import { useState, useEffect, useRef } from 'react'
import FrameEditor from './FrameEditor'
import { Upload, Plus, Save, Trash2, Lock, Unlock, ZoomIn, ZoomOut, Loader2, Check, Copy, Layout } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const CanvasManager = ({ user }) => {
  const [frames, setFrames] = useState([])
  const [activeFrameId, setActiveFrameId] = useState(null)
  const [layersVisibility, setLayersVisibility] = useState({ frame: true })
  const [hiddenSlots, setHiddenSlots] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [lockedLayers, setLockedLayers] = useState([])
  const [zoom, setZoom] = useState(0.8)
  const clipboardRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Undo/Redo State
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])

  const pushToHistory = (newFrames) => {
    setPast(prev => [...prev.slice(-29), frames]) // Keep last 30 states
    setFrames(newFrames)
    setFuture([])
  }

  const undo = () => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)
    
    setFuture(prev => [frames, ...prev])
    setFrames(previous)
    setPast(newPast)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    const newFuture = future.slice(1)

    setPast(prev => [...prev, frames])
    setFrames(next)
    setFuture(newFuture)
  }

  // Load frames from Supabase on mount
  useEffect(() => {
    const loadFrames = async () => {
      if (!user?.id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load frames:', error)
        setLoading(false)
        return
      }

      const mapped = (data || []).map(f => ({
        id: f.id,
        name: f.name,
        url: f.image_url,
        x: f.frame_x,
        y: f.frame_y,
        width: f.frame_width,
        height: f.frame_height,
        slots: (f.slots || []).map((s, i) => ({
          ...s,
          id: s.id || Date.now() + i,
        })),
        supabaseId: f.id,
      }))
      setFrames(mapped)
      setLoading(false)
    }
    loadFrames()
  }, [user?.id])

  const toggleLock = (id) => {
    setLockedLayers(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  // Keyboard shortcuts: Ctrl+C / Ctrl+V and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (!isMeta) return

      // Undo: Command/Ctrl + Z
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Command/Ctrl + Shift + Z or Command/Ctrl + Y
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }

      if (!activeFrameId) return

      if (e.key === 'c') {
        const currentFrame = frames.find(f => f.id === activeFrameId)
        if (!currentFrame) return
        const slot = currentFrame.slots.find(s => s.id === selectedLayerId)
        if (slot) {
          clipboardRef.current = { ...slot }
        }
      }

      if (e.key === 'v') {
        if (!clipboardRef.current) return
        e.preventDefault()
        const source = clipboardRef.current
        const currentFrame = frames.find(f => f.id === activeFrameId)
        if (!currentFrame) return
        const newId = Date.now()
        const newSlot = {
          ...source,
          id: newId,
          number: source.number,
          x: source.x + 20,
          y: source.y + 20,
        }
        pushToHistory(frames.map(f =>
          f.id === activeFrameId ? { ...f, slots: [...f.slots, newSlot] } : f
        ))
        setSelectedLayerId(newId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [frames, activeFrameId, selectedLayerId, past, future])

  const activeIndex = frames.findIndex(f => f.id === activeFrameId)
  const activeFrame = frames[activeIndex]
  const boxes = activeFrame?.slots || []

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSaving(true)
    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('frames')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload failed:', uploadError)
      alert('Gagal upload frame: ' + uploadError.message)
      setSaving(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('frames')
      .getPublicUrl(fileName)

    // Insert into database
    const { data: insertData, error: insertError } = await supabase
      .from('frames')
      .insert({
        user_id: user?.id,
        name: file.name,
        image_url: publicUrl,
        frame_x: 0,
        frame_y: 0,
        frame_width: 600,
        frame_height: 900,
        slots: []
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert failed:', insertError)
      alert('Gagal menyimpan frame: ' + insertError.message)
      setSaving(false)
      return
    }

    const newFrame = {
      id: insertData.id,
      name: insertData.name,
      url: insertData.image_url,
      slots: [],
      x: 0,
      y: 0,
      width: 600,
      height: 900,
      supabaseId: insertData.id,
    }
    setFrames(prev => [newFrame, ...prev])
    setActiveFrameId(newFrame.id)
    setSelectedLayerId(newFrame.id)
    setSaving(false)
  }

  const updateFrame = (updates) => {
    pushToHistory(frames.map(f =>
      f.id === activeFrameId ? { ...f, ...updates } : f
    ))
  }

  const addSlot = () => {
    if (!activeFrameId) {
      alert('Upload atau Pilih Frame terlebih dahulu!')
      return
    }
    const newId = Date.now()
    const nextNumber = boxes.length > 0 ? Math.max(...boxes.map(b => b.number)) + 1 : 1
    const newBox = {
      id: newId,
      number: nextNumber,
      x: 50,
      y: 50,
      width: 200,
      height: 300
    }

    pushToHistory(frames.map(f =>
      f.id === activeFrameId ? { ...f, slots: [...f.slots, newBox] } : f
    ))
    setSelectedLayerId(newId)
  }

  const updateBox = (id, updates) => {
    const newFrames = frames.map(f =>
      f.id === activeFrameId ? {
        ...f,
        slots: f.slots.map(box => box.id === id ? { ...box, ...updates } : box)
      } : f
    )
    // For box updates (like dragging), we might want to debounce pushToHistory
    // But for now, simple push
    pushToHistory(newFrames)
  }

  const deleteBox = (id) => {
    pushToHistory(frames.map(f =>
      f.id === activeFrameId ? {
        ...f,
        slots: f.slots.filter(box => box.id !== id).map((box, i) => ({
          ...box,
          number: i + 1
        }))
      } : f
    ))
  }

  const deleteFrame = async (id) => {
    if (!confirm('Hapus frame ini selamanya?')) return
    const frame = frames.find(f => f.id === id)
    if (frame?.supabaseId) {
      await supabase.from('frames').delete().eq('id', frame.supabaseId)
      const urlParts = frame.url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      await supabase.storage.from('frames').remove([fileName])
    }
    setFrames(prev => prev.filter(f => f.id !== id))
    if (activeFrameId === id) setActiveFrameId(null)
  }

  const handleSave = async () => {
    if (!activeFrame) return
    setSaving(true)

    const slotsForDb = boxes.map(box => ({
      number: box.number,
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height)
    }))

    const uniquePhotos = [...new Set(slotsForDb.map(s => s.number))]
    const photoCount = uniquePhotos.length

    const { error } = await supabase
      .from('frames')
      .update({
        frame_x: Math.round(activeFrame.x),
        frame_y: Math.round(activeFrame.y),
        frame_width: Math.round(activeFrame.width),
        frame_height: Math.round(activeFrame.height),
        slots: slotsForDb,
        photo_count: photoCount
      })
      .eq('id', activeFrame.supabaseId || activeFrame.id)

    if (error) {
      console.error('Save failed:', error)
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setActiveFrameId(null)
      setSelectedLayerId(null)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
      <Loader2 className="animate-spin" size={48} />
      <p className="font-bold uppercase tracking-widest text-xs">Loading Canvas...</p>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden bg-white/40 backdrop-blur-2xl rounded-[3rem] border border-white/40 shadow-[0_20px_70px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Left: Management Sidebar */}
      <aside className="w-80 border-r border-white/40 flex flex-col p-8 bg-white/20">
        <div className="mb-10">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Workflow Tools</h3>
          <p className="text-sm font-black text-slate-800 mt-2">Canvas Architect</p>
        </div>
        
        <div className="space-y-4">
          <label className="group flex flex-col items-center justify-center gap-3 w-full py-8 bg-white/40 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-[2rem] cursor-pointer transition-all duration-500">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
              <Upload size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">Import Base Frame</span>
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
          </label>

          <button 
            onClick={addSlot} 
            className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.15em] hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-500/20 border-b-4 border-blue-800"
          >
            <Plus size={18} /> Add Target Slot
          </button>

          <button 
            onClick={handleSave} 
            disabled={saving || !activeFrame} 
            className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.15em] hover:bg-slate-800 disabled:opacity-30 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Commit Changes
          </button>
        </div>

        <div className="mt-12 mb-6 flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace History</span>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{frames.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {frames.map(f => (
            <div 
              key={f.id} 
              onClick={() => setActiveFrameId(f.id)}
              className={`group p-4 rounded-2xl border-2 transition-all duration-500 cursor-pointer flex items-center gap-4 ${activeFrameId === f.id ? 'border-blue-200 bg-blue-500/5 shadow-sm scale-102' : 'border-transparent hover:border-slate-100 hover:bg-white/40'}`}
            >
              <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 shadow-sm relative">
                <img src={f.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                {activeFrameId === f.id && <div className="absolute inset-0 bg-blue-500/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-700 truncate">{f.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {f.id.slice(0,8)}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center: Editor area */}
      <main className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        <div className="relative z-10 p-2 bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 flex items-center gap-2 mb-10">
           <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ZoomOut size={18} /></button>
           <div className="w-16 text-center">
             <span className="text-xs font-black text-slate-700 tabular-nums">{Math.round(zoom * 100)}%</span>
           </div>
           <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ZoomIn size={18} /></button>
           <div className="w-[1px] h-6 bg-slate-200/50 mx-2"></div>
           <button onClick={() => setZoom(0.8)} className="px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Default</button>
        </div>

        <div className="relative transform origin-center transition-all duration-700 ease-out-expo">
           {activeFrame ? (
             <div className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.15)] bg-white p-2 rounded-sm ring-1 ring-slate-200">
               <FrameEditor
                  frame={activeFrame}
                  boxes={boxes}
                  onUpdateBox={updateBox}
                  onDeleteBox={deleteBox}
                  onUpdateFrame={updateFrame}
                  zoom={zoom}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  lockedLayerIds={lockedLayers}
                  frameVisible={layersVisibility.frame}
                  hiddenSlotIds={hiddenSlots}
               />
             </div>
           ) : (
             <div className="w-[450px] h-[650px] border-[3px] border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-6 bg-white/20 backdrop-blur-sm animate-in fade-in zoom-in duration-700">
               <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center text-slate-200 shadow-sm border border-white/40">
                 <Plus size={48} strokeWidth={3} className="opacity-40" />
               </div>
               <div className="text-center">
                 <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Void Workspace</p>
                 <p className="text-[10px] text-slate-300 mt-2 font-medium">Select a frame from the library to begin editing.</p>
               </div>
             </div>
           )}
        </div>
      </main>

      {/* Right: Layers / Details Sidebar */}
      <aside className="w-80 border-l border-white/40 flex flex-col p-8 bg-white/20">
         <div className="mb-10">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Layer Hierarchy</h3>
           <p className="text-sm font-black text-slate-800 mt-2">Active Elements</p>
         </div>

         <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-1">
            {activeFrame && (
              <div 
                onClick={() => setSelectedLayerId(activeFrame.id)}
                className={`group p-5 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex items-center gap-4 ${selectedLayerId === activeFrame.id ? 'border-blue-500/20 bg-white shadow-xl shadow-blue-500/5' : 'bg-white/40 border-transparent hover:border-slate-100 hover:bg-white'}`}
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Layout size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate uppercase tracking-tight">{activeFrame.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Base Component</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLock(activeFrame.id); }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${lockedLayers.includes(activeFrame.id) ? 'text-amber-500 bg-amber-50 shadow-sm' : 'text-slate-300 hover:bg-slate-50'}`}
                  >
                    {lockedLayers.includes(activeFrame.id) ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteFrame(activeFrame.id); }} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                </div>
              </div>
            )}

            {activeFrame && (
              <div className="py-8 flex items-center gap-4 px-2">
                <div className="h-[1px] flex-1 bg-slate-100/50"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Mapping Nodes</span>
                <div className="h-[1px] flex-1 bg-slate-100/50"></div>
              </div>
            )}

            {[...boxes].reverse().map(box => (
              <div 
                key={box.id}
                onClick={() => setSelectedLayerId(box.id)}
                className={`group p-5 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex items-center gap-4 ${selectedLayerId === box.id ? 'border-blue-500/20 bg-white shadow-xl shadow-blue-500/5' : 'bg-white/40 border-transparent hover:border-slate-100 hover:bg-white'}`}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                  {box.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate tracking-tight">Node #{box.number}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{box.width} x {box.height}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLock(box.id); }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${lockedLayers.includes(box.id) ? 'text-amber-500 bg-amber-50 shadow-sm' : 'text-slate-300 hover:bg-slate-50'}`}
                  >
                    {lockedLayers.includes(box.id) ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
         </div>
      </aside>
    </div>
  )
}

export default CanvasManager
