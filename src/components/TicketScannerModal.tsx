import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
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
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { IRegistration, IEvent } from '../types';

interface TicketScannerModalProps {
  onClose: () => void;
  onSuccessCheckIn?: () => void;
}

export const TicketScannerModal: React.FC<TicketScannerModalProps> = ({ onClose, onSuccessCheckIn }) => {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

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

  // Stop camera tracks cleanly
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

  // Stop camera on unmount or modal close
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Extract clean ticket ID from raw QR text
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

  // Perform backend verification
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

      setResult({
        status: isAlready ? 'already_checked_in' : 'valid',
        registration: res.registration,
        event: res.event,
        message: res.message,
        ticketId: code
      });

      if (!isAlready) {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.65 }
        });
      }

      if (onSuccessCheckIn) {
        onSuccessCheckIn();
      }
    } catch (err: any) {
      setResult({
        status: 'invalid',
        error: err.message || 'Invalid or unregistered ticket pass.',
        ticketId: code
      });
    } finally {
      setLoading(false);
      // Brief delay before allowing next scan
      setTimeout(() => {
        isVerifyingRef.current = false;
      }, 1500);
    }
  };

  // Video scanning loop using jsQR
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
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
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

      // Enumerate camera devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
      } catch (err) {
        console.warn('Could not enumerate devices', err);
      }

      // Start the scan loop
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage(
          'Camera permission was denied. Please allow camera access in your browser settings (click the lock or camera icon in the address bar) and try again.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setErrorMessage('No camera device was detected on your system.');
      } else {
        setCameraStatus('unavailable');
        setErrorMessage(err.message || 'Failed to initialize device camera.');
      }
      setCameraActive(false);
    }
  }, [facingMode, scanLoop, selectedDeviceId, stopCameraStream]);

  // Automatically request camera permission and start scanner on modal mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  // Switch facing mode (rear vs front)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display">EventHub Attendance Scanner</h3>
              <p className="text-[11px] text-slate-300">Live Entrance QR Check-in</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Camera Viewfinder Area */}
          <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Active Scanner Laser & Reticle Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Targeting Reticle */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-indigo-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br"></div>
                  {/* Animated laser line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2s_infinite]"></div>
                </div>

                <span className="mt-3 px-3 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium rounded-full border border-slate-700">
                  Align QR code inside box
                </span>
              </div>
            )}

            {/* Inactive / Permission / Unavailable States */}
            {!cameraActive && (
              <div className="p-6 text-center space-y-3 z-10 max-w-xs">
                {cameraStatus === 'requesting' ? (
                  <>
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-white">Connecting to Camera...</p>
                    <p className="text-[11px] text-slate-400">Please grant permission if prompted by your browser</p>
                  </>
                ) : cameraStatus === 'denied' ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                      <CameraOff className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-rose-300">Camera Access Denied</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Camera permission is blocked. Click the lock icon 🔒 in your browser's address bar, enable Camera access, and click Retry below.
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
                    <p className="text-xs font-bold text-amber-300">Camera Unavailable</p>
                    <p className="text-[11px] text-slate-400">
                      {errorMessage || 'No camera detected. You can type or paste the ticket code in manual lookup below.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">Device Camera Standby</p>
                    <p className="text-[11px] text-slate-400">
                      Start your camera to scan physical or mobile digital passes in real-time.
                    </p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera Scanner</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Top Toolbar overlay when active */}
            {cameraActive && (
              <div className="absolute top-2 inset-x-2 flex items-center justify-between p-1 z-20">
                <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Rear Camera Active
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg backdrop-blur-xs border border-slate-700 transition-colors"
                    title="Flip camera (Rear / Front)"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs transition-colors shadow-xs"
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Verification Result Feedback Box */}
          {result && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              {result.status === 'invalid' ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold block text-sm">Verification Failed</strong>
                    <p className="text-rose-700">{result.error}</p>
                    {result.ticketId && (
                      <p className="font-mono text-[11px] text-rose-800">Scanned code: {result.ticketId}</p>
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
                      <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
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

          {/* Manual Input Form & Lookup */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-3 pt-1 border-t border-slate-100"
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Manual Ticket Code Lookup
              </label>
              <span className="text-[10px] text-slate-400">Alphanumeric or UUID</span>
            </div>

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
                    <span>Verify Code</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Quick Test Sample Passes
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTicketInput('EH-TKT-782194');
                  handleVerify('EH-TKT-782194');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
              >
                <QrCode className="w-3 h-3 text-indigo-600" />
                <span>Test #EH-TKT-782194</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTicketInput('EH-TKT-491023');
                  handleVerify('EH-TKT-491023');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
              >
                <QrCode className="w-3 h-3 text-indigo-600" />
                <span>Test #EH-TKT-491023</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {cameraActive ? (
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <CameraOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Stop Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Start Scanner</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
