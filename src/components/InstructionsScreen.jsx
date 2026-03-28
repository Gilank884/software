import StepWrapper from './StepWrapper'
import { Laptop, Timer, Printer, ChevronRight } from 'lucide-react'

const InstructionsScreen = ({ onNext }) => (
  <StepWrapper title="How To Use" subtitle="3 simple steps to capture your joy">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {[
        { icon: <Laptop className="w-8 h-8 text-blue-500" />, title: "Pick Session", text: "Select your favorite package." },
        { icon: <Timer className="w-8 h-8 text-blue-500" />, title: "Get Ready", text: "Strike your best pose." },
        { icon: <Printer className="w-8 h-8 text-blue-500" />, title: "Collect result", text: "Receive your printed photos." }
      ].map((item, i) => (
        <div key={i} className="bg-white/80 backdrop-blur-3xl p-8 rounded-[40px] border border-white shadow-sm hover:translate-y-[-8px] transition-all duration-500 group text-center">
           <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner mx-auto">{item.icon}</div>
           <h3 className="text-2xl font-black text-slate-800 mb-3 font-caveat leading-tight">{item.title}</h3>
           <p className="text-slate-500 font-medium leading-[1.5] text-sm">{item.text}</p>
        </div>
      ))}
    </div>
    <div className="mt-8 text-center">
      <button 
        onClick={onNext}
        className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-full text-2xl font-black font-caveat tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-4 mx-auto"
      >
        Lanjut ke pembayaran <ChevronRight size={24} />
      </button>
    </div>
  </StepWrapper>
)

export default InstructionsScreen
