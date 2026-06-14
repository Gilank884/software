import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Wand2, Sparkles, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Layers, Heart, Star, ArrowLeft } from 'lucide-react'
import { QRCode } from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'
import { getFrameCache, setFrameCache } from '../lib/frameCache'

const FILTER_OPTIONS = [
  { id: 'grayscale', name: 'NOIR', class: 'grayscale', icon: Palette, color: 'from-gray-400 to-slate-900' },
  { id: 'none', name: 'ORIGINAL', class: '', icon: Wand2, color: 'from-slate-600 to-black' },
  { id: 'sepia', name: 'VINTAGE', class: 'sepia', icon: Sparkles, color: 'from-amber-400 to-orange-900' },
  { id: 'vibrant', name: 'VIVID', class: 'saturate-200 contrast-125', icon: ImageIcon, color: 'from-rose-400 to-purple-600' }
];

const CANVAS_BASE = {
  '4R': { width: 600, height: 900 },
  'A4': { width: 636, height: 900 }
};

const SLOT_COLORS = [
  { bg: 'bg-rose-50/50', text: 'text-rose-500', border: 'border-rose-100' },
  { bg: 'bg-purple-50/50', text: 'text-purple-500', border: 'border-purple-100' },
  { bg: 'bg-pink-50/50', text: 'text-pink-500', border: 'border-pink-100' },
  { bg: 'bg-amber-50/50', text: 'text-amber-500', border: 'border-amber-100' },
  { bg: 'bg-emerald-50/50', text: 'text-emerald-500', border: 'border-emerald-100' },
  { bg: 'bg-orange-50/50', text: 'text-orange-500', border: 'border-orange-100' }
];

