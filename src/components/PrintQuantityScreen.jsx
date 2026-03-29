import StepWrapper from './StepWrapper'
import { Printer, Minus, Plus, Images } from 'lucide-react'

const PrintQuantityScreen = ({ quantity, setQuantity, onNext }) => {
  const increment = () => setQuantity(prev => Math.min(prev + 1, 10))
  const decrement = () => setQuantity(prev => Math.max(prev - 1, 1))

  return (
    <StepWrapper title="Print Order" subtitle="How many physical copies do you want?">
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-10">
        
        <div className="bg-white/80 backdrop-blur-3xl rounded-[3rem] p-12 border-2 border-white/50 shadow-[0_30px_80px_rgba(0,0,0,0.05)] w-full text-center relative overflow-hidden">
          
          <div className="absolute -right-20 -bottom-20 opacity-[0.03] scale-150 pointer-events-none">
            <Printer size={300} strokeWidth={1} />
          </div>

          <div className="relative z-10">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner border border-blue-100 mx-auto mb-10">
              <Images size={40} className="drop-shadow-sm" />
            </div>

            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Print Quantity</h3>
            <p className="text-slate-500 font-medium mb-10">
              Select the number of high-quality photo prints you'd like to take home.
            </p>

            <div className="flex items-center justify-center gap-8 mb-12">
              <button 
                onClick={decrement}
                disabled={quantity <= 1}
                className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                <Minus size={24} strokeWidth={3} />
              </button>
              
              <div className="w-32 h-32 rounded-[2rem] bg-blue-50 text-blue-600 border border-blue-100 shadow-inner flex flex-col items-center justify-center gap-1">
                 <span className="text-5xl font-black drop-shadow-sm animate-in zoom-in duration-300" key={quantity}>
                   {quantity}
                 </span>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Copies</span>
              </div>
              
              <button 
                onClick={increment}
                disabled={quantity >= 10}
                className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 transition-all disabled:opacity-50 shadow-sm active:scale-95"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>

            <button 
              onClick={onNext}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all text-center flex justify-center items-center gap-3 border-b-4 border-slate-950 hover:bg-black"
            >
              <Printer size={20} />
              Confirm & Continue
            </button>
          </div>
        </div>
      </div>
    </StepWrapper>
  )
}

export default PrintQuantityScreen
