import React, { useState, useEffect, useRef } from 'react';
import { BrandAmbassador, AttendanceRecord } from '../types';
import { DataService } from '../services/dataService';
import { getZimbabweDate, getZimbabweTime } from '../utils/dateUtils';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  PenTool,
  X,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface DigitalSignatureKioskProps {
  actorName: string;
  actorRole: 'admin' | 'consultant' | 'operator';
  onRecordUpdated?: () => void;
}

interface ScanNotification {
  id: string;
  baName: string;
  baId: string;
  action: 'CLOCK_IN' | 'CLOCK_OUT';
  status: 'success' | 'error';
  message: string;
  time: string;
}

export const DigitalSignatureKiosk: React.FC<DigitalSignatureKioskProps> = ({
  actorName,
  actorRole,
  onRecordUpdated,
}) => {
  // Search and Selection State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBa, setSelectedBa] = useState<BrandAmbassador | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  
  // Signature State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<ScanNotification[]>([]);
  const [processingSignature, setProcessingSignature] = useState<boolean>(false);
  
  // Time Display
  const [harareTime, setHarareTime] = useState<string>(getZimbabweTime());
  const [harareDate, setHarareDate] = useState<string>(getZimbabweDate());
  
  // Get all active BAs
  const allBas = DataService.getBAs().filter(ba => ba.status === 'active');
  
  // Filter BAs based on search
  const filteredBas = allBas.filter(ba => 
    ba.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.baId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get today's attendance stats
  const todayRecords = DataService.getAttendanceRecords().filter(r => r.date === harareDate);
  const totalPresent = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const clockedInNow = todayRecords.filter(r => r.clockInTime && !r.clockOutTime).length;
  const completedToday = todayRecords.filter(r => r.isCompleted).length;

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setHarareTime(getZimbabweTime());
      setHarareDate(getZimbabweDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (showSignatureModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b'; // Slate 800
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [showSignatureModal]);

  // Handle BA selection
  const handleSelectBa = (ba: BrandAmbassador) => {
    setSelectedBa(ba);
    setShowSignatureModal(true);
    setHasSignature(false);
  };

  // Clear selection and signature
  const handleClearSelection = () => {
    setSelectedBa(null);
    setShowSignatureModal(false);
    setHasSignature(false);
    setSearchQuery('');
    clearCanvas();
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Process attendance with signature
  const handleConfirmSignature = () => {
    if (!selectedBa || !hasSignature) return;

    setProcessingSignature(true);

    // Get signature as data URL
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png') || '';

    // Process attendance using existing service with signature
    const result = DataService.processQrScan(selectedBa.qrToken, actorName, actorRole, signatureData);

    // Create notification
    const notification: ScanNotification = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      baName: selectedBa.fullName,
      baId: selectedBa.baId,
      action: result.actionTaken as 'CLOCK_IN' | 'CLOCK_OUT',
      status: result.success ? 'success' : 'error',
      message: result.message,
      time: getZimbabweTime(),
    };

    setRecentScans(prev => [notification, ...prev.slice(0, 9)]);

    // Play sound
    if (result.success) {
      playSuccessChime();
    } else {
      playErrorChime();
    }

    // Reset state
    setProcessingSignature(false);
    setShowSignatureModal(false);
    setSelectedBa(null);
    setSearchQuery('');
    clearCanvas();

    // Callback to refresh data
    onRecordUpdated?.();
  };

  // Audio feedback
  const playSuccessChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const playErrorChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  // Get today's record for selected BA
  const getTodayRecordForBa = (ba: BrandAmbassador) => {
    return todayRecords.find(r => r.baId === ba.baId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-800 to-blue-900 rounded-2xl p-5 text-white shadow-lg border border-blue-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DIGITAL ATTENDANCE REGISTER
            </div>
            <h2 className="text-2xl font-bold mt-1 text-white">
              Self-Service Attendance Kiosk
            </h2>
            <p className="text-xs text-blue-200 mt-1">
              Search your name, sign on screen, and clock in/out • Station: <span className="font-semibold text-white">{actorName}</span>
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-right">
            <div className="text-xs text-blue-200 uppercase tracking-widest font-mono">
              {harareDate}
            </div>
            <div className="text-2xl font-bold font-mono tracking-wider text-amber-300">
              {harareTime} <span className="text-xs font-normal text-slate-300">CAT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search and BA Selection */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-blue-600" />
              Find Your Name
            </h3>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                soundEnabled ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-400 bg-slate-50 border-slate-200'
              }`}
              title={soundEnabled ? 'Audio Enabled' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Search Box */}
          <div className="mt-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type your name, BA ID, or branch..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-base bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {searchQuery && (
              <p className="text-xs text-slate-500 mt-2">
                Found <strong className="text-slate-900">{filteredBas.length}</strong> matching Brand Ambassador{filteredBas.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* BA List */}
          <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
            {searchQuery === '' ? (
              <div className="text-center py-16 text-slate-400">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium">Start typing to search</p>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your name, BA ID, or branch name
                </p>
              </div>
            ) : filteredBas.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
                <p className="text-sm font-medium text-slate-700">No Brand Ambassadors found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              filteredBas.map(ba => {
                const todayRec = getTodayRecordForBa(ba);
                const hasClockIn = Boolean(todayRec?.clockInTime);
                const hasClockOut = Boolean(todayRec?.clockOutTime);
                const isCompleted = todayRec?.isCompleted || false;

                return (
                  <button
                    key={ba.id}
                    onClick={() => handleSelectBa(ba)}
                    disabled={isCompleted}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200 opacity-60 cursor-not-allowed'
                        : hasClockIn
                        ? 'bg-blue-50 border-blue-300 hover:border-blue-500 hover:bg-blue-100'
                        : 'bg-white border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={ba.photoUrl}
                        alt={ba.fullName}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-slate-900 truncate">
                          {ba.fullName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {ba.baId}
                          </span>
                          <span className="text-xs text-slate-600">{ba.branch}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </div>
                        ) : hasClockIn ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              Clocked In
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Click to Clock Out
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <LogIn className="w-3 h-3" />
                            Click to Clock In
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Today's Activity
            </h3>
            {recentScans.length > 0 && (
              <button
                onClick={() => setRecentScans([])}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-center">
              <div className="text-[10px] font-semibold text-blue-700 uppercase">Total</div>
              <div className="text-xl font-bold text-blue-950 mt-0.5">{totalPresent}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg text-center">
              <div className="text-[10px] font-semibold text-amber-700 uppercase">Active</div>
              <div className="text-xl font-bold text-amber-950 mt-0.5">{clockedInNow}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-center">
              <div className="text-[10px] font-semibold text-emerald-700 uppercase">Done</div>
              <div className="text-xl font-bold text-emerald-950 mt-0.5">{completedToday}</div>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No activity yet today</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Attendance records will appear here
                </p>
              </div>
            ) : (
              recentScans.map(scan => (
                <div
                  key={scan.id}
                  className={`p-3 rounded-lg border flex items-start gap-2 transition-all ${
                    scan.status === 'success'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  {scan.status === 'success' ? (
                    scan.action === 'CLOCK_IN' ? (
                      <LogIn className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <LogOut className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {scan.baName}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {scan.time}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                      {scan.baId}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${
                      scan.status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {scan.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedBa && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBa.photoUrl}
                  alt={selectedBa.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedBa.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedBa.baId} • {selectedBa.branch}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <PenTool className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">Sign Below to Confirm Attendance</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Draw your signature using your finger (touchscreen) or mouse. 
                      This will record your attendance for today ({harareDate}).
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Canvas */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Your Signature</label>
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full border-2 border-slate-300 rounded-xl bg-slate-50 cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm">Sign here</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {hasSignature ? 'Signature captured ✓' : 'Please sign above'}
                  </p>
                  <button
                    onClick={clearCanvas}
                    disabled={!hasSignature}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleClearSelection}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSignature}
                  disabled={!hasSignature || processingSignature}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingSignature ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
