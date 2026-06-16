import { useState, useEffect } from 'react'
import { CheckCircle2, RefreshCcw, ScanLine, Printer, Sparkles, Heart, Star, PartyPopper, X, WifiOff } from 'lucide-react'
import { QRCode } from 'react-qr-code'
import { AnimatePresence, motion } from 'framer-motion'
import StepWrapper from './StepWrapper'

const OutputScreen = ({ galleryData, onReset, onAddPrint }) => {
  const [activeMedia, setActiveMedia] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const galleryBase = import.meta.env.VITE_GALLERY_URL || (import.meta.env.DEV ? window.location.origin : "https://fotoku.latarcerita.com");

  const galleryUrl = galleryData?.sessionId
    ? `${galleryBase}/?gallery=${galleryData.sessionId}`
    : galleryBase;

  const isOfflinePending = galleryData?.offline === true

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <StepWrapper title="" subtitle="">
      {/* Top Right Action: Reprint Button */}
      <div className="fixed top-8 right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={onAddPrint}
          className="w-16 h-16 bg-white/80 backdrop-blur-md border-2 border-slate-100 text-slate-800 rounded-2xl flex items-center justify-center shadow-lg hover:border-rose-500 hover:text-rose-600 transition-all group"
          title="Cetak Lagi"
        >
          <Printer size={28} className="group-hover:scale-110 transition-transform" />
          <div className="absolute -bottom-10 right-0 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cetak Lagi</span>
          </div>
        </motion.button>
      </div>
      {/* Decorative Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-[10%] left-[5%] text-rose-300/30"><Heart size={48} /></motion.div>
        <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} className="absolute bottom-[10%] right-[5%] text-orange-300/30"><Sparkles size={56} /></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[20%] right-[15%] text-amber-300/20"><Star size={40} /></motion.div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute bottom-[20%] left-[15%] text-purple-300/20"><PartyPopper size={44} /></motion.div>
        
        {/* Soft Background Glows */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-rose-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange-400/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full flex flex-col md:flex-row items-center gap-2 py-2 h-full relative z-10">
        
        {/* Leftmost: QR Code Panel — selalu tampil */}
        <div className="flex flex-col items-center justify-center transition-all duration-1000 pl-12 shrink-0 z-10">
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-700">

            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-200">
              <ScanLine size={28} />
            </div>

            {/* QR selalu tampil — gallery page yang handle state pending */}
            <div className="bg-white p-3 rounded-2xl border-4 border-slate-50 shadow-sm mb-4 relative">
              <QRCode
                value={galleryUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
              {/* Badge pending tipis di atas QR saat offline */}
              {isOfflinePending && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-400 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  <WifiOff size={10} /> Akan tersedia saat online
                </div>
              )}
            </div>

            <h3 className="text-5xl font-black text-fun-gradient tracking-tight text-center mb-1 font-caveat drop-shadow-sm px-4">Scan Here!</h3>

            {isOfflinePending ? (
              <p className="text-amber-500 text-sm font-bold text-center font-sans mb-6 animate-pulse">
                {isOnline ? 'Sedang mengirim foto...' : 'Foto akan muncul saat jaringan tersedia'}
              </p>
            ) : (
              <p className="text-slate-500 text-sm font-medium text-center animate-pulse mb-6">Get all your photos!</p>
            )}

            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={onReset}
                className="w-full px-10 py-4 bg-slate-900 text-white rounded-[20px] font-black font-sans uppercase text-sm tracking-[0.2em] shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-4 group"
              >
                Finish <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-1000" />
              </button>
              <p className="text-center mt-2 text-slate-400 font-sans font-bold text-[8px] uppercase tracking-[0.3em] animate-pulse">
                Thank you for using Latarcerita
              </p>
            </div>
          </div>
        </div>

        {/* Divider: Full Height Vertical Marquee Divider (In Flow) */}
        <div className="hidden md:flex relative w-12 shrink-0 h-20 mx-12 z-0">
          <div className="absolute top-[-50vh] bottom-[-50vh] left-0 right-0 w-full flex items-center justify-center overflow-hidden border-x-2 border-rose-500/20 bg-slate-50/30">
            <div className="flex flex-col whitespace-nowrap animate-marquee-vertical">
              {[...Array(40)].map((_, i) => (
                <span key={i} className="text-[10px] font-black text-fun-gradient uppercase tracking-[0.5em] py-4 [writing-mode:vertical-lr] rotate-180">
                  LATARCERITA • SCAN QR • DOWNLOAD •
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Success Message & Detailed Previews */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 font-caveat pr-8 z-10 overflow-hidden">
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl font-black text-fun-gradient mb-4 drop-shadow-sm px-4"
          >
            Fotomu sudah siap!
          </motion.h2>

          {galleryData?.compositeUrl ? (
            <div className="flex flex-row items-center gap-6 p-2">
              {/* Column 1: Raw Photos (Stacked Vertically) */}
              <div className="flex flex-col gap-3">
                {galleryData?.rawPhotos?.map((url, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group/raw cursor-zoom-in"
                    onClick={() => setActiveMedia({ type: 'image', url })}
                  >
                    <div className="bg-white p-2 rounded-lg shadow-md border border-slate-100 transform transition-transform group-hover/raw:scale-110 group-hover/raw:rotate-2">
                      <img 
                        src={url} 
                        alt={`Capture ${idx + 1}`} 
                        className="w-40 h-auto rounded-md object-cover aspect-[4/3]"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Column 2: Final Framed Photo */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group/framed cursor-zoom-in"
                onClick={() => setActiveMedia(galleryData.videoUrl ? { type: 'video', url: galleryData.videoUrl } : { type: 'image', url: galleryData.compositeUrl })}
              >
                <div className="absolute -inset-4 bg-gradient-to-tr from-rose-400/20 via-purple-400/20 to-cyan-400/20 rounded-[2rem] blur-2xl opacity-0 group-hover/framed:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white p-2 rounded-[1.5rem] shadow-2xl border border-slate-100 overflow-hidden transform transition-transform group-hover/framed:scale-105 duration-500">
                  {galleryData.videoUrl ? (
                    <video 
                      src={galleryData.videoUrl} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className="w-full max-w-[320px] h-auto rounded-[1.2rem]"
                    />
                  ) : (
                    <img 
                      src={galleryData.compositeUrl} 
                      alt="Final Framed Result" 
                      className="w-full max-w-[320px] h-auto rounded-[1.2rem]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/framed:opacity-100 transition-opacity" />
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -top-3 -right-3 bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <CheckCircle2 size={20} />
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-lg shadow-green-200 relative z-10">
              <CheckCircle2 size={40} />
            </div>
          )}

          {galleryData?.compositeUrl && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-4xl font-black text-slate-700 font-caveat"
            >
              Terima Kasih!
            </motion.p>
          )}
          
          {!galleryData?.compositeUrl && (
            <>
              <h3 className="text-5xl font-black text-slate-900 mb-2 tracking-tight relative z-10">Success!</h3>
              <p className="text-gradient-red font-black uppercase tracking-widest font-sans text-[10px] relative z-10">Printing in progress</p>
            </>
          )}
        </div>
      </div>

      {/* Premium Media Zoom Popup */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMedia(null)}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 cursor-zoom-out"
          >
            {/* Close Button */}
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveMedia(null);
              }}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-lg backdrop-blur-md"
            >
              <X size={24} />
            </motion.button>

            {/* Media Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-[90vw] max-h-[80vh] bg-white p-3 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex items-center justify-center"
            >
              {activeMedia.type === 'video' ? (
                <video
                  src={activeMedia.url}
                  autoPlay
                  loop
                  controls
                  playsInline
                  className="rounded-[1.5rem] max-w-full max-h-[75vh] object-contain shadow-inner"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt="Expanded Photo Preview"
                  className="rounded-[1.5rem] max-w-full max-h-[75vh] object-contain shadow-inner"
                />
              )}
            </motion.div>

            {/* Subtle Hint */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-white/60 text-xs font-sans font-bold uppercase tracking-[0.2em] pointer-events-none"
            >
              Click anywhere to close preview
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </StepWrapper>
  )
}

export default OutputScreen
