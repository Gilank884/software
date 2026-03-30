import { useState } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, LayoutGrid, Palette, BarChart3, Settings, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function Sidebar({ activeTab, onTabChange, onSignOut, user }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/events' },
    { id: 'devices', label: 'Devices', icon: Smartphone, path: '/devices' },
    { id: 'frames', label: 'Frames', icon: LayoutGrid, path: '/frames' },
    { id: 'canvas', label: 'Canvas Editor', icon: Palette, path: '/canvas' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 84 : 280 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-[2.5rem] flex flex-col items-center py-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)] h-fit relative z-40 transition-colors duration-500"
    >
      <div className="w-full px-4 space-y-2.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button 
              key={tab.id}
              onClick={() => onTabChange(tab.id, tab.path)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-5'} py-4 rounded-3xl font-bold transition-all group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                  : 'text-slate-500 hover:bg-white/60 hover:text-blue-600'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? '' : 'group-hover:scale-110 transition-transform duration-300'}`} />
              
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-4 text-[13px] tracking-tight truncate whitespace-nowrap"
                >
                  {tab.label}
                </motion.span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-5 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-3 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-2xl">
                  {tab.label}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-[40px]" />

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 hover:bg-blue-600/10 text-slate-400 hover:text-blue-600 rounded-full transition-all active:scale-90 border border-transparent hover:border-blue-100/50 group"
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "backOut" }}
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </motion.div>
      </button>
    </motion.aside>
  )
}
