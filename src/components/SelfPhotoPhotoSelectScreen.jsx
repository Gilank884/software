import { useState } from 'react'
import StepWrapper from './StepWrapper'
import { CheckCircle2, Grip, Check, Images, AlertCircle } from 'lucide-react'

const SelfPhotoPhotoSelectScreen = ({ 
  photos, 
  selectedFrameData, 
  selectedPhotos, 
  setSelectedPhotos, 
  onNext 
}) => {
  // Number of slots required by the selected frame
  const requiredCount = selectedFrameData?.photo_count || 1;

  const toggleSelect = (index) => {
    setSelectedPhotos(prev => {
      const isSelected = prev.includes(index)
      if (isSelected) {
        return prev.filter(i => i !== index)
      } else {
        if (prev.length < requiredCount) {
          return [...prev, index]
        }
        return prev // already maxed
      }
    })
  }

  const isComplete = selectedPhotos.length === requiredCount;

  return (
    <StepWrapper 
      title="Curate Your Shots" 
      subtitle={`Select ${requiredCount} photos for your layout.`}
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center pb-20 mt-6 relative h-[75vh]">
        
        {/* Sticky Header Indicator */}
        <div className="sticky top-0 z-50 w-full mb-8 pt-4 pb-6 bg-slate-50/90 backdrop-blur-xl border-b border-white flex flex-col md:flex-row items-center justify-between gap-6 px-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100/50">
               <Images size={28} />
             </div>
             <div>
               <p className="text-xl font-black text-slate-800 tracking-tight">Gallery Selection</p>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                 {selectedPhotos.length} of {requiredCount} Selected
               </p>
             </div>
          </div>
          
          <button 
            onClick={onNext}
            disabled={!isComplete}
            className={`px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${isComplete ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 border-b-4 border-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none shadow-none'}`}
          >
            {isComplete ? (
              <>
                <Check size={18} />
                Continue to Filters
              </>
            ) : (
              `Pick ${requiredCount - selectedPhotos.length} More`
            )}
          </button>
        </div>

        {/* Photo Grid */}
        <div className="w-full h-full overflow-y-auto custom-scrollbar px-4 pb-12">
          {photos.length === 0 ? (
            <div className="w-full py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-300 mb-6 border-4 border-white shadow-sm">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No Photos Found</h3>
              <p className="text-slate-500 font-medium">It looks like the camera didn't capture anything.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {photos.map((photo, index) => {
                const selectedIndex = selectedPhotos.indexOf(index);
                const isSelected = selectedIndex !== -1;
                const isFull = selectedPhotos.length >= requiredCount && !isSelected;
                
                return (
                  <div 
                    key={index}
                    onClick={() => {
                       if (!isFull) toggleSelect(index);
                    }}
                    className={`relative aspect-[3/4] group rounded-3xl overflow-hidden transition-all duration-300 ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]'} ${isSelected ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-slate-50' : 'border border-slate-200 shadow-sm'}`}
                  >
                    <img src={photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Shot ${index + 1}`} />
                    
                    {/* Dim Overlay on unselected vs selected */}
                    {!isSelected && !isFull && (
                      <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}

                    {/* Selection Indicator */}
                    <div className={`absolute top-4 right-4 w-8 h-8 rounded-full border-2 flex items-center justify-center backdrop-blur-md transition-all ${isSelected ? 'bg-emerald-500 border-none text-white' : 'border-white bg-slate-900/40 text-transparent'}`}>
                       {isSelected ? (
                         <span className="font-black font-sans">{selectedIndex + 1}</span>
                       ) : (
                         <CheckCircle2 size={16} />
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </StepWrapper>
  )
}

export default SelfPhotoPhotoSelectScreen
