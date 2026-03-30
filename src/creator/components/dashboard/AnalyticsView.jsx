import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { TrendingUp, Monitor, Smartphone, RefreshCw, Calendar, Loader2, Activity } from 'lucide-react'
import PageHeader from './PageHeader'

export default function AnalyticsView({ user, devices }) {
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCaptures = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('captures')
      .select('*')
      .eq('user_id', user.id)
    setCaptures(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user?.id) fetchCaptures()
  }, [user?.id])

  if (loading && captures.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-12 overflow-y-auto pr-6 pb-20 custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        badge="INTELLIGENCE ENGINE • PLATFORM MATRIX"
        titleMain="Network"
        titleHighlight="Analytics"
        description="Synthesizing ecosystem data into actionable performance metrics and real-time growth insights."
        icon={Activity}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Time Range Selector */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/40 p-1.5 rounded-[1.5rem] flex items-center shadow-sm">
            {['7D', '30D', 'MONTH', 'ALL'].map((range) => (
              <button
                key={range}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${range === 'MONTH' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Date Picker Placeholder */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/40 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-700 tabular-nums">28/02/2026</span>
            </div>
            <div className="w-2 h-[1px] bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-700 tabular-nums">30/03/2026</span>
              <Calendar size={14} className="text-blue-500" />
            </div>
          </div>

          {/* Sync Button */}
          <button 
            onClick={fetchCaptures}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20"
          >
            <RefreshCw size={18} className={`${loading ? "animate-spin" : ""}`} />
            Sync Engine
          </button>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
            <TrendingUp size={140} />
          </div>
          <div className="w-16 h-16 bg-blue-500 text-white rounded-[1.25rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20">
            <TrendingUp size={32} />
          </div>
          <div className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums">{captures.length}</div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mt-3">Total Cumulative Captures</p>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
            <Monitor size={140} />
          </div>
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center mb-8 shadow-xl shadow-slate-900/20">
            <Monitor size={32} />
          </div>
          <div className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums">{devices.length}</div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mt-3">Active Registered Devices</p>
        </div>
      </div>

      {/* Device Usage Table */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance by Device</h3>
          <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Live Updates</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Device Identity</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Code</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Capture Count</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Market Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {devices.map(device => {
                const deviceCaptures = captures.filter(c => c.device_id === device.id)
                const count = deviceCaptures.length
                const percentage = captures.length > 0 ? (count / captures.length) * 100 : 0
                
                return (
                  <tr key={device.id} className="hover:bg-white/60 transition-colors duration-300">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200/50">
                          <Monitor size={20} />
                        </div>
                        <div>
                          <span className="block text-base font-black text-slate-800">{device.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Online System</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <code className="bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 font-black tracking-widest text-xs border border-blue-100/50">
                        {device.unique_code}
                      </code>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <span className="text-2xl font-black text-blue-600 tabular-nums">{count}</span>
                    </td>
                    <td className="px-10 py-7">
                      <div className="w-full max-w-[160px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Utilization</span>
                          <span className="text-xs font-black text-slate-700 tabular-nums">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/30">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
