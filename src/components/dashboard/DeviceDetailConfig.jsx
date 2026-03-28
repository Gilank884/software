import { useState, useEffect } from 'react'
import { Monitor, ShieldCheck, Palette, Smartphone, Check, Layout, Trash2, Copy, Loader2, Save } from 'lucide-react'

export default function DeviceDetailConfig({ device, availableFrames, onUpdate, onBack }) {
  const [localPayment, setLocalPayment] = useState(device.payment_enabled)
  const [localFrames, setLocalFrames] = useState(device.available_frames || [])
  const [isSaving, setIsSaving] = useState(false)

  // Sync with device prop if it changes externally
  useEffect(() => {
    setLocalPayment(device.payment_enabled)
    setLocalFrames(device.available_frames || [])
  }, [device.id, device.payment_enabled, device.available_frames])

  const hasChanges = localPayment !== device.payment_enabled || 
                     JSON.stringify([...localFrames].sort()) !== JSON.stringify([...(device.available_frames || [])].sort())

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdate(device.id, { 
      payment_enabled: localPayment,
      available_frames: localFrames
    })
    setIsSaving(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
          >
            <Monitor size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800">{device.name}</h2>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100 italic">Configuration</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Device ID: {device.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges ? (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20 animate-in zoom-in duration-300"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          ) : (
            <div className="px-6 py-3 rounded-2xl font-bold text-slate-300 border border-slate-200 bg-white/50 flex items-center gap-2 text-xs uppercase tracking-widest transition-all">
              <Check size={16} />
              Settings Synced
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Payment Gateway Config */}
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
