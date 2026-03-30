import { useState, useEffect } from 'react'
import { Monitor, ShieldCheck, Palette, Smartphone, Check, Layout, Trash2, Copy, Loader2, Save, Calendar, ChevronLeft } from 'lucide-react'
import PageHeader from './PageHeader'

export default function DeviceDetailConfig({ device, availableFrames, events, onUpdate, onBack }) {
  const [localPayment, setLocalPayment] = useState(device.payment_enabled)
  const [localPhotobooth, setLocalPhotobooth] = useState(device.enable_photobooth ?? true)
  const [localSelfPhoto, setLocalSelfPhoto] = useState(device.enable_self_photo ?? false)
  const [localFrames, setLocalFrames] = useState(device.available_frames || [])
  const [localDurations, setLocalDurations] = useState(device.self_photo_durations || [5, 10, 15])
  const [localEventId, setLocalEventId] = useState(device.event_id || '')
  const [newDuration, setNewDuration] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Sync with device prop if it changes externally
  useEffect(() => {
    setLocalPayment(device.payment_enabled)
    setLocalPhotobooth(device.enable_photobooth ?? true)
    setLocalSelfPhoto(device.enable_self_photo ?? false)
    setLocalFrames(device.available_frames || [])
    setLocalDurations(device.self_photo_durations || [5, 10, 15])
    setLocalEventId(device.event_id || '')
  }, [device])

  const hasChanges = localPayment !== device.payment_enabled || 
                     localPhotobooth !== (device.enable_photobooth ?? true) ||
                     localSelfPhoto !== (device.enable_self_photo ?? false) ||
                     localEventId !== (device.event_id || '') ||
                     JSON.stringify(localDurations) !== JSON.stringify(device.self_photo_durations || [5, 10, 15]) ||
                     JSON.stringify([...localFrames].sort()) !== JSON.stringify([...(device.available_frames || [])].sort())

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdate(device.id, { 
      payment_enabled: localPayment,
      enable_photobooth: localPhotobooth,
      enable_self_photo: localSelfPhoto,
      self_photo_durations: localDurations,
      available_frames: localFrames,
      event_id: localEventId || null
    })
    setIsSaving(false)
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 custom-scrollbar overflow-y-auto pr-6">
      <PageHeader
        badge="UNIT CONFIGURATION • OPERATIONAL PARAMETERS"
        titleMain={device.name}
        titleHighlight="Settings"
        description="Configure hardware identity, payment gateways, and operational modes for this specific deployment."
        icon={Smartphone}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button 
            onClick={onBack}
            className="w-14 h-14 bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 group"
          >
            <ChevronLeft size={24} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
          </button>

          {hasChanges ? (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 animate-in zoom-in duration-300"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Commit Settings
            </button>
          ) : (
            <div className="px-8 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 border border-slate-200 bg-white/50 flex items-center gap-3 transition-all">
              <Check size={18} className="text-emerald-500" />
              Synced to Cloud
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-10">
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Calendar size={120} />
            </div>
            
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Calendar size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800 tracking-tight">Event Association</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Logical Grouping</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Hubungkan perangkat ini ke event tertentu untuk mempermudah manajemen dan pelaporan.
              </p>
              
              <div className="relative">
                <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                <select 
                  value={localEventId}
                  onChange={e => setLocalEventId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-8 py-5 font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">No Special Event</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <ShieldCheck size={120} />
            </div>
            
            <div className="flex items-center gap-5 mb-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${localPayment ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800 tracking-tight">Payment Gateway</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Managed via QRIS System</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Aktifkan pembayaran otomatis untuk setiap sesi foto. Pengguna wajib melakukan pembayaran via QRIS sebelum sistem kamera aktif.
              </p>
              
              <button 
                onClick={() => setLocalPayment(!localPayment)}
                className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-4 transition-all duration-500 border-2 ${localPayment ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}
              >
                <div className={`w-3 h-3 rounded-full ${localPayment ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                {localPayment ? 'Payment Active' : 'Payment Disabled'}
              </button>
            </div>
            
            {/* Mode Configuration */}
            <div className="mt-10 border-t border-slate-100/50 pt-8">
              <h5 className="text-sm font-black text-slate-800 tracking-tight mb-4">Device Application Modes</h5>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white/50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Photobooth / Photobox</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Standard 3-shot layout mode</p>
                  </div>
                  <button 
                    onClick={() => setLocalPhotobooth(!localPhotobooth)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${localPhotobooth ? 'bg-blue-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-sm ${localPhotobooth ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white/50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Self Photo</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Free-roaming timer mode</p>
                  </div>
                  <button 
                    onClick={() => setLocalSelfPhoto(!localSelfPhoto)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${localSelfPhoto ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-sm ${localSelfPhoto ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {localSelfPhoto && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-3">Self Photo Durations (Minutes)</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {localDurations.map((dur, i) => (
                        <div key={i} className="bg-white border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2 group shadow-sm">
                          <span className="text-sm font-black text-slate-700">{dur < 1 ? `${dur * 60}s` : `${dur}m`}</span>
                          <button 
                            onClick={() => setLocalDurations(localDurations.filter((_, idx) => idx !== i))}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="Min..."
                        className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          if (newDuration && !isNaN(newDuration)) {
                            setLocalDurations([...localDurations, parseFloat(newDuration)].sort((a,b) => a-b))
                            setNewDuration('')
                          }
                        }}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 italic font-medium">Use 0.5 for 30 seconds</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Frames Authorization */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Layout size={120} />
          </div>

          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layout size={28} />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-800 tracking-tight">Authorized Frames</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Device Access Control</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar flex-1">
            {availableFrames.map(frame => {
              const isSelected = localFrames.includes(frame.id)
              return (
                <div 
                  key={frame.id}
                  onClick={() => {
                    const next = isSelected 
                      ? localFrames.filter(id => id !== frame.id)
                      : [...localFrames, frame.id]
                    setLocalFrames(next)
                  }}
                  className={`p-4 rounded-[1.25rem] border-2 transition-all duration-300 cursor-pointer flex items-center gap-4 ${isSelected ? 'border-blue-500/20 bg-blue-500/5 shadow-sm' : 'border-slate-100 bg-white/40 hover:border-slate-200 hover:bg-white'}`}
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 relative group">
                    <img src={frame.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={frame.name} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-black text-slate-800 truncate">{frame.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Template ID: {frame.id.slice(0,8)}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 text-white scale-110' : 'bg-slate-100 text-transparent'}`}>
                    <Check size={14} strokeWidth={4} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
