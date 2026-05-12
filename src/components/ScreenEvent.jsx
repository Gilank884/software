import { motion } from 'framer-motion'
import { Sparkles, Camera } from 'lucide-react'

const ScreenEvent = ({ onStart }) => {
  return (
    <div className="z-10 text-center relative max-w-2xl w-full py-16 px-4">
      <div className="mb-6 inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-rose-600 px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] border border-rose-100/50 shadow-lg transition-colors">
        <Sparkles size={12} className="text-rose-500" fill="currentColor" /> EVENT EDITION
      </div>

      <div className="flex flex-col items-center group">
        <h1 className="text-7xl font-black text-slate-800 font-caveat relative drop-shadow-xl inline-block -rotate-3 transition-transform duration-500 group-hover:-rotate-1 pointer-events-none">
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [-10, 10, -10]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-10 left-12 text-rose-500 drop-shadow-lg z-20"
          >
            <Camera size={32} fill="currentColor" className="opacity-90" />
          </motion.div>
          <span className="bg-gradient-to-r from-rose-600 via-indigo-600 to-amber-600 bg-clip-text text-transparent px-4">Latar Cerita</span>
        </h1>

        <div className="flex flex-col items-center -mt-2 relative z-10">
          <motion.img
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            src="/Event3.png"
            alt="Event"
            className="max-w-[280px] h-auto drop-shadow-xl"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        <span className="text-4xl font-black text-slate-800 tracking-widest font-caveat leading-none">
          Ketuk Untuk Berfoto
        </span>
      </div>
    </div>
  )
}

export default ScreenEvent