const CustomizeScreen = ({
  mode = "frame",
  photos,
  selectedFrame,
  setSelectedFrame,
  selectedFrameData,
  setSelectedFrameData,
  selectedFilter,
  setSelectedFilter,
  onCetak,
  onNext,
  onBack,
  maxCaptures,
  setMaxCaptures,
  user,
  appMode
}) => {
  const [dbFrames, setDbFrames] = useState([])
  const [loadingFrames, setLoadingFrames] = useState(true)
  const carouselRef = useRef(null)
  const isFrameMode = mode === "frame";

  const filters = {
    none: "",
    grayscale: "grayscale",
    sepia: "sepia",
    vibrant: "saturate-200 contrast-125"
  };

  useEffect(() => {
    const loadFrames = async () => {
      if (mode !== 'frame') return
      setLoadingFrames(true)

      const applyFrames = (processedFrames) => {
        setDbFrames(processedFrames)
        if (processedFrames.length > 0 && !selectedFrameData) {
          const firstFrame = processedFrames[0]
          setSelectedFrame(firstFrame.id)
          setSelectedFrameData(firstFrame)
          const photoSlots = (firstFrame.slots || []).filter(s => s.number > 0 && s.type !== 'qr')
          const uniqueSlots = [...new Set(photoSlots.map(s => s.number))]
          const actualCount = uniqueSlots.length || firstFrame.photo_count || 3
          if (setMaxCaptures) setMaxCaptures(actualCount)
        }
        setLoadingFrames(false)
      }

      // ── Cache-first: cek localStorage sebelum fetch ke Supabase ──
      const cached = getFrameCache(user)
      if (cached && cached.length > 0) {
        console.log('[FrameCache] Menggunakan cache lokal:', cached.length, 'frame')
        applyFrames(cached)
        return
      }

      // ── Cache miss: fetch dari Supabase ──
      let query = supabase.from('frames').select('*')
      if (user?.availableFrames && user.availableFrames.length > 0) {
        query = query.in('id', user.availableFrames)
      } else if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to load frames:', error)
        setLoadingFrames(false)
      } else {
        const processedFrames = (data || []).map(f => {
          if (f.photo_count) return f
          if (f.slots && Array.isArray(f.slots)) {
            const unique = [...new Set(f.slots.map(s => s.number))]
            return { ...f, photo_count: unique.length }
          }
          return f
        })

        // Simpan ke cache untuk sesi berikutnya
        setFrameCache(user, processedFrames)
        console.log('[FrameCache] Disimpan ke cache:', processedFrames.length, 'frame')

        applyFrames(processedFrames)
      }
    }
    loadFrames()
  }, [mode, appMode, user?.id, user?.availableFrames])

  // Scroll selected item into view whenever it changes or mode changes
  useEffect(() => {
    if (!carouselRef.current) return
    const container = carouselRef.current
    const targetId = isFrameMode ? selectedFrame : selectedFilter
    
    const timer = setTimeout(() => {
      const selectedEl = container.querySelector(`[data-id="${targetId}"]`)
      if (selectedEl) {
        const scrollLeft = selectedEl.offsetLeft - container.offsetWidth / 2 + selectedEl.offsetWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedFrame, selectedFilter, mode, isFrameMode, dbFrames, loadingFrames])

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame.id)
    setSelectedFrameData(frame)
    
    // Calculate actual photo count from unique slot numbers to be robust, ignoring QR
    const photoSlots = (frame.slots || []).filter(s => s.number > 0 && s.type !== 'qr')
    const uniqueSlots = [...new Set(photoSlots.map(s => s.number))]
    const actualCount = uniqueSlots.length || frame.photo_count || 3
    if (setMaxCaptures) {
      setMaxCaptures(actualCount)
    }
  }

  const handleFilterSelect = (filterId) => {
    if (setSelectedFilter) {
      setSelectedFilter(filterId)
    }
  }

  const handlePrevItem = () => {
    if (isFrameMode) {
      if (dbFrames.length === 0) return
      const currentIndex = dbFrames.findIndex(f => f.id === selectedFrame)
      const prevIndex = (currentIndex - 1 + dbFrames.length) % dbFrames.length
      handleFrameSelect(dbFrames[prevIndex])
    } else {
      const currentIndex = FILTER_OPTIONS.findIndex(f => f.id === selectedFilter)
      const prevIndex = (currentIndex - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length
      handleFilterSelect(FILTER_OPTIONS[prevIndex].id)
    }
  }

  const handleNextItem = () => {
    if (isFrameMode) {
      if (dbFrames.length === 0) return
      const currentIndex = dbFrames.findIndex(f => f.id === selectedFrame)
      const nextIndex = (currentIndex + 1) % dbFrames.length
      handleFrameSelect(dbFrames[nextIndex])
    } else {
      const currentIndex = FILTER_OPTIONS.findIndex(f => f.id === selectedFilter)
      const nextIndex = (currentIndex + 1) % FILTER_OPTIONS.length
      handleFilterSelect(FILTER_OPTIONS[nextIndex].id)
    }
  }

  const showNavButtons = isFrameMode 
    ? dbFrames.length > 1 
    : FILTER_OPTIONS.length > 1;
  const currentFrame = selectedFrameData || dbFrames.find(f => f.id === selectedFrame)

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col z-50 overflow-hidden">
      
      {/* Background Decorative Elements - Keep it clean */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Header Section */}
      <div className="w-full flex items-center justify-between px-16 py-6 z-50 shrink-0">
        <div className="flex-1" /> {/* Left Spacer */}
        
        <div className="text-center flex-shrink-0 relative">
          <motion.h2
            key={mode}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black text-fun-gradient font-caveat drop-shadow-sm mb-2 px-8"
          >
            {isFrameMode ? (photos?.length > 0 ? "Pilih Frame Terbaikmu" : "Pilih Layout Frame") : "Pilih Filter "}
          </motion.h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-slate-200 to-slate-200 rounded-full" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">
              Geser ke samping untuk memilih
            </p>
            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-slate-200 to-slate-200 rounded-full" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={isFrameMode ? onNext : onCetak}
            className="group relative px-10 py-4 bg-gradient-to-r from-rose-600 via-purple-600 to-rose-600 text-white rounded-[24px] font-black text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(225,29,72,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-center gap-3">
              <span>{isFrameMode ? 'LANJUTKAN' : 'CETAK SEKARANG'}</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </motion.div>
      </div>

      {/* Carousel Section with Side Masks */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-0 z-10">
        
        {/* Top Decorative Divider */}
        <div className="absolute top-0 left-0 right-0 z-30 overflow-hidden py-3 bg-white/40 backdrop-blur-md border-y border-rose-100">
          <div className="flex whitespace-nowrap animate-marquee-horizontal">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-[10px] font-black text-rose-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
            {[...Array(10)].map((_, i) => (
              <span key={i + 10} className="text-[10px] font-black text-purple-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Decorative Divider */}
        <div className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden py-3 bg-white/40 backdrop-blur-md border-y border-orange-100">
          <div className="flex whitespace-nowrap animate-marquee-horizontal-reverse">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-[10px] font-black text-orange-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
            {[...Array(10)].map((_, i) => (
              <span key={i + 10} className="text-[10px] font-black text-rose-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
          </div>
        </div>

        {/* Side Masks for better focus */}
        <div className="absolute inset-y-0 left-0 w-[20vw] bg-gradient-to-r from-slate-50/90 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-[20vw] bg-gradient-to-l from-slate-50/90 to-transparent z-20 pointer-events-none" />

        {/* Left and Right Navigation Buttons */}
        {showNavButtons && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevItem}
              className="absolute left-10 z-40 p-5 rounded-full bg-white/70 backdrop-blur-md border border-rose-100/50 shadow-[0_15px_35px_rgba(225,29,72,0.15)] text-rose-500 hover:text-rose-600 hover:bg-white hover:border-rose-200 transition-colors duration-300 flex items-center justify-center cursor-pointer animate-pulse"
              style={{ animationDuration: '3s' }}
            >
              <ChevronLeft size={36} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextItem}
              className="absolute right-10 z-40 p-5 rounded-full bg-white/70 backdrop-blur-md border border-rose-100/50 shadow-[0_15px_35px_rgba(225,29,72,0.15)] text-rose-500 hover:text-rose-600 hover:bg-white hover:border-rose-200 transition-colors duration-300 flex items-center justify-center cursor-pointer animate-pulse"
              style={{ animationDuration: '3s' }}
            >
              <ChevronRight size={36} strokeWidth={2.5} />
            </motion.button>
          </>
        )}

        <div
          ref={carouselRef}
          className="w-full h-full flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar-none px-[35vw] snap-x snap-mandatory gap-20 py-8"
        >
          {isFrameMode ? (
            loadingFrames ? (
              <div className="w-full flex items-center justify-center">
                <div className="relative">
                  <Loader2 size={80} className="animate-spin text-rose-600/20" />
                  <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-600 animate-pulse" />
                </div>
              </div>
            ) : (
              dbFrames.map((frame) => (
                <motion.div
                  key={frame.id}
                  data-id={frame.id}
                  onClick={() => handleFrameSelect(frame)}
                  className={`snap-center flex-shrink-0 relative transition-all duration-700 cursor-pointer ${selectedFrame === frame.id ? 'scale-110 z-30' : 'scale-90 opacity-20 grayscale-[0.5] z-10'}`}
                  style={{ willChange: 'transform, opacity' }}
                >
                  {/* Premium Card Glow */}
                  {selectedFrame === frame.id && (
                    <motion.div
                      layoutId="frame-glow"
                      className="absolute -inset-24 bg-gradient-to-tr from-rose-400/30 via-purple-400/30 to-orange-400/30 rounded-full blur-[120px] z-0"
                    />
                  )}

                  <div className="relative z-10">
                    {(() => {
                      const base = CANVAS_BASE[frame.size_type] || CANVAS_BASE['4R'];
                      const s = 0.38;
                      return (
                        <div
                          className="relative shadow-[0_60px_120px_rgba(0,0,0,0.2)] ring-1 ring-black/5 bg-white overflow-hidden"
                          style={{ width: `${base.width * s}px`, height: `${base.height * s}px` }}
                        >
                          {frame.slots?.map((slot, i) => {
                            const isQr = slot.type === 'qr' || slot.number === 0;
                            const photo = !isQr ? photos?.[slot.number - 1] : null;
                            const colorIndex = isQr ? 5 : (slot.number - 1); // Use indigo (index 5) for QR
                            const color = SLOT_COLORS[Math.max(0, colorIndex % SLOT_COLORS.length)];
                            
                            return (
                              <div
                                key={i}
                                className={`absolute overflow-hidden ${photo ? '' : color.bg} transition-all duration-700 ${filters[selectedFilter]} border border-white/10 flex items-center justify-center`}
                                style={{
                                  left: `${slot.x * s}px`,
                                  top: `${slot.y * s}px`,
                                  width: `${slot.width * s}px`,
                                  height: `${slot.height * s}px`,
                                }}
                              >
                                {isQr ? (
                                  <div className="bg-white p-1 rounded-sm shadow-inner scale-[0.8] opacity-70">
                                    <QRCode 
                                      value="https://fotoku.latarcerita.com" 
                                      size={Math.max(10, Math.min(slot.width * s, slot.height * s) - 4)} 
                                      level="L"
                                    />
                                  </div>
                                ) : photo ? (
                                  <img src={photo} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className={`flex flex-col items-center justify-center ${color.text} animate-pulse`}>
                                    <span className="text-4xl font-black italic leading-none opacity-40">
                                      {slot.number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <div 
                            className="absolute pointer-events-none z-30"
                            style={{
                              left: `${(frame.frame_x || 0) * s}px`,
                              top: `${(frame.frame_y || 0) * s}px`,
                              width: `${(frame.frame_width || base.width) * s}px`,
                              height: `${(frame.frame_height || base.height) * s}px`,
                            }}
                          >
                            <img
                              src={frame.image_url}
                              className="w-full h-full object-contain"
                              alt={frame.name}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              ))
            )
          ) : (
            FILTER_OPTIONS.map((filter) => (
              <motion.div
                key={filter.id}
                data-id={filter.id}
                onClick={() => handleFilterSelect(filter.id)}
                className={`snap-center flex-shrink-0 relative transition-all duration-700 cursor-pointer ${selectedFilter === filter.id ? 'scale-110 z-30' : 'scale-90 opacity-20 grayscale-[0.5] z-10'}`}
                style={{ willChange: 'transform, opacity' }}
              >
                {selectedFilter === filter.id && (
                  <motion.div
                    layoutId="filter-glow"
                    className={`absolute -inset-20 bg-gradient-to-tr ${filter.color} opacity-20 rounded-full blur-[100px] z-0`}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  {(() => {
                    const base = CANVAS_BASE[currentFrame?.size_type] || CANVAS_BASE['4R'];
                    const s = 0.35;
                    return (
                      <div
                        className="relative bg-white shadow-[0_60px_120px_rgba(0,0,0,0.2)] overflow-hidden ring-1 ring-black/5"
                        style={{ width: `${base.width * s}px`, height: `${base.height * s}px` }}
                      >
                        {currentFrame?.slots?.map((slot, i) => {
                          const isQr = slot.type === 'qr' || slot.number === 0;
                          const photo = !isQr ? photos?.[slot.number - 1] : null;
                          return (
                            <div
                              key={i}
                              className={`absolute overflow-hidden transition-all duration-700 ${filter.class} border border-white/20 flex items-center justify-center bg-slate-50/10`}
                              style={{
                                left: `${slot.x * s}px`,
                                top: `${slot.y * s}px`,
                                width: `${slot.width * s}px`,
                                height: `${slot.height * s}px`,
                              }}
                            >
                              {isQr ? (
                                <div className="bg-white p-1 rounded-sm scale-[0.6] opacity-40">
                                   <QRCode 
                                     value="https://fotoku.latarcerita.com" 
                                     size={Math.max(10, Math.min(slot.width * s, slot.height * s) - 4)} 
                                     level="L"
                                   />
                                </div>
                              ) : photo ? (
                                <img src={photo} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full bg-slate-100" />
                              )}
                            </div>
                          );
                        })}

                        {currentFrame && (
                          <div 
                            className="absolute pointer-events-none z-30"
                            style={{
                              left: `${(currentFrame.frame_x || 0) * s}px`,
                              top: `${(currentFrame.frame_y || 0) * s}px`,
                              width: `${(currentFrame.frame_width || base.width) * s}px`,
                              height: `${(currentFrame.frame_height || base.height) * s}px`,
                            }}
                          >
                            <img
                              src={currentFrame.image_url}
                              className="w-full h-full object-contain"
                              alt={currentFrame.name}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full px-16 py-4 flex items-center justify-between z-50 shrink-0">
        {/* Tombol Kembali */}
        {onBack && (
          <motion.button
            whileHover={{ scale: 1.05, x: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/70 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            <ArrowLeft size={14} />
            Kembali
          </motion.button>
        )}

        <div className="flex items-center gap-3 mx-auto">
          <Heart size={14} className="text-rose-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Latarcerita Photobooth</span>
        </div>

        {/* Spacer agar tengah tetap center */}
        {onBack && <div className="w-[100px]" />}
      </div>

    </div>
  )
}

export default CustomizeScreen
