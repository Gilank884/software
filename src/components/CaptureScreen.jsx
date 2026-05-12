import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { 
  Camera, 
  RefreshCcw, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Settings2, 
  Layout, 
  Palette,
  AlertCircle,
  Play,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Target,
  QrCode
} from 'lucide-react'
import DecorativeBackground from './DecorativeBackground'
import { motion, AnimatePresence } from 'framer-motion'
import HandTrackerOverlay from './HandTrackerOverlay'
import { QRCode } from 'react-qr-code'

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
  currentShotIndex, 
  maxCaptures, 
  photos, 
  isReviewing, 
  hasStartedSession,
  onStartSession,
  onContinue, 
  onRetake,
  cameraError = null,
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
    
    // Create flash effect
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[100] animate-pulse';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    const dataUrl = trackerCanvasRef.current.toDataURL('image/png');
    
    if (!activePortal) {
      // --- STAGE 1: LOCK PORTAL ---
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
        
        // Save current frame as a "ghost" to freeze the background
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          setGhosts(prev => [...prev, { image: img }]);
        };
      }
    } else {
      // --- STAGE 2: FINAL SNAP ---
      setActivePortal(null);
      onSpecialCapture(dataUrl);
    }
  }, [onSpecialCapture, activePortal, isHandLocked, setActivePortal, setGhosts]);

  useEffect(() => {
    let timer;
    if (isSpecialMode && !isReviewing && hasStartedSession && !isAwaitingLockConfirmation) {
      if (!activePortal) {
        // Stage 1: Waiting for hand lock
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
        // Stage 2: Portal locked AND confirmed, countdown to final snap
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
    if (gestureCooldown) return; // Ignore gestures during cooldown

    if (isAwaitingLockConfirmation) {
      if (detectedGesture === 'THUMBS_UP') {
        handleConfirmLock();
      } else if (detectedGesture === 'PEACE') {
        handleRejectLock();
      }
    }
    
    // Handle gestures during Review phase (Always active if session started)
    if (isReviewing) {
      if (detectedGesture === 'THUMBS_UP') {
        onContinue();
      } else if (detectedGesture === 'PEACE') {
        onRetake();
      }
    }
  }, [isAwaitingLockConfirmation, isReviewing, detectedGesture, gestureCooldown, onContinue, onRetake]);

  // --- VIDEO RECORDING LOGIC ---
  useEffect(() => {
    const targetCountdown = isSpecialMode ? specialCountdown : countdown;
    
    // Start recording as soon as countdown starts (T-minus 5 or 3 seconds)
    // We start earlier to ensure the recorder is "warmed up" and captures the final seconds perfectly
    if (targetCountdown !== null && targetCountdown > 0 && !isReviewing && !mediaRecorderRef.current) {
      let stream = null;
      if (cameraStatus.source === 'dslr') {
        // For DSLR, we record from the preview canvas
        stream = previewCanvasRef.current?.captureStream(30);
      } else {
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
          console.log("Started recording clip for shot", currentShotIndex);
        } catch (err) {
          console.error("Failed to start MediaRecorder:", err);
        }
      }
    }

    // Stop recording when photo is taken (countdown hits 0/null)
    if ((targetCountdown === 0 || targetCountdown === null) && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log("Stopped recording clip for shot", currentShotIndex);
    }
  }, [countdown, specialCountdown, isSpecialMode, isReviewing, cameraStatus.source, currentShotIndex, setVideoClips]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden font-sans bg-slate-900">
      {/* Dynamic Marquee CSS */}
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

      <div className={`z-10 w-full flex flex-col lg:flex-row h-screen transition-colors duration-700 ${isSpecialMode ? 'bg-black text-pink-500' : ''}`}>
        {/* Main Viewport Area */}
        <div className={`flex-1 relative flex flex-row overflow-hidden shadow-2xl ${isSpecialMode ? 'bg-slate-950' : 'bg-black'}`}>
          
          {/* Left Marquee Border - Scrolls UP */}
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

          {/* Camera Viewport */}
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
              cameraStatus.source === 'dslr' ? (
                <canvas 
                  ref={previewCanvasRef}
                  className="w-full h-full object-cover z-10"
                  width={1280}
                  height={720}
                />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] z-10 ${isSpecialMode ? 'opacity-0' : 'opacity-100'}`}
                />
              )
            )}

            {isSpecialMode && !cameraError && (
              <>
                {/* Scanline & Grid Overlays */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-30 opacity-50" />
                <div className="absolute inset-0 opacity-10 z-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ec4899 1px, transparent 1px), linear-gradient(to bottom, #ec4899 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <canvas 
                  ref={trackerCanvasRef}
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] z-20 ${isSpecialMode ? 'opacity-100' : 'opacity-0'}`}
                  width={1280}
                  height={720}
                />
                <HandTrackerOverlay 
                  videoRef={videoRef}
                  canvasRef={trackerCanvasRef}
                  isActive={isSpecialMode || isReviewing}
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-3xl z-30 cursor-pointer"
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

            {isReviewing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black animate-in fade-in zoom-in duration-500 z-40">
                 <img 
                   src={photos[currentShotIndex]} 
                   className="w-full h-full object-cover" 
                   alt="Capture Preview" 
                 />
              </div>
            )}

            <div className="absolute bottom-10 right-10 text-white/40 text-7xl font-black tracking-tighter font-caveat z-20 mix-blend-difference">
              {currentShotIndex + 1}/{maxCaptures}
            </div>

            {/* Special Feature Button */}
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

          {/* Right Marquee Border - Scrolls DOWN */}
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

        {/* Sidebar Frame Preview */}
        <div className={`w-full lg:w-[480px] flex flex-col items-center justify-center p-8 lg:p-12 shadow-2xl relative overflow-hidden transition-all duration-700 ${isSpecialMode ? 'bg-slate-950 border-l border-pink-500/30' : 'bg-white border-l border-slate-200'}`}>
          
          {/* Decorative Background Elements */}
          <div className={`absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full blur-3xl animate-pulse ${isSpecialMode ? 'bg-pink-500/20' : 'bg-blue-400/10'}`} />
          <div className={`absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full blur-3xl animate-pulse delay-1000 ${isSpecialMode ? 'bg-yellow-500/20' : 'bg-purple-400/10'}`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 ${isSpecialMode ? 'bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:30px_30px]' : 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]'}`} />

          <div className="absolute top-8 lg:top-12 text-center mb-12 z-10 font-mono">
            <h2 className={`text-4xl font-black mb-1 tracking-tight drop-shadow-sm uppercase ${isSpecialMode ? 'text-pink-500' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'}`}>
              Photo Strip
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className={`h-[2px] w-8 rounded-full ${isSpecialMode ? 'bg-pink-500/40' : 'bg-gradient-to-r from-transparent to-blue-500'}`} />
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isSpecialMode ? 'text-pink-500/60' : 'text-slate-400'}`}>
                {isSpecialMode ? 'Neural_Link' : 'Live Session'}
              </p>
              <div className={`h-[2px] w-8 rounded-full ${isSpecialMode ? 'bg-pink-500/40' : 'bg-gradient-to-l from-transparent to-purple-500'}`} />
            </div>
          </div>

          <div className="relative mt-24 lg:mt-16 group flex items-center justify-center w-full h-[60vh] z-10">
            {/* Glow behind frame */}
            <div className={`absolute inset-0 blur-2xl rounded-full scale-90 group-hover:scale-100 transition-transform duration-1000 ${isSpecialMode ? 'bg-pink-500/20' : 'bg-gradient-to-b from-blue-500/5 to-purple-500/5'}`} />
            
            {selectedFrameData ? (() => {
              // Standard resolution from database/config
              const fWidth = selectedFrameData.frame_width || 600;
              const fHeight = selectedFrameData.frame_height || 900;
              
              // Sidebar bounds
              const targetSidebarWidth = 350;
              const targetSidebarHeight = window.innerHeight * 0.6;
              
              // Calculate exact scale factor
              const scale = Math.min(targetSidebarWidth / fWidth, targetSidebarHeight / fHeight);
              
              return (
                <div 
                  className={`relative overflow-hidden transition-all duration-700 bg-white ${isSpecialMode ? 'shadow-[0_0_50px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50' : 'shadow-[0_40px_100px_rgba(0,0,0,0.25)] ring-1 ring-black/5'}`}
                  style={{
                    width: `${fWidth * scale}px`,
                    height: `${fHeight * scale}px`,
                  }}
                >
                  {/* Internal coordinate system at 1:1 scale */}
                  <div 
                    style={{ 
                      width: `${fWidth}px`, 
                      height: `${fHeight}px`, 
                      transform: `scale(${scale})`, 
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                  >
                    {/* Photo slots */}
                    {selectedFrameData.slots?.map((slot, i) => {
                      const photo = photos?.[slot.number - 1];
                      
                      return (
                        <div
                          key={i}
                          className={`absolute overflow-hidden ${photo ? '' : 'bg-slate-50'} transition-all duration-700 flex items-center justify-center`}
                          style={{
                            left: `${slot.x}px`,
                            top: `${slot.y}px`,
                            width: `${slot.width}px`,
                            height: `${slot.height}px`,
                            zIndex: 10
                          }}
                        >
                          {photo ? (
                            <img src={photo} className="w-full h-full object-cover animate-in fade-in zoom-in duration-700" alt="" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                              <div className="absolute inset-0 bg-[radial-gradient(#d4a373_1px,transparent_1px)] [background-size:10px_10px] opacity-10" />
                              {slot.type === 'qr' || slot.number === 0 ? (
                                <div className="bg-white p-2 rounded-sm shadow-inner opacity-80 group-hover:opacity-100 transition-opacity">
                                  <QRCode 
                                    value="https://fotoku.latarcerita.com" 
                                    size={Math.max(10, Math.min(slot.width, slot.height) - 40)}
                                    level="L"
                                  />
                                </div>
                              ) : (
                                <span className="text-amber-900/20 font-black text-8xl font-caveat relative z-10">{slot.number}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Frame overlay */}
                    <img
                      src={selectedFrameData.image_url}
                      className="absolute pointer-events-none"
                      alt={selectedFrameData.name}
                      style={{
                        left: `${(selectedFrameData.frame_x || 0)}px`,
                        top: `${(selectedFrameData.frame_y || 0)}px`,
                        width: `${(selectedFrameData.frame_width || 600)}px`,
                        height: `${(selectedFrameData.frame_height || 900)}px`,
                        zIndex: 20
                      }}
                    />
                  </div>
                </div>
              );
            })() : (
              <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Layout size={48} className="text-slate-200 mb-4" />
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Pilih Frame Dahulu</span>
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-16 w-full max-w-[340px] flex flex-col gap-6 z-10">
             {isReviewing ? (
               isSpecialMode ? (
                 <div className="p-6 rounded-3xl border border-pink-500/30 bg-black/40 backdrop-blur-md font-mono flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-2">
                      <h3 className="text-pink-500 text-[10px] font-bold tracking-[0.4em] uppercase mb-1">Neural Review</h3>
                      <p className="text-white/40 text-[8px] tracking-widest uppercase">Select action via gesture</p>
                    </div>
                    <div className="flex gap-3 relative">
                      {gestureCooldown && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
                          <span className="text-[10px] text-pink-500 font-bold uppercase tracking-widest animate-pulse">Menunggu...</span>
                        </div>
                      )}
                      <button 
                        onClick={onRetake}
                        className={`flex-1 py-4 border transition-all flex flex-col items-center gap-1 rounded-2xl ${detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-pink-500 border-pink-500 text-white scale-105' : 'border-pink-500/30 text-pink-500 hover:bg-pink-500/10'}`}
                      >
                        <RefreshCcw size={16} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Retake</span>
                        <span className="text-[7px] opacity-60">(Peace)</span>
                      </button>
                      <button 
                        onClick={onContinue}
                        className={`flex-[1.5] py-4 border transition-all flex flex-col items-center gap-1 rounded-2xl ${detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-yellow-400 border-yellow-400 text-black scale-105 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10'}`}
                      >
                        <Check size={16} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Next</span>
                        <span className="text-[7px] opacity-60">(Thumbs)</span>
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-row gap-3 animate-in slide-in-from-bottom-4 duration-500 relative">
                    {gestureCooldown && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Menunggu...</span>
                      </div>
                    )}
                    <button 
                      onClick={onRetake}
                      className={`flex-1 py-4 border rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${detectedGesture === 'PEACE' && !gestureCooldown ? 'bg-slate-800 border-slate-800 text-white scale-105' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-95'}`}
                    >
                      <div className="flex items-center gap-2"><RefreshCcw size={14} /> Retake</div>
                      <span className="text-[7px] opacity-60">(Peace)</span>
                    </button>
                    <button 
                      onClick={onContinue}
                      className={`flex-[2.5] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all shadow-xl shadow-blue-500/25 ${detectedGesture === 'THUMBS_UP' && !gestureCooldown ? 'bg-gradient-to-r from-blue-800 to-indigo-800 text-white scale-105' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95'}`}
                    >
                      <div className="flex items-center gap-2">Lanjutkan <ChevronRight size={16} /></div>
                      <span className="text-[7px] opacity-80">(Thumbs Up)</span>
                    </button>
                 </div>
               )
             ) : (
                <div className={`p-6 rounded-3xl border transition-all duration-700 font-mono ${isSpecialMode ? 'bg-black/40 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.1)]' : 'bg-slate-50/50 border-slate-100 shadow-sm'}`}>
                  <div className={`flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] mb-4 ${isSpecialMode ? 'text-pink-500' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isSpecialMode ? 'bg-yellow-400' : 'bg-blue-500'}`} />
                       {isSpecialMode ? 'Buffer_Status' : 'Progres Sesi'}
                    </span>
                    <span className={`tabular-nums ${isSpecialMode ? 'text-yellow-400' : 'text-blue-600'}`}>{photos.filter(p => p).length} / {maxCaptures}</span>
                  </div>
                  <div className={`h-4 w-full rounded-full overflow-hidden p-1 shadow-inner ${isSpecialMode ? 'bg-slate-900 border border-pink-500/20' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${isSpecialMode ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500' : 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500'}`} 
                      style={{ width: `${(photos.filter(p => p).length / maxCaptures) * 100}%` }}
                    />
                  </div>
                  <p className={`mt-4 text-center text-[9px] font-bold uppercase tracking-widest opacity-60 ${isSpecialMode ? 'text-pink-500/60' : 'text-slate-400'}`}>
                    {isSpecialMode ? 'Optimizing Neural Layers...' : `Ambil ${maxCaptures} pose terbaikmu!`}
                  </p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaptureScreen
