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

const AppBackground = ({ mode = 'default', isHidden = false }) => {
  const isEvent = mode === 'event'

  const backgroundIcons = useMemo(() => {
    // ... (rest of the logic stays same)
    const defaultPool = [
      { Icon: FaCameraRetro, color: 'text-rose-400' },
      { Icon: FaRegSmile, color: 'text-orange-400' },
      { Icon: IoMusicalNotes, color: 'text-red-400' },
      { Icon: IoIceCreamOutline, color: 'text-orange-400' },
      { Icon: FaRocket, color: 'text-rose-500' },
      { Icon: IoSparkles, color: 'text-rose-300' },
      { Icon: FaCat, color: 'text-amber-500' },
      { Icon: FaDog, color: 'text-rose-200' },
      { Icon: IoAirplaneOutline, color: 'text-orange-300' },
      { Icon: IoCloudOutline, color: 'text-rose-100' }
    ]

    const eventPool = [
      { Icon: FaGlassCheers, color: 'text-amber-400' },
      { Icon: IoBalloonOutline, color: 'text-rose-400' },
      { Icon: FaCrown, color: 'text-yellow-500' },
      { Icon: FaGem, color: 'text-indigo-400' },
      { Icon: FaRegHeart, color: 'text-pink-400' },
      { Icon: FaRegStar, color: 'text-yellow-400' },
      { Icon: IoSparkles, color: 'text-yellow-300' },
      { Icon: FaBirthdayCake, color: 'text-rose-500' },
      { Icon: FaCocktail, color: 'text-emerald-400' },
      { Icon: FaGraduationCap, color: 'text-indigo-600' }
    ]

    const iconPool = isEvent ? [...eventPool, ...defaultPool.slice(0, 5)] : [...defaultPool, ...eventPool.slice(0, 5)]

    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      ...iconPool[Math.floor(Math.random() * iconPool.length)],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.floor(Math.random() * 26) + 18,
      delay: Math.random() * 8,
      duration: Math.random() * 12 + 15,
      opacity: isEvent ? (Math.random() * 0.4) + 0.3 : (Math.random() * 0.3) + 0.2,
      parallaxFactor: Math.random() * 20 + 10,
      rotateDir: Math.random() > 0.5 ? 1 : -1
    }))
  }, [isEvent])

  const backgroundPhotos = useMemo(() => {
    const photoPool = ['/bg_photo_1.png', '/bg_photo_2.png', '/bg_photo_3.png']
    return Array.from({ length: 5 }).map((_, i) => ({ // Optimized count
      id: i,
      src: photoPool[i % photoPool.length],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      rotation: (Math.random() - 0.5) * 50,
      scale: 2.0 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 50 + Math.random() * 30, // Even slower
      blur: `blur(${Math.floor(Math.random() * 8) + 6}px)`,
      opacity: 0.08 + Math.random() * 0.1
    }))
  }, [])

  return (
    <motion.div 
      initial={false}
      animate={{ opacity: isHidden ? 0 : 1 }}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000 ${isEvent ? 'bg-rose-50/30' : 'bg-slate-50'}`}
    >
      {/* Base Decorative Layers */}
      <DecorativeBackground opacity={isEvent ? "opacity-30" : "opacity-100"} />
      
      {/* Holographic Gradient Overlay */}
      <div className={`absolute inset-0 transition-all duration-1000 z-1 ${
        isEvent 
          ? 'bg-gradient-to-br from-rose-100/30 via-white/60 to-indigo-100/30' 
          : 'bg-gradient-to-br from-rose-100/20 via-white/40 to-orange-100/20'
      }`}></div>

      {/* Animated Photo Layer - Only show in event mode */}
      {isEvent && (
        <div className="absolute inset-0 z-2 opacity-60">
          {backgroundPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.5, rotate: photo.rotation }}
              animate={{ 
                opacity: [photo.opacity, photo.opacity * 1.5, photo.opacity],
                y: [0, -60, 0],
                x: [0, 40, 0],
                rotate: [photo.rotation, photo.rotation + 10, photo.rotation]
              }}
              transition={{
                duration: photo.duration,
                delay: photo.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: photo.top,
                left: photo.left,
                scale: photo.scale,
                filter: photo.blur,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
              className="p-8 pb-28 bg-white/90 backdrop-blur-sm shadow-[0_40px_100px_rgba(0,0,0,0.25)] border border-white/50 flex flex-col items-center"
            >
              <div className="w-96 h-96 overflow-hidden bg-slate-100">
                <img src={photo.src} alt="" className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Animated Icon Layer - Only show in default mode */}
      {!isEvent && (
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
      )}

      {/* Ambient soft glows */}
      {isEvent ? (
        <>
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-rose-200/30 rounded-full blur-[120px] opacity-60 z-3 animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-200/30 rounded-full blur-[120px] opacity-60 z-3"></div>
          <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-amber-100/40 rounded-full blur-[100px] opacity-50 z-3"></div>
        </>
      ) : (
        <>
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-rose-200/20 rounded-full blur-[120px] opacity-60 z-3"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-200/20 rounded-full blur-[120px] opacity-60 z-3"></div>
          <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-pink-100/20 rounded-full blur-[100px] opacity-40 z-3"></div>
        </>
      )}
    </motion.div>
  )
}

export default AppBackground
