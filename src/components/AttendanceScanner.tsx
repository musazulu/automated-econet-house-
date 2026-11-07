import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { BrandAmbassador, AttendanceRecord } from '../types';
import { DataService } from '../services/dataService';
import {
  getZimbabweDate,
  getZimbabweTime,
  getZimbabweTimestamp,
  formatCurrency,
} from '../utils/dateUtils';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  RotateCcw,
  Sparkles,
  Search,
  LogIn,
  LogOut,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AttendanceScannerProps {
  actorName: string;
  actorRole: 'admin' | 'consultant' | 'operator';
  onRecordUpdated?: () => void;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({
  actorName,
  actorRole,
  onRecordUpdated,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scanned State
  const [identifiedBa, setIdentifiedBa] = useState<BrandAmbassador | null>(null);
  const [scannedRecord, setScannedRecord] = useState<AttendanceRecord | null>(null);
  const [scanStatus, setScanStatus] = useState<{
    type: 'success' | 'warning' | 'error' | 'idle';
    title: string;
    message: string;
  }>({
    type: 'idle',
    title: 'Ready to Scan',
    message: 'Align BA card QR code in front of camera or select a badge below.',
  });

  // Current Zimbabwe Clock
  const [harareTime, setHarareTime] = useState<string>(getZimbabweTime());
  const [harareDate, setHarareDate] = useState<string>(getZimbabweDate());

  // Quick Select / Simulator Filter
  const [simulatorQuery, setSimulatorQuery] = useState<string>('');
  const allBas = DataService.getBAs();

  // Camera & Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Audio chimes
  const playChime = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(240, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // AudioContext may be restricted by browser policy until interaction
    }
  };

  // Keep Harare clock ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setHarareTime(getZimbabweTime());
      setHarareDate(getZimbabweDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Camera lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (cameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.play();
            requestAnimationFrame(scanVideoFrame);
          }
          setCameraError(null);
        })
        .catch(err => {
          console.warn('Camera permission or device error:', err);
          setCameraError('Camera access unavailable or permission denied. Please use the simulator below or manual entry.');
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive]);

  // Video QR Detection loop
  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      const now = Date.now();
      // Debounce repeat scans of same card within 3 seconds
      if (lastScannedTokenRef.current !== code.data || now - lastScannedTimeRef.current > 3000) {
        lastScannedTokenRef.current = code.data;
        lastScannedTimeRef.current = now;
        handleTokenScanned(code.data);
      }
    }

    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Main QR Processing Handler
  const handleTokenScanned = (token: string) => {
    const ba = DataService.getBAByQrToken(token);
    setIdentifiedBa(ba || null);

    const result = DataService.processQrScan(token, actorName, actorRole);

    if (result.success) {
      playChime(true);
      setScannedRecord(result.record || null);
      setScanStatus({
        type: 'success',
        title: result.actionTaken === 'CLOCK_IN' ? 'Clock-In Recorded!' : 'Clock-Out Completed!',
        message: result.message,
      });
      onRecordUpdated?.();
    } else {
      playChime(false);
      setScannedRecord(result.record || null);

      if (result.actionTaken === 'DUPLICATE_SCAN' || result.actionTaken === 'ALREADY_COMPLETED') {
        setScanStatus({
          type: 'warning',
          title: 'Duplicate Session Check',
          message: result.message,
        });
      } else {
        setScanStatus({
          type: 'error',
          title: 'Scan Rejected',
          message: result.message,
        });
      }
    }
  };

  // Quick Action Buttons for currently identified BA
  const handleManualAction = (token: string) => {
    handleTokenScanned(token);
  };

  const handleResetScanner = () => {
    setIdentifiedBa(null);
    setScannedRecord(null);
    lastScannedTokenRef.current = null;
    setScanStatus({
      type: 'idle',
      title: 'Ready to Scan',
      message: 'Align BA card QR code in front of camera or select a badge below.',
    });
  };

  const filteredBas = allBas.filter(
    b =>
      b.fullName.toLowerCase().includes(simulatorQuery.toLowerCase()) ||
      b.baId.toLowerCase().includes(simulatorQuery.toLowerCase()) ||
      b.branch.toLowerCase().includes(simulatorQuery.toLowerCase())
  );

  // Today's attendance summary for this scan station
  const todayRecords = DataService.getAttendanceRecords().filter(r => r.date === harareDate);
  const completedToday = todayRecords.filter(r => r.isCompleted).length;
  const activeNow = todayRecords.filter(r => r.clockInTime && !r.clockOutTime).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Harare CAT Live Time */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-5 text-white shadow-lg border border-blue-700/50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ATTENDANCE SCANNING STATION
          </div>
          <h2 className="text-2xl font-bold mt-1 text-white">
            Econet BA QR Attendance Station
          </h2>
          <p className="text-xs text-blue-200">
            Station Operator: <span className="font-semibold text-white">{actorName}</span> • Zimbabwe Standard Time (CAT, UTC+2)
          </p>
        </div>

        {/* Live Harare Clock Box */}
        <div className="bg-black/30 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-right">
          <div className="text-xs text-blue-200 uppercase tracking-widest font-mono">
            {harareDate}
          </div>
          <div className="text-2xl font-bold font-mono tracking-wider text-amber-300">
            {harareTime} <span className="text-xs font-normal text-slate-300">CAT</span>
          </div>
        </div>
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera / QR Reader Viewport */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Camera className="w-5 h-5 text-blue-600" />
                Optical QR Scanner
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    soundEnabled ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-400 bg-slate-50 border-slate-200'
                  }`}
                  title={soundEnabled ? 'Audio Chimes Enabled' : 'Muted'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setCameraActive(!cameraActive)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    cameraActive
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {cameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" /> Start Camera
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Feed / Placeholder Frame */}
            <div className="relative mt-4 aspect-4/3 max-h-[380px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  {/* Target Crosshair / Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-blue-400/80 rounded-2xl relative shadow-2xl">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400" />
                      <div className="w-full h-0.5 bg-red-500/80 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full font-medium">
                      Position QR code inside guidelines
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-300">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">Camera Offline</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Click "Start Camera" above to read physical BA cards, or use the Instant Badge Simulator below to test clock-ins and clock-outs.
                    </p>
                  </div>
                  {cameraError && (
                    <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-lg text-xs max-w-sm mx-auto">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick status counters */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                  Active Shifts Now
                </span>
                <p className="text-xl font-bold text-blue-950">{activeNow}</p>
              </div>
              <LogIn className="w-6 h-6 text-blue-500 opacity-60" />
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                  Completed Shifts Today
                </span>
                <p className="text-xl font-bold text-emerald-950">{completedToday}</p>
              </div>
              <LogOut className="w-6 h-6 text-emerald-500 opacity-60" />
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result & Real-Time Action Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Scan Feedback & Verification
              </h3>
              {identifiedBa && (
                <button
                  onClick={handleResetScanner}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {/* Notification Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                scanStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : scanStatus.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : scanStatus.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {scanStatus.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {scanStatus.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {scanStatus.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {scanStatus.type === 'idle' && <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

              <div>
                <h4 className="font-bold text-sm">{scanStatus.title}</h4>
                <p className="text-xs mt-0.5 leading-relaxed">{scanStatus.message}</p>
              </div>
            </div>

            {/* Identified BA Card Details */}
            {identifiedBa ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={identifiedBa.photoUrl}
                    alt={identifiedBa.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{identifiedBa.fullName}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {identifiedBa.baId}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {identifiedBa.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-200 pt-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Assigned Workplace</span>
                    <span className="font-semibold text-slate-800">{identifiedBa.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Sales Consultant</span>
                    <span className="font-semibold text-slate-800">{identifiedBa.salesConsultantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Daily Sales Rate</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(identifiedBa.dailyCommissionRate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Attendance Rate</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(identifiedBa.dailyAttendanceCommissionRate)}</span>
                  </div>
                </div>

                {/* Previous Attendance Event */}
                {scannedRecord && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      Today's Attendance Session
                    </span>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Clock-In:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {scannedRecord.clockInTime ? `${scannedRecord.clockInTime} CAT` : 'None'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Clock-Out:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {scannedRecord.clockOutTime ? `${scannedRecord.clockOutTime} CAT` : 'In Progress (Not clocked out)'}
                      </span>
                    </div>
                    {scannedRecord.totalHours > 0 && (
                      <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-100">
                        <span>Total Hours:</span>
                        <span className="font-mono font-bold text-emerald-700">{scannedRecord.totalHours} hrs</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No BA card scanned yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Point an authorized BA badge at the camera or click a badge below to simulate.
                </p>
              </div>
            )}
          </div>

          {/* Action Trigger for the Selected BA */}
          {identifiedBa && (
            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <button
                onClick={() => handleManualAction(identifiedBa.qrToken)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Scan Again / Toggle Next Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Badge Simulator for Easy Prototyping */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Instant Badge Simulator (One-Click Card Scan)
            </h3>
            <p className="text-xs text-slate-500">
              Click any BA below to simulate an instantaneous physical badge tap at this scan station.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search BA name, ID, or branch..."
              value={simulatorQuery}
              onChange={e => setSimulatorQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {filteredBas.map(ba => {
            const todayRec = todayRecords.find(r => r.baId === ba.baId);
            const isPresent = todayRec?.status === 'present';
            const isClockedOut = Boolean(todayRec?.clockOutTime);
            const isInactive = ba.status === 'inactive';

            return (
              <div
                key={ba.id}
                onClick={() => handleManualAction(ba.qrToken)}
                className={`group p-3 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md ${
                  isInactive
                    ? 'bg-slate-100 border-slate-200 opacity-60'
                    : isClockedOut
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                    : isPresent
                    ? 'bg-blue-50/40 border-blue-200 hover:border-blue-400'
                    : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={ba.photoUrl}
                    alt={ba.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {ba.fullName}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-600">{ba.baId}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        {ba.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 truncate max-w-[120px]">{ba.branch}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      isInactive
                        ? 'bg-slate-200 text-slate-700'
                        : isClockedOut
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPresent
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isInactive
                      ? 'Inactive'
                      : isClockedOut
                      ? 'Clocked Out'
                      : isPresent
                      ? 'Clocked In'
                      : 'Not Scanned'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
