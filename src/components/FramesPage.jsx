import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Home, Image as ImageIcon, Search, Filter, Loader2, ArrowRight } from 'lucide-react'
import DecorativeBackground from './DecorativeBackground'

const FramesPage = ({ user }) => {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCount, setFilterCount] = useState('all')

  useEffect(() => {
    const fetchFrames = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching frames:', error)
      } else {
        const processed = (data || []).map(f => {
          if (f.photo_count) return f;
          if (f.slots && Array.isArray(f.slots)) {
            const unique = [...new Set(f.slots.map(s => s.number))];
            return { ...f, photo_count: unique.length };
          }
          return { ...f, photo_count: 0 };
        })
        setFrames(processed)
      }
      setLoading(false)
    }
    fetchFrames()
  }, [])

  const filteredFrames = frames.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterCount === 'all' || f.photo_count.toString() === filterCount
    return matchesSearch && matchesFilter
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
          Frame Gallery
        </h1>
        <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px]">
          Explore our collection of premium photobooth frames
        </p>
      </header>

      {/* Controls Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 mb-20 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search frames by name..."
            className="w-full pl-14 pr-8 py-6 bg-white border-2 border-slate-200 focus:border-blue-400 rounded-[32px] outline-none font-bold text-slate-700 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 p-2 bg-white border border-slate-100 rounded-[32px] shadow-sm">
          {['all', '2', '3'].map((count) => (
            <button
              key={count}
              onClick={() => setFilterCount(count)}
              className={`px-10 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${filterCount === count ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {count === 'all' ? 'All' : `${count} Shots`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 size={64} className="animate-spin text-blue-100" />
            <p className="font-black text-slate-200 uppercase tracking-widest text-xs">Curating frames...</p>
          </div>
        ) : filteredFrames.length === 0 ? (
          <div className="text-center py-40">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon size={40} className="text-slate-200" />
             </div>
             <p className="text-slate-400 font-black text-xl">No frames found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
            {filteredFrames.map((frame) => (
              <div 
                key={frame.id} 
                className="group relative flex flex-col items-center"
              >
                {/* Image Container - No Background, Just Dashed Border */}
                <div 
                  className="relative transition-all duration-700 drop-shadow-md group-hover:drop-shadow-2xl"
                  style={{
                    width: '240px',
                    height: '360px',
                  }}
                >
                  <img 
                    src={frame.image_url} 
                    alt={frame.name}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Subtle Overlays */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <p className="text-[10px] font-black text-white truncate text-center uppercase tracking-widest">
                      {frame.name.replace(/\.[^/.]+$/, '')}
                    </p>
                    <p className="text-[8px] font-bold text-blue-400 text-center uppercase tracking-[0.2em] mt-1">
                      {frame.photo_count} Shots
                    </p>
                  </div>
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

export default FramesPage
