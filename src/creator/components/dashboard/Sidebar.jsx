import { Smartphone, LayoutGrid, Palette, BarChart3, Settings, LogOut, Monitor } from 'lucide-react'

export default function Sidebar({ activeTab, onTabChange, onSignOut, user }) {
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'devices', label: 'Devices', icon: Smartphone, path: '/devices' },
    { id: 'frames', label: 'Frames', icon: LayoutGrid, path: '/frames' },
    { id: 'canvas', label: 'Canvas Editor', icon: Palette, path: '/canvas' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <aside className="w-64 space-y-2 flex-shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        
        return (
          <button 
            key={tab.id}
            onClick={() => onTabChange(tab.id, tab.path)}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              isActive 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                : 'text-slate-500 hover:bg-white hover:text-blue-600 shadow-sm'
            }`}
          >
            <Icon size={20} />
            {tab.label}
          </button>
        )
      })}
    </aside>
  )
}
