import { useState, useEffect } from 'react'
import StepWrapper from './StepWrapper'
import { Palette, Wand2, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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
  user
}) => {
  const [dbFrames, setDbFrames] = useState([])
  const [loadingFrames, setLoadingFrames] = useState(true)

  const filters = {
    none: "",
    grayscale: "grayscale",
    sepia: "sepia",
    vibrant: "saturate-200 contrast-125"
  };

  // Load frames from Supabase filtered by slot_count
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
        }).filter(f => f.photo_count === maxCaptures);

        setDbFrames(processedFrames)
        // Auto-select first frame if none selected
        if (processedFrames.length > 0 && !selectedFrameData) {
          setSelectedFrame(processedFrames[0].id)
          setSelectedFrameData(processedFrames[0])
        }
      }
      setLoadingFrames(false)
    }
    loadFrames()
  }, [mode, maxCaptures])

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame.id)
    setSelectedFrameData(frame)
  }

  const currentFrame = selectedFrameData || dbFrames.find(f => f.id === selectedFrame)
  const isFrameMode = mode === "frame";

  return (
    <StepWrapper
      title={isFrameMode ? "Pilih Frame Terbaikmu" : "Pilih Filter Favoritmu"}
      subtitle={""}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-6xl mx-auto py-10 h-[80vh]">
        {/* Left: Frame Preview */}
        <div className="lg:col-span-7 flex justify-center sticky top-20">
          <div
            className="relative transition-transform duration-1000 animate-float drop-shadow-2xl"
            style={{
              width: `${600 * 0.6}px`,
              height: `${900 * 0.6}px`,
              backgroundColor: 'transparent'
            }}
          >
            {/* Photo slots with absolute positioning */}
            {currentFrame?.slots?.map((slot, i) => {
              if (slot.number > maxCaptures) return null;
              const photo = photos[slot.number - 1];
              const s = 0.6;
              return (
                <div
                  key={i}
                  className={`absolute overflow-hidden bg-transparent transition-all duration-500 hover:z-20 group/slot ${filters[selectedFilter]} drop-shadow-md group-hover:drop-shadow-2xl`}
                  style={{
                    left: `${slot.x * s}px`,
                    top: `${slot.y * s}px`,
                    width: `${slot.width * s}px`,
                    height: `${slot.height * s}px`,
                    borderRadius: '2px',
                  }}
                >
                  {photo ? (
                    <img src={photo} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" alt={`Slot ${slot.number}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-2xl animate-pulse">
                      {slot.number}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Frame overlay */}
            {currentFrame && (
              <img
                src={currentFrame.image_url}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
                alt="Frame overlay"
                style={{
                  left: `${(currentFrame.frame_x || 0) * 0.6}px`,
                  top: `${(currentFrame.frame_y || 0) * 0.6}px`,
                  width: `${(currentFrame.frame_width || 600) * 0.6}px`,
                  height: `${(currentFrame.frame_height || 900) * 0.6}px`,
                }}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6 font-caveat">
          <div className="flex flex-col h-[55vh] overflow-hidden bg-white/50 backdrop-blur-3xl px-8 py-8 rounded-[40px] border border-white shadow-[0_0_80px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.03)]">
            {isFrameMode ? (
              <div className="flex flex-col h-full translate-z-0">
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                  <div className="relative flex-shrink-0">
                    <h3 className="text-4xl font-black flex items-center gap-4 italic mb-1">
                      <Palette size={32} className="text-blue-500" />
                      <span className="text-gradient-blue inline-block pr-6">Frames</span>
                    </h3>
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-400/10 via-blue-500/30 to-blue-400/10 rounded-full"></div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mx-4 px-4 custom-scrollbar">
                  {loadingFrames ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>
                  ) : dbFrames.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">Belum ada frame.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-10 gap-y-16 pt-12 pb-24 px-4">
                      {dbFrames.map((frame, idx) => (
                        <button
                          key={frame.id}
                          onClick={() => handleFrameSelect(frame)}
                          className={`relative aspect-[3/4] transition-all duration-500 ${selectedFrame === frame.id ? 'scale-110 z-10' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                        >
                          <img
                            src={frame.image_url}
                            className={`w-full h-full object-contain drop-shadow-md transition-all ${selectedFrame === frame.id ? 'drop-shadow-[0_10px_15px_rgba(59,130,246,0.3)]' : ''}`}
                            alt={frame.name}
                          />
                          {selectedFrame === frame.id && (
                            <div className="absolute -bottom-2 translate-y-full left-1/2 -translate-x-1/2 text-[10px] font-black text-gradient-blue uppercase tracking-widest whitespace-nowrap bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100 animate-bounce">
                              Selected
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full translate-z-0">
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                  <div className="relative flex-shrink-0">
                    <h3 className="text-4xl font-black flex items-center gap-4 italic mb-1">
                      <Wand2 size={32} className="text-blue-500" />
                      <span className="text-gradient-blue inline-block pr-6">Filters</span>
                    </h3>
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-400/10 via-blue-500/30 to-blue-400/10 rounded-full"></div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mx-4 px-4 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-16 pt-12 pb-24 px-4">
                    {Object.keys(filters).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedFilter(filter)}
                        className={`group relative p-2.5 rounded-[32px] font-black transition-all overflow-hidden flex flex-col items-center gap-2.5 ${selectedFilter === filter ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 hover:scale-[1.02]'}`}
                      >
                        <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-slate-100 relative group-hover:rotate-1 transition-transform duration-500 shadow-inner">
                          {photos && photos[0] ? (
                            <img
                              src={photos[0]}
                              className={`w-full h-full object-cover ${filters[filter]}`}
                              alt={filter}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                              <ImageIcon size={24} className="opacity-20" />
                            </div>
                          )}
                          <div className="absolute inset-0 border border-black/5 pointer-events-none rounded-[24px]"></div>
                        </div>
                        <div className="relative z-10 flex flex-col items-center gap-0.5 pb-2">
                          <span className="capitalize text-lg tracking-tight">{filter === 'none' ? 'Natural' : filter}</span>
                          <span className="text-[8px] opacity-60 font-bold uppercase tracking-[0.2em]">{selectedFilter === filter ? 'Active' : 'Select'}</span>
                        </div>
                        {selectedFilter === filter && (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-700/10 pointer-events-none"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={isFrameMode ? onNext : onCetak}
            className="w-full py-2.5 bg-slate-900 text-white rounded-2xl font-black text-2xl tracking-widest shadow-lg hover:bg-blue-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-4 group flex-shrink-0"
          >
            {isFrameMode ? 'Lanjutkan' : 'Cetak Hasil'} <Sparkles size={24} className="group-hover:rotate-12 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </StepWrapper>
  )
}

export default CustomizeScreen
