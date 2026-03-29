import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ArrowRight, Loader2, MonitorSmartphone } from 'lucide-react'
import AppBackground from './AppBackground'

export default function DeviceLogin({ onLogin }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.length < 5) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_device_code', {
        p_code: code.toUpperCase()
      })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        const sessionData = {
          device_id: data[0].device_id,
          creator_id: data[0].creator_id,
          name: data[0].device_name,
          payment_enabled: data[0].payment_enabled ?? false,
          available_frames: data[0].available_frames || [],
          enable_photobooth: data[0].enable_photobooth ?? true,
          enable_self_photo: data[0].enable_self_photo ?? false,
          self_photo_durations: data[0].self_photo_durations || [5, 10, 15],
          login_at: new Date().toISOString()
        }
        localStorage.setItem('pb_device_session', JSON.stringify(sessionData))
        onLogin(sessionData)
      } else {
        setError('Kode tidak valid atau perangkat non-aktif.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Gagal memvalidasi kode perangkat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50">
      <AppBackground />

      <div className="z-10 w-full max-w-[360px] bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        
        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-transparent opacity-50" />
           <MonitorSmartphone size={28} className="text-white relative z-10" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Device Login</h1>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8 text-center text-balance leading-relaxed">
          Masukkan 6 digit kode akses
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="------"
            maxLength={6}
            className="w-full bg-slate-50/50 border-2 border-slate-100/80 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.3em] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner mb-6"
            autoFocus
          />

          {error && (
            <p className="text-rose-500 text-[10px] font-bold mb-6 text-center bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 w-full">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 5}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-xl shadow-blue-600/20 text-xs uppercase tracking-widest active:scale-95 border-b-[3px] border-blue-800 disabled:border-blue-600"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><span className="mt-0.5">Connect</span> <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
