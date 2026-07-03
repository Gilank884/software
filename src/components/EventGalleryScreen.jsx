import { useState, useEffect, useRef } from 'react'
import { Download, Loader2, ImageIcon, AlertCircle, Sparkles, X, ChevronLeft, ChevronRight, Camera, LayoutTemplate, DownloadCloud } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const PHOTOS_PER_PAGE = 24

export default function EventGalleryScreen({ eventId }) {
  const [event, setEvent] = useState(null)
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedCapture, setSelectedCapture] = useState(null)
  const loaderRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100vh'
    }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedCapture(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedCapture ? 'hidden' : 'auto'
  }, [selectedCapture])

  useEffect(() => {
    if (!eventId) return
    fetchEvent()
    fetchCaptures(0, true)
  }, [eventId])

  useEffect(() => {
    if (!loaderRef.current || !hasMore || loadingMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchCaptures(page + 1) },
      { threshold: 0.1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page])

  const fetchEvent = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, logo_url, description')
      .eq('id', eventId)
      .single()
    if (data) setEvent(data)
  }

  const fetchCaptures = async (pageNum, reset = false) => {
    if (pageNum !== 0 && loadingMore) return
    pageNum === 0 ? setLoading(true) : setLoadingMore(true)

    const from = pageNum * PHOTOS_PER_PAGE
    const to = from + PHOTOS_PER_PAGE - 1

    const { data, error: fetchErr } = await supabase
      .from('captures')
      .select('id, image_url, raw_photos, session_id, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (fetchErr) {
      setError(true)
    } else {
      setCaptures(prev => reset ? (data || []) : [...prev, ...(data || [])])
      setHasMore((data || []).length === PHOTOS_PER_PAGE)
      setPage(pageNum)
    }

    pageNum === 0 ? setLoading(false) : setLoadingMore(false)
  }

  const getThumbUrl = (url, width = 600) => {
    if (!url) return url
    if (url.includes('/storage/v1/object/public/')) {
      return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
        `?width=${width}&quality=75&resize=cover`
    }
    return url
  }

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const navigateCapture = (dir) => {
    if (!selectedCapture) return
    const idx = captures.findIndex(c => c.id === selectedCapture.id)
    const next = captures[idx + dir]
    if (next) setSelectedCapture(next)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={24} className="text-indigo-400 animate-pulse" />
          </div>
        </div>
        <p className="text-indigo-400 font-bold tracking-[0.3em] uppercase text-xs">Memuat Kenangan...</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center bg-white rounded-3xl p-12 shadow-xl border border-slate-100 max-w-sm">
          <AlertCircle size={52} className="text-rose-400 mx-auto mb-5" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Galeri Tidak Ditemukan</h2>
          <p className="text-slate-400 text-sm leading-relaxed">Event ini tidak tersedia atau telah dihapus.</p>
        </div>
      </div>
    )
  }

  const selectedIdx = selectedCapture ? captures.findIndex(c => c.id === selectedCapture.id) : -1

  return (
    <div className="min-h-screen font-sans bg-[#F5F7FF] relative overflow-x-hidden">

      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-200/50 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-violet-200/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: 'radial-gradient(rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* ── HERO HEADER ─────────────────────────────────────────────────────── */}
      <header className="relative pt-16 pb-12 px-6 flex flex-col items-center text-center overflow-hidden">

        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[700px] rounded-full border border-indigo-200/40" />
          <div className="absolute w-[450px] h-[450px] rounded-full border border-indigo-300/30" />
        </div>

        {/* ── Headline (di atas logo) ── */}
        <div className="relative z-10 space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 border border-indigo-100 rounded-full backdrop-blur-sm shadow-sm shadow-indigo-100 mb-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">
              {event?.name || 'Event Gallery'}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.0] tracking-tight font-caveat">
            <span className="text-slate-800">Cari </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-500 to-blue-500">
              Kenanganmu
            </span>
            <br />
            <span className="text-slate-500">Disini</span>
          </h1>

          <p className="text-slate-400 text-sm font-medium mt-4">
            Temukan &amp; unduh foto kenangan kamu dari event ini
          </p>
        </div>

        {/* ── Logo (di bawah teks) ── */}
        <div className="relative z-10 mb-10">
          {event?.logo_url ? (
            <div className="relative inline-flex flex-col items-center">
              <div className="absolute -inset-6 bg-white/60 rounded-[2.5rem] blur-2xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-indigo-200/60 border border-indigo-100/60 px-10 py-6">
                <img
                  src={event.logo_url}
                  alt={event?.name || 'Event Logo'}
                  className="h-28 md:h-40 w-auto object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-300/50">
              <Sparkles size={48} className="text-white" />
            </div>
          )}
        </div>

        {/* Stats strip */}
        {captures.length > 0 && (
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex flex-col items-center px-6 py-3 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-2xl shadow-sm">
              <span className="text-2xl font-black text-indigo-600 tabular-nums">
                {captures.length}{hasMore ? '+' : ''}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Foto</span>
            </div>
            {captures[0]?.created_at && (
              <div className="flex flex-col items-center px-6 py-3 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-2xl shadow-sm">
                <span className="text-sm font-black text-slate-700">
                  {new Date(captures[0].created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tanggal</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
      </header>

      {/* ── PHOTO GRID ──────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 pb-24">

        {captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-lg">
              <ImageIcon size={36} className="text-indigo-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs mb-2">Belum Ada Foto</p>
            <p className="text-slate-300 text-xs font-medium mt-1">Foto akan muncul di sini setelah sesi dimulai.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
              {captures.map((capture, i) => (
                <button
                  key={capture.id}
                  onClick={() => setSelectedCapture(capture)}
                  className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/60 transition-all duration-500 cursor-pointer text-left"
                >
                  <div className="relative aspect-[2/3] bg-slate-50 overflow-hidden">
                    <img
                      src={getThumbUrl(capture.image_url, 400)}
                      onError={(e) => { e.target.onerror = null; e.target.src = capture.image_url }}
                      alt={`Foto ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-700/70 via-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col items-end justify-start p-2">
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 text-indigo-600 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg">
                        Lihat Detail
                      </div>
                    </div>
                    {/* Number badge */}
                    <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-md tracking-widest">
                      #{i + 1}
                    </div>
                    {/* Raw count badge */}
                    {capture.raw_photos?.length > 0 && (
                      <div className="absolute top-2 right-2 bg-indigo-500/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-widest">
                        {capture.raw_photos.length}x
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between border-t border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                      {new Date(capture.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="w-4 h-4 rounded-full bg-indigo-50 flex items-center justify-center">
                      <ChevronRight size={10} className="text-indigo-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="flex justify-center mt-14">
              {loadingMore ? (
                <div className="flex items-center gap-3 text-slate-400">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">Memuat lebih banyak...</span>
                </div>
              ) : !hasMore ? (
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="h-px w-16 bg-indigo-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Semua foto telah dimuat</span>
                  <div className="h-px w-16 bg-indigo-100" />
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      {/* ── DETAIL MODAL ────────────────────────────────────────────────────── */}
      {selectedCapture && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCapture(null) }}
        >
          <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl m-3 md:m-6 rounded-3xl shadow-2xl shadow-slate-900/20 border border-white overflow-hidden">

            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100 bg-white/80">
              <div className="flex items-center gap-3">
                {event?.logo_url && (
                  <img src={event.logo_url} alt="" className="h-8 w-auto object-contain" />
                )}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Foto</p>
                  <p className="text-xs font-bold text-slate-600">
                    {new Date(selectedCapture.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}{' · '}
                    {new Date(selectedCapture.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCapture(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-6 items-start">

                {/* ── LEFT: Foto Bingkai ─────────────────────────────────── */}
                <div className="w-full lg:w-[44%] shrink-0">
                  {/* Section label */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                      <LayoutTemplate size={15} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 leading-none">Foto Bingkai</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sudah Digabung</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {selectedCapture.image_url ? (
                      <>
                        {/* Blurred bg */}
                        <div className="relative overflow-hidden">
                          <div
                            className="absolute inset-0 scale-110"
                            style={{
                              backgroundImage: `url(${selectedCapture.image_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'blur(28px)',
                              opacity: 0.12,
                            }}
                          />
                          <div className="relative flex items-center justify-center bg-slate-50/60 p-5 min-h-[300px] md:min-h-[420px]">
                            <img
                              src={selectedCapture.image_url}
                              alt="Foto Bingkai"
                              className="max-h-[420px] w-auto max-w-full object-contain rounded-xl shadow-lg shadow-slate-200"
                            />
                          </div>
                        </div>
                        <div className="p-4 border-t border-slate-100">
                          <button
                            onClick={() => handleDownload(
                              selectedCapture.image_url,
                              `bingkai-${selectedCapture.session_id?.slice(0, 8) || selectedCapture.id.slice(0, 8)}.jpg`
                            )}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
                          >
                            <DownloadCloud size={15} />
                            Download Foto Bingkai
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-200">
                        <ImageIcon size={40} />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RIGHT: Foto Asli ───────────────────────────────────── */}
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center">
                      <Camera size={15} className="text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 leading-none">Foto Asli</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Belum Digabung</p>
                    </div>
                    {selectedCapture.raw_photos?.length > 0 && (
                      <span className="bg-violet-50 border border-violet-100 text-violet-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        {selectedCapture.raw_photos.length} Foto
                      </span>
                    )}
                  </div>

                  {selectedCapture.raw_photos?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCapture.raw_photos.map((url, idx) => (
                        <div
                          key={idx}
                          className="group bg-white rounded-2xl border border-slate-200 hover:border-violet-300 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                            <img
                              src={getThumbUrl(url, 600)}
                              onError={(e) => { e.target.onerror = null; e.target.src = url }}
                              alt={`Asli ${idx + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-violet-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDownload(url, `asli-${idx + 1}-${selectedCapture.session_id?.slice(0, 8) || 'foto'}.jpg`)}
                                className="bg-white/90 text-violet-600 rounded-full p-2.5 hover:bg-white active:scale-95 transition-all shadow-lg"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                              #{idx + 1}
                            </div>
                          </div>
                          <div className="px-3 py-2.5 flex items-center justify-between border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Foto {idx + 1}</span>
                            <button
                              onClick={() => handleDownload(url, `asli-${idx + 1}-${selectedCapture.session_id?.slice(0, 8) || 'foto'}.jpg`)}
                              className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-violet-500 uppercase tracking-widest transition-colors"
                            >
                              <Download size={11} />
                              Unduh
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-dashed border-slate-200">
                      <Camera size={28} className="text-slate-200 mb-3" />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Foto asli tidak tersedia</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-center gap-4 px-8 py-4 border-t border-slate-100 bg-white/80">
              <button
                onClick={() => navigateCapture(-1)}
                disabled={selectedIdx <= 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <ChevronLeft size={14} />
                Sebelumnya
              </button>
              <span className="text-slate-300 text-xs font-bold tabular-nums">
                {selectedIdx + 1} / {captures.length}{hasMore ? '+' : ''}
              </span>
              <button
                onClick={() => navigateCapture(1)}
                disabled={selectedIdx >= captures.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Selanjutnya
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
