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
  AlertCircle
} from 'lucide-react'
import DecorativeBackground from './DecorativeBackground'

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
  cameraError = null 
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      <div className="z-10 w-full max-w-7xl px-12 flex flex-col lg:flex-row gap-12 items-center h-[85vh]">
        {/* Main Viewport - Refined shadow-based style */}
        <div className="flex-1 w-full h-full bg-slate-900 rounded-[60px] overflow-hidden border-8 border-white/50 shadow-[0_40px_100px_rgba(0,0,0,0.1),0_0_80px_rgba(0,0,0,0.05)] relative group transition-all duration-1000">
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
              onClick={onStartSession}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md z-30 cursor-pointer group"
            >
              <div className="bg-blue-600 p-8 rounded-full mb-6 group-hover:scale-110 shadow-2xl transition-all duration-500">
                <Camera size={48} className="text-white animate-bounce" />
              </div>
              <h1 className="text-6xl font-black text-slate-800 mb-2 tracking-tighter font-caveat">
                 Siap untuk foto?
              </h1>
              <p className="text-lg font-black text-gradient-blue uppercase tracking-widest font-sans animate-pulse">
                 Klik dimana saja untuk mulai
              </p>
            </div>
          )}
          
          {hasStartedSession && !isReviewing && (
            <>
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 z-20">
                  <span className="text-[10rem] font-black text-white animate-pulse drop-shadow-2xl font-caveat leading-none">
                    {countdown}
                  </span>
                </div>
              )}
            </>
          )}

          {isReviewing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 animate-in fade-in zoom-in duration-500 z-40">
               <img 
                 src={photos[currentShotIndex]} 
                 className="w-full h-full object-cover" 
                 alt="Capture Preview" 
               />
               
               <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent flex flex-col items-center justify-end pb-12">
                  <h2 className="text-5xl font-black text-gradient-blue mb-8 font-caveat italic">Hasil Foto Bagus!</h2>
                  <div className="flex gap-4">
                    <button 
                      onClick={onRetake}
                      className="px-6 py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-full font-black text-xl flex items-center gap-2 hover:bg-slate-100 transition-all font-caveat"
                    >
                      <RefreshCcw size={20} /> Retake
                    </button>
                    <button 
                      onClick={onContinue}
                      className="px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xl flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all font-caveat shadow-lg shadow-blue-200"
                    >
                      Lanjutkan <ChevronRight size={20} />
                    </button>
                  </div>
               </div>
            </div>
          )}

          <div className="absolute bottom-10 right-10 text-slate-200 text-6xl font-black tracking-tighter font-caveat z-20">
            {currentShotIndex + 1}/{maxCaptures}
          </div>
        </div>

        {/* Sidebar Mini Previews */}
        <div className="w-full lg:w-56 flex lg:flex-col gap-8 pb-6 lg:pb-0 h-full overflow-visible p-6">
          {[...Array(maxCaptures)].map((_, i) => (
            <div 
              key={i} 
              className={`aspect-square rounded-[32px] border-[6px] transition-all duration-700 bg-white/80 backdrop-blur-md flex items-center justify-center overflow-hidden flex-shrink-0 ${
                i === currentShotIndex 
                  ? 'border-white scale-110 z-20 shadow-[0_20px_50px_rgba(59,130,246,0.3),0_0_30px_rgba(59,130,246,0.1)]' 
                  : photos[i] 
                    ? 'border-white opacity-100 scale-100 shadow-[0_15px_40px_rgba(0,0,0,0.1),0_0_20px_rgba(0,0,0,0.05)]' 
                    : 'border-white/40 scale-90 opacity-40'
              }`}
            >
              {photos[i] ? (
                <img src={photos[i]} className="w-full h-full object-cover" alt={`Capture ${i+1}`} />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-slate-100 font-black text-4xl font-caveat">{i + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CaptureScreen
