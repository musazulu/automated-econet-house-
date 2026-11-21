import React, { useState, useEffect } from 'react';
import { QrCodeDisplay } from './QrCodeDisplay';
import { DataService } from '../services/dataService';
import { getZimbabweDate, getZimbabweTime, getZimbabweTimestamp } from '../utils/dateUtils';
import {
  Monitor,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  QrCode,
  Smartphone,
} from 'lucide-react';

interface AttendanceQrDisplayProps {
  actorName: string;
  actorRole: 'admin' | 'consultant' | 'operator';
  onRecordUpdated?: () => void;
}

interface ScanNotification {
  id: string;
  baName: string;
  baId: string;
  status: 'success' | 'error';
  message: string;
  time: string;
}

export const AttendanceQrDisplay: React.FC<AttendanceQrDisplayProps> = ({
  actorName,
  actorRole,
  onRecordUpdated,
}) => {
  // QR Code State - generates a time-based token that BAs scan
  const [qrSessionToken, setQrSessionToken] = useState<string>('');
  const [qrGeneratedAt, setQrGeneratedAt] = useState<string>('');
  
  // UI State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<ScanNotification[]>([]);
  
  // Time Display
  const [harareTime, setHarareTime] = useState<string>(getZimbabweTime());
  const [harareDate, setHarareDate] = useState<string>(getZimbabweDate());
  
  // Today's stats
  const todayRecords = DataService.getAttendanceRecords().filter(r => r.date === harareDate);
  const totalScannedToday = todayRecords.length;
  const clockedInNow = todayRecords.filter(r => r.clockInTime && !r.clockOutTime).length;
  const completedToday = todayRecords.filter(r => r.isCompleted).length;

  // Generate new QR session token with URL
  const generateNewQrToken = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    const token = `ATTENDANCE_STATION_${timestamp}_${random}`;
    
    // Create a URL that will work when scanned
    // In production, this would be: https://attendance.econet.co.zw/scan?token=...
    // For local testing, use the local server URL
    const baseUrl = window.location.origin;
    const scanUrl = `${baseUrl}/scan.html?token=${token}`;
    
    setQrSessionToken(scanUrl);
    setQrGeneratedAt(getZimbabweTimestamp());
  };

  // Initialize QR token on mount
  useEffect(() => {
    generateNewQrToken();
    // Regenerate QR code every 5 minutes for security
    const regenerateInterval = setInterval(() => {
      generateNewQrToken();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(regenerateInterval);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setHarareTime(getZimbabweTime());
      setHarareDate(getZimbabweDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for scan events from BA phones
  // In production, this would be a WebSocket connection or polling endpoint
  // For now, we'll simulate with a listener that processes scans
  useEffect(() => {
    // Create a custom event listener for when BAs scan the QR code
    const handleBaScan = (event: CustomEvent) => {
      const { baQrToken } = event.detail;
      processBaScan(baQrToken);
    };

    window.addEventListener('ba-scanned-attendance-qr' as any, handleBaScan as EventListener);
    
    return () => {
      window.removeEventListener('ba-scanned-attendance-qr' as any, handleBaScan as EventListener);
    };
  }, [actorName, actorRole]);

  const processBaScan = (baQrToken: string) => {
    const result = DataService.processQrScan(baQrToken, actorName, actorRole);
    
    const notification: ScanNotification = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      baName: result.ba?.fullName || 'Unknown BA',
      baId: result.ba?.baId || 'Unknown',
      status: result.success ? 'success' : 'error',
      message: result.message,
      time: getZimbabweTime(),
    };

    setRecentScans(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

    if (result.success) {
      playSuccessChime();
    } else {
      playErrorChime();
    }

    onRecordUpdated?.();
  };

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
    } catch {
      // AudioContext may be restricted
    }
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
    } catch {
      // AudioContext may be restricted
    }
  };

  // For testing: Simulate BA phone scan
  const simulateBaScan = (baQrToken: string) => {
    const event = new CustomEvent('ba-scanned-attendance-qr', {
      detail: { baQrToken, stationToken: qrSessionToken }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : ''}`}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-800 to-blue-900 rounded-2xl p-5 text-white shadow-lg border border-blue-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE ATTENDANCE STATION
            </div>
            <h2 className="text-2xl font-bold mt-1 text-white">
              Scan This QR Code to Mark Attendance
            </h2>
            <p className="text-xs text-blue-200 mt-1">
              Station Operator: <span className="font-semibold text-white">{actorName}</span> • Zimbabwe Standard Time (CAT, UTC+2)
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
        {/* Left: QR Code Display */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5 text-blue-600" />
              Attendance QR Station Display
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  soundEnabled ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-400 bg-slate-50 border-slate-200'
                }`}
                title={soundEnabled ? 'Audio Enabled' : 'Muted'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={generateNewQrToken}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Regenerate QR Code"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* QR Code Display Area */}
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border-4 border-blue-200 shadow-xl">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <QrCodeDisplay token={qrSessionToken} size={isFullscreen ? 400 : 280} />
              </div>
            </div>

            <div className="mt-6 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Open your phone camera and point at this QR code
                </span>
              </div>
              
              <p className="text-xs text-slate-500 max-w-md">
                BA Instructions: Use your mobile phone camera or QR scanner app to scan this code. 
                Your attendance will be automatically recorded with the current timestamp.
              </p>

              <div className="text-[10px] text-slate-400 font-mono pt-2">
                Session Token: {qrSessionToken.substring(0, 30)}...
                <br />
                Generated: {qrGeneratedAt}
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Total Scans
              </div>
              <div className="text-2xl font-bold text-blue-950 mt-1">{totalScannedToday}</div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Active Now
              </div>
              <div className="text-2xl font-bold text-amber-950 mt-1">{clockedInNow}</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Completed
              </div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">{completedToday}</div>
            </div>
          </div>
        </div>

        {/* Right: Recent Scans Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-blue-600" />
              Live Scan Activity
            </h3>
            <button
              onClick={() => setRecentScans([])}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Waiting for BA scans...</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scans will appear here in real-time
                </p>
              </div>
            ) : (
              recentScans.map(scan => (
                <div
                  key={scan.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                    scan.status === 'success'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  {scan.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {scan.baName}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {scan.time}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                      {scan.baId}
                    </p>
                    <p className={`text-xs mt-1 ${
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

      {/* Testing Panel - Simulate BA Scans */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-900">Testing Mode</h4>
            <p className="text-xs text-amber-700 mt-1">
              In production, BAs would scan this QR code with their phones. For testing, click a BA below to simulate their phone scanning the attendance QR code.
            </p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              {DataService.getBAs().slice(0, 6).map(ba => (
                <button
                  key={ba.id}
                  onClick={() => simulateBaScan(ba.qrToken)}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  Simulate {ba.fullName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
