import StepWrapper from './StepWrapper'
import { Timer, Clock, Clock3, Clock4 } from 'lucide-react'

const SelfPhotoTimeSelectScreen = ({ onSelectDuration, durations = [5, 10, 15] }) => {
  // Map raw durations to display objects
  const options = durations.map(val => {
    let label = `${val} Mins`
    let icon = Clock
    
    if (val < 1) {
      label = `${Math.round(val * 60)} Sec`
      icon = Clock
    } else if (val >= 10 && val < 15) {
      icon = Clock3
    } else if (val >= 15) {
      icon = Clock4
    }

    return {
      value: val,
      label: label,
      icon: icon
    }
  })

  return (
    <StepWrapper title="Studio Time" subtitle="How long do you need?">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        <div className="flex flex-wrap lg:flex-nowrap justify-center gap-8 mb-12 w-full max-w-full px-10">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button 
                key={opt.value}
                onClick={() => onSelectDuration(opt.value)}
                className="group relative bg-white hover:bg-white/90 backdrop-blur-3xl border-2 border-white/50 hover:border-emerald-500 hover:shadow-[0_20px_60px_rgba(16,185,129,0.3)] rounded-3xl p-10 text-center transition-all duration-300 overflow-hidden flex flex-col items-center min-w-[280px] flex-1 max-w-[340px]"
              >
                <div className="absolute -right-10 -top-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-500 scale-150 group-hover:scale-110">
                  <Timer size={240} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 w-full flex flex-col items-center">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-emerald-100/50 group-hover:-translate-y-2 transition-transform duration-500">
                    <Icon size={48} className="group-hover:scale-110 transition-transform" />
                  </div>
                  
                  <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-2 whitespace-nowrap">{opt.label}</h3>
                  <div className="h-1.5 w-16 bg-emerald-500 rounded-full mb-8 group-hover:w-32 transition-all duration-500"></div>
                  
                  <p className="text-slate-500 font-medium text-base leading-relaxed mb-8 italic">
                    {opt.value < 1 ? 'Quick run' : 'Session duration'}
                  </p>
                  
                  <span className="inline-flex items-center justify-center gap-2 text-xs w-full font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-4 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    Start {opt.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </StepWrapper>
  )
}

export default SelfPhotoTimeSelectScreen
