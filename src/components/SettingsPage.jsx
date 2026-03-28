import { useState, useEffect, useRef } from 'react'
import FrameEditor from './FrameEditor'
import { Upload, Plus, Save, Trash2, Home, Lock, Unlock, ZoomIn, ZoomOut, Copy, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const SettingsPage = ({ user }) => {
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

  // Load frames from Supabase on mount
  useEffect(() => {
    const loadFrames = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('user_id', user?.id)
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
  }, [])

  // Keyboard shortcuts: Ctrl+C / Ctrl+V for copy-paste layers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (!isMeta || !activeFrameId) return

      if (e.key === 'c') {
        const currentFrame = frames.find(f => f.id === activeFrameId)
        if (!currentFrame) return
        const slot = currentFrame.slots.find(s => s.id === selectedLayerId)
        if (slot) {
          clipboardRef.current = { ...slot }
          console.log('📋 Copied slot:', slot.number)
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
        setFrames(prev => prev.map(f =>
          f.id === activeFrameId ? { ...f, slots: [...f.slots, newSlot] } : f
        ))
        setSelectedLayerId(newId)
        console.log('📌 Pasted slot as Foto', source.number)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [frames, activeFrameId, selectedLayerId])

  const toggleLock = (id) => {
    setLockedLayers(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const activeIndex = frames.findIndex(f => f.id === activeFrameId)
  const activeFrame = frames[activeIndex]
  const boxes = activeFrame?.slots || []

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('frames')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload failed:', uploadError)
      alert('Gagal upload frame: ' + uploadError.message)
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
  }

  const updateFrame = (updates) => {
    setFrames(prev => prev.map(f =>
      f.id === activeFrameId ? { ...f, ...updates } : f
    ))
  }

  const addSlot = () => {
    if (!activeFrameId) {
      alert('Upload atau Pilih Frame terlebih dahulu!')
      return
    }
    const newId = Date.now()
    const nextNumber = boxes.length + 1
    const newBox = {
      id: newId,
      number: nextNumber,
      x: 50,
      y: 50,
      width: 200,
      height: 300
    }

    setFrames(prev => prev.map(f =>
      f.id === activeFrameId ? { ...f, slots: [...f.slots, newBox] } : f
    ))
    setSelectedLayerId(newId)
  }

  const updateBox = (id, updates) => {
    setFrames(prev => prev.map(f =>
      f.id === activeFrameId ? {
        ...f,
        slots: f.slots.map(box => box.id === id ? { ...box, ...updates } : box)
      } : f
    ))
  }

  const deleteBox = (id) => {
    setFrames(prev => prev.map(f =>
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
    const frame = frames.find(f => f.id === id)
    if (frame?.supabaseId) {
      // Delete from DB
      await supabase.from('frames').delete().eq('id', frame.supabaseId)
      // Delete from Storage (extract filename from URL)
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

    // photo_count = unique photo numbers (e.g. slots [1,1,2,2,3,3] → 3 unique photos)
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
      console.log('✅ Saved to Supabase:', { frame: activeFrame.name, slots: slotsForDb.length, uniquePhotos: photoCount })
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-10 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <a href="/" className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <Home size={24} className="text-slate-400" />
          </a>
          <div>
            <h1 className="font-black text-2xl tracking-tight leading-none mb-1">Frame Editor</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Latarcerita Photobooth Pro</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-xs font-bold tracking-widest uppercase">
          Integrated Coordinate Mapping Tool
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Management */}
        <aside className="w-80 bg-white border-r border-slate-100 flex flex-col p-8 overflow-y-auto">
          <div className="mb-10">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black">F</span>
              Management
            </h2>

            <div className="space-y-6">
              {/* 1. Upload & Create Section */}
              <div className="space-y-3">
                <label
                  htmlFor="frame-upload"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 rounded-[28px] font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 hover:bg-white transition-all cursor-pointer group"
                >
                  <Upload size={16} className="group-hover:scale-110 transition-transform" />
                  Tambah Frame
                  <input
                    type="file"
                    id="frame-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*"
                  />
                </label>

                <button
                  onClick={addSlot}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-50 text-gradient-blue border-2 border-blue-100 rounded-[28px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95"
                >
                  <Plus size={16} /> Tambah Slot
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-[28px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save to Cloud</>}
                </button>
              </div>

              {/* 2. Zoom Controls Section */}
              <div className="p-4 bg-slate-50 rounded-[32px] space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canvas Zoom</span>
                  <span className="text-[10px] font-black text-blue-500">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                    className="flex-1 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:shadow-md transition-all border border-white hover:border-red-100"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    onClick={() => setZoom(0.8)}
                    className="flex-1 h-12 bg-white rounded-2xl flex items-center justify-center text-[9px] font-black text-slate-400 hover:text-blue-500 transition-all border border-white"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                    className="flex-1 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:shadow-md transition-all border border-white hover:border-blue-100"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Editor Canvas */}
        <main className="flex-1 p-16 flex flex-col items-center justify-start overflow-y-auto bg-slate-50/50">
          <div className="flex flex-col items-center gap-6 mt-10">
            <FrameEditor
              key={activeFrameId}
              frame={activeFrame}
              boxes={boxes}
              onUpdateBox={updateBox}
              onDeleteBox={deleteBox}
              onUpdateFrame={updateFrame}
              frameVisible={layersVisibility.frame}
              hiddenSlotIds={hiddenSlots}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              lockedLayerIds={lockedLayers}
              zoom={zoom}
            />
            <p className="text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase opacity-50">Editor Area (4R - 102x152mm)</p>
          </div>
        </main>

        {/* Right Sidebar: Layers Panel */}
        <aside className="w-96 bg-white border-l border-slate-100 flex flex-col p-8 overflow-y-auto">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-3 text-slate-800">
              <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">L</span>
              Layers
            </h2>
          </div>

          <div className="flex-1 space-y-2">
            {/* Frame Layer Item */}
            {activeFrame && (
              <div
                onClick={() => setSelectedLayerId(activeFrame.id)}
                className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all cursor-pointer ${selectedLayerId === activeFrame.id ? 'border-blue-500 bg-blue-50/50' : layersVisibility.frame ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-50'}`}
              >
                <div className="w-12 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                  <img src={activeFrame.url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[11px] font-black text-slate-800 truncate">{activeFrame.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Main Frame (Z:10)</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(activeFrame.id); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${lockedLayers.includes(activeFrame.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-100'}`}
                    title={lockedLayers.includes(activeFrame.id) ? "Unlock Layer" : "Lock Layer"}
                  >
                    {lockedLayers.includes(activeFrame.id) ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLayersVisibility(prev => ({ ...prev, frame: !prev.frame })) }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${layersVisibility.frame ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-300 hover:bg-slate-100'}`}
                  >
                    <Plus size={16} className={layersVisibility.frame ? 'rotate-45' : ''} />
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="py-4 flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-slate-100"></div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Photo Slots</span>
              <div className="h-[1px] flex-1 bg-slate-100"></div>
            </div>

            {/* Slot Layer Items */}
            <div className="space-y-2">
              {[...boxes].reverse().map(box => {
                const isHidden = hiddenSlots.includes(box.id);
                return (
                  <div
                    key={box.id}
                    onClick={() => setSelectedLayerId(box.id)}
                    className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all cursor-pointer ${selectedLayerId === box.id ? 'border-blue-500 bg-blue-50/50' : !isHidden ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-50'}`}
                  >
                    <div className="w-12 h-12 bg-red-50 text-red-400 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border border-red-100">
                      #{box.number}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-[11px] font-black text-slate-800 truncate">Foto {box.number}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Photo Slot (Z:0)</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLock(box.id); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${lockedLayers.includes(box.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-100'}`}
                        title={lockedLayers.includes(box.id) ? "Unlock Layer" : "Lock Layer"}
                      >
                        {lockedLayers.includes(box.id) ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setHiddenSlots(prev => isHidden ? prev.filter(id => id !== box.id) : [...prev, box.id]) }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${!isHidden ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-300 hover:bg-slate-100'}`}
                      >
                        <Plus size={16} className={!isHidden ? 'rotate-45' : ''} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {boxes.length === 0 && (
                <div className="py-10 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-100">
                  <p className="text-slate-300 text-[10px] font-black tracking-widest uppercase">No Slots Created</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default SettingsPage
