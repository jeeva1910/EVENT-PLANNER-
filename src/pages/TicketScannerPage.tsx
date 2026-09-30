import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  CheckCircle,
  AlertCircle,
  Search,
  UserCheck,
  ShieldCheck,
  Camera,
  CameraOff,
  RefreshCw,
  SwitchCamera,
  Loader2,
  AlertTriangle,
  Users,
  Compass,
  Check,
  Copy,
  Calendar
} from 'lucide-react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { IRegistration, IEvent } from '../types';
import { useAuth } from '../context/AuthContext';

export const TicketScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [scanHistory, setScanHistory] = useState<
    Array<{
      id: string;
      ticketId: string;
      status: 'valid' | 'already_checked_in' | 'invalid';
      message: string;
      attendeeName?: string;
      eventTitle?: string;
      timestamp: Date;
    }>
  >([]);

  const [result, setResult] = useState<{
    status: 'valid' | 'already_checked_in' | 'invalid';
    registration?: IRegistration;
    event?: IEvent;
    message?: string;
    error?: string;
    ticketId?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const isVerifyingRef = useRef(false);

  // Stop camera stream tracks
  const stopCameraStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Extract clean ticket ID
  const extractTicketId = (scannedText: string): string => {
    const trimmed = scannedText.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.ticketId) {
        return String(parsed.ticketId).trim();
      }
    } catch {
      // not JSON
    }
    const urlMatch = trimmed.match(/\/tickets\/([A-Za-z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].trim();
    }
    return trimmed;
  };

  // Perform verification
  const handleVerify = async (rawCode?: string) => {
    const code = extractTicketId(rawCode || ticketInput).trim();
    if (!code) return;

    // Cooldown check for duplicate rapid scans
    const now = Date.now();
    if (
      lastScannedRef.current.code.toUpperCase() === code.toUpperCase() &&
      now - lastScannedRef.current.time < 3500
    ) {
      return;
    }
    lastScannedRef.current = { code, time: now };

    setLoading(true);
    isVerifyingRef.current = true;
    setResult(null);

    try {
      const res = await api.verifyTicket(code);
      const isAlready = res.message.toLowerCase().includes('already checked in');

      const outcome = {
        status: (isAlready ? 'already_checked_in' : 'valid') as 'valid' | 'already_checked_in',
        registration: res.registration,
        event: res.event,
        message: res.message,
        ticketId: code
      };
      setResult(outcome);

      setScanHistory((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          ticketId: code,
          status: outcome.status,
          message: res.message,
          attendeeName: (res.registration as any).attendee?.name,
          eventTitle: res.event?.title,
          timestamp: new Date()
        },
        ...prev.slice(0, 19)
      ]);

      if (!isAlready) {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.65 }
        });
      }
    } catch (err: any) {
      const outcome = {
        status: 'invalid' as const,
        error: err.message || 'Invalid or unregistered ticket pass.',
        ticketId: code
      };
      setResult(outcome);

      setScanHistory((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          ticketId: code,
          status: 'invalid',
          message: err.message || 'Invalid ticket code',
          timestamp: new Date()
        },
        ...prev.slice(0, 19)
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isVerifyingRef.current = false;
      }, 1500);
    }
  };

  // Continuous frame scanning
  const scanLoop = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    if (isVerifyingRef.current) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (decoded && decoded.data) {
        const foundCode = decoded.data.trim();
        if (foundCode) {
          handleVerify(foundCode);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, []);

  // Start Camera
  const startCamera = useCallback(async (forceFacingMode?: 'environment' | 'user') => {
    stopCameraStream();
    setErrorMessage(null);
    setCameraStatus('requesting');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unavailable');
      setErrorMessage('Camera access is not supported by your browser or environment.');
      return;
    }

    try {
      const mode = forceFacingMode || facingMode;
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraStatus('active');

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage(
          'Camera permission was denied. Please allow camera access in your browser settings (click lock icon in address bar) and try again.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setErrorMessage('No camera hardware detected on this device.');
      } else {
        setCameraStatus('unavailable');
        setErrorMessage(err.message || 'Failed to access camera.');
      }
      setCameraActive(false);
    }
  }, [facingMode, scanLoop, stopCameraStream]);

  // Automatically request camera permission and start scanner on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Persistent Navigation Subheader */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                stopCameraStream();
                navigate('/dashboard/organizer');
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Return to Organizer Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* Breadcrumb links */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard/organizer" className="hover:text-slate-900 transition-colors">Organizer</Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">QR Attendance Scanner</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              to="/dashboard/organizer"
              onClick={stopCameraStream}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Operations Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Camera & Scanner */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Scanner Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display">Live Entrance Scanner</h2>
                  <p className="text-xs text-slate-300">Point device camera at attendee digital passes</p>
                </div>
              </div>

              {cameraActive && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Switch between front and back camera"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip Camera</span>
                </button>
              )}
            </div>

            {/* Camera Viewfinder */}
            <div className="p-6 space-y-5">
              <div className="relative aspect-4/3 w-full rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {/* Laser scan reticle overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-indigo-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br"></div>
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2s_infinite]"></div>
                    </div>
                    <span className="mt-4 px-3.5 py-1 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-medium rounded-full border border-slate-700">
                      Rear Camera Scanning Active
                    </span>
                  </div>
                )}

                {/* Inactive & Error States */}
                {!cameraActive && (
                  <div className="p-6 text-center space-y-3 z-10 max-w-sm">
                    {cameraStatus === 'requesting' ? (
                      <>
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-white">Opening Camera Feed...</p>
                        <p className="text-xs text-slate-400">Please allow permission in your browser prompt</p>
                      </>
                    ) : cameraStatus === 'denied' ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                          <CameraOff className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-rose-300">Camera Access Blocked</p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Permission was denied. Click the lock icon 🔒 in your browser address bar to allow Camera access.
                        </p>
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Camera</span>
                        </button>
                      </>
                    ) : cameraStatus === 'unavailable' ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-amber-300">Camera Hardware Not Found</p>
                        <p className="text-xs text-slate-400">
                          {errorMessage || 'Use the manual ticket ID code lookup below.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-white">Camera on Standby</p>
                        <p className="text-xs text-slate-400">
                          Turn on your device camera to scan passes at the entrance.
                        </p>
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Start Camera Scanner</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {cameraActive ? (
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                  >
                    <CameraOff className="w-4 h-4 text-slate-600" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Activate Camera</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTicketInput('EH-TKT-782194');
                      handleVerify('EH-TKT-782194');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono rounded-xl transition-colors"
                  >
                    Test #782194
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketInput('EH-TKT-491023');
                      handleVerify('EH-TKT-491023');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono rounded-xl transition-colors"
                  >
                    Test #491023
                  </button>
                </div>
              </div>

              {/* Verification Result Box */}
              {result && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                  {result.status === 'invalid' ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="font-bold block text-sm">Verification Failed</strong>
                        <p className="text-rose-700">{result.error}</p>
                        {result.ticketId && (
                          <p className="font-mono text-[11px] text-rose-800">Code: {result.ticketId}</p>
                        )}
                      </div>
                    </div>
                  ) : result.status === 'already_checked_in' ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="font-bold block text-sm">Already Checked In</strong>
                        <p className="text-amber-800">{result.message}</p>
                        {result.registration?.attendee && (
                          <div className="pt-2 border-t border-amber-200 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-amber-700" />
                            <span>
                              <strong>Attendee:</strong> {result.registration.attendee.name} (
                              {result.registration.attendee.email})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs shadow-xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <strong className="font-bold block text-sm">Entrance Verified & Checked In!</strong>
                        <p className="text-emerald-800">{result.message}</p>
                        {result.event && (
                          <p className="text-slate-600">
                            <strong>Event:</strong> {result.event.title}
                          </p>
                        )}
                        {result.registration?.attendee && (
                          <div className="pt-2 border-t border-emerald-200 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                            <span>
                              <strong>Attendee:</strong> {result.registration.attendee.name} (
                              {result.registration.attendee.email})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Ticket Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
                className="space-y-2 pt-2 border-t border-slate-100"
              >
                <label className="block text-xs font-semibold text-slate-700">
                  Manual Code Search & Check-in
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. EH-TKT-782194"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !ticketInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Check In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Scan History Log */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Session Verification Log
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                {scanHistory.length} Scans
              </span>
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No scans recorded yet in this session.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      item.status === 'valid'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : item.status === 'already_checked_in'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px]">{item.ticketId}</span>
                      <span className="text-[10px] text-slate-500">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {item.attendeeName && (
                      <p className="font-semibold text-[11px] truncate">{item.attendeeName}</p>
                    )}
                    <p className="text-[10px] text-slate-600 line-clamp-1">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
