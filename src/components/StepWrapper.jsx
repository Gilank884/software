const StepWrapper = ({ title, subtitle, children }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
    <div className="z-10 w-full max-w-7xl transition-all duration-700">
      {(title || subtitle) && (
        <div className="text-center mb-6">
          {title && (
            <div className="relative inline-block mb-2 px-6">
              <h1 className="text-6xl font-black mb-1 tracking-tight leading-none font-caveat">
                <span className="text-gradient-blue inline-block pr-10">{title}</span>
              </h1>
              <div className="h-2 w-full bg-gradient-to-r from-blue-400/20 via-blue-500/40 to-blue-400/20 rounded-full blur-[1px]"></div>
            </div>
          )}
          {subtitle && <p className="text-sm text-slate-500 font-black tracking-[0.2em] uppercase font-sans mb-4 ">{subtitle}</p>}
        </div>
      )}
      
      {children}
    </div>
  </div>
)

export default StepWrapper
