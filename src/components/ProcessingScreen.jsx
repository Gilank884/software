import { RefreshCcw } from 'lucide-react';

const ProcessingScreen = () => (
  <div className="flex-1 flex flex-col items-center justify-center font-caveat relative overflow-hidden">

    <div className="z-10 text-center scale-90 md:scale-100">
      <div className="w-48 h-48 relative mb-12 mx-auto">
        <div className="absolute inset-0 border-[12px] border-blue-50 rounded-full"></div>
        <div className="absolute inset-0 border-[12px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-gradient-blue pb-2">
          <RefreshCcw size={64} className="animate-pulse" />
        </div>
      </div>

      <h2 className="text-7xl font-black text-slate-800 mb-6 animate-bounce tracking-tighter leading-none">
        Printing...
      </h2>

      <div className="flex items-center justify-center gap-3">
        <div className="h-1 w-10 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 w-full animate-[progress_1.5s_infinite_linear]"></div>
        </div>
        <p className="text-slate-400 text-sm font-black uppercase tracking-[0.4em] font-sans">Preparing photostrip</p>
        <div className="h-1 w-10 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 w-full animate-[progress_1.5s_infinite_linear]"></div>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes progress {
        from { transform: translateX(-100%); }
        to { transform: translateX(100%); }
      }
    `}</style>
  </div>
)

export default ProcessingScreen
