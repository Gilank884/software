import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Camera, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react'

const RemoteController = ({ sessionId }) => {
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'success' | 'error'
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState(null)

  useEffect(() => {
    if (!sessionId) return

    const newChannel = supabase.channel(`remote-control:${sessionId}`, {
      config: {
        broadcast: { self: true },
      },
    })

    newChannel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [sessionId])

  const triggerCapture = async () => {
    if (!channel || status === 'sending') return

    setStatus('sending')
    
    try {
      const response = await channel.send({
        type: 'broadcast',
        event: 'capture',
        payload: { timestamp: new Date().toISOString() },
      })

      if (response === 'ok') {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 1000)
      } else {
        throw new Error('Failed to send broadcast')
      }
    } catch (err) {
      console.error('Remote capture error:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
        {/* Connection Status */}
        <div className={`mb-12 px-4 py-2 rounded-full border flex items-center gap-2 transition-all duration-500 ${
          isConnected 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Connected to Studio</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">Reconnecting...</span>
            </>
          )}
        </div>

        <h1 className="text-4xl font-black mb-4 tracking-tight">Studio Remote</h1>
        <p className="text-slate-400 mb-16 px-4">Tap the shutter button below to take a photo instantly.</p>

        {/* Big Shutter Button */}
        <button
          onClick={triggerCapture}
          disabled={!isConnected || status === 'sending'}
          className={`relative group w-64 h-64 rounded-full border-8 transition-all duration-300 flex items-center justify-center shadow-2xl ${
            !isConnected 
              ? 'border-slate-800 bg-slate-900/50 scale-95 opacity-50 cursor-not-allowed' 
              : status === 'success'
              ? 'border-emerald-400 bg-emerald-500/20 scale-105'
              : status === 'error'
              ? 'border-rose-400 bg-rose-500/20'
              : 'border-white bg-white/5 active:scale-90 hover:border-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          {/* Inner Circle */}
          <div className={`w-48 h-48 rounded-full transition-all duration-300 flex items-center justify-center ${
            status === 'success' 
              ? 'bg-emerald-400' 
              : status === 'error'
              ? 'bg-rose-400'
              : 'bg-white group-hover:bg-emerald-400'
          }`}>
            {status === 'sending' ? (
              <div className="w-12 h-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 size={64} className="text-slate-950" />
            ) : status === 'error' ? (
              <AlertCircle size={64} className="text-slate-950" />
            ) : (
              <Camera size={64} className="text-slate-950" />
            )}
          </div>

          {/* Ripple effects when active */}
          {isConnected && status === 'idle' && (
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping opacity-20 pointer-events-none" />
          )}
        </button>

        <div className="mt-16 text-slate-500 font-medium text-sm flex flex-col gap-1 items-center">
            <span>Room ID: <span className="text-slate-300 font-mono">{sessionId.slice(0, 8)}</span></span>
            <span className="text-[10px] uppercase tracking-widest opacity-50">Photobooth Controller v1.0</span>
        </div>
      </div>
    </div>
  )
}

export default RemoteController
