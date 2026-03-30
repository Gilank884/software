import { useState } from 'react'
import { Plus, Calendar, Trash2, Loader2, Edit2, Check, X, Activity } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import PageHeader from './PageHeader'

export default function EventsView({ user, events, devices, onRefresh }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name) return
    setIsSaving(true)

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update({ name, description })
        .eq('id', editingEvent.id)
      
      if (!error) {
        setEditingEvent(null)
        onRefresh()
      }
    } else {
      const { error } = await supabase
        .from('events')
        .insert([{ 
          creator_id: user.id, 
          name, 
          description 
        }])

      if (!error) {
        setIsAdding(false)
        onRefresh()
      }
    }
    
    setName('')
    setDescription('')
    setIsSaving(false)
  }

  const deleteEvent = async (id) => {
    if (!confirm('Hapus event ini? Semua perangkat yang terhubung akan dilepas dari event ini.')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) onRefresh()
  }

  const startEdit = (event) => {
    setEditingEvent(event)
    setName(event.name)
    setDescription(event.description || '')
    setIsAdding(true)
  }

  return (
    <div className="space-y-12 overflow-y-auto pr-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
      <PageHeader
        badge="EVENT COORDINATOR • PROGRAM MANAGER"
        titleMain="Active"
        titleHighlight="Events"
        description="Organize your photobooth sessions by specific high-traffic events for better fleet tracking."
        icon={Calendar}
      >
        <button 
          onClick={() => { setIsAdding(true); setEditingEvent(null); setName(''); setDescription(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20"
        >
          <Plus size={20} />
          Create New Event
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div 
            key={event.id}
            className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Calendar size={80} />
            </div>
            
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                <Calendar size={28} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => startEdit(event)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteEvent(event.id)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2 truncate">{event.name}</h3>
            <p className="text-slate-500 text-sm line-clamp-2 min-h-[40px] mb-6">
              {event.description || 'No description provided.'}
            </p>

            {/* Linked Devices Section */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Linked Fleet</span>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  {devices.filter(d => d.event_id === event.id).length} units
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {devices.filter(d => d.event_id === event.id).length > 0 ? (
                  devices.filter(d => d.event_id === event.id).slice(0, 3).map(device => (
                    <div key={device.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <span className="text-[9px] font-bold text-slate-600 truncate max-w-[80px]">{device.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[9px] font-medium text-slate-300 italic">No devices currently assigned</span>
                )}
                {devices.filter(d => d.event_id === event.id).length > 3 && (
                  <span className="text-[9px] font-bold text-slate-400 mt-1">+{devices.filter(d => d.event_id === event.id).length - 3} more</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100/50">
               <div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Session Start</p>
                 <p className="text-xs font-black text-slate-700 mt-0.5">
                   {new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                 </p>
               </div>
               <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${devices.filter(d => d.event_id === event.id).length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                 {devices.filter(d => d.event_id === event.id).length > 0 ? 'Operational' : 'Idle'}
               </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/20 rounded-[3rem] border-2 border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
               <Calendar size={40} />
             </div>
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Events Created</p>
             <p className="text-slate-300 text-xs mt-2 italic">Start by creating your first session event.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-[950]/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative bg-white rounded-[3rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] w-full max-w-md p-12 animate-in zoom-in slide-in-from-bottom-8 duration-500 border border-white/20">
            <div className="w-20 h-20 bg-blue-500 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto mb-8">
              <Calendar size={40} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 text-center tracking-tight">
              {editingEvent ? 'Update Event' : 'New Event Session'}
            </h3>
            <p className="text-slate-500 text-center mb-10 font-medium">Define the core identity of your photobooth event.</p>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Event Name</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="e.g. Wedding Anisa & Budi"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description (Optional)</label>
                <textarea 
                  placeholder="Tell us more about this event..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || !name}
                  className="flex-1 bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    editingEvent ? 'Update' : 'Schedule'
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
