import StepWrapper from './StepWrapper'
import { QrCode, Scan } from 'lucide-react'

const PaymentScreen = ({ onPaymentSuccess }) => (
  <StepWrapper title="Payment" subtitle="Scan QRIS to start">
    <div className="max-w-md mx-auto bg-white/70 backdrop-blur-[30px] rounded-[60px] p-10 border border-white shadow-xl text-center relative font-caveat overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 rounded-t-[60px]"></div>
      
      <div className="mb-10 inline-block p-10 bg-white rounded-[50px] shadow-inner border border-slate-50">
         <QrCode size={180} className="text-slate-800" />
      </div>

      <div className="flex items-center justify-center gap-6 mb-8">
         <div className="h-[1px] bg-slate-100 flex-1"></div>
         <span className="text-slate-300 font-black uppercase tracking-widest text-[10px] font-sans">OR TICKET</span>
         <div className="h-[1px] bg-slate-100 flex-1"></div>
      </div>

      <div className="flex flex-col gap-4">
        <button className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black text-xl flex items-center justify-center gap-4 hover:bg-black transition-all">
          <Scan size={24} /> Scan Ticket
        </button>
        <button 
          onClick={onPaymentSuccess}
          className="w-full py-4 bg-blue-50 text-gradient-blue rounded-[24px] font-black text-xl border-2 border-blue-100 hover:bg-blue-100 transition-all tracking-widest leading-none"
        >
          (Payment Successful)
        </button>
      </div>

      <div className="mt-8 inline-block bg-blue-50/50 px-6 py-2 rounded-full border border-blue-100/50">
         <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] font-sans">
           Price: <span className="text-gradient-blue font-black">Rp 25.000</span>
         </p>
      </div>
    </div>
  </StepWrapper>
)

export default PaymentScreen
