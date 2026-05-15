import StepWrapper from './StepWrapper'
import { MonitorPlay, TimerReset } from 'lucide-react'

const ModeSelectScreen = ({ onSelect }) => {
  return (
    <StepWrapper title="Select Mode" subtitle="Choose your photo experience">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 justify-center items-stretch mt-10">

        {/* Photobooth Mode */}
        <button
          onClick={() => onSelect('photobooth')}
          className="group relative flex-1 bg-white hover:bg-white/90 backdrop-blur-xl border-4 border-white/50 hover:border-rose-500 hover:shadow-[0_20px_60px_rgba(225,29,72,0.3)] rounded-[3rem] p-10 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-500 scale-150 group-hover:scale-110">
            <MonitorPlay size={300} strokeWidth={1} />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-rose-100/50 group-hover:-translate-y-2 transition-transform duration-500">
              <MonitorPlay size={40} className="group-hover:scale-110 transition-transform" />
            </div>

            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Photobooth</h3>
            <div className="h-1 w-12 bg-rose-500 rounded-full mb-6 group-hover:w-24 transition-all duration-500"></div>

            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Experience the classic photobox feeling. Quick captures perfectly suited for premium frame layouts. Guaranteed fun in a quick session.
            </p>

            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-4 py-2 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
              Standard Mode &rarr;
            </span>
          </div>
        </button>

        {/* Self Photo Mode */}
        <button
          onClick={() => onSelect('self_photo')}
          className="group relative flex-1 bg-white hover:bg-white/90 backdrop-blur-xl border-4 border-white/50 hover:border-emerald-500 hover:shadow-[0_20px_60px_rgba(16,185,129,0.3)] rounded-[3rem] p-10 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-500 scale-150 group-hover:scale-110">
            <TimerReset size={300} strokeWidth={1} />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-emerald-100/50 group-hover:-translate-y-2 transition-transform duration-500">
              <TimerReset size={40} className="group-hover:scale-110 transition-transform" />
            </div>

            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Self Photo</h3>
            <div className="h-1 w-12 bg-emerald-500 rounded-full mb-6 group-hover:w-24 transition-all duration-500"></div>

            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Freedom to strike any pose, over and over! Reserve the camera for a set duration, snap multiple photos, and hand-pick your absolute favorites.
            </p>

            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              Studio Mode &rarr;
            </span>
          </div>
        </button>

      </div>
    </StepWrapper>
  )
}

export default ModeSelectScreen
