import { useState, useEffect, useRef } from 'react'
import { Camera, AlertCircle, Clock } from 'lucide-react'

const SelfPhotoCaptureScreen = ({ 
  videoRef, 
  durationMinutes, 
  photos, 
  setPhotos, 
  onFinish, 
  cameraError 
}) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  const [isCapturing, setIsCapturing] = useState(false) // flash effect
  const [sessionStarted, setSessionStarted] = useState(false)
  
  const canvasRef = useRef(null)

  // Start and Session Timer logic
  useEffect(() => {
    if (sessionStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setTimeout(() => onFinish(), 1000)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [sessionStarted])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && !isCapturing) {
      setIsCapturing(true)
      
      const context = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      
      // Mirror image
      context.translate(canvasRef.current.width, 0)
      context.scale(-1, 1)
      context.drawImage(videoRef.current, 0, 0)
      
      // Compress to save memory (JPEG instead of PNG, 0.6 quality)
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6)
      
      setPhotos(prev => [...prev, dataUrl])
      
      setTimeout(() => setIsCapturing(false), 200) // Flash duration
    }
  }

  // Spacebar Capture Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && sessionStarted && !isCapturing) {
        e.preventDefault()
        capturePhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionStarted, isCapturing])

  // Formatting time
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (cameraError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] p-12 text-center max-w-lg shadow-[0_20px_60px_rgba(225,29,72,0.15)] animate-in zoom-in-95 duration-500">
          <AlertCircle size={80} className="text-rose-500 mx-auto mb-6 drop-shadow-sm" />
          <h2 className="text-3xl font-black text-rose-900 mb-4 tracking-tight">Camera Error</h2>
          <p className="text-rose-600/80 mb-8 font-medium italic">{cameraError}</p>
          <div className="animate-spin w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
      
      {/* Session Controls or Header */}
      {!sessionStarted ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full text-center border ring-1 ring-white/50 shadow-[0_20px_80px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-700">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-emerald-50 text-emerald-500 mb-8 shadow-inner border border-emerald-100">
              <Camera size={50} strokeWidth={2} />
            </div>
            
            <h2 className="text-5xl font-black text-slate-800 tracking-tight mb-4">Ready?</h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 px-6">
              You have <strong className="text-slate-800">{durationMinutes} minutes</strong> in the studio. 
              Click the shutter button on screen to start capturing. Go crazy!
            </p>
            
            <button 
              onClick={() => setSessionStarted(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] py-6 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all text-center flex justify-center border-b-4 border-emerald-700 hover:border-emerald-800"
            >
              Start Studio Sesson
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-10 flex gap-4 z-40 w-full px-10 justify-between items-start pointer-events-none">
          {/* Main Timer Display */}
          <div className="bg-white/90 backdrop-blur-3xl px-8 py-5 rounded-[2rem] border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex items-center gap-4">
            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-inner ${timeLeft <= 60 ? 'bg-rose-50 text-rose-500 border border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Remaining</span>
              <span className={`text-4xl font-black tracking-tight ${timeLeft <= 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          
          {/* Shot Status & Micro Timer */}
          <div className="flex flex-col items-end gap-3">
             <div className="bg-slate-900/90 backdrop-blur-3xl px-8 py-5 rounded-[2rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col items-end">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Shots</span>
               <span className="text-3xl font-black tracking-tight text-white">{photos.length}</span>
             </div>
          </div>
        </div>
      )}

      {/* Camera Viewfinder */}
      <div className={`relative w-full max-w-4xl aspect-[4/3] rounded-[3rem] bg-slate-200 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-300 ring-8 ring-white/40 transition-all duration-300 ${isCapturing ? 'brightness-200 scale-95 ring-emerald-400' : ''}`}>
        
        {/* Flash overlay */}
        <div className={`absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150 ${isCapturing ? 'opacity-100' : 'opacity-0'}`} />

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${!sessionStarted ? 'opacity-30 blur-sm' : 'opacity-100'}`}
        />
        
        {/* Grid Overlay for framing */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-30">
          <div className="border-r border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-b border-white"></div>
          <div className="border-r border-white"></div>
          <div className="border-r border-white"></div>
          <div className=""></div>
        </div>
        
        {/* On-Screen Shutter Button */}
        {sessionStarted && (
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
             <button 
               onClick={capturePhoto}
               disabled={isCapturing}
               className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-[4px] md:border-[6px] border-white flex items-center justify-center p-1.5 md:p-2 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${isCapturing ? 'opacity-50 scale-90 bg-white/30' : 'bg-white/20 hover:bg-white/40 hover:scale-105 active:scale-95'}`}
             >
               <div className={`w-full h-full rounded-full bg-white transition-all ${isCapturing ? 'scale-75 cursor-not-allowed' : 'hover:scale-95'}`}></div>
             </button>
           </div>
        )}
      </div>

      {/* Captured Photos Filmstrip */}
      {sessionStarted && photos.length > 0 && (
        <div className="w-full max-w-6xl mt-8 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x flex-nowrap items-center">
            {photos.map((photo, i) => (
              <div key={i} className="flex-shrink-0 w-32 aspect-[4/3] rounded-xl overflow-hidden border-[3px] border-white shadow-md snap-start relative group">
                <img src={photo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Shot ${i + 1}`} />
                <div className="absolute bottom-1.5 right-1.5 bg-slate-900/60 backdrop-blur-sm text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                  {i + 1}
                </div>
              </div>
            ))}
            {/* Auto-scroll anchor */}
            <div ref={(el) => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' }) }} className="w-1 flex-shrink-0" />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

    </div>
  )
}

export default SelfPhotoCaptureScreen
