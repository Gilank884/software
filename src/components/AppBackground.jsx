import { useMemo } from 'react'
import { motion } from 'framer-motion'
import DecorativeBackground from './DecorativeBackground'
import { 
  FaCameraRetro, FaRegHeart, FaRegStar, FaRegSmile, FaMagic, 
  FaGlassCheers, FaCloud, FaBirthdayCake, FaGamepad, FaMusic, 
  FaPalette, FaRocket, FaCrown, FaGem, FaGhost, FaLaughWink, FaGrinHearts,
  FaCat, FaDog, FaPizzaSlice, FaIceCream, FaHamburger, FaCocktail, FaGraduationCap
} from 'react-icons/fa'
import { 
  IoMusicalNotes, IoSparkles, IoBalloonOutline, IoIceCreamOutline,
  IoHeartOutline, IoStarOutline, IoCameraOutline, IoAirplaneOutline,
  IoPlanetOutline, IoSunnyOutline, IoMoonOutline, IoCloudOutline
} from 'react-icons/io5'

const AppBackground = () => {
  const backgroundIcons = useMemo(() => {
    const iconPool = [
      { Icon: FaCameraRetro, color: 'text-blue-400' },
      { Icon: FaRegHeart, color: 'text-pink-400' },
      { Icon: FaRegStar, color: 'text-yellow-400' },
      { Icon: FaRegSmile, color: 'text-orange-400' },
      { Icon: FaMagic, color: 'text-purple-400' },
      { Icon: FaGlassCheers, color: 'text-amber-400' },
      { Icon: IoMusicalNotes, color: 'text-indigo-400' },
      { Icon: IoBalloonOutline, color: 'text-rose-400' },
      { Icon: IoIceCreamOutline, color: 'text-sky-400' },
      { Icon: FaCrown, color: 'text-yellow-500' },
      { Icon: FaGem, color: 'text-blue-500' },
      { Icon: FaRocket, color: 'text-indigo-500' },
      { Icon: FaGhost, color: 'text-slate-400' },
      { Icon: IoSparkles, color: 'text-blue-300' },
      { Icon: FaGamepad, color: 'text-green-400' },
      { Icon: FaPalette, color: 'text-red-400' },
      { Icon: FaLaughWink, color: 'text-orange-500' },
      { Icon: FaGrinHearts, color: 'text-pink-500' },
      { Icon: FaCat, color: 'text-amber-500' },
      { Icon: FaDog, color: 'text-blue-200' },
      { Icon: FaPizzaSlice, color: 'text-yellow-600' },
      { Icon: FaIceCream, color: 'text-pink-200' },
      { Icon: FaHamburger, color: 'text-amber-700' },
      { Icon: FaCocktail, color: 'text-green-500' },
      { Icon: FaGraduationCap, color: 'text-slate-500' },
      { Icon: IoHeartOutline, color: 'text-rose-300' },
      { Icon: IoStarOutline, color: 'text-yellow-200' },
      { Icon: IoAirplaneOutline, color: 'text-sky-300' },
      { Icon: IoPlanetOutline, color: 'text-purple-200' },
      { Icon: IoSunnyOutline, color: 'text-amber-300' },
      { Icon: IoMoonOutline, color: 'text-slate-200' },
      { Icon: IoCloudOutline, color: 'text-blue-100' }
    ]

    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      ...iconPool[Math.floor(Math.random() * iconPool.length)],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.floor(Math.random() * 26) + 18,
      delay: Math.random() * 8,
      duration: Math.random() * 12 + 15,
      opacity: (Math.random() * 0.3) + 0.2,
      parallaxFactor: Math.random() * 20 + 10,
      rotateDir: Math.random() > 0.5 ? 1 : -1
    }))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base Decorative Layers */}
      <DecorativeBackground opacity="opacity-100" />
      
      {/* Holographic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-white/40 to-sky-100/20 z-1"></div>

      {/* Animated Icon Layer */}
      <div className="absolute inset-0 z-2 mix-blend-darken opacity-90">
        {backgroundIcons.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [item.opacity, item.opacity * 1.5, item.opacity],
              scale: [1, 1.15, 1],
              y: [0, -item.parallaxFactor, 0],
              x: [0, (Math.random() - 0.5) * 30, 0],
              rotate: [0, 25 * item.rotateDir, -25 * item.rotateDir, 0]
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
            }}
          >
            <item.Icon size={item.size} className={`${item.color} filter blur-[0.2px] saturate-200 drop-shadow-sm`} />
          </motion.div>
        ))}
      </div>

      {/* Ambient soft glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/20 rounded-full blur-[120px] opacity-60 z-3"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-200/20 rounded-full blur-[120px] opacity-60 z-3"></div>
      <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-pink-100/20 rounded-full blur-[100px] opacity-40 z-3"></div>
    </div>
  )
}

export default AppBackground
