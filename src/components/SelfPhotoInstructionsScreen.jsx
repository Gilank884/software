import StepWrapper from './StepWrapper'
import { Camera, LayoutGrid, Timer } from 'lucide-react'

const SelfPhotoInstructionsScreen = ({ onNext }) => {
  return (
    <StepWrapper title="How to Start Your Shoot" subtitle="Follow these simple steps">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        <div className="flex flex-col md:flex-row gap-6 mb-12 w-full justify-center">
          
          <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] p-8 flex-1 border border-white max-w-sm text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-500">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
              <Timer size={28} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">1. Select Duration</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
              Choose between 5, 10, or 15 minutes of uninterrupted studio time.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] p-8 flex-1 border border-white max-w-sm text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-500">
            <div className="w-16 h-16 rounded-3xl bg-blue-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
              <Camera size={28} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">2. Strike a Pose</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
              Camera automatically takes a snap every 3 seconds for the entire duration!
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] p-8 flex-1 border border-white max-w-sm text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-500">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
              <LayoutGrid size={28} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">3. Curate & Print</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
              After time is up, pick a frame layout and select your best shots to print!
            </p>
          </div>
          
        </div>

        <button 
          onClick={onNext}
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all w-full max-w-md hover:bg-black"
        >
          I Understand, Let's Go
        </button>

      </div>
    </StepWrapper>
  )
}

export default SelfPhotoInstructionsScreen
