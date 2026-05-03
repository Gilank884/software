import { motion } from 'framer-motion'
import { Sparkles, Camera } from 'lucide-react'

const ScreenDefault = ({ onStart }) => {
  return (
    <div className="z-10 text-center relative max-w-2xl w-full py-16 px-4">
      <div className="mb-6 inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-gradient-blue px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] border border-blue-100/50 shadow-lg">
        <Sparkles size={12} className="text-blue-500" fill="currentColor" /> PREMIUM PHOTOBOOTH
      </div>

      <h1 className="text-9xl font-black text-slate-800 mb-8 font-caveat relative drop-shadow-xl inline-block -rotate-3 transition-transform duration-500 group-hover/title:-rotate-1 pointer-events-none">
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
          className="absolute -top-12 left-16 text-blue-500 drop-shadow-lg z-20"
        >
          <Camera size={44} fill="currentColor" className="opacity-90" />
        </motion.div>
        <span className="text-gradient-blue px-4">Latar Cerita</span>
      </h1>

      <div className="flex flex-col items-center gap-4 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        <span className="text-4xl font-black text-slate-800 tracking-widest font-caveat leading-none">
          Tekan Dimana saja Untuk Memulai
        </span>
      </div>
    </div>
  )
}

export default ScreenDefault
