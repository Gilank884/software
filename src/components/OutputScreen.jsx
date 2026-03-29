import { useState } from 'react'
import { CheckCircle2, Share2, RefreshCcw, Mail, X, Loader2, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { QRCode } from 'react-qr-code'

import StepWrapper from './StepWrapper'

const OutputScreen = ({ galleryData, selectedFrame, selectedFrameData, selectedFilter, onReset, user }) => {
  const [showShareModal, setShowShareModal] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null

  // If galleryData is somehow missing, use fallback logic or URL
  // In production/release, we use the main domain for the gallery link
  const productionBase = "https://latarcerita.com";
  
  const galleryUrl = galleryData?.sessionId 
    ? `${productionBase}/?gallery=${galleryData.sessionId}` 
    : productionBase;

  const handleShareEmail = async (e) => {
    e.preventDefault()
    if (!email) return

    setSending(true)
    setStatus(null)

    try {
      // 1. Log to shared_captures table
      await supabase.from('shared_captures').insert({
        user_id: user?.id,
        email,
        photo_url: galleryUrl,
        frame_id: selectedFrameData?.id,
        filter: selectedFilter
      })

      // 2. Invoke Edge Function with Gallery URL instead of just the image
      const { data, error } = await supabase.functions.invoke('send-photo-email', {
        body: {
          email,
          photoUrl: galleryUrl,
          userName: "Latarcerita User"
        }
      })

      if (error) throw error

      setStatus('success')
      setTimeout(() => {
        setShowShareModal(false)
        setStatus(null)
        setEmail('')
      }, 3000)
    } catch (err) {
      console.error('Email share error:', err)
      setStatus('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <StepWrapper title="Completed!" subtitle="Scan to download all your photos">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-10">
        
        {/* Left Side: QR Code Panel */}
        <div className="flex justify-center transition-all duration-1000">
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-200 flex flex-col items-center animate-in zoom-in-95 duration-700">
            
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
               <ScanLine size={32} />
            </div>
            
            <div className="bg-white p-4 rounded-3xl border-4 border-slate-100 shadow-sm mb-6">
              <QRCode 
                value={galleryUrl} 
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
            </div>
            
            <h3 className="text-3xl font-black text-slate-800 tracking-tight text-center mb-2">Scan & Download</h3>
            <p className="text-slate-500 font-medium text-center animate-pulse">Get all your photos!</p>
          </div>
        </div>

        {/* Right Side: Options & End */}
        <div className="flex flex-col gap-12 font-caveat">
          <div className="bg-transparent text-center relative overflow-hidden group p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-lg shadow-green-200 relative z-10">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-5xl font-black text-slate-900 mb-2 tracking-tight relative z-10">Success!</h3>
            <p className="text-gradient-blue font-black uppercase tracking-widest font-sans text-[10px] relative z-10">Printing in progress</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center justify-center gap-4 p-6 bg-white border border-white rounded-[40px] hover:bg-slate-50 transition-all shadow-sm group"
            >
              <div className="w-14 h-14 bg-slate-100 rounded-[20px] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-200">
                <Share2 size={24} className="group-hover:scale-125 transition-transform" />
              </div>
              <span className="font-black text-slate-800 text-2xl font-sans tracking-wide">Share via Email</span>
            </button>
          </div>

          {/* Share Modal */}
          {showShareModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                onClick={() => !sending && setShowShareModal(false)}
              />

              <div className="bg-white rounded-[48px] p-10 w-full max-w-md relative z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="absolute right-8 top-8 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} className="text-blue-500" />
                  </div>
                  <h4 className="text-4xl font-black text-gradient-blue font-caveat tracking-tight mb-2">Share Link</h4>
                  <p className="text-slate-500 font-sans text-sm font-medium">We'll send the gallery link right away</p>
                </div>

                <form onSubmit={handleShareEmail} className="space-y-6 font-sans">
                  <div>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      required
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-3xl outline-none font-bold text-slate-700 transition-all text-center"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={sending || status === 'success'}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending || status === 'success'}
                    className={`w-full py-5 rounded-3xl font-black text-lg tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${status === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {sending ? (
                      <>Sending... <Loader2 size={20} className="animate-spin" /></>
                    ) : status === 'success' ? (
                      <>Email Sent! <CheckCircle2 size={20} /></>
                    ) : (
                      <>Send Gallery</>
                    )}
                  </button>

                  {status === 'error' && (
                    <p className="text-red-500 text-xs text-center font-bold">Failed to send email. Please try again.</p>
                  )}
                </form>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="w-full py-7 bg-slate-900 text-white rounded-[40px] font-black font-sans uppercase text-2xl tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-6 group"
          >
            Finish <RefreshCcw size={28} className="group-hover:rotate-180 transition-transform duration-1000" />
          </button>
        </div>
      </div>
    </StepWrapper>
  )
}

export default OutputScreen
