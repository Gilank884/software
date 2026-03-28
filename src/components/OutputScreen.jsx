import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Download, Share2, RefreshCcw, Mail, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

import StepWrapper from './StepWrapper'

const OutputScreen = ({ photos, selectedFrame, selectedFrameData, selectedFilter, onReset, user }) => {
  const [showShareModal, setShowShareModal] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [isSaved, setIsSaved] = useState(false)
  const saveRef = useRef(false)
  const canvasRef = useRef(null)

  // Auto-save to gallery on mount
  useEffect(() => {
    const saveToGallery = async () => {
      if (saveRef.current) return;
      saveRef.current = true;
      
      try {
        const blob = await generateCompositeImage();
        const fileName = `captures/${user?.id}/${Date.now()}.png`;
        
        // 1. Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('frames')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('frames')
          .getPublicUrl(fileName);

        // 3. Insert into captures table
        const { error: insertError } = await supabase.from('captures').insert({
          user_id: user?.id,
          frame_id: selectedFrameData?.id,
          image_url: publicUrl,
          device_id: user?.deviceId,
          device_name: user?.deviceName
        });

        if (insertError) throw insertError;

        setIsSaved(true);
        console.log("✅ Capture auto-saved to user gallery");
      } catch (err) {
        saveRef.current = false; // Allow retry on error
        console.error("❌ Gallery save error:", err);
        alert("Gagal mencatat data ke database: " + err.message);
      }
    };

    if (user && !isSaved && !saveRef.current) {
      saveToGallery();
    }
  }, [user, selectedFrameData, photos, isSaved]);

  const filters = {
    none: "",
    grayscale: "grayscale",
    sepia: "sepia",
    vibrant: "saturate-200 contrast-125"
  }

  const canvasFilters = {
    none: "",
    grayscale: "grayscale(100%)",
    sepia: "sepia(100%)",
    vibrant: "saturate(1.5)",
  }

  const scale = 0.6; // Scale for output preview (original 600x900)

  const handleShareEmail = async (e) => {
    e.preventDefault()
    if (!email) return

    setSending(true)
    setStatus(null)

    try {
      // 1. Generate Composite Image via Canvas
      const blob = await generateCompositeImage()

      // 2. Upload to Supabase Storage
      const fileName = `shared/${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('frames')
        .getPublicUrl(fileName)

      // 4. Log to shared_captures table
      await supabase.from('shared_captures').insert({
        user_id: user?.id,
        email,
        photo_url: publicUrl,
        frame_id: selectedFrameData?.id,
        filter: selectedFilter
      })

      // 5. Invoke Edge Function with Final URL
      const { data, error } = await supabase.functions.invoke('send-photo-email', {
        body: {
          email,
          photoUrl: publicUrl,
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

  const generateCompositeImage = () => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Set fixed resolution 600x900
      canvas.width = 600
      canvas.height = 900

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const loadImage = (src) => {
        if (!src) {
          console.error('loadImage Error: Source is undefined or null');
          return Promise.reject(new Error('Image source is missing'));
        }
        return new Promise((res, rej) => {
          const img = new Image()
          if (typeof src === 'string' && src.startsWith('http')) {
            img.crossOrigin = "anonymous"
          }
          img.onload = () => res(img)
          img.onerror = (err) => {
            console.error('Canvas Image Load Error:', src, err)
            rej(err)
          }
          img.src = src
        })
      }

      const drawAll = async () => {
        try {
          // 1. Draw Photos into Slots
          for (const slot of selectedFrameData.slots) {
            const photoSrc = photos[slot.number - 1]
            if (photoSrc) {
              const img = await loadImage(photoSrc)

              ctx.save()
              // Apply filter
              if (selectedFilter && canvasFilters[selectedFilter]) {
                ctx.filter = canvasFilters[selectedFilter]
              }

              // Draw image (cover style)
              const aspect = img.width / img.height
              const targetAspect = slot.width / slot.height

              let drawW, drawH, drawX, drawY
              if (aspect > targetAspect) {
                drawH = slot.height
                drawW = slot.height * aspect
                drawX = slot.x - (drawW - slot.width) / 2
                drawY = slot.y
              } else {
                drawW = slot.width
                drawH = slot.width / aspect
                drawX = slot.x
                drawY = slot.y - (drawH - slot.height) / 2
              }

              // Clip to slot
              ctx.beginPath()
              ctx.rect(slot.x, slot.y, slot.width, slot.height)
              ctx.clip()

              ctx.drawImage(img, drawX, drawY, drawW, drawH)
              ctx.restore()
            }
          }

          // 2. Draw Frame Overlay
          const frameUrl = selectedFrameData.url || selectedFrameData.image_url
          const frameImg = await loadImage(frameUrl)

          const fx = selectedFrameData.frame_x || 0
          const fy = selectedFrameData.frame_y || 0
          const fw = selectedFrameData.frame_width || 600
          const fh = selectedFrameData.frame_height || 900

          // Replicate 'object-contain' behavior on canvas
          const fAspect = frameImg.width / frameImg.height
          const targetFAspect = fw / fh

          let fDrawW, fDrawH, fDrawX, fDrawY
          if (fAspect > targetFAspect) {
            fDrawW = fw
            fDrawH = fw / fAspect
            fDrawX = fx
            fDrawY = fy + (fh - fDrawH) / 2
          } else {
            fDrawH = fh
            fDrawW = fh * fAspect
            fDrawX = fx + (fw - fDrawW) / 2
            fDrawY = fy
          }

          ctx.drawImage(frameImg, fDrawX, fDrawY, fDrawW, fDrawH)

          // 3. Export to Blob
          canvas.toBlob((blob) => resolve(blob), 'image/png')
        } catch (err) {
          reject(err)
        }
      }

      drawAll()
    })
  }

  return (
    <StepWrapper title="Completed!" subtitle="Collect your prints at the booth">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-10">
        <div className="flex justify-center transition-all duration-1000">
          <div
            className="relative transition-transform duration-1000 animate-float-delayed drop-shadow-2xl"
            style={{
              width: `${600 * 0.6}px`,
              height: `${900 * 0.6}px`,
              backgroundColor: 'transparent'
            }}
          >
            {/* Photo slots */}
            {selectedFrameData?.slots?.map((slot, i) => {
              const photo = photos[slot.number - 1];
              const s = 0.6;
              return (
                <div
                  key={i}
                  className={`absolute overflow-hidden bg-slate-800 ${filters[selectedFilter]}`}
                  style={{
                    left: `${slot.x * s}px`,
                    top: `${slot.y * s}px`,
                    width: `${slot.width * s}px`,
                    height: `${slot.height * s}px`,
                  }}
                >
                  {photo && (
                    <img src={photo} className="w-full h-full object-cover" alt={`Final capture ${slot.number}`} />
                  )}
                </div>
              );
            })}

            {/* Frame overlay */}
            {selectedFrameData && (
              <img
                src={selectedFrameData.image_url}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
                alt="Frame overlay"
                style={{
                  left: `${(selectedFrameData.frame_x || 0) * 0.6}px`,
                  top: `${(selectedFrameData.frame_y || 0) * 0.6}px`,
                  width: `${(selectedFrameData.frame_width || 600) * 0.6}px`,
                  height: `${(selectedFrameData.frame_height || 900) * 0.6}px`,
                }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-12 font-caveat">
          <div className="bg-transparent text-center relative overflow-hidden group p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-lg shadow-green-200 relative z-10">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-5xl font-black text-slate-900 mb-2 tracking-tight relative z-10">Success!</h3>
            <p className="text-gradient-blue font-black uppercase tracking-widest font-sans text-[10px] relative z-10">Enjoy your photos</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button className="flex flex-col items-center justify-center p-6 bg-white border border-white rounded-[40px] hover:bg-slate-50 transition-all shadow-sm group">
              <div className="w-14 h-14 bg-slate-100 rounded-[20px] flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-200">
                <Download size={24} className="group-hover:scale-125 transition-transform" />
              </div>
              <span className="font-black text-slate-800 text-xl">Save</span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex flex-col items-center justify-center p-6 bg-white border border-white rounded-[40px] hover:bg-slate-50 transition-all shadow-sm group"
            >
              <div className="w-14 h-14 bg-slate-100 rounded-[20px] flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-200">
                <Share2 size={24} className="group-hover:scale-125 transition-transform" />
              </div>
              <span className="font-black text-slate-800 text-xl">Share</span>
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
                  <h4 className="text-3xl font-black text-gradient-blue font-caveat">Share to Email</h4>
                  <p className="text-slate-500 text-sm mt-1">We'll send your digital copy right away</p>
                </div>

                <form onSubmit={handleShareEmail} className="space-y-6">
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
                    className={`w-full py-5 rounded-3xl font-black text-xl tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${status === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {sending ? (
                      <>Sending... <Loader2 size={20} className="animate-spin" /></>
                    ) : status === 'success' ? (
                      <>Email Sent! <CheckCircle2 size={20} /></>
                    ) : (
                      <>Send Photo</>
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
            className="w-full py-7 bg-slate-900 text-white rounded-[40px] font-black text-4xl tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-6 group"
          >
            Finish <RefreshCcw size={32} className="group-hover:rotate-180 transition-transform duration-1000" />
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </StepWrapper>
  )
}

export default OutputScreen
