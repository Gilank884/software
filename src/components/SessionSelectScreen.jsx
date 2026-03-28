import { useState, useEffect } from 'react'
import StepWrapper from './StepWrapper'
import { Image as ImageIcon, Star, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const SessionSelectScreen = ({ onSelectSession, user }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('frames')
          .select('id, photo_count, slots')

        if (user?.availableFrames && user.availableFrames.length > 0) {
          query = query.in('id', user.availableFrames)
        } else if (user?.id) {
          query = query.eq('user_id', user.id)
        }

        const { data, error } = await query

        if (error) {
          console.error('Failed to load sessions:', error)
          setLoading(false)
          return
        }

        // Calculate photo_count if null from slots
        const processedData = (data || []).map(f => {
          if (f.photo_count) return f;
          if (f.slots && Array.isArray(f.slots)) {
            const unique = [...new Set(f.slots.map(s => s.number))];
            return { ...f, photo_count: unique.length };
          }
          return f;
        });

        // Get unique photo counts and sort them
        const counts = [...new Set(processedData.map(f => f.photo_count))].sort((a, b) => a - b)
        
        const sessionOptions = counts.map((count) => ({
          id: count,
          title: count === 2 ? 'Standard' : 'Premium',
          shots: count,
          desc: `${count} foto dalam 1 sesi`,
          popular: count === 3
        }))
        
        setSessions(sessionOptions)
      } catch (err) {
        console.error('Supabase connection error:', err)
      }
      setLoading(false)
    }
    loadSessions()
  }, [])

  if (loading) {
    return (
      <StepWrapper title="Pick Session" subtitle="Memuat sesi tersedia...">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-blue-500" />
        </div>
      </StepWrapper>
    )
  }

  if (sessions.length === 0) {
    return (
      <StepWrapper title="Pick Session" subtitle="Belum ada frame yang tersedia">
        <div className="text-center py-20 max-w-md mx-auto">
          <p className="text-slate-400 text-lg font-medium mb-4">Admin belum membuat template frame.</p>
          <p className="text-slate-300 text-sm">Hubungi admin untuk menambahkan frame di halaman Settings.</p>
        </div>
      </StepWrapper>
    )
  }

  return (
    <StepWrapper title="Pick Session" subtitle="Standard or Premium?">
      <div className={`grid grid-cols-1 ${sessions.length > 1 ? 'md:grid-cols-2' : ''} ${sessions.length > 2 ? 'lg:grid-cols-3' : ''} gap-8 max-w-4xl mx-auto font-caveat`}>
        {sessions.map((session) => (
          <button 
            key={session.id}
            onClick={() => onSelectSession(session.shots)}
            className={`bg-white/90 backdrop-blur-3xl p-10 rounded-[60px] border-4 transition-all group relative overflow-hidden text-left flex flex-col items-center text-center ${
              session.popular ? 'border-blue-100 shadow-xl scale-105' : 'border-white shadow-lg hover:border-blue-50'
            }`}
          >
            {session.popular && (
              <div className="absolute top-6 right-6 bg-blue-600 text-white px-4 py-1 rounded-full flex items-center gap-2 text-[10px] font-black tracking-widest font-sans z-10">
                 <Star size={10} fill="currentColor" /> POPULAR
              </div>
            )}
            
            <div className={`w-32 h-20 bg-blue-50 rounded-[24px] mb-8 flex items-center justify-center transition-all duration-700 group-hover:scale-110 shadow-inner group-hover:bg-blue-600 group-hover:text-white`}>
               <ImageIcon size={40} className="opacity-40 group-hover:opacity-100" />
            </div>

            <h3 className="text-3xl font-black text-slate-800 mb-2">{session.title}</h3>
            <p className="text-6xl font-black text-gradient-blue mb-4 leading-none tracking-tighter">{session.shots} Shots</p>
            <p className="text-slate-400 font-bold uppercase tracking-widest font-sans text-[10px]">{session.desc}</p>
          </button>
        ))}
      </div>
    </StepWrapper>
  )
}

export default SessionSelectScreen
