import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import FramesManager from '../components/FramesManager'
import CanvasManager from '../components/CanvasManager'
import CreatorBackground from '../components/CreatorBackground'
import Sidebar from './components/dashboard/Sidebar'
import AnalyticsView from './components/dashboard/AnalyticsView'
import DevicesView from './components/dashboard/DevicesView'
import AuthScreen from '../components/AuthScreen'
import { Monitor, LogOut, Calendar } from 'lucide-react'
import EventsView from './components/dashboard/EventsView'

export default function CreatorApp() {
  const [session, setSession] = useState(null)
  
  useEffect(() => {
    // Ensure body is scrollable in dashboard
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    const isSignupPath = window.location.pathname === '/daftar'
    return <AuthScreen onAuthSuccess={setSession} initialIsLogin={!isSignupPath} />
  }

  return <CreatorDashboard user={session.user} onSignOut={() => supabase.auth.signOut()} />
}

function CreatorDashboard({ user, onSignOut }) {
  const [devices, setDevices] = useState([])
  const [frames, setFrames] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Initial tab from URL or default to 'devices'
  const getInitialTab = () => {
    const path = window.location.pathname
    if (path.includes('/analytics')) return 'analytics'
    if (path.includes('/events')) return 'events'
    if (path.includes('/devices')) return 'devices'
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
      fetchEvents()
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

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
    setEvents(data || [])
  }

  const fetchFrames = async () => {
    const { data } = await supabase
      .from('frames')
      .select('*')
      .eq('user_id', user.id)
    setFrames(data || [])
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-y-auto font-sans">
      <CreatorBackground />
      
      {/* Top Navbar */}
      <nav className="relative z-50 bg-white/30 backdrop-blur-xl border-b border-white/40 px-8 py-4 flex items-center justify-between transition-all duration-500">
        <div className="flex items-center gap-5 cursor-pointer group" onClick={() => handleTabChange('analytics', '/analytics')}>
          <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 border border-blue-100/50 shadow-sm shadow-blue-500/10">
            <Monitor size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              Creator<span className="text-blue-600/80">Portal</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse opacity-70" />
              <p className="text-[11px] text-slate-400/80 font-medium tracking-wide">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="h-6 w-[1px] bg-slate-200/40 hidden md:block" />
          <button 
            onClick={onSignOut}
            className="flex items-center gap-2 px-5 py-2 hover:bg-white/80 active:scale-95 text-slate-500 hover:text-rose-500 border border-transparent hover:border-rose-100/30 rounded-xl font-semibold text-xs transition-all duration-300"
          >
            <LogOut size={14} strokeWidth={2.5} />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative z-10 px-10 py-12 gap-10 overflow-y-auto">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          onSignOut={onSignOut} 
          user={user} 
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'events' && (
            <EventsView 
              user={user} 
              events={events} 
              devices={devices}
              onRefresh={fetchEvents} 
            />
          )}

          {activeTab === 'devices' && (
            <DevicesView 
              user={user} 
              devices={devices} 
              frames={frames} 
              events={events} 
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
