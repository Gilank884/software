import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function PageHeader({ 
  badge = "INTELLIGENCE ENGINE • PLATFORM MATRIX", 
  titleMain, 
  titleHighlight, 
  description, 
  icon: Icon = Activity,
  children 
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="flex-1 space-y-4">
        {/* Badge Label */}
        <div className="flex items-center gap-3">
           <div className="bg-blue-600 px-3 py-1 rounded-full shadow-md shadow-blue-500/20 overflow-hidden relative group">
              <span className="text-[9px] font-black text-white uppercase tracking-[0.15em] relative z-10 whitespace-nowrap">
                {badge}
              </span>
           </div>
           <div className="w-1 h-1 bg-slate-200 rounded-full" />
           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{titleMain}</span>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-3">
            <span>{titleMain}</span>
            <span className="text-blue-600">{titleHighlight}</span>
            {Icon && (
              <motion.div 
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-blue-500/30"
              >
                <Icon size={24} strokeWidth={2.5} />
              </motion.div>
            )}
          </h2>
          <p className="text-slate-400 font-medium text-sm max-w-xl leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex flex-wrap items-center lg:items-start gap-4">
        {children}
      </div>
    </div>
  )
}
