import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Camera, LogOut, Settings, Printer, X } from 'lucide-react'

const StartScreen = ({ onStart, user, onLogout }) => {
  const [showExit, setShowExit] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printers, setPrinters] = useState([])
  const [isCheckingPrinters, setIsCheckingPrinters] = useState(false)
  const pressTimer = useRef(null)
  const isLongPress = useRef(false)
  const videoRef = useRef(null)

  const handlePrinterTest = (e) => {
    e.stopPropagation()
    setIsPrinting(true)
    if (window.electronAPI?.printTestPage) {
        window.electronAPI.printTestPage()
    }
    setTimeout(() => setIsPrinting(false), 5000)
  }

  const checkPrinters = async () => {
    if (!window.electronAPI?.getPrinters) return
    setIsCheckingPrinters(true)
    try {
      const printerList = await window.electronAPI.getPrinters()
      setPrinters(printerList || [])
    } catch (err) {
      console.error("Error checking printers:", err)
      setPrinters([])
    } finally {
      setIsCheckingPrinters(false)
    }
  }

  // Long press logic
  const handlePointerDown = (e) => {
    isLongPress.current = false
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setShowExit(true)
    }, 3000)
  }

  const handlePointerUp = (e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    
    // Only trigger onStart if it wasn't a long press and clicking outside the control-card
    if (!isLongPress.current && e.target.closest('.control-card') === null) {
      onStart()
    }
  }

  const handlePointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  // Camera Management for Test Modal
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      })
      setCameraStream(stream)
    } catch (err) {
      console.error("Camera Test Error:", err)
      alert("Gagal akses kamera: " + err.message)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  useEffect(() => {
    if (showCameraModal) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [showCameraModal])

  // Attach stream when video element becomes available
  useEffect(() => {
    if (cameraStream && videoRef.current) {
        videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream, showCameraModal])

  // Re-check printers whenever diagnostic menu is opened
  useEffect(() => {
    if (showExit) {
      checkPrinters()
    }
  }, [showExit])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current)
      stopCamera()
    }
  }, [])

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center cursor-pointer group px-4 relative overflow-hidden select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="z-10 text-center relative max-w-2xl w-full py-16 px-4">
        <div className="mb-6 inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-gradient-blue px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] border border-blue-100/50 shadow-lg">
          <Sparkles size={12} className="text-blue-500" fill="currentColor" /> PREMIUM PHOTOBOOTH
        </div>

        <h1 className="text-9xl font-black text-slate-800 mb-8 font-caveat relative drop-shadow-xl inline-block -rotate-3 transition-transform duration-500 group-hover/title:-rotate-1 pointer-events-none">
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [-10, 10, -10]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-12 left-16 text-blue-500 drop-shadow-lg z-20"
          >
            <Camera size={44} fill="currentColor" className="opacity-90" />
          </motion.div>
          <span className="text-gradient-blue px-4">Latar Cerita</span>
        </h1>

        <div className="flex flex-col items-center gap-4 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
          <span className="text-4xl font-black text-slate-800 tracking-widest font-caveat leading-none">
            Tekan Dimana saja Untuk Memulai
          </span>
        </div>
      </div>

      {/* Control Card (Long Press Triggered) */}
      <AnimatePresence>
        {showExit && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-10 right-10 z-[100] control-card flex flex-col gap-4 pointer-events-auto"
          >
            {/* Test Utilities Card */}
            <div className="bg-white/90 backdrop-blur-2xl border-2 border-slate-100 p-4 rounded-[32px] shadow-2xl flex flex-col gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCameraModal(true); }}
                className="flex items-center gap-4 hover:bg-blue-50 p-2 pr-6 rounded-2xl transition-all duration-300 group/btn"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all">
                  <Camera size={20} />
                </div>
                <div className="flex flex-col items-start px-2">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Diagnostic</span>
                  <span className="text-xs font-black text-slate-700">Camera Test</span>
                </div>
              </button>

              <button
                onClick={handlePrinterTest}
                className="flex items-center gap-4 hover:bg-slate-50 p-2 pr-6 rounded-2xl transition-all duration-300 group/btn relative overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${printers.length > 0 ? 'bg-indigo-100 text-indigo-600 group-hover/btn:bg-indigo-600 group-hover/btn:text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Printer size={20} />
                </div>
                <div className="flex flex-col items-start px-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${printers.length > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>Diagnostic</span>
                    {isCheckingPrinters ? (
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-ping"></span>
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${printers.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`}></span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-700">Printer 4R Test</span>
                  <span className={`text-[8px] font-bold uppercase transition-colors ${printers.length > 0 ? 'text-green-600' : 'text-rose-600'}`}>
                    {isCheckingPrinters ? 'Checking...' : printers.length > 0 ? `${printers.length} Printer Ready` : 'Printer Tidak Terbaca'}
                  </span>
                </div>
              </button>


              <div className="h-px bg-slate-100 my-1 mx-2"></div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowExit(false); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Close Menu
              </button>
            </div>

            {/* Exit Device Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onLogout?.(); }}
              className="group/logout flex items-center gap-4 bg-white/90 backdrop-blur-2xl border-2 border-rose-100 hover:border-rose-500 hover:bg-rose-50 px-6 py-4 rounded-[32px] transition-all duration-300 shadow-xl active:scale-95 cursor-pointer"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 group-hover/logout:text-white group-hover/logout:bg-rose-500 transition-all duration-300">
                <LogOut size={24} />
              </div>
              <div className="flex flex-col items-start pr-4">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Terminate</span>
                <span className="text-sm font-black text-rose-600 uppercase tracking-widest">Exit Device</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Test Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] overflow-hidden w-full max-w-2xl shadow-2xl relative border-4 border-white/20"
            >
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 font-caveat tracking-tight">Camera Diagnostic</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Checking Hardware Connection</p>
                </div>
                <button 
                  onClick={() => setShowCameraModal(false)}
                  className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="aspect-video bg-slate-900 mx-8 mb-8 rounded-[24px] overflow-hidden relative group">
                {!cameraStream ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Connecting to Camera...</span>
                  </div>
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover -scale-x-100"
                  />
                )}
                
                <div className="absolute top-6 right-6 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> LIVE
                </div>
              </div>

              <div className="px-8 pb-8 flex items-center justify-between bg-slate-50/50 pt-8 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Camera size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-600">Standard HD Stream</span>
                </div>
                <button 
                  onClick={() => setShowCameraModal(false)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                >
                  Close Test
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printing Notification */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
                <Printer size={16} />
            </div>
            <div className="flex flex-col items-start pr-4">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Printer Status</span>
                <span className="text-sm font-black text-white">Sedang Mencetak Test Page...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}

export default StartScreen
