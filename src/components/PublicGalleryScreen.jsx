import { useState, useEffect } from 'react'
import { Download, AlertCircle, Loader2, Sparkles, Image as ImageIcon, Link as LinkIcon, DownloadCloud } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const PublicGalleryScreen = ({ galleryId }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Unlock body scroll for gallery view
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    return () => {
      // Re-lock body scroll when leaving gallery
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
  }, []);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data: captureData, error: dbError } = await supabase
          .from('captures')
          .select('image_url, raw_photos, gif_url, created_at')
          .eq('session_id', galleryId)
          .single()

        if (dbError) throw dbError
        if (!captureData) throw new Error("Gallery not found")

        setData(captureData)
      } catch (err) {
        console.error("Gallery fetch error:", err)
        setError("Gallery not found or has expired.")
      } finally {
        setLoading(false)
      }
    }

    if (galleryId) {
      fetchGallery()
    }
  }, [galleryId])

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("Download failed:", err)
      window.open(url, '_blank')
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col gap-6 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 opacity-50 blur-3xl"></div>
        <Loader2 size={64} className="text-blue-400 animate-spin relative z-10" />
        <p className="text-blue-200 font-bold tracking-[0.3em] uppercase text-sm relative z-10 animate-pulse">Loading Magic...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-200 via-slate-100 to-slate-200">
        <div className="bg-white/80 backdrop-blur-2xl p-16 rounded-3xl shadow-2xl border border-white max-w-lg w-full text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <AlertCircle size={150} />
           </div>
           <AlertCircle size={64} className="text-rose-500 mx-auto mb-8 relative z-10" />
           <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight relative z-10">Oops!</h2>
           <p className="text-slate-500 font-medium relative z-10">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-[#F8FAFC] relative selection:bg-blue-300 selection:text-blue-900 pb-32">
      
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden -z-10 bg-[#F8FAFC]">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
        <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-purple-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-20 w-[600px] h-[600px] bg-pink-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-3000" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-16 flex flex-col items-center">
        
        {/* Header Section (Centered) */}
        <div className="text-center mb-16 animate-in slide-in-from-top-12 duration-1000 flex flex-col items-center">
           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 font-bold text-xs tracking-widest uppercase mb-4 backdrop-blur-md">
             <Sparkles size={14} /> Digital Prints
           </div>
           <h1 className="text-5xl md:text-7xl font-black font-caveat tracking-tighter text-slate-900 leading-[1.1] pb-1">
             Your Latarcerita <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 pr-4">
               Memories.
             </span>
           </h1>
           <p className="text-slate-400 font-medium tracking-wide mt-3 text-base">
             Captured on {new Date(data.created_at).toLocaleDateString('en-US', {
               weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
             })}
           </p>
           
           <div className="flex gap-4 mt-8">
              <button 
                onClick={copyLink}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all shadow-xl border border-slate-100"
                title="Copy Gallery Link"
              >
                {copied ? <CheckCircle2 size={24} className="text-green-500" /> : <LinkIcon size={24} />}
              </button>
           </div>
        </div>

        {/* Centered Single Column Content */}
        <div className="w-full flex flex-col items-center gap-16">
          
          {/* 1. Framed Layout Section (Full Width / Centered) */}
          {data.image_url && (
            <div className="w-full max-w-xl flex flex-col items-center animate-in slide-in-from-bottom-12 duration-1000 delay-150 px-2">
              <div className="flex items-center gap-2 mb-6">
                <ImageIcon size={28} className="text-blue-500" />
                <h2 className="text-4xl md:text-5xl font-black font-caveat text-slate-800 tracking-tight">The Layout</h2>
              </div>
              
              <div className="relative w-full bg-white p-2 md:p-3 rounded-[1.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <img 
                  src={data.image_url} 
                  alt="Layout" 
                  className="w-full h-auto rounded-xl object-contain mb-3"
                />
                
                <button 
                  onClick={() => handleDownload(data.image_url, 'latarcerita-layout.png')}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-black tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md text-[10px]"
                >
                  <DownloadCloud size={16} /> Download Layout
                </button>
              </div>
            </div>
          )}

          {/* 2. Raw Photos Grid (Centered) */}
          {data.raw_photos && data.raw_photos.length > 0 && (
            <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-12 duration-1000 delay-300 px-2">
               <div className="flex flex-col items-center mb-8">
                 <div className="flex items-center gap-2 mb-1">
                   <ImageIcon size={28} className="text-slate-400" />
                   <h2 className="text-4xl md:text-5xl font-black font-caveat text-slate-800 tracking-tight">Original Cuts</h2>
                 </div>
                 <span className="bg-slate-800 text-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                   {data.raw_photos.length} Captures
                 </span>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {data.raw_photos.map((url, i) => (
                     <div key={i} className="bg-white p-1.5 rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col gap-1.5">
                        <img 
                          src={url} 
                          alt={`Original cut ${i+1}`}
                          className="w-full h-auto aspect-[4/3] object-cover rounded-lg" 
                          loading="lazy"
                        />
                        <button 
                          onClick={() => handleDownload(url, `latarcerita-raw-${i+1}.jpg`)}
                          className="w-full py-2 bg-slate-50 text-slate-800 rounded-md font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:bg-blue-600 active:text-white transition-all"
                        >
                          <Download size={12} /> Download
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Global Floating Action Button for Mobile / General Download */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
           <div className="bg-slate-900/40 backdrop-blur-2xl px-6 py-3 rounded-full text-white font-medium text-sm tracking-wide border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
              Scroll or tap a photo to download
           </div>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

// Inline fallback for CheckCircle icon if missing in user's import scope
function CheckCircle2(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

export default PublicGalleryScreen
