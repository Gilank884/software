import { useMemo } from 'react'
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
  Play
} from 'lucide-react'
import DecorativeBackground from './DecorativeBackground'
import { motion } from 'framer-motion'

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
  user
}) => {
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

      <div className="z-10 w-full flex flex-col lg:flex-row h-screen">
        {/* Main Viewport Area */}
        <div className="flex-1 bg-black relative flex flex-row overflow-hidden shadow-2xl">
          
          {/* Left Marquee Border - Scrolls UP */}
          <div className="w-[50px] h-full bg-white border-r border-slate-100 relative overflow-hidden flex flex-col items-center flex-shrink-0">
            <div className="flex flex-col animate-marquee-vertical py-10">
              <div className="flex flex-col gap-32 mb-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`l1-${i}`} className="marquee-text text-[11px] font-black text-slate-800 uppercase tracking-[0.6em] opacity-70">
                    LATARCERITA OFFICIAL
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`l2-${i}`} className="marquee-text text-[11px] font-black text-slate-800 uppercase tracking-[0.6em] opacity-70">
                    LATARCERITA OFFICIAL
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
                  className="w-full h-full object-cover scale-x-[-1] z-10"
                />
              )
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
          </div>

          {/* Right Marquee Border - Scrolls DOWN */}
          <div className="w-[50px] h-full bg-white border-l border-slate-100 relative overflow-hidden flex flex-col items-center flex-shrink-0">
            <div className="flex flex-col animate-marquee-vertical-reverse py-10">
              <div className="flex flex-col gap-32 mb-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`r1-${i}`} className="marquee-text text-[11px] font-black text-slate-800 uppercase tracking-[0.6em] opacity-70">
                    LATARCERITA OFFICIAL
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-32">
                {[...Array(4)].map((_, i) => (
                  <span key={`r2-${i}`} className="marquee-text text-[11px] font-black text-slate-800 uppercase tracking-[0.6em] opacity-70">
                    LATARCERITA OFFICIAL
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Frame Preview */}
        <div className="w-full lg:w-[480px] bg-white flex flex-col items-center justify-center p-8 lg:p-12 shadow-2xl relative overflow-hidden border-l border-slate-200">
          
          {/* Decorative Background Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

          <div className="absolute top-8 lg:top-12 text-center mb-12 z-10">
            <h2 className="text-5xl font-black mb-1 font-caveat tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
              Photo Strip
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[2px] w-8 bg-gradient-to-r from-transparent to-blue-500 rounded-full" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Live Session</p>
              <div className="h-[2px] w-8 bg-gradient-to-l from-transparent to-purple-500 rounded-full" />
            </div>
          </div>

          <div className="relative mt-24 lg:mt-16 group flex items-center justify-center w-full h-[60vh] z-10">
            {/* Glow behind frame */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 blur-2xl rounded-full scale-90 group-hover:scale-100 transition-transform duration-1000" />
            
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
                  className="relative shadow-[0_40px_100px_rgba(0,0,0,0.25)] bg-white overflow-hidden ring-1 ring-black/5"
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
                              <span className="text-amber-900/20 font-black text-8xl font-caveat relative z-10">{slot.number}</span>
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
               <div className="flex flex-row gap-3 animate-in slide-in-from-bottom-4 duration-500">
                  <button 
                    onClick={onRetake}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all shadow-sm"
                  >
                    <RefreshCcw size={14} /> Retake
                  </button>
                  <button 
                    onClick={onContinue}
                    className="flex-[2.5] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/25"
                  >
                    Lanjutkan <ChevronRight size={16} />
                  </button>
               </div>
             ) : (
               <div className="bg-slate-50/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                    <span className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                       Progres Sesi
                    </span>
                    <span className="text-blue-600 tabular-nums">{photos.filter(p => p).length} / {maxCaptures}</span>
                 </div>
                 <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-lg" 
                      style={{ width: `${(photos.filter(p => p).length / maxCaptures) * 100}%` }}
                    />
                 </div>
                 <p className="mt-4 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                    Ambil {maxCaptures} pose terbaikmu!
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
