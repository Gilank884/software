import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import FramesManager from './FramesManager'
import CanvasManager from './CanvasManager'
import AppBackground from './AppBackground'
import Sidebar from './dashboard/Sidebar'
import AnalyticsView from './dashboard/AnalyticsView'
import DevicesView from './dashboard/DevicesView'
import { Monitor, LogOut } from 'lucide-react'

export default function CreatorDashboard({ user, onSignOut }) {
  const [devices, setDevices] = useState([])
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Initial tab from URL or default to 'devices'
  const getInitialTab = () => {
    const path = window.location.pathname
    if (path.includes('/analytics')) return 'analytics'
    if (path.includes('/frames')) return 'frames'
    if (path.includes('/canvas')) return 'canvas'
    if (path.includes('/settings')) return 'settings'
    return 'analytics'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  const handleTabChange = (tabId, path) => {
    setActiveTab(tabId)
    window.history.pushState({}, '', path)
  }

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchDevices()
      fetchFrames()
    }
  }, [user?.id])

  const fetchDevices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('creator_id', user?.id)
      .order('created_at', { ascending: false })
    setDevices(data || [])
    setLoading(false)
  }

  const fetchFrames = async () => {
    const { data } = await supabase
      .from('frames')
      .select('*')
      .eq('user_id', user.id)
    setFrames(data || [])
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-hidden font-sans">
      <AppBackground />
      
      {/* Top Navbar */}
      <nav className="relative z-50 bg-white/40 backdrop-blur-2xl border-b border-white/40 px-10 py-5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-6 cursor-pointer group" onClick={() => handleTabChange('analytics', '/analytics')}>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all duration-500">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Creator<span className="text-blue-600">Portal</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="h-8 w-[1px] bg-slate-200/50 hidden md:block" />
          <button 
            onClick={onSignOut}
            className="flex items-center gap-3 px-6 py-2.5 bg-white/50 hover:bg-white text-slate-400 hover:text-rose-500 border border-slate-200/50 hover:border-rose-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-sm"
          >
            <LogOut size={14} />
            Secure Sign Out
          </button>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative z-10 px-10 py-12 gap-10 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          onSignOut={onSignOut} 
          user={user} 
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'devices' && (
            <DevicesView 
              user={user} 
              devices={devices} 
              frames={frames} 
              onRefresh={fetchDevices} 
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView 
              user={user} 
              devices={devices} 
            />
          )}

          {activeTab === 'frames' && (
            <FramesManager user={user} />
          )}

          {activeTab === 'canvas' && (
            <CanvasManager user={user} />
          )}
          
          {activeTab === 'settings' && (
             <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
               Common Settings Coming Soon
             </div>
          )}
        </main>
      </div>
    </div>
  )
}
