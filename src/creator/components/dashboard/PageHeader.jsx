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
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="flex-1 space-y-6">
        {/* Badge Label */}
        <div className="flex items-center gap-3">
           <div className="bg-blue-600 px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] relative z-10 whitespace-nowrap">
                {badge}
              </span>
           </div>
           <div className="w-2 h-2 bg-slate-200 rounded-full" />
           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{titleMain}</span>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{titleMain}</span>
            <span className="text-blue-600 drop-shadow-sm">{titleHighlight}</span>
            {Icon && (
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-blue-500/40"
              >
                <Icon size={44} strokeWidth={2.5} />
              </motion.div>
            )}
          </h2>
          <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-start sm:items-center xl:items-end 2xl:items-center gap-6">
        {children}
      </div>
    </div>
  )
}
