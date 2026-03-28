import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { KeyRound, ArrowRight, Loader2 } from 'lucide-react'
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
          payment_enabled: data[0].payment_enabled,
          available_frames: data[0].available_frames || [],
          login_at: new Date().toISOString()
        }
        localStorage.setItem('pb_device_session', JSON.stringify(sessionData))
        onLogin(sessionData)
      } else {
        setError('Kode unik tidak valid atau perangkat tidak aktif.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kesalahan saat validasi kode.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
      <AppBackground />

      <div className="w-full max-w-md z-10">
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-6 animate-float">
              <KeyRound className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 text-center tracking-tighter">
              Software<span className="text-blue-600">Photobooth</span>
            </h1>
            <p className="text-slate-400 mt-3 text-center font-bold uppercase tracking-widest text-[10px]">
              Masukkan kode unik perangkat Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CONTOH: 567BYK"
                maxLength={10}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 text-3xl font-black tracking-[0.4em] text-center text-slate-800 placeholder:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 transition-all shadow-inner"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-500 px-6 py-4 rounded-2xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 5}
              className="w-full bg-blue-600 text-white rounded-3xl py-5 font-black flex items-center justify-center gap-3 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 transition-all shadow-xl shadow-blue-500/30 border-b-4 border-blue-800"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  Connect Device
                  <ArrowRight size={24} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
              Ingin mengelola perangkat?
              <a href="http://creator.localhost:3000" className="text-blue-600 ml-2 hover:underline">
                Creator Dashboard
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
