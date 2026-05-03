import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Wand2, Sparkles, Loader2, Image as ImageIcon, ChevronRight, Layers, Heart, Star } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const FILTER_OPTIONS = [
  { id: 'grayscale', name: 'NOIR', class: 'grayscale', icon: Palette, color: 'from-gray-400 to-slate-900' },
  { id: 'none', name: 'ORIGINAL', class: '', icon: Wand2, color: 'from-slate-600 to-black' },
  { id: 'sepia', name: 'VINTAGE', class: 'sepia', icon: Sparkles, color: 'from-amber-400 to-orange-900' },
  { id: 'vibrant', name: 'VIVID', class: 'saturate-200 contrast-125', icon: ImageIcon, color: 'from-rose-400 to-purple-600' }
];

const SLOT_COLORS = [
  { bg: 'bg-blue-50/50', text: 'text-blue-500', border: 'border-blue-100' },
  { bg: 'bg-purple-50/50', text: 'text-purple-500', border: 'border-purple-100' },
  { bg: 'bg-rose-50/50', text: 'text-rose-500', border: 'border-rose-100' },
  { bg: 'bg-amber-50/50', text: 'text-amber-500', border: 'border-amber-100' },
  { bg: 'bg-emerald-50/50', text: 'text-emerald-500', border: 'border-emerald-100' },
  { bg: 'bg-indigo-50/50', text: 'text-indigo-500', border: 'border-indigo-100' }
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
  maxCaptures,
  setMaxCaptures,
  user,
  appMode
}) => {
  const [dbFrames, setDbFrames] = useState([])
  const [loadingFrames, setLoadingFrames] = useState(true)
  const carouselRef = useRef(null)

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

      let query = supabase.from('frames').select('*')
      
      if (user?.availableFrames && user.availableFrames.length > 0) {
        query = query.in('id', user.availableFrames)
      } else if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to load frames:', error)
      } else {
        const processedFrames = (data || []).map(f => {
          if (f.photo_count) return f;
          if (f.slots && Array.isArray(f.slots)) {
            const unique = [...new Set(f.slots.map(s => s.number))];
            return { ...f, photo_count: unique.length };
          }
          return f;
        }).filter(f => appMode === 'self_photo' ? true : f.photo_count === maxCaptures);

        setDbFrames(processedFrames)
        if (processedFrames.length > 0 && !selectedFrameData) {
          setSelectedFrame(processedFrames[0].id)
          setSelectedFrameData(processedFrames[0])
        }
      }
      setLoadingFrames(false)
    }
    loadFrames()
  }, [mode, maxCaptures, appMode])

  useEffect(() => {
    if (mode === 'filter' && carouselRef.current) {
      const container = carouselRef.current
      const items = container.querySelectorAll('.snap-center')
      if (items.length > 1) {
        const originalItem = items[1]
        if (originalItem) {
          const containerWidth = container.offsetWidth
          const itemWidth = originalItem.offsetWidth
          const scrollLeft = originalItem.offsetLeft - (containerWidth / 2) + (itemWidth / 2)
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
        }
      }
    }
  }, [mode])

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame.id)
    setSelectedFrameData(frame)
    if (setMaxCaptures && frame.photo_count) {
      setMaxCaptures(frame.photo_count)
    }
  }

  const handleFilterSelect = (filterId) => {
    if (setSelectedFilter) {
      setSelectedFilter(filterId)
    }
  }

  const isFrameMode = mode === "frame";
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
            className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-rose-600 text-white rounded-[24px] font-black text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] overflow-hidden"
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
        <div className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden py-3 bg-white/40 backdrop-blur-md border-y border-cyan-100">
          <div className="flex whitespace-nowrap animate-marquee-horizontal-reverse">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-[10px] font-black text-cyan-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
            {[...Array(10)].map((_, i) => (
              <span key={i + 10} className="text-[10px] font-black text-blue-500/40 uppercase tracking-[1em] px-4">
                LATARCERITA OFFICIAL • PREMIUM PHOTOBOOTH • FUN TIMES •
              </span>
            ))}
          </div>
        </div>

        {/* Side Masks for better focus */}
        <div className="absolute inset-y-0 left-0 w-[20vw] bg-gradient-to-r from-slate-50/90 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-[20vw] bg-gradient-to-l from-slate-50/90 to-transparent z-20 pointer-events-none" />

        <div
          ref={carouselRef}
          className="w-full h-full flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar-none px-[35vw] snap-x snap-mandatory gap-20 py-8"
        >
          {isFrameMode ? (
            loadingFrames ? (
              <div className="w-full flex items-center justify-center">
                <div className="relative">
                  <Loader2 size={80} className="animate-spin text-blue-600/20" />
                  <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" />
                </div>
              </div>
            ) : (
              dbFrames.map((frame) => (
                <motion.div
                  key={frame.id}
                  onClick={() => handleFrameSelect(frame)}
                  className={`snap-center flex-shrink-0 relative transition-all duration-700 cursor-pointer ${selectedFrame === frame.id ? 'scale-110 z-30' : 'scale-90 opacity-20 grayscale-[0.5] z-10'}`}
                  style={{ willChange: 'transform, opacity' }}
                >
                  {/* Premium Card Glow */}
                  {selectedFrame === frame.id && (
                    <motion.div
                      layoutId="frame-glow"
                      className="absolute -inset-24 bg-gradient-to-tr from-rose-400/30 via-purple-400/30 to-cyan-400/30 rounded-full blur-[120px] z-0"
                    />
                  )}

                  <div className="relative z-10">


                    <div
                      className="relative shadow-[0_60px_120px_rgba(0,0,0,0.2)] ring-1 ring-black/5 bg-white"
                      style={{ width: `${600 * 0.38}px`, height: `${900 * 0.38}px` }}
                    >
                      {frame.slots?.map((slot, i) => {
                        const photo = photos?.[slot.number - 1];
                        const s = 0.38;
                        const color = SLOT_COLORS[(slot.number - 1) % SLOT_COLORS.length];
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
                            {photo ? (
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

                      <img
                        src={frame.image_url}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
                        alt={frame.name}
                        style={{
                          left: `${(frame.frame_x || 0) * 0.38}px`,
                          top: `${(frame.frame_y || 0) * 0.38}px`,
                          width: `${(frame.frame_width || 600) * 0.38}px`,
                          height: `${(frame.frame_height || 900) * 0.38}px`,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )
          ) : (
            FILTER_OPTIONS.map((filter) => (
              <motion.div
                key={filter.id}
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


                  <div
                    className="relative bg-white shadow-[0_60px_120px_rgba(0,0,0,0.2)] overflow-hidden ring-1 ring-black/5"
                    style={{ width: `${600 * 0.35}px`, height: `${900 * 0.35}px` }}
                  >
                    {currentFrame?.slots?.map((slot, i) => {
                      const photo = photos?.[slot.number - 1];
                      const s = 0.35;
                      return (
                        <div
                          key={i}
                          className={`absolute overflow-hidden transition-all duration-700 ${filter.class} border border-white/20`}
                          style={{
                            left: `${slot.x * s}px`,
                            top: `${slot.y * s}px`,
                            width: `${slot.width * s}px`,
                            height: `${slot.height * s}px`,
                          }}
                        >
                          {photo ? (
                            <img src={photo} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full bg-slate-100" />
                          )}
                        </div>
                      );
                    })}

                    {currentFrame && (
                      <img
                        src={currentFrame.image_url}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
                        alt={currentFrame.name}
                        style={{
                          left: `${(currentFrame.frame_x || 0) * 0.35}px`,
                          top: `${(currentFrame.frame_y || 0) * 0.35}px`,
                          width: `${(currentFrame.frame_width || 600) * 0.35}px`,
                          height: `${(currentFrame.frame_height || 900) * 0.35}px`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Status Info */}
      <div className="w-full px-16 py-4 flex items-center justify-center gap-12 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Heart size={14} className="text-rose-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Latarcerita Photobooth</span>
        </div>
      </div>

    </div>
  )
}

export default CustomizeScreen
