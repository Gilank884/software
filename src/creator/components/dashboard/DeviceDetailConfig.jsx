import { useState, useEffect } from 'react'
import { Smartphone, Check, Layout, Loader2, Save, ChevronLeft } from 'lucide-react'
import PageHeader from './PageHeader'

export default function DeviceDetailConfig({ device, availableFrames, onUpdate, onBack }) {
  const [localFrames, setLocalFrames] = useState(device.available_frames || [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalFrames(device.available_frames || [])
  }, [device])

  const hasChanges = JSON.stringify([...localFrames].sort()) !== JSON.stringify([...(device.available_frames || [])].sort())

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdate(device.id, { available_frames: localFrames })
    setIsSaving(false)
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 custom-scrollbar overflow-y-auto pr-6">
      <PageHeader
        badge="UNIT CONFIGURATION • FRAME ASSIGNMENT"
        titleMain={device.name}
        titleHighlight="Settings"
        description="Pilih frame yang tersedia untuk perangkat ini dan hubungkan ke event."
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

      <div>
        {/* Frames */}
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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">
                {localFrames.length} Frame dipilih
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
            {availableFrames.length === 0 && (
              <p className="col-span-full text-slate-400 text-sm font-medium text-center py-10 italic">
                Belum ada frame tersedia. Buat frame dulu di menu Frames.
              </p>
            )}
            {availableFrames.map(frame => {
              const isSelected = localFrames.includes(frame.id)
              const photoCount = Array.isArray(frame.slots) ? frame.slots.length : 0
              return (
                <div
                  key={frame.id}
                  onClick={() => {
                    const next = isSelected
                      ? localFrames.filter(id => id !== frame.id)
                      : [...localFrames, frame.id]
                    setLocalFrames(next)
                  }}
                  className={`relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 group ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                >
                  {/* Frame preview — proporsional */}
                  <div className="bg-slate-100 w-full">
                    <img
                      src={frame.image_url}
                      alt={frame.name}
                      loading="lazy"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  {/* Badge jumlah foto */}
                  {photoCount > 0 && (
                    <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <span className="text-blue-300">▣</span>
                      {photoCount} Foto
                    </div>
                  )}

                  {/* Centang jika dipilih */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-blue-500 text-white scale-110 shadow-lg' : 'bg-white/80 text-transparent border border-slate-200'}`}>
                    <Check size={13} strokeWidth={4} />
                  </div>

                  {/* Nama frame */}
                  <div className={`px-3 py-2.5 border-t transition-colors ${isSelected ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
                    <p className={`text-[11px] font-black truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{frame.name}</p>
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
