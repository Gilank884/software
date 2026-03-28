import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Home, Image as ImageIcon, Search, Download, Trash2, Loader2, Calendar, Share2 } from 'lucide-react'
import DecorativeBackground from './DecorativeBackground'

const GalleryPage = ({ user }) => {
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchCaptures = async () => {
      if (!user) return
      setLoading(true)
      const { data, error } = await supabase
        .from('captures')
        .select(`
          *,
          frames (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching captures:', error)
      } else {
        setCaptures(data || [])
      }
      setLoading(false)
    }
    fetchCaptures()
  }, [user])

  const handleDelete = async (id, imageUrl) => {
    if (!confirm('Are you sure you want to delete this photo from your gallery?')) return

    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('captures').delete().eq('id', id)
      if (dbError) throw dbError

      // 2. Delete from Storage (extract filename)
      const urlParts = imageUrl.split('/')
      const fileName = urlParts.slice(urlParts.indexOf('frames') + 1).join('/')
      await supabase.storage.from('frames').remove([fileName])

      setCaptures(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete item.')
    }
  }

  const filteredCaptures = captures.filter(c => {
    const frameName = c.frames?.name?.toLowerCase() || ''
    const date = new Date(c.created_at).toLocaleDateString().toLowerCase()
    return frameName.includes(searchTerm.toLowerCase()) || date.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden pb-20">
      <DecorativeBackground opacity="opacity-20" />

      {/* Header Section */}
      <header className="relative z-10 pt-20 pb-16 px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <a href="/" className="mb-10 p-5 bg-white rounded-3xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all group shadow-sm border border-slate-100">
          <Home size={28} className="group-hover:scale-110 transition-transform" />
        </a>
        <h1 className="text-8xl font-black tracking-tighter mb-6 font-caveat text-slate-900 italic">
          My Gallery
        </h1>
        <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px]">
          Your collection of digital photobooth memories
        </p>
      </header>

      {/* Controls Section */}
      <div className="relative z-10 max-w-2xl mx-auto px-8 mb-20">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by frame or date..."
            className="w-full pl-14 pr-8 py-6 bg-white border-2 border-slate-200 focus:border-blue-400 rounded-[32px] outline-none font-bold text-slate-700 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 size={64} className="animate-spin text-blue-100" />
            <p className="font-black text-slate-200 uppercase tracking-widest text-xs">Loading your memories...</p>
          </div>
        ) : filteredCaptures.length === 0 ? (
          <div className="text-center py-40">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={40} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black text-xl">No photos found in your gallery</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
            {filteredCaptures.map((capture) => (
              <div
                key={capture.id}
                className="group relative flex flex-col bg-white rounded-[40px] p-4 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100"
              >
                {/* Image Preview */}
                <div className="relative aspect-[2/3] w-full rounded-[30px] overflow-hidden bg-slate-100 mb-6 group-hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src={capture.image_url}
                    alt="Capture"
                    className="w-full h-full object-cover"
                  />

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-4">
                    <a
                      href={capture.image_url}
                      download
                      target="_blank"
                      className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                    >
                      <Download size={20} />
                    </a>
                    <button
                      onClick={() => handleDelete(capture.id, capture.image_url)}
                      className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="px-2 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      {new Date(capture.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-slate-800 truncate">
                    {capture.frames?.name || 'Custom Frame'}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <div className="mt-40 text-center opacity-20 pointer-events-none">
        <span className="text-[12vw] font-black font-caveat text-slate-100 italic select-none">Latarcerita Photobooth</span>
      </div>
    </div>
  )
}

export default GalleryPage
