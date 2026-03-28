import { useState } from 'react'
import { Plus, Monitor, Check, Copy, Trash2, Loader2, Smartphone, ShieldCheck, Layout } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import DeviceDetailConfig from './DeviceDetailConfig'

export default function DevicesView({ user, devices, frames, onRefresh }) {
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copying, setCopying] = useState(null)

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopying(code)
    setTimeout(() => setCopying(null), 2000)
  }

  const addDevice = async (e) => {
    e.preventDefault()
    if (!newDeviceName) return
    setIsSaving(true)

    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }

    let uniqueCode = generateCode()
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 5) {
      const { data } = await supabase.from('devices').select('id').eq('unique_code', uniqueCode).single()
      if (!data) {
        isUnique = true
      } else {
        uniqueCode = generateCode()
        attempts++
      }
    }

    const { error } = await supabase
      .from('devices')
      .insert([{ 
        creator_id: user.id, 
        name: newDeviceName, 
        unique_code: uniqueCode,
        is_active: true
      }])

    if (!error) {
      setNewDeviceName('')
      setIsAdding(false)
      onRefresh()
    }
    setIsSaving(false)
  }

  const deleteDevice = async (id) => {
    if (!confirm('Hapus perangkat ini?')) return
    const { error } = await supabase.from('devices').delete().eq('id', id)
    if (!error) onRefresh()
  }

  const updateDeviceConfig = async (deviceId, updates) => {
    const { error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', deviceId)

    if (!error) {
      onRefresh()
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice(prev => ({ ...prev, ...updates }))
      }
    }
  }

  if (selectedDevice) {
    return (
      <DeviceDetailConfig 
        device={selectedDevice} 
        availableFrames={frames}
        onUpdate={updateDeviceConfig}
        onBack={() => setSelectedDevice(null)}
      />
    )
  }

  return (
    <div className="space-y-10 overflow-y-auto pr-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Devices</h2>
          <p className="text-slate-500 font-medium mt-2">Manage and monitor your connected photobox hardware.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20"
        >
          <Plus size={20} />
          Register Device
        </button>
      </div>

      {/* Device List (Table) */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Active Inventory</h3>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Sync</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Device Persona</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Access Credentials</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifecycle</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {devices.map((device) => (
                <tr 
                  key={device.id} 
                  className="hover:bg-white/60 transition-colors duration-300 cursor-pointer group"
                  onClick={() => setSelectedDevice(device)}
                >
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                        <Monitor size={22} />
                      </div>
                      <div>
                        <span className="block text-base font-black text-slate-800">{device.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hardware Unit</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                      <code className="bg-slate-900 text-blue-400 px-4 py-2 rounded-xl font-black tracking-[0.2em] text-xs shadow-lg shadow-slate-900/10">
                        {device.unique_code}
                      </code>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(device.unique_code); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        {copying === device.unique_code ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Connected
                    </span>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteDevice(device.id); }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                         <Smartphone size={40} />
                       </div>
                       <div>
                         <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No Devices Detected</p>
                         <p className="text-slate-300 text-[10px] mt-1 italic">Register your first hardware unit to begin.</p>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-[950]/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative bg-white rounded-[3rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] w-full max-w-md p-12 animate-in zoom-in slide-in-from-bottom-8 duration-500 border border-white/20">
            <div className="w-20 h-20 bg-blue-500 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto mb-8">
              <Plus size={40} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 text-center tracking-tight">Deploy New Unit</h3>
            <p className="text-slate-500 text-center mb-10 font-medium">Assign a unique identity to your new photobox hardware.</p>
            
            <form onSubmit={addDevice} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Device Display Name</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="e.g. Sudirman Booth 01"
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || !newDeviceName}
                  className="flex-1 bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    'Provision Unit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
