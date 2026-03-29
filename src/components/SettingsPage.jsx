import { useState, useEffect, useRef } from 'react'
import FrameEditor from './FrameEditor'
import { Home, Upload, Plus, Save, Trash2, Lock, Unlock, ZoomIn, ZoomOut, Loader2, Maximize2, Eraser, Check, Layout, RotateCcw, RotateCw, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const CANVAS_CONFIG = {
  '4R': { width: 600, height: 900, label: '4R - 102×152mm', pxPerCm: 58.8235 },
  'A4': { width: 636, height: 900, label: 'A4 - 210×297mm', pxPerCm: 30.2857 }
}

const SettingsPage = ({ user }) => {
  const [canvasSize, setCanvasSize] = useState('4R')
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
  const [eraserGuide, setEraserGuide] = useState(null)
  const [selectionPalette, setSelectionPalette] = useState([])
  const [toast, setToast] = useState(null)
  const thumbnailCanvasRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  // Undo/Redo State
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const pushToHistory = (newFrames) => {
    setPast(prev => [...prev.slice(-20), frames])
    setFrames(newFrames)
    setFuture([])
  }

  const undo = () => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)
    setFuture(prev => [frames, ...prev])
    setFrames(previous)
    setPast(newPast)
  }

  const startRename = (id, currentName) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleRename = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null)
      return
    }

    const currentFrame = frames.find(f => f.id === activeFrameId)
    if (!currentFrame) return

    let newFrames
    if (editingId === activeFrameId) {
      newFrames = frames.map(f => f.id === editingId ? { ...f, name: editingName } : f)
    } else {
      newFrames = frames.map(f => f.id === activeFrameId ? {
        ...f,
        slots: f.slots.map(s => s.id === editingId ? { ...s, name: editingName } : s)
      } : f)
    }

    pushToHistory(newFrames)
    setEditingId(null)
    setToast({ type: 'success', message: 'Lapisan Berhasil Dinamai Ulang!' })
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    const newFuture = future.slice(1)
    setPast(prev => [...prev, frames])
    setFrames(next)
    setFuture(newFuture)
  }
  

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Load frames from Supabase on mount
  useEffect(() => {
    const loadFrames = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('user_id', user?.id)
        .eq('size_type', canvasSize)
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
  }, [user?.id, canvasSize])

  // Keyboard shortcuts: Ctrl+C / Ctrl+V for copy-paste layers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo/Redo Control Cepat (Z & Y)
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }

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
        pushToHistory(frames.map(f =>
          f.id === activeFrameId ? { ...f, slots: [...f.slots, newSlot] } : f
        ))
        setSelectedLayerId(newId)
        console.log('📌 Pasted slot as Foto', source.number)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [frames, activeFrameId, selectedLayerId, past, future])

  const toggleLock = (id) => {
    setLockedLayers(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const activeIndex = frames.findIndex(f => f.id === activeFrameId)
  const activeFrame = frames[activeIndex]
  const boxes = activeFrame?.slots || []

  // Pre-generate a thumbnail for instant palette extraction
  useEffect(() => {
    if (!activeFrame?.url) {
      thumbnailCanvasRef.current = null
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = activeFrame.url
    img.onload = () => {
      const thumb = document.createElement('canvas')
      const maxDim = 500
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight)
      thumb.width = img.naturalWidth * scale
      thumb.height = img.naturalHeight * scale
      const ctx = thumb.getContext('2d')
      ctx.drawImage(img, 0, 0, thumb.width, thumb.height)
      thumbnailCanvasRef.current = thumb
    }
  }, [activeFrame?.url])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Clear input so selecting same file again after error triggers change
    const target = e.target
    target.value = ''

    setSaving(true)
    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload failed:', uploadError)
        setToast({ type: 'error', message: 'Gagal upload frame: ' + uploadError.message })
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
          frame_width: CANVAS_CONFIG[canvasSize].width,
          frame_height: CANVAS_CONFIG[canvasSize].height,
          size_type: canvasSize,
          slots: []
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert failed:', insertError)
        setToast({ type: 'error', message: 'Gagal menyimpan frame: ' + insertError.message })
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
      setToast({ type: 'success', message: 'Frame Berhasil Diunggah!' })
    } catch (err) {
      console.error('Upload process failed:', err)
      setToast({ type: 'error', message: 'Terjadi kesalahan sistem.' })
    } finally {
      setSaving(false)
    }
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
        name: activeFrame.name,
        frame_x: Math.round(activeFrame.x),
        frame_y: Math.round(activeFrame.y),
        frame_width: Math.round(activeFrame.width),
        frame_height: Math.round(activeFrame.height),
        size_type: canvasSize,
        slots: slotsForDb,
        photo_count: photoCount
      })
      .eq('id', activeFrame.supabaseId || activeFrame.id)

    if (error) {
      console.error('Save failed:', error)
      setToast({ type: 'error', message: 'Gagal Menyimpan Frame!' })
    } else {
      setToast({ type: 'success', message: 'Frame Berhasil Disimpan!' })
      setActiveFrameId(null)
      setSelectedLayerId(null)
    }
    setSaving(false)
  }

  const handleUpdateEraserGuide = (rect) => {
    setEraserGuide(rect)
    analyzeAreaPalette(rect, false)
  }

  const extractPaletteFromData = (data, shouldClose) => {
    const colorCounts = {}
    for (let i = 0; i < data.length; i += 4 * 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 128) continue
      const qr = Math.round(r / 10) * 10
      const qg = Math.round(g / 10) * 10
      const qb = Math.round(b / 10) * 10
      const key = `${qr},${qg},${qb}`
      colorCounts[key] = (colorCounts[key] || 0) + 1
    }

    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key]) => key)

    setSelectionPalette(sortedColors)
    if (shouldClose) setToast({ type: 'success', message: 'Palette Warna Berhasil Dibuat!' })
  }

  const analyzeAreaPalette = async (rect, shouldClose = true) => {
    if (!activeFrame) return
    
    if (thumbnailCanvasRef.current) {
      const thumb = thumbnailCanvasRef.current
      const ctx = thumb.getContext('2d')
      const scaleX = thumb.width / activeFrame.width
      const scaleY = thumb.height / activeFrame.height
      const rx = Math.round(rect.x * scaleX)
      const ry = Math.round(rect.y * scaleY)
      const rw = Math.round(rect.width * scaleX)
      const rh = Math.round(rect.height * scaleY)

      const imageData = ctx.getImageData(rx, ry, rw, rh)
      extractPaletteFromData(imageData.data, shouldClose)
      return
    }

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = activeFrame.url
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const scaleX = img.naturalWidth / activeFrame.width
      const scaleY = img.naturalHeight / activeFrame.height
      const rx = Math.round(rect.x * scaleX)
      const ry = Math.round(rect.y * scaleY)
      const rw = Math.round(rect.width * scaleX)
      const rh = Math.round(rect.height * scaleY)
      const imageData = ctx.getImageData(rx, ry, rw, rh)
      extractPaletteFromData(imageData.data, shouldClose)
    } catch (err) {
      console.error('Palette extraction failed:', err)
    }
  }

  const eraseSpecificColor = async (rgbStr, area = null) => {
    if (!activeFrame) return
    const [tr, tg, tb] = rgbStr.split(',').map(Number)

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = activeFrame.url
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { width, height, data } = imageData

      const scaleX = width / (activeFrame.width || 600)
      const scaleY = height / (activeFrame.height || 900)
      const rx = area ? Math.round(area.x * scaleX) : 0
      const ry = area ? Math.round(area.y * scaleY) : 0
      const rw = area ? Math.round(area.width * scaleX) : width
      const rh = area ? Math.round(area.height * scaleY) : height

      let pixelsCleared = 0
      const tol = 25
      const matchedMap = new Uint8Array(width * height)

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          if (x < 0 || x >= width || y < 0 || y >= height) continue
          const i = (y * width + x) * 4
          const dr = Math.abs(data[i] - tr), dg = Math.abs(data[i+1] - tg), db = Math.abs(data[i+2] - tb)
          const matchTol = (tr < 50 && tg < 10 && tb < 10) ? 15 : tol
          if ((dr <= matchTol && dg <= matchTol && db <= matchTol) || (data[i+3] > 0 && data[i+3] < 80)) {
            matchedMap[y * width + x] = 1
          }
        }
      }

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const idx = y * width + x
          if (matchedMap[idx] === 1) {
            const i = idx * 4
            data[i] = data[i+1] = data[i+2] = data[i+3] = 0
            pixelsCleared++
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx
                if (nx >= rx && nx < rx + rw && ny >= ry && ny < ry + rh) {
                  const nIdx = ny * width + nx, ni = nIdx * 4
                  if (data[ni+3] > 0 && data[ni+3] < 180) {
                    data[ni] = data[ni+1] = data[ni+2] = data[ni+3] = 0
                    pixelsCleared++
                  }
                }
              }
            }
          }
        }
      }

      if (pixelsCleared > 0) {
        ctx.putImageData(imageData, 0, 0)
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        const fileName = `${Date.now()}_palette_erased_${activeFrame.name.split('.')[0]}.png`
        const { error: uploadError } = await supabase.storage.from('frames').upload(fileName, blob, { contentType: 'image/png' })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('frames').getPublicUrl(fileName)
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
        
        await supabase.from('frames').update({ image_url: publicUrl }).eq('id', activeFrame.supabaseId || activeFrame.id)
        setFrames(prev => prev.map(f => f.id === activeFrameId ? { ...f, url: cacheBustedUrl } : f))
        setToast({ type: 'success', message: `Berhasil Kosongkan Frame!` })
      }
    } catch (err) {
      console.error('Erasure failed:', err)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300 bg-white">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400">Loading Environment...</p>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col relative bg-slate-50/50">
          
          {/* Top Horizontal Toolbar (Photoshop Style) */}
          <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between gap-6 relative z-10 shadow-sm">
            
            {/* Group 1: Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-2xl">
              <button onClick={undo} disabled={past.length === 0} className="group relative p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all">
                <RotateCcw size={18} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                  Batal
                </span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
              <button onClick={redo} disabled={future.length === 0} className="group relative p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all">
                <RotateCw size={18} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                  Ulangi
                </span>
              </button>
            </div>

            <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>

            {/* Group 2: Format Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50">
              {Object.keys(CANVAS_CONFIG).map(size => (
                <button
                  key={size}
                  onClick={() => {
                    if (canvasSize === size) return
                    setActiveFrameId(null)
                    setCanvasSize(size)
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${canvasSize === size ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="flex-1"></div>

            {/* Group 4: Zoom Controls */}
            <div className="flex items-center gap-2 p-1 bg-white rounded-2xl shadow-inner border border-slate-100">
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="group relative p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <ZoomOut size={16} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                  Perkecil
                </span>
              </button>
              <div className="w-12 text-center">
                <span className="text-[10px] font-black text-slate-700 tabular-nums">{Math.round(zoom * 100)}%</span>
              </div>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="group relative p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <ZoomIn size={16} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                  Perbesar
                </span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
              <button onClick={() => setZoom(0.8)} className="group relative px-3 py-1.5 text-[8px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">
                Reset
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                  Normal
                </span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-10">
            <div className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.15)] bg-white p-2 rounded-sm ring-1 ring-slate-200">
              <FrameEditor
                key={activeFrameId || canvasSize}
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
                eraserGuide={eraserGuide}
                onUpdateEraserGuide={handleUpdateEraserGuide}
                width={CANVAS_CONFIG[canvasSize].width}
                height={CANVAS_CONFIG[canvasSize].height}
                canvasSize={canvasSize}
                pxPerCm={CANVAS_CONFIG[canvasSize].pxPerCm}
              />
            </div>
            <p className="text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase opacity-50">Editor Area ({CANVAS_CONFIG[canvasSize].label})</p>
          </div>

          {/* Toast Pop-up */}
          {toast && (
            <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl border-2 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-500 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {toast.type === 'success' ? <Check size={18} /> : <Trash2 size={18} />}
              </div>
              <p className="text-[10px] font-black tracking-widest uppercase">{toast.message}</p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Photoshop-style Pro Panel */}
        <aside 
          className={`transition-all duration-500 ease-in-out bg-white border-l border-slate-200 flex flex-col relative ${isSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
        >
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="fixed right-6 top-1/2 -translate-y-1/2 w-10 h-20 bg-white border border-slate-200 rounded-l-3xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-xl z-[100] group"
            >
              <Plus size={24} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          )}

          <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar gap-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-3 text-slate-800">
                <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">P</span>
                Pro Panel
              </h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                title="Sembunyikan Panel"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="frame-upload"
                className="flex items-center gap-4 px-5 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 hover:bg-white transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Upload size={16} />
                </div>
                Import Frame
                <input type="file" id="frame-upload" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>

              <button
                onClick={addSlot}
                className="w-full flex items-center gap-4 px-5 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plus size={16} />
                </div>
                Tambah Slot
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center gap-4 px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </div>
                Commit Changes
              </button>
            </div>

            {/* Section 2: Smart Tools */}
            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precision Kit</span>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Palette Detector</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, idx) => {
                      const rgb = selectionPalette[idx];
                      return (
                        <div key={idx} className="relative group aspect-square">
                          {rgb ? (
                            <button
                              onClick={() => eraseSpecificColor(rgb, eraserGuide)}
                              className="w-full h-full rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-110"
                              style={{ backgroundColor: `rgb(${rgb})` }}
                              title="Click to erase this color"
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-2xl">
                                <Eraser size={12} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-full h-full rounded-2xl border border-dashed border-slate-200 bg-white/50 flex items-center justify-center">
                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Smart Tools */}
            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precision Kit</span>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Palette Detector</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, idx) => {
                      const rgb = selectionPalette[idx];
                      return (
                        <div key={idx} className="relative group aspect-square">
                          {rgb ? (
                            <button
                              onClick={() => eraseSpecificColor(rgb, eraserGuide)}
                              className="w-full h-full rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-110"
                              style={{ backgroundColor: `rgb(${rgb})` }}
                              title="Click to erase this color"
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-2xl">
                                <Eraser size={12} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-full h-full rounded-2xl border border-dashed border-slate-200 bg-white/50 flex items-center justify-center">
                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Layers hierarchy */}
            <div className="flex-1 flex flex-col min-h-0">
               <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Layer Hierarchy</h3>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                {activeFrame && (
                  <div
                    onClick={() => setSelectedLayerId(activeFrame.id)}
                    className={`group flex items-center gap-4 p-4 rounded-[24px] border transition-all cursor-pointer ${selectedLayerId === activeFrame.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="w-10 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 shadow-inner">
                      <img src={activeFrame.url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 truncate">
                      {editingId === activeFrame.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                          onBlur={handleRename}
                          className="w-full bg-blue-50 border border-blue-400 text-[11px] font-black p-1 rounded-md outline-none"
                        />
                      ) : (
                        <p
                          onDoubleClick={() => startRename(activeFrame.id, activeFrame.name)}
                          className="text-[11px] font-black text-slate-800 truncate"
                        >
                          {activeFrame.name}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Frame</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(activeFrame.id, activeFrame.name); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                        title="Ubah Nama"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLock(activeFrame.id); }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${lockedLayers.includes(activeFrame.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-100'}`}
                      >
                        {lockedLayers.includes(activeFrame.id) ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLayersVisibility(prev => ({ ...prev, frame: !prev.frame })) }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${layersVisibility.frame ? 'text-blue-500 bg-blue-50' : 'text-slate-300 hover:bg-slate-100'}`}
                      >
                        <Plus size={16} className={layersVisibility.frame ? 'rotate-45' : ''} />
                      </button>
                    </div>
                  </div>
                )}

                {boxes.length > 0 && (
                  <div className="pt-2">
                     {[...boxes].reverse().map(box => {
                      const isHidden = hiddenSlots.includes(box.id);
                      return (
                        <div
                          key={box.id}
                          onClick={() => setSelectedLayerId(box.id)}
                          className={`group flex items-center gap-4 p-4 rounded-[24px] border transition-all cursor-pointer mb-2 ${selectedLayerId === box.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                        >
                          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0 border border-red-100 shadow-inner">
                            #{box.number}
                          </div>
                          <div className="flex-1 truncate">
                            {editingId === box.id ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                onBlur={handleRename}
                                className="w-full bg-blue-50 border border-blue-400 text-[11px] font-black p-1 rounded-md outline-none"
                              />
                            ) : (
                              <p
                                onDoubleClick={() => startRename(box.id, box.name || `Slot #${box.number}`)}
                                className="text-[11px] font-black text-slate-800 truncate"
                              >
                                {box.name || `Slot #${box.number}`}
                              </p>
                            )}
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{box.width}×{box.height}px</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(box.id, box.name || `Slot #${box.number}`); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                              title="Ubah Nama"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLock(box.id); }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${lockedLayers.includes(box.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-100'}`}
                            >
                              {lockedLayers.includes(box.id) ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setHiddenSlots(prev => isHidden ? prev.filter(id => id !== box.id) : [...prev, box.id]) }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!isHidden ? 'text-blue-500 bg-blue-50' : 'text-slate-300 hover:bg-slate-100'}`}
                            >
                              <Plus size={16} className={!isHidden ? 'rotate-45' : ''} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default SettingsPage
