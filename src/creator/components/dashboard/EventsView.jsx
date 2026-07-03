import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Calendar, Trash2, Loader2, Edit2, Check, X, Activity, ChevronRight, ArrowLeft, Download, Eye, Smartphone, ImageIcon, RefreshCcw, Printer, AlertCircle, HardDrive, Mail, Link2, Copy } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import PageHeader from './PageHeader'

export default function EventsView({ user, events, devices, onRefresh }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([])
  const [logoFile, setLogoFile] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  // New State for Table & Drill-down
  const [allCaptures, setAllCaptures] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventCaptures, setEventCaptures] = useState([])
  const [loadingCaptures, setLoadingCaptures] = useState(false)
  const [selectedCapture, setSelectedCapture] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCaptures, setTotalCaptures] = useState(0)
  const PHOTOS_PER_PAGE = 4

  // Storage usage state untuk event yang sedang dibuka
  const [eventStorageBytes, setEventStorageBytes] = useState(null) // null=belum dihitung, number=bytes
  const [loadingStorage, setLoadingStorage] = useState(false)

  const [copiedEventId, setCopiedEventId] = useState(null)

  // Email State
  const [emailInput, setEmailInput] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Printer Settings State
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selectedPrinter') || '')
  const [selectedPaperSize, setSelectedPaperSize] = useState(localStorage.getItem('selectedPaperSize') || '4r')
  const [autoEpsonMatte, setAutoEpsonMatte] = useState(localStorage.getItem('autoEpsonMatte') === 'true')
  const [isElectron, setIsElectron] = useState(!!window.electronAPI)

  useEffect(() => {
    if (user?.id) {
      fetchAllCaptures()
    }
    
    // Fetch printers if in Electron
    if (window.electronAPI?.getPrinters) {
      window.electronAPI.getPrinters().then(list => {
        setPrinters(list || [])
        // If no printer selected but there are printers, default to system default if available
        if (!selectedPrinter && list?.length > 0) {
          const defaultPrinter = list.find(p => p.isDefault)
          if (defaultPrinter) {
            setSelectedPrinter(defaultPrinter.name)
            localStorage.setItem('selectedPrinter', defaultPrinter.name)
          }
        }
      })
    }
  }, [user?.id])

  const fetchAllCaptures = async () => {
    let query = supabase.from('captures').select('id, event_id')
    
    if (!user.isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error: capturesError } = await query
    
    if (capturesError) {
      console.warn('Column event_id might be missing in captures table:', capturesError)
      setAllCaptures([])
      return
    }
    setAllCaptures(data || [])
  }

  const fetchEventCaptures = async (eventId, page = 1) => {
    setLoadingCaptures(true)
    const from = (page - 1) * PHOTOS_PER_PAGE
    const to = from + PHOTOS_PER_PAGE - 1

    const { data, error } = await supabase
      .from('captures')
      .select('id, image_url, session_id, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching event captures:', error)
      setEventCaptures([])
      if (error.message.includes('event_id')) {
        alert('Fitur pelacakan foto memerlukan kolom "event_id" di tabel "captures". Silakan tambahkan kolom tersebut di Supabase Dashboard.')
      }
    } else {
      setEventCaptures(data || [])
    }
    setLoadingCaptures(false)
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const calculateEventStorage = async (eventId) => {
    setLoadingStorage(true)
    setEventStorageBytes(null)
    try {
      const { data: caps } = await supabase
        .from('captures')
        .select('image_url, raw_photos')
        .eq('event_id', eventId)

      const urls = []
      for (const cap of (caps || [])) {
        if (cap.image_url) urls.push(cap.image_url)
        if (Array.isArray(cap.raw_photos)) urls.push(...cap.raw_photos)
      }

      if (urls.length === 0) { setEventStorageBytes(0); return }

      const results = await Promise.allSettled(
        urls.map(url =>
          fetch(url, { method: 'HEAD' })
            .then(r => parseInt(r.headers.get('content-length') || '0', 10))
            .catch(() => 0)
        )
      )
      const total = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)
      setEventStorageBytes(total)
    } catch {
      setEventStorageBytes(0)
    } finally {
      setLoadingStorage(false)
    }
  }

  const getThumbUrl = (url, width = 600) => {
    if (!url) return url
    if (url.includes('/storage/v1/object/public/')) {
      return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=75&resize=cover`
    }
    return url
  }

  const handleSendEmail = async (sessionId) => {
    if (!emailInput || !emailInput.includes('@')) {
      alert('Masukkan alamat email yang valid.')
      return
    }
    setSendingEmail(true)
    setEmailSent(false)
    try {
      const galleryBase = import.meta.env.VITE_GALLERY_URL || "https://fotoku.latarcerita.com"
      const galleryUrl = `${galleryBase}/?gallery=${sessionId}`
      const { error } = await supabase.functions.invoke('send-photo-email', {
        body: { email: emailInput, galleryUrl },
      })
      if (error) throw error
      setEmailSent(true)
      setEmailInput('')
      setTimeout(() => setEmailSent(false), 3000)
    } catch (err) {
      const detail = await err?.context?.json?.().catch(() => null)
      console.error('Send email error:', err, detail)
      alert(`Gagal mengirim email.\n\n${detail?.error || err?.message || 'Unknown error'}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handlePrint = async (imageUrl) => {
    alert('Memulai proses cetak... Mohon tunggu.');
    
    // 1. Try specialized Electron printing if available (Direct/Silent Print)
    if (window.electronAPI?.printImage) {
      try {
        console.log(`[AutoPrint] Sending URL to main process: ${imageUrl}`);
        const printerPaperSize = selectedPaperSize === 'a4_plus' ? 'a4' : selectedPaperSize;
        
        // Pass URL directly to main process - it's much faster and avoids large string limits
        window.electronAPI.printImage(imageUrl, 1, selectedPrinter, printerPaperSize, autoEpsonMatte);
        
        // Give immediate visual feedback
        setTimeout(() => {
          alert('Perintah cetak telah dikirim ke printer.');
        }, 1000);
        return;
      } catch (err) {
        console.error('Electron Print Error:', err);
        alert('Gagal mencetak secara otomatis. Mencoba metode alternatif...');
      }
    }

    // 2. Fallback to standard browser printing using a Hidden Iframe
    // If we are here, we are likely in a standard browser where silent print is not possible
    let printFrame = document.getElementById('print-frame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <html>
        <head>
          <title>Print - Latarcerita</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; background: white; }
            body { display: flex; align-items: center; justify-content: center; }
            img { max-width: 100%; max-height: 100vh; width: auto; height: auto; display: block; }
            @media print {
              @page { margin: 0; size: auto; }
              html, body { width: 100%; height: 100%; overflow: hidden; }
              img { max-width: 100%; max-height: 100vh; width: auto; height: auto; page-break-after: avoid; break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" />
          <script>
            function tryPrint() {
              var img = document.querySelector('img');
              if (img.complete) {
                window.focus();
                window.print();
              } else {
                setTimeout(tryPrint, 100);
              }
            }
            window.onload = tryPrint;
          </script>
        </body>
      </html>
    `);
    frameDoc.close();
  }

  const handleDownload = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `capture-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if blob fails
      window.open(imageUrl, '_blank');
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setCurrentPage(1)
    setTotalCaptures(allCaptures.filter(c => c.event_id === event.id).length)
    fetchEventCaptures(event.id, 1)
    calculateEventStorage(event.id)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchEventCaptures(selectedEvent.id, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleSave = async (e) => {
    e.preventDefault()
    if (!name) return
    setIsSaving(true)

    let finalLogoUrl = logoUrl
    if (logoFile) {
      setIsUploading(true)
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('events')
        .upload(filePath, logoFile)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('events')
          .getPublicUrl(filePath)
        finalLogoUrl = publicUrl
      }
      setIsUploading(false)
    }

    if (editingEvent) {
      const { error: eventError } = await supabase
        .from('events')
        .update({ name, description, logo_url: finalLogoUrl })
        .eq('id', editingEvent.id)
      
      if (!eventError) {
        await supabase
          .from('devices')
          .update({ event_id: null })
          .eq('event_id', editingEvent.id)
          
        if (selectedDeviceIds.length > 0) {
           await supabase
             .from('devices')
             .update({ event_id: editingEvent.id })
             .in('id', selectedDeviceIds)
        }
        
        setEditingEvent(null)
        onRefresh()
      }
    } else {
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([{ 
          creator_id: user.id, 
          name, 
          description,
          logo_url: finalLogoUrl
        }])
        .select()
        .single()

      if (!eventError && newEvent) {
        if (selectedDeviceIds.length > 0) {
           await supabase
             .from('devices')
             .update({ event_id: newEvent.id })
             .in('id', selectedDeviceIds)
        }
        
        setIsAdding(false)
        onRefresh()
      }
    }
    
    setName('')
    setDescription('')
    setLogoFile(null)
    setLogoUrl('')
    setSelectedDeviceIds([])
    setIsSaving(false)
  }

  // Ekstrak storage path dari public URL, misal:
  // "https://xxx.supabase.co/storage/v1/object/public/frames/captures/uid/file.png"
  // → "captures/uid/file.png"
  const extractStoragePath = (url, bucket) => {
    try {
      const marker = `/storage/v1/object/public/${bucket}/`
      const idx = url.indexOf(marker)
      if (idx === -1) return null
      return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
    } catch {
      return null
    }
  }

  // Hapus file-file foto dari Supabase Storage berdasarkan daftar captures
  const deleteCapureFilesFromStorage = async (captures) => {
    const paths = []
    for (const cap of captures) {
      if (cap.image_url) {
        const p = extractStoragePath(cap.image_url, 'frames')
        if (p) paths.push(p)
      }
      if (Array.isArray(cap.raw_photos)) {
        for (const rawUrl of cap.raw_photos) {
          const p = extractStoragePath(rawUrl, 'frames')
          if (p) paths.push(p)
        }
      }
    }
    // Hapus per batch 100 (batas Supabase)
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from('frames').remove(paths.slice(i, i + 100))
    }
  }

  const deleteEvent = async (e, event) => {
    e.stopPropagation()
    const id = event.id
    if (!confirm(`Hapus event "${event.name}"? \n\nPERHATIAN: Semua foto (captures) dan data terkait dalam event ini akan dihapus secara permanen dari database dan storage!`)) return

    try {
      // 1. Ambil semua captures untuk hapus filenya dari storage
      const { data: captures } = await supabase
        .from('captures')
        .select('id, image_url, raw_photos')
        .eq('event_id', id)

      if (captures?.length) await deleteCapureFilesFromStorage(captures)

      // 2. Hapus record captures dari database
      const { error: capturesError } = await supabase
        .from('captures')
        .delete()
        .eq('event_id', id)

      if (capturesError) console.error('Error deleting event captures:', capturesError)

      // 3. Hapus logo event dari storage
      if (event.logo_url) {
        try {
          const urlParts = event.logo_url.split('/')
          const fileName = urlParts[urlParts.length - 1].split('?')[0]
          await supabase.storage.from('events').remove([`logos/${fileName}`])
        } catch (storageErr) {
          console.error('Error deleting logo from storage:', storageErr)
        }
      }

      // 4. Hapus event itu sendiri
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (!eventError) {
        onRefresh()
      } else {
        alert('Gagal menghapus event: ' + eventError.message)
      }
    } catch (err) {
      console.error('Delete event failed:', err)
      alert('Terjadi kesalahan saat menghapus event.')
    }
  }

  const clearEvent = async (event) => {
    if (!confirm(`Bersihkan semua foto di event "${event.name}"? \n\nSemua foto akan dihapus permanen dari database dan storage, tapi event tetap ada.`)) return

    try {
      // 1. Ambil semua captures untuk hapus filenya dari storage
      const { data: captures, error: fetchError } = await supabase
        .from('captures')
        .select('id, image_url, raw_photos')
        .eq('event_id', event.id)

      if (fetchError) throw fetchError
      if (captures?.length) await deleteCapureFilesFromStorage(captures)

      // 2. Hapus record dari database
      const { error } = await supabase
        .from('captures')
        .delete()
        .eq('event_id', event.id)

      if (!error) {
        fetchEventCaptures(event.id)
        fetchAllCaptures()
        setEventStorageBytes(0) // storage jadi 0 setelah semua file dihapus
      } else {
        alert('Gagal membersihkan event: ' + error.message)
      }
    } catch (err) {
      console.error('Clear event failed:', err)
      alert('Terjadi kesalahan saat membersihkan event.')
    }
  }

  const startEdit = (e, event) => {
    e.stopPropagation()
    setEditingEvent(event)
    setName(event.name)
    setDescription(event.description || '')
    setLogoUrl(event.logo_url || '')
    setLogoFile(null)
    const currentlyAssigned = devices.filter(d => d.event_id === event.id).map(d => d.id)
    setSelectedDeviceIds(currentlyAssigned)
    setIsAdding(true)
  }

  return (
    <>
      {selectedCapture && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f1f5f9] animate-in fade-in duration-200">

          {/* Header */}
          <div className="shrink-0 flex items-center px-5 h-13 bg-white border-b border-slate-200">
            <button
              onClick={() => setSelectedCapture(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                <ArrowLeft size={14} />
              </div>
              <span className="font-semibold text-sm text-slate-600 group-hover:text-blue-600 transition-colors">Kembali ke Galeri</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-6">
            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-5 items-stretch">

              {/* Image Card */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="relative flex-1 flex items-center justify-center bg-slate-50 p-6" style={{ minHeight: 420 }}>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${selectedCapture.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(20px)',
                      opacity: 0.2,
                      transform: 'scale(1.1)',
                    }}
                  />
                  <img
                    src={selectedCapture.image_url}
                    alt="Detail"
                    className="relative z-10 max-h-[420px] w-auto object-contain rounded-xl shadow-lg"
                  />
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesi #{selectedCapture.sessionNumber ?? '—'}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {new Date(selectedCapture.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(selectedCapture.image_url, `capture-${selectedCapture.id.slice(0,8)}.png`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg transition-all uppercase tracking-wider"
                  >
                    <Download size={12} />
                    Download
                  </button>
                </div>
              </div>

              {/* Actions Card */}
              <div className="w-full md:w-72 shrink-0 flex flex-col gap-3">

                {/* Print */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Cetak Foto</p>
                  <button
                    onClick={() => handlePrint(selectedCapture.image_url)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-sm shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Printer size={16} />
                    Print Sekarang
                  </button>
                </div>

                {/* Share */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Bagikan</p>
                  <button
                    onClick={() => {
                      const galleryBase = import.meta.env.VITE_GALLERY_URL || "https://fotoku.latarcerita.com"
                      const galleryUrl = `${galleryBase}/?gallery=${selectedCapture.session_id}`
                      navigator.clipboard.writeText(galleryUrl)
                      alert('Link Galeri berhasil disalin!')
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Link2 size={14} />
                    Salin Link
                  </button>
                </div>

                {/* Email */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kirim Link ke Email</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="contoh@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendEmail(selectedCapture.session_id)}
                      className="flex-1 min-w-0 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 font-medium bg-slate-50"
                    />
                    <button
                      onClick={() => handleSendEmail(selectedCapture.session_id)}
                      disabled={sendingEmail}
                      className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {sendingEmail
                        ? <Loader2 size={13} className="animate-spin" />
                        : emailSent
                        ? <><Check size={13} /> Terkirim</>
                        : <><Mail size={13} /> Kirim</>
                      }
                    </button>
                  </div>
                  {emailSent && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                      <Check size={11} /> Email berhasil dikirim!
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedEvent ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto pr-6 pb-20 custom-scrollbar">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
             <div className="flex-1 flex items-center gap-4">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-colors mr-4"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                {isElectron ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Target Printer (Auto)</span>
                      <select 
                        value={selectedPrinter}
                        onChange={(e) => {
                          setSelectedPrinter(e.target.value);
                          localStorage.setItem('selectedPrinter', e.target.value);
                        }}
                        className="bg-blue-50 border border-blue-100 text-blue-600 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-sm"
                      >
                        <option value="">Default System</option>
                        {printers.map(p => (
                          <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Paper</span>
                      <select 
                        value={selectedPaperSize}
                        onChange={(e) => {
                          setSelectedPaperSize(e.target.value);
                          localStorage.setItem('selectedPaperSize', e.target.value);
                        }}
                        className="bg-slate-50 border border-slate-100 text-slate-600 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-sm"
                      >
                        <option value="4r">4R (4x6)</option>
                        <option value="a4">A4 Standard</option>
                        <option value="a4_plus">A4 Full</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      Standard Browser Mode: Dialog Print Enabled
                    </span>
                  </div>
                )}
             </div>

             <div className="flex items-center gap-3">
                <div className="text-right">
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{selectedEvent.name}</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Event Gallery Results</p>
                </div>
                <div className="w-12 h-12 bg-white border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                   {selectedEvent.logo_url ? (
                     <img src={selectedEvent.logo_url} className="w-full h-full object-cover" alt="Logo" />
                   ) : (
                     <ImageIcon size={24} />
                   )}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
             <button
               onClick={() => clearEvent(selectedEvent)}
               className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm"
             >
               <RefreshCcw size={14} />
               Clear Photos
             </button>
             <button
               onClick={(e) => {
                 deleteEvent(e, selectedEvent);
                 setSelectedEvent(null);
               }}
               className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
             >
               <Trash2 size={14} />
               Delete Event
             </button>

             {/* Storage badge */}
             <div className={`ml-auto flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
               eventStorageBytes !== null && eventStorageBytes > 50 * 1024 * 1024
                 ? 'bg-rose-50 border-rose-200 text-rose-600'
                 : 'bg-slate-50 border-slate-200 text-slate-500'
             }`}>
               {loadingStorage ? (
                 <>
                   <Loader2 size={13} className="animate-spin text-slate-400" />
                   <span className="text-slate-400">Menghitung...</span>
                 </>
               ) : (
                 <>
                   <HardDrive size={13} />
                   <span>
                     {eventStorageBytes === null ? '—' : formatBytes(eventStorageBytes)}
                   </span>
                   <span className="text-slate-300 font-medium normal-case tracking-normal">storage</span>
                 </>
               )}
             </div>
          </div>

          {loadingCaptures ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Synchronizing Results...</p>
            </div>
          ) : eventCaptures.length === 0 ? (
            <div className="text-center py-40 bg-white/20 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon size={40} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Photos Captured Yet</p>
              <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Session results will appear here once guests start posing.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {eventCaptures.map((capture, index) => {
                  const sessionNumber = totalCaptures - ((currentPage - 1) * PHOTOS_PER_PAGE + index)
                  return (
                    <div
                      key={capture.id}
                      onClick={() => setSelectedCapture({ ...capture, sessionNumber })}
                      className="group bg-white/60 backdrop-blur-xl border border-white/40 rounded-none p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-700 cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] rounded-none overflow-hidden bg-slate-100 mb-4">
                        <img
                          src={getThumbUrl(capture.image_url, 600)}
                          onError={(e) => { e.target.onerror = null; e.target.src = capture.image_url }}
                          alt="Capture"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Nomor sesi — badge di atas foto */}
                        <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] font-black tracking-widest">Sesi #{sessionNumber}</span>
                        </div>
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center gap-4">
                          <div className="bg-white/20 backdrop-blur-md border border-white/20 p-4 rounded-full text-white">
                             <Eye size={32} />
                          </div>
                          <p className="text-white font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">View & Print</p>
                        </div>
                      </div>
                      <div className="px-2 pb-2 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                          {new Date(capture.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalCaptures > PHOTOS_PER_PAGE && (
                <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Halaman {currentPage} dari {Math.ceil(totalCaptures / PHOTOS_PER_PAGE)} &nbsp;·&nbsp; {totalCaptures} Foto
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loadingCaptures}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: Math.ceil(totalCaptures / PHOTOS_PER_PAGE) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(totalCaptures / PHOTOS_PER_PAGE) || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-slate-300 font-black text-[10px]">···</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            disabled={loadingCaptures}
                            className={`w-10 h-10 rounded-xl font-black text-[10px] border transition-all ${currentPage === p ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'}`}
                          >
                            {p}
                          </button>
                        )
                      )
                    }

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === Math.ceil(totalCaptures / PHOTOS_PER_PAGE) || loadingCaptures}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-12 overflow-y-auto pr-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
          <PageHeader
            badge="EVENT COORDINATOR • PROGRAM MANAGER"
            titleMain="Active"
            titleHighlight="Events"
            description="Organize your photobooth sessions by specific high-traffic events for better fleet tracking."
            icon={Calendar}
          >
            <button 
              onClick={() => { 
                setIsAdding(true); 
                setEditingEvent(null); 
                setName(''); 
                setDescription(''); 
                setLogoFile(null); 
                setLogoUrl(''); 
                setSelectedDeviceIds([]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] border-b-4 border-blue-800 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20"
            >
              <Plus size={20} />
              Create New Event
            </button>
          </PageHeader>

          {/* Events Table */}
          <div className="bg-white/40 backdrop-blur-xl rounded-none overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Ecosystem Events List</h3>
              <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Real-time Session Monitoring</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event Identity</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Date</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Linked Fleet</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Total Captures</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {events.map((event) => {
                    const eventDevices = devices.filter(d => d.event_id === event.id)
                    const photoCount = allCaptures.filter(c => c.event_id === event.id).length
                    
                    return (
                      <tr 
                        key={event.id} 
                        onClick={() => handleEventClick(event)}
                        className="group hover:bg-white/60 transition-all duration-300 cursor-pointer"
                      >
                        <td className="px-10 py-7">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-none flex items-center justify-center border border-slate-100 overflow-hidden group-hover:border-blue-200 transition-all duration-500">
                              {event.logo_url ? (
                                <img src={event.logo_url} className="w-full h-full object-cover" alt="Logo" />
                              ) : (
                                <Calendar size={20} />
                              )}
                            </div>
                            <div>
                              <span className="block text-base font-black text-slate-800 truncate max-w-[250px]">{event.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1 max-w-[200px]">
                                {event.description || 'Global Session Event'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-7">
                           <div>
                             <span className="block text-[11px] font-black text-slate-700">
                               {new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                             </span>
                             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Initialization Date</span>
                           </div>
                        </td>
                        <td className="px-10 py-7">
                           <div className="flex items-center gap-3">
                             <div className="flex -space-x-3">
                                {eventDevices.slice(0, 3).map(d => (
                                  <div key={d.id} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400 shadow-sm" title={d.name}>
                                    <Smartphone size={14} />
                                  </div>
                                ))}
                                {eventDevices.length > 3 && (
                                  <div className="w-8 h-8 rounded-xl bg-blue-50 border-2 border-white flex items-center justify-center text-blue-600 text-[10px] font-black shadow-sm">
                                    +{eventDevices.length - 3}
                                  </div>
                                )}
                             </div>
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                               {eventDevices.length} Units
                             </span>
                           </div>
                        </td>
                        <td className="px-10 py-7 text-center">
                           <div className="inline-flex flex-col items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                             <span className="text-xl font-black text-slate-900 group-hover:text-blue-600 tabular-nums">{photoCount}</span>
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Captures</span>
                           </div>
                        </td>
                        <td className="px-10 py-7">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 const galleryBase = import.meta.env.VITE_GALLERY_URL || "https://fotoku.latarcerita.com"
                                 navigator.clipboard.writeText(`${galleryBase}/?event=${event.id}`)
                                 setCopiedEventId(event.id)
                                 setTimeout(() => setCopiedEventId(null), 2000)
                               }}
                               className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                 copiedEventId === event.id
                                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                   : 'bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border-slate-100 hover:border-emerald-100'
                               }`}
                               title="Salin Link Galeri Event"
                             >
                               {copiedEventId === event.id ? <Check size={13} /> : <Copy size={13} />}
                               {copiedEventId === event.id ? 'Tersalin!' : 'Salin Link'}
                             </button>
                             <button
                               onClick={(e) => startEdit(e, event)}
                               className="p-3 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 hover:border-blue-100 transition-all"
                               title="Edit Event"
                             >
                               <Edit2 size={16} />
                             </button>
                             <button
                               onClick={(e) => deleteEvent(e, event)}
                               className="p-3 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all"
                               title="Delete Event"
                             >
                               <Trash2 size={16} />
                             </button>
                             <div className="p-3 text-slate-300">
                               <ChevronRight size={20} />
                             </div>
                           </div>
                        </td>
                      </tr>
                    )
                  })}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-10 py-32 text-center">
                         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                           <Calendar size={40} />
                         </div>
                         <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Events Found</p>
                         <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Synchronize your ecosystem to see active sessions.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (Remains same structure but styled) */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-white rounded-none shadow-[0_30px_90px_rgba(0,0,0,0.2)] w-full max-w-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            
            <div className="flex flex-col md:flex-row divide-x divide-slate-100">
              {/* Left Column: Form */}
              <div className="flex-1 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingEvent ? 'Edit Event' : 'New Event'}
                  </h3>
                </div>
                
                <form id="event-form" onSubmit={handleSave} className="space-y-4">
                  <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-100">
                    <div className="relative group">
                      <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                        {(logoFile || logoUrl) ? (
                          <img 
                            src={logoFile ? URL.createObjectURL(logoFile) : logoUrl} 
                            className="w-full h-full object-cover" 
                            alt="Logo Preview" 
                          />
                        ) : (
                          <ImageIcon size={24} className="text-slate-300" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        id="logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-black uppercase tracking-widest cursor-pointer text-center px-1"
                      >
                        Change
                      </label>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest block mb-1">Event Logo</label>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        PNG or JPG recommended.<br/>Will appear on device screens.
                      </p>
                      {!logoFile && !logoUrl && (
                        <label 
                          htmlFor="logo-upload"
                          className="mt-2 inline-block text-[9px] font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline"
                        >
                          Choose File
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Name</label>
                    <input 
                      type="text"
                      autoFocus
                      placeholder="e.g. Wedding Event"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      placeholder="Brief details..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows="2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all text-sm resize-none"
                    />
                  </div>
                </form>
              </div>

              {/* Right Column: Device Assignment */}
              <div className="w-full md:w-72 bg-slate-50/50 p-8 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Assign Fleet</h4>
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5">{selectedDeviceIds.length} Selected</span>
                </div>
                
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                  {devices.map(device => {
                    const isSelected = selectedDeviceIds.includes(device.id)
                    const isOtherEvent = device.event_id && device.event_id !== editingEvent?.id

                    return (
                      <div 
                        key={device.id}
                        onClick={() => {
                          const next = isSelected 
                            ? selectedDeviceIds.filter(id => id !== device.id)
                            : [...selectedDeviceIds, device.id]
                          setSelectedDeviceIds(next)
                        }}
                        className={`p-3 border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Activity size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-slate-800 truncate">{device.name}</p>
                            {isOtherEvent && (
                               <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest truncate">In Use</p>
                            )}
                          </div>
                        </div>
                        <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                           {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3 justify-end">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2.5 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button 
                form="event-form"
                type="submit"
                disabled={isSaving || !name}
                className="bg-slate-900 text-white px-8 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : (editingEvent ? 'Save Changes' : 'Create Event')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
