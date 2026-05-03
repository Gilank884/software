import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ArrowRight, Loader2, MonitorSmartphone, Calendar, Check, ChevronRight } from 'lucide-react'
import AppBackground from './AppBackground'

export default function DeviceLogin({ onLogin }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('login') // 'login' | 'select_event'
  const [events, setEvents] = useState([])
  const [deviceData, setDeviceData] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)

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
        const baseSession = {
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
        
        setDeviceData(baseSession)
        
        // Fetch events for this creator
        const { data: eventList, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('creator_id', baseSession.creator_id)
          .order('created_at', { ascending: false })
          
        if (eventError) throw eventError
        
        if (eventList && eventList.length > 0) {
          setEvents(eventList)
          setStep('select_event')
        } else {
          // If no events exist, proceed but with a null event_id (or could require one)
          const sessionWithNullEvent = { ...baseSession, event_id: null }
          localStorage.setItem('pb_device_session', JSON.stringify(sessionWithNullEvent))
          onLogin(sessionWithNullEvent)
        }
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

  const handleSelectEvent = async () => {
    if (!selectedEventId || !deviceData) return
    
    setLoading(true)
    try {
      // Update device with selected event in DB
      const { error: updateError } = await supabase
        .from('devices')
        .update({ event_id: selectedEventId })
        .eq('id', deviceData.device_id)
      
      if (updateError) throw updateError
      
      const finalSession = { ...deviceData, event_id: selectedEventId }
      localStorage.setItem('pb_device_session', JSON.stringify(finalSession))
      onLogin(finalSession)
    } catch (err) {
      console.error('Event selection error:', err)
      setError('Gagal menetapkan event ke perangkat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50">
      <AppBackground />

      <div className="z-10 w-full max-w-[400px] bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        
        {step === 'login' ? (
          <>
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
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><span className="mt-0.5">Validate Code</span> <ArrowRight size={16} /></>}
              </button>
            </form>
          </>
        ) : (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-blue-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-transparent opacity-30" />
               <Calendar size={28} className="relative z-10" />
            </div>

            <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1 text-center">Select Event</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8 text-center leading-relaxed">
              Pilih event yang akan ditugaskan ke {deviceData?.name}
            </p>

            <div className="w-full space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-8 custom-scrollbar">
              {events.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${selectedEventId === event.id ? 'border-blue-500 bg-blue-50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all overflow-hidden ${selectedEventId === event.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 shadow-sm border border-slate-100'}`}>
                      {event.logo_url ? (
                        <img src={event.logo_url} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <Calendar size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 line-clamp-1">{event.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Session</p>
                    </div>
                  </div>
                  {selectedEventId === event.id ? (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  ) : (
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400" />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-rose-500 text-[10px] font-bold mb-6 text-center bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 w-full">
                {error}
              </p>
            )}

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setStep('login')}
                className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSelectEvent}
                disabled={loading || !selectedEventId}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-xl shadow-blue-600/20 text-xs uppercase tracking-widest active:scale-95 border-b-[3px] border-blue-800"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><span className="mt-0.5">Start Session</span> <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        ) }
      </div>
    </div>
  )
}
