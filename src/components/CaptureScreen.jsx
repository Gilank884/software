import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  RefreshCcw,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Zap,
  Activity,
  Target,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react'
import HandTrackerOverlay from './HandTrackerOverlay'

const TelemetryBox = ({ title, data, position = 'bottom-left' }) => (
  <div className={`absolute p-4 border border-pink-500/30 bg-black/40 backdrop-blur-md font-mono text-[10px] text-pink-500 min-w-[150px] transition-all z-50 ${
    position === 'bottom-left' ? "bottom-6 left-6 border-l-4" : "bottom-6 right-6 border-r-4"
  }`}>
    <div className="flex items-center gap-2 mb-2 border-b border-pink-500/20 pb-1">
      <Zap size={12} className="animate-pulse" />
      <span className="uppercase tracking-tighter font-bold">{title}</span>
    </div>
    <div className="space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4">
          <span className="opacity-60">{key.toUpperCase()}:</span>
          <span className={value === 'LOCKED' || value === 'ACTIVE' || value === 'READY' ? "text-yellow-400" : "text-pink-400"}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const CaptureScreen = ({
  videoRef,
  previewCanvasRef,
  cameraStatus,
  countdown,
  isCapturing,
  currentShotIndex,
  maxCaptures,
  photos,
  isReviewing,
  hasStartedSession,
  onStartSession,
  onContinue,
  onRetake,
  cameraError = null,
  captureError = null,
  selectedFrameData,
  user,
  isSpecialMode,
  setIsSpecialMode,
  ghosts,
  setGhosts,
  activePortal,
  setActivePortal,
  onSpecialCapture,
  setVideoClips
}) => {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const trackerCanvasRef = useRef(null);
  const [specialCountdown, setSpecialCountdown] = useState(null);
  const [isHandLocked, setIsHandLocked] = useState(false);
  const [isAwaitingLockConfirmation, setIsAwaitingLockConfirmation] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState('NONE');
  const [gestureCooldown, setGestureCooldown] = useState(false);
  const lastResultsRef = useRef(null);

  const onStatusChange = useCallback((status) => {
    setIsHandLocked(status.isLocked);
    lastResultsRef.current = status.results;
    setDetectedGesture(status.gesture);
  }, []);

  const handleCapture = useCallback(() => {
    if (!trackerCanvasRef.current) return;

    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[100] animate-pulse';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    const dataUrl = trackerCanvasRef.current.toDataURL('image/png');

    if (!activePortal) {
      if (isHandLocked && lastResultsRef.current) {
        const hands = lastResultsRef.current.multiHandLandmarks;
        const pts = [
          { x: hands[0][8].x * 1280, y: hands[0][8].y * 720 },
          { x: hands[1][8].x * 1280, y: hands[1][8].y * 720 },
          { x: hands[1][4].x * 1280, y: hands[1][4].y * 720 },
          { x: hands[0][4].x * 1280, y: hands[0][4].y * 720 },
        ];
        setActivePortal(pts);
        setIsAwaitingLockConfirmation(true);

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          setGhosts(prev => [...prev, { image: img }]);
        };
      }
    } else {
      setActivePortal(null);
      onSpecialCapture(dataUrl);
    }
  }, [onSpecialCapture, activePortal, isHandLocked, setActivePortal, setGhosts]);

  useEffect(() => {
    let timer;
    if (isSpecialMode && !isReviewing && hasStartedSession && !isAwaitingLockConfirmation) {
      if (!activePortal) {
        if (isHandLocked) {
          if (specialCountdown === null) setSpecialCountdown(3);
          timer = setInterval(() => {
            setSpecialCountdown(prev => {
              if (prev === null) return 3;
              if (prev <= 1) {
                clearInterval(timer);
                handleCapture();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setSpecialCountdown(null);
          if (timer) clearInterval(timer);
        }
      } else {
        if (specialCountdown === null) setSpecialCountdown(5);
        timer = setInterval(() => {
          setSpecialCountdown(prev => {
            if (prev === null) return 5;
            if (prev <= 1) {
              clearInterval(timer);
              handleCapture();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else if (isAwaitingLockConfirmation) {
      setSpecialCountdown(null);
      if (timer) clearInterval(timer);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isSpecialMode, isHandLocked, isReviewing, hasStartedSession, activePortal, isAwaitingLockConfirmation, handleCapture]);

  const handleConfirmLock = () => {
    setIsAwaitingLockConfirmation(false);
  };

  const handleRejectLock = () => {
    setActivePortal(null);
    setGhosts([]);
    setIsAwaitingLockConfirmation(false);
  };

  useEffect(() => {
    if (isReviewing || isAwaitingLockConfirmation) {
      setGestureCooldown(true);
      const timer = setTimeout(() => setGestureCooldown(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isReviewing, isAwaitingLockConfirmation]);

  useEffect(() => {
    if (gestureCooldown) return;

    if (isAwaitingLockConfirmation) {
      if (detectedGesture === 'THUMBS_UP') {
        handleConfirmLock();
      } else if (detectedGesture === 'PEACE') {
        handleRejectLock();
      }
    }

    if (isReviewing && isSpecialMode) {
      if (detectedGesture === 'THUMBS_UP') {
        onContinue();
      } else if (detectedGesture === 'PEACE') {
        onRetake();
      }
    }
  }, [isAwaitingLockConfirmation, isReviewing, isSpecialMode, detectedGesture, gestureCooldown, onContinue, onRetake]);

  useEffect(() => {
    // Video recording is temporarily disabled
    return;

    const targetCountdown = isSpecialMode ? specialCountdown : countdown;

    if (targetCountdown !== null && targetCountdown > 0 && !isReviewing && !mediaRecorderRef.current) {
      let stream = null;
      if (cameraStatus.source === 'dslr' || cameraStatus.source === 'phone') {
        stream = previewCanvasRef.current?.captureStream(30);
      } else if (cameraStatus.source !== 'canon') {
        // Canon uses JPEG frames — no video stream available for recording
        stream = videoRef.current?.srcObject;
      }

      if (stream) {
        try {
          chunksRef.current = [];
          const options = { mimeType: 'video/webm;codecs=vp8' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
             options.mimeType = 'video/webm';
          }

          const recorder = new MediaRecorder(stream, options);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setVideoClips(prev => {
              const next = [...prev];
              next[currentShotIndex] = blob;
              return next;
            });
            mediaRecorderRef.current = null;
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch (err) {
          console.error("Failed to start MediaRecorder:", err);
        }
      }
    }

    if ((targetCountdown === 0 || targetCountdown === null) && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [countdown, specialCountdown, isSpecialMode, isReviewing, cameraStatus.source, currentShotIndex, setVideoClips]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden font-sans bg-[#1a0f0f]">
      <style>{`
        @keyframes marquee-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marquee-vertical-reverse {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .animate-marquee-vertical {
          animation: marquee-vertical 25s linear infinite;
        }
        .animate-marquee-vertical-reverse {
          animation: marquee-vertical-reverse 25s linear infinite;
        }
        .marquee-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          white-space: nowrap;
        }
      `}</style>

      <div className={`z-10 w-full flex h-screen transition-colors duration-700 ${isSpecialMode ? 'bg-black text-pink-500' : ''}`}>
        {/* Main Viewport Area - full width, no sidebar */}
        <div className={`flex-1 relative flex flex-row overflow-hidden shadow-2xl ${isSpecialMode ? 'bg-slate-950' : 'bg-black'}`}>

          {/* Left Marquee Border */}
          <div className={`w-[50px] h-full relative overflow-hidden flex flex-col items-center flex-shrink-0 transition-colors duration-700 ${isSpecialMode ? 'bg-black border-r border-pink-500/20' : 'bg-white border-r border-slate-100'}`}>
            <div className="flex flex-col animate-marquee-vertical py-10">
              <div className="flex flex-col gap-32 mb-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`l1-${i}`} className={`marquee-text text-[11px] font-black uppercase tracking-[0.6em] transition-all duration-700 ${isSpecialMode ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-800 opacity-70'}`}>
                    {isSpecialMode ? 'RECURSION PROTOCOL' : 'LATARCERITA OFFICIAL'}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`l2-${i}`} className={`marquee-text text-[11px] font-black uppercase tracking-[0.6em] transition-all duration-700 ${isSpecialMode ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-800 opacity-70'}`}>
                    {isSpecialMode ? 'RECURSION PROTOCOL' : 'LATARCERITA OFFICIAL'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Camera Viewport - full width */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white p-8 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Masalah Kamera</h3>
                <p className="text-gray-300 max-w-md">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
                >
                  Muat Ulang Aplikasi
                </button>
              </div>
            ) : (
              cameraStatus.source === 'canon' ? (
                <img
                  ref={previewCanvasRef}
                  alt="Canon Live View"
                  className="w-full h-full object-cover z-10"
                  src={cameraStatus.lastCapturedImage || undefined}
                  style={cameraStatus?.cameraZoom && cameraStatus.cameraZoom !== 1 ? { transform: `scale(${cameraStatus.cameraZoom})` } : undefined}
                />
              ) : cameraStatus.source === 'mock' ? (
                <img
                  ref={previewCanvasRef}
                  alt="Preview"
                  className="w-full h-full object-cover z-10"
                  src={cameraStatus.lastCapturedImage || undefined}
                />
              ) : (cameraStatus.source === 'dslr' || cameraStatus.source === 'phone') ? (
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full object-cover z-10"
                  width={1280}
                  height={720}
                  style={cameraStatus?.cameraZoom && cameraStatus.cameraZoom !== 1 ? { transform: `scale(${cameraStatus.cameraZoom})` } : undefined}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover z-10 ${isSpecialMode ? 'opacity-0' : 'opacity-100'}`}
                  style={cameraStatus?.cameraZoom && cameraStatus.cameraZoom !== 1 ? { transform: `scale(${cameraStatus.cameraZoom})` } : undefined}
                />
              )
            )}

            {/* Capture failure message */}
            {captureError && !isReviewing && (
              <div className="absolute inset-x-0 bottom-6 z-[60] flex justify-center px-4">
                <div className="flex items-center gap-3 bg-red-600/90 text-white px-5 py-3 rounded-2xl shadow-xl max-w-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold">Gagal mengambil foto: {captureError}</span>
                </div>
              </div>
            )}

            {/* Phone camera connection indicator */}
            {cameraStatus.source === 'phone' && !cameraError && (
              <div className={`absolute top-6 left-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
                cameraStatus.isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}>
                <Smartphone size={14} className="flex-shrink-0" />
                {cameraStatus.isConnected ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">HP Tersambung</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Menunggu HP...</span>
                  </>
                )}
              </div>
            )}

            {isSpecialMode && !cameraError && (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-30 opacity-50" />
                <div className="absolute inset-0 opacity-10 z-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ec4899 1px, transparent 1px), linear-gradient(to bottom, #ec4899 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <canvas
                  ref={trackerCanvasRef}
                  className={`absolute inset-0 w-full h-full object-cover z-20 ${isSpecialMode ? 'opacity-100' : 'opacity-0'}`}
                  width={1280}
                  height={720}
                />
                <HandTrackerOverlay
                  videoRef={videoRef}
                  canvasRef={trackerCanvasRef}
                  isActive={isSpecialMode}
                  onStatusChange={onStatusChange}
                  ghosts={ghosts}
                  activePortal={activePortal}
                />

                {!isReviewing && hasStartedSession && (
                  <>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50 font-mono">
                      <div className="text-pink-500 text-xs tracking-[0.3em] font-bold uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">Recursive Protocol</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Activity size={10} className="text-pink-500/50" />
                        <span className="text-[9px] text-pink-500/60 tracking-widest uppercase">System: Online</span>
                      </div>
                    </div>

                    <TelemetryBox
                      title="Tactical Data"
                      data={{
                        status: activePortal ? 'PORTAL_LOCKED' : 'SCANNING',
                        hands: isHandLocked ? 'LOCKED' : 'SEARCHING',
                        timer: specialCountdown !== null ? `${specialCountdown}s` : 'IDLE',
                        depth: `LVL_${ghosts.length}`
                      }}
                      position="bottom-left"
                    />

                    <TelemetryBox
                      title="Environment"
                      data={{
                        signal: 'STABLE',
                        buffer: 'READY',
                        sync: 'ACTIVE',
                        recursion: 'ENABLED'
                      }}
                      position="bottom-right"
                    />

                    {isAwaitingLockConfirmation && (
                      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[60] font-mono w-full max-w-sm px-6">
                        <div className="p-5 border border-yellow-400/50 bg-black/80 backdrop-blur-lg flex flex-col items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center justify-between w-full border-b border-yellow-400/20 pb-2">
                            <div className="flex items-center gap-2 text-yellow-400">
                              <Target size={14} className="animate-spin-slow" />
                              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Portal Locked</span>
                            </div>
                            <span className="text-[8px] text-yellow-400/50 font-bold uppercase">Ready for sequence</span>
                          </div>

                          <p className="text-white/70 text-[9px] text-center tracking-widest uppercase leading-relaxed">
                            Coordinates stable. Execute recursive snap?
                          </p>

                          <div className="flex gap-3 w-full relative">
                            {gestureCooldown && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <span className="text-[8px] text-pink-500 font-bold uppercase tracking-widest animate-pulse">Menunggu...</span>
                              </div>
                            )}
                            <button
                              onClick={handleRejectLock}
                              className={`flex-1 py-2 border border-pink-500/30 text-pink-500 text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-pink-500 text-white scale-105' : 'hover:bg-pink-500/10'}`}
                            >
                              <span>Reset</span>
                              <span className="text-[7px] opacity-60">(Peace Sign)</span>
                            </button>
                            <button
                              onClick={handleConfirmLock}
                              className={`flex-[2] py-2 text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-yellow-400 text-black scale-105 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/30'}`}
                            >
                              <span>Execute</span>
                              <span className="text-[7px] opacity-60">(Thumbs Up)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {!hasStartedSession && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/40 backdrop-blur-sm z-30 cursor-pointer"
                onClick={onStartSession}
              >
                <div className="flex flex-col items-center gap-10 max-w-lg text-center animate-in zoom-in-95 duration-700">
                  <div className="bg-white/10 p-1 rounded-[40px] shadow-2xl backdrop-blur-md">
                    <div className="bg-white p-6 rounded-[36px] shadow-inner overflow-hidden flex items-center justify-center w-32 h-32">
                      {user?.eventLogo ? (
                        <img src={user.eventLogo} className="w-full h-full object-contain" alt="Event Logo" />
                      ) : (
                        <Camera size={56} className="text-slate-900 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h1 className="text-7xl font-black text-white tracking-tighter font-caveat drop-shadow-2xl leading-tight">
                       {user?.eventName || "Sudah Siap!!"}
                    </h1>

                    <div className="flex flex-col items-center gap-4 animate-pulse">
                      <span className="text-4xl font-black text-white tracking-widest font-caveat leading-none">
                        Ketuk Dimana Saja Untuk Memulai
                      </span>
                      <div className="h-1 w-24 bg-gradient-to-r from-transparent via-white to-transparent rounded-full opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasStartedSession && !isReviewing && (
              <>
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
                    <span className="text-[20rem] font-black text-white animate-pulse drop-shadow-[0_0_80px_rgba(255,255,255,0.6)] font-caveat leading-none">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* Cheese!! overlay — shown while camera is processing the shot */}
                {isCapturing && countdown === null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-30 animate-in fade-in duration-150">
                    {/* Flash effect */}
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
                    <div className="relative flex flex-col items-center gap-4">
                      <span
                        className="font-black text-white font-caveat leading-none select-none"
                        style={{
                          fontSize: 'clamp(6rem, 20vw, 18rem)',
                          textShadow: '0 0 60px rgba(255,255,255,0.8), 0 0 120px rgba(255,255,255,0.4)',
                          animation: 'pulse 0.4s ease-in-out infinite alternate'
                        }}
                      >
                        Cheese!!
                      </span>
                      <span className="text-white/80 text-xl font-black uppercase tracking-[0.4em] animate-pulse">
                        📸 Mengambil foto...
                      </span>
                    </div>
                  </div>
                )}

                {specialCountdown !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-500/10 backdrop-blur-[1px] z-50 font-mono">
                    <span className="text-[120px] font-bold text-yellow-400 animate-bounce leading-none drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                      {specialCountdown}
                    </span>
                    <span className="text-yellow-400 tracking-[0.5em] text-sm font-bold mt-8 animate-pulse text-center max-w-md">
                      {activePortal ? 'EXECUTING RECURSIVE SEQUENCE' : 'LOCKING PORTAL COORDINATES'}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Full-screen review: photo fills viewport, buttons overlaid at bottom */}
            {isReviewing && (
              <div className="absolute inset-0 z-40">
                <img
                  src={photos[currentShotIndex]}
                  className="w-full h-full object-cover"
                  alt="Capture Preview"
                />
                {/* Gradient overlay — visual only */}
                <div className="absolute bottom-0 inset-x-0 h-52 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                {/* Cooldown overlay */}
                {gestureCooldown && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <span className={`text-[11px] font-bold uppercase tracking-widest animate-pulse ${isSpecialMode ? 'text-pink-400' : 'text-white'}`}>Menunggu...</span>
                  </div>
                )}

                {/* ── RETAKE — pojok kiri bawah ── */}
                <button
                  onClick={onRetake}
                  className={`absolute bottom-10 left-6 z-40 w-44 flex items-center justify-center py-4 px-4 overflow-hidden font-black text-[11px] uppercase tracking-widest transition-all rounded-2xl group ${
                    isSpecialMode
                      ? detectedGesture === 'PEACE' && !gestureCooldown
                        ? 'bg-pink-500 border border-pink-500 scale-105 shadow-lg shadow-pink-500/40'
                        : 'bg-black/40 backdrop-blur-sm border border-pink-500/60'
                      : 'bg-white/10 backdrop-blur-sm border border-white/30'
                  }`}
                >
                  <span className={`absolute top-0 right-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out rounded group-hover:-mr-4 group-hover:-mt-4 ${isSpecialMode ? (detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-pink-800' : 'bg-pink-700/50') : 'bg-white/30'}`}>
                    <span className="absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 bg-white/20"></span>
                  </span>
                  <span className={`absolute bottom-0 rotate-180 left-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out rounded group-hover:-ml-4 group-hover:-mb-4 ${isSpecialMode ? (detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-pink-800' : 'bg-pink-700/50') : 'bg-white/30'}`}>
                    <span className="absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 bg-white/20"></span>
                  </span>
                  <span className={`absolute bottom-0 left-0 w-full h-full transition-all duration-500 ease-in-out delay-200 -translate-x-full rounded-2xl group-hover:translate-x-0 ${isSpecialMode ? (detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-pink-600' : 'bg-pink-500/20') : 'bg-white/20'}`}></span>
                  <span className={`relative flex items-center gap-2 transition-colors duration-200 ${isSpecialMode ? (detectedGesture === 'PEACE' && !gestureCooldown ? 'text-white' : 'text-pink-400') : 'text-white'}`}>
                    <RefreshCcw size={15} /> Ambil Ulang
                    {isSpecialMode && <span className="text-[8px] opacity-60">(Peace)</span>}
                  </span>
                </button>

                {/* ── CONTINUE — pojok kanan bawah ── */}
                <button
                  onClick={onContinue}
                  className={`absolute bottom-10 right-6 z-40 w-44 flex items-center justify-center py-4 px-4 overflow-hidden font-black text-[11px] uppercase tracking-widest transition-all rounded-2xl group ${
                    isSpecialMode
                      ? detectedGesture === 'THUMBS_UP' && !gestureCooldown
                        ? 'bg-yellow-400 border border-yellow-400 scale-105 shadow-lg shadow-yellow-400/40'
                        : 'bg-black/40 backdrop-blur-sm border border-yellow-400/60'
                      : 'bg-rose-600 shadow-xl shadow-rose-500/40'
                  }`}
                >
                  <span className={`absolute top-0 right-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out rounded group-hover:-mr-4 group-hover:-mt-4 ${isSpecialMode ? (detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-yellow-600' : 'bg-yellow-600/50') : 'bg-rose-800'}`}>
                    <span className={`absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 ${isSpecialMode && !(detectedGesture === 'THUMBS_UP' && !gestureCooldown) ? 'bg-white/20' : 'bg-white'}`}></span>
                  </span>
                  <span className={`absolute bottom-0 rotate-180 left-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out rounded group-hover:-ml-4 group-hover:-mb-4 ${isSpecialMode ? (detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-yellow-600' : 'bg-yellow-600/50') : 'bg-rose-800'}`}>
                    <span className={`absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 ${isSpecialMode && !(detectedGesture === 'THUMBS_UP' && !gestureCooldown) ? 'bg-white/20' : 'bg-white'}`}></span>
                  </span>
                  <span className={`absolute bottom-0 left-0 w-full h-full transition-all duration-500 ease-in-out delay-200 -translate-x-full rounded-2xl group-hover:translate-x-0 ${isSpecialMode ? (detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-yellow-500' : 'bg-yellow-400/20') : 'bg-red-700'}`}></span>
                  <span className={`relative flex items-center gap-2 transition-colors duration-200 ${isSpecialMode ? (detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'text-black' : 'text-yellow-400') : 'text-white'}`}>
                    Lanjutkan <ChevronRight size={15} />
                    {isSpecialMode && <span className="text-[8px] opacity-60">(Thumbs Up)</span>}
                  </span>
                </button>
              </div>
            )}

            <div className="absolute bottom-10 right-10 text-white/40 text-7xl font-black tracking-tighter font-caveat z-20 mix-blend-difference">
              {currentShotIndex + 1}/{maxCaptures}
            </div>

            {!isReviewing && hasStartedSession && (
              <button
                onClick={() => setIsSpecialMode(!isSpecialMode)}
                className={`absolute top-10 right-10 z-50 p-4 rounded-2xl border-2 transition-all duration-500 flex items-center gap-3 ${
                  isSpecialMode
                    ? 'bg-pink-500 border-pink-400 text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] scale-110'
                    : 'bg-black/20 backdrop-blur-md border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <Sparkles size={24} className={isSpecialMode ? 'animate-spin' : ''} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {isSpecialMode ? 'Special Mode ON' : 'Special Mode'}
                </span>
              </button>
            )}
          </div>

          {/* Right Marquee Border */}
          <div className={`w-[50px] h-full relative overflow-hidden flex flex-col items-center flex-shrink-0 transition-colors duration-700 ${isSpecialMode ? 'bg-black border-l border-pink-500/20' : 'bg-white border-l border-slate-100'}`}>
            <div className="flex flex-col animate-marquee-vertical-reverse py-10">
              <div className="flex flex-col gap-32 mb-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`r1-${i}`} className={`marquee-text text-[11px] font-black uppercase tracking-[0.6em] transition-all duration-700 ${isSpecialMode ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-800 opacity-70'}`}>
                    {isSpecialMode ? 'RECURSION PROTOCOL' : 'LATARCERITA OFFICIAL'}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`r2-${i}`} className={`marquee-text text-[11px] font-black uppercase tracking-[0.6em] transition-all duration-700 ${isSpecialMode ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-800 opacity-70'}`}>
                    {isSpecialMode ? 'RECURSION PROTOCOL' : 'LATARCERITA OFFICIAL'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaptureScreen
