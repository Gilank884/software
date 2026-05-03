import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, Loader2, ImageIcon, LayoutGrid, Trash2 } from 'lucide-react'
import PageHeader from '../creator/components/dashboard/PageHeader'

const FramesManager = ({ user }) => {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSize, setFilterSize] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const fetchFrames = async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('frames')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching frames:', error)
    } else {
      setFrames(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFrames()
  }, [user?.id])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this frame? This action cannot be undone.')) return
    
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('frames')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setFrames(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete frame.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredFrames = frames.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterSize === 'all' || f.size_type === filterSize
    return matchesSearch && matchesFilter
  })

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
      <Loader2 className="animate-spin" size={48} />
      <p className="font-bold uppercase tracking-widest text-xs">Loading Frames...</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        badge="TEMPLATE REPOSITORY • ASSET ENGINE"
        titleMain="Frame"
        titleHighlight="Library"
        description="Browse and organize your custom photobox templates for various event themes and layouts."
        icon={LayoutGrid}
      />

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300" size={20} />
          <input 
            type="text" 
            placeholder="Search templates by name..."
            className="w-full pl-14 pr-8 py-5 bg-white/40 backdrop-blur-xl border border-white/40 focus:border-blue-400 rounded-3xl outline-none font-black text-slate-800 placeholder:text-slate-300 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:shadow-[0_8px_30px_rgba(59,130,246,0.1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 p-2 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {['all', '4R', 'A4'].map((size) => (
            <button
              key={size}
              onClick={() => setFilterSize(size)}
              className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${filterSize === size ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
            >
              {size === 'all' ? 'All Layouts' : `Format ${size}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-6 pb-20 custom-scrollbar">
        {filteredFrames.length === 0 ? (
          <div className="text-center py-32 bg-white/30 backdrop-blur-md border-[3px] border-dashed border-white/60 rounded-[3rem] flex flex-col items-center justify-center">
             <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center text-slate-200 mb-6 shadow-sm">
               <ImageIcon size={48} />
             </div>
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No matching templates found</p>
             <p className="text-slate-300 text-[10px] mt-2 italic">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredFrames.map((frame) => (
              <div 
                key={frame.id} 
                className="group relative flex flex-col bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-2"
              >
                <div className="aspect-[3/4] relative bg-slate-50/50 overflow-hidden flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <img 
                    src={frame.image_url} 
                    alt={frame.name}
                    className="w-full h-auto object-contain relative z-10 drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Action Buttons Overlay */}
                  <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                    <div className="bg-white/80 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-xl font-black text-[9px] text-slate-600 uppercase tracking-widest shadow-sm">
                      FORMAT {frame.size_type || '4R'}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(frame.id);
                      }}
                      className="w-10 h-10 bg-white/90 backdrop-blur-md border border-white/40 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      disabled={deletingId === frame.id}
                    >
                      {deletingId === frame.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
                <div className="p-8 bg-white/20 border-t border-white/40">
                  <p className="text-xs font-black text-slate-800 truncate uppercase tracking-[0.15em]">{frame.name.replace(/\.[^/.]+$/, '')}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 group-hover:text-blue-500 transition-colors">Digital Template</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FramesManager
