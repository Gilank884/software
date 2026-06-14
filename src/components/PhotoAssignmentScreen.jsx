import { useState } from 'react'
import { ChevronRight, CheckCircle2, ImagePlus } from 'lucide-react'
import { QRCode } from 'react-qr-code'

const PhotoAssignmentScreen = ({ photos, selectedFrameData, onFinish }) => {
  const photoSlots = (selectedFrameData?.slots || [])
    .filter(s => s.number > 0 && s.type !== 'qr')
    .sort((a, b) => a.number - b.number)

  const [assignment, setAssignment] = useState(() => {
    const result = {}
    photoSlots.forEach((slot) => {
      result[slot.number] = null
    })
    return result
  })

  const [selectedSlot, setSelectedSlot] = useState(null)

  const handleSlotClick = (slotNumber) => {
    setSelectedSlot(prev => prev === slotNumber ? null : slotNumber)
  }

  const handlePhotoClick = (photoIndex) => {
    if (selectedSlot === null) return
    setAssignment(prev => ({ ...prev, [selectedSlot]: photoIndex }))
    setSelectedSlot(null)
  }

  const allAssigned = photoSlots.every(slot => assignment[slot.number] !== null)
  const filledCount = photoSlots.filter(slot => assignment[slot.number] !== null).length

  const handleFinish = () => {
    if (!allAssigned) return
    const reordered = photoSlots.map(slot => photos[assignment[slot.number]])
    onFinish(reordered)
  }

  const fWidth = selectedFrameData?.frame_width || 600
  const fHeight = selectedFrameData?.frame_height || 900
  const maxW = 340
  const maxH = Math.min(window.innerHeight * 0.72, 600)
  const scale = Math.min(maxW / fWidth, maxH / fHeight)

  const floatDelays = ['0s', '0.7s', '1.4s', '2.1s']
  const validPhotos = photos.filter(Boolean)
  // Triplicate so marquee never runs out regardless of photo count
  const marqueePhotos = [...validPhotos, ...validPhotos, ...validPhotos]

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex flex-row overflow-hidden font-sans">
      <style>{`
        @keyframes float-up-down {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(-0.5deg); }
          66% { transform: translateY(-6px) rotate(0.5deg); }
        }
        .photo-float { animation: float-up-down 3.5s ease-in-out infinite; }

        @keyframes marquee-down {
          0%   { transform: translateY(-33.33%); }
          100% { transform: translateY(0%); }
        }
        @keyframes marquee-up {
          0%   { transform: translateY(0%); }
          100% { transform: translateY(-33.33%); }
        }
        .marquee-down { animation: marquee-down 14s linear infinite; }
        .marquee-up   { animation: marquee-up   14s linear infinite; }
      `}</style>

      {/* ── LEFT MARQUEE — scrolls top → bottom ── */}
      <div className="w-[150px] flex-shrink-0 relative overflow-hidden">
        <div className="marquee-down flex flex-col items-center gap-0 blur-[2px]">
          {marqueePhotos.map((photo, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-white p-[6px] border-b-2 border-blue-100"
              style={{ width: 150 }}
            >
              <img
                src={photo}
                alt=""
                className="w-full object-cover block"
                style={{ height: 90 }}
              />
            </div>
          ))}
        </div>
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-sky-50 to-transparent pointer-events-none z-10" />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative px-6">

        {/* Background blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-[420px] h-[420px] bg-blue-300/25 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[380px] h-[380px] bg-sky-300/25 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-[15%] left-[5%] w-60 h-60 bg-indigo-200/30 rounded-full blur-[55px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[5%] w-52 h-52 bg-cyan-200/35 rounded-full blur-[50px] pointer-events-none" />
        <div className="absolute top-[45%] right-[18%] w-44 h-44 bg-blue-100/40 rounded-full blur-[45px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right,#3b82f6 1px,transparent 1px),linear-gradient(to bottom,#3b82f6 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Header */}
        <div className="text-center mb-20 z-10">
          <h1 className="text-6xl font-black text-slate-800 tracking-tight font-caveat leading-none drop-shadow-sm">
            Atur Posisi Foto
          </h1>
          {selectedSlot !== null && (
            <p className="text-base mt-3 tracking-widest uppercase font-bold text-blue-500">
              ✦ Pilih foto untuk Slot {selectedSlot}
            </p>
          )}
        </div>

        {/* Frame + Photos */}
        <div className="flex gap-14 items-start w-full max-w-5xl justify-center z-10">

          {/* Frame Preview */}
          <div className="flex flex-col items-center gap-4 flex-shrink-0 -mt-16">
            <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Preview Frame</span>
            <div
              className="relative overflow-hidden bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] rounded-sm"
              style={{ width: `${fWidth * scale}px`, height: `${fHeight * scale}px` }}
            >
              <div style={{
                width: `${fWidth}px`,
                height: `${fHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}>
                {selectedFrameData?.slots?.map((slot, i) => {
                  const isPhotoSlot = slot.number > 0 && slot.type !== 'qr'
                  const photoIndex = isPhotoSlot ? assignment[slot.number] : null
                  const photo = (photoIndex !== null && photoIndex !== undefined) ? photos[photoIndex] : null
                  const isSelected = selectedSlot === slot.number

                  return (
                    <div
                      key={i}
                      onClick={() => isPhotoSlot && handleSlotClick(slot.number)}
                      className={`absolute overflow-hidden transition-all duration-200 ${isPhotoSlot ? 'cursor-pointer' : ''}`}
                      style={{
                        left: `${slot.x}px`,
                        top: `${slot.y}px`,
                        width: `${slot.width}px`,
                        height: `${slot.height}px`,
                        zIndex: isSelected ? 15 : 10,
                        outline: isSelected ? '6px solid #3b82f6' : 'none',
                        outlineOffset: '-3px'
                      }}
                    >
                      {(slot.type === 'qr' || slot.number === 0) ? (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                          <QRCode
                            value="https://fotoku.latarcerita.com"
                            size={Math.max(10, Math.min(slot.width, slot.height) - 40)}
                            level="L"
                          />
                        </div>
                      ) : photo ? (
                        <img src={photo} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-slate-100'}`}>
                          <ImagePlus
                            size={Math.min(slot.width, slot.height) * 0.18}
                            className={isSelected ? 'text-blue-400' : 'text-slate-300'}
                          />
                          <span
                            className={`font-black leading-none font-caveat transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}
                            style={{ fontSize: Math.min(slot.width, slot.height) * 0.28 }}
                          >
                            {slot.number}
                          </span>
                        </div>
                      )}
                      {isPhotoSlot && (
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${isSelected ? 'opacity-100 bg-blue-500/10' : 'opacity-0 hover:opacity-100 bg-black/5'}`}>
                          {isSelected && (
                            <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
                              Pilih Foto →
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                <img
                  src={selectedFrameData?.image_url}
                  className="absolute pointer-events-none"
                  alt=""
                  style={{
                    left: `${selectedFrameData?.frame_x || 0}px`,
                    top: `${selectedFrameData?.frame_y || 0}px`,
                    width: `${fWidth}px`,
                    height: `${fHeight}px`,
                    zIndex: 20
                  }}
                />
              </div>
            </div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest text-center">
              Ketuk slot untuk memilih foto
            </p>
          </div>

          {/* Photo Picker */}
          <div className="flex flex-col gap-6">
            <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Foto Kamu</span>

            <div className="grid grid-cols-2 gap-6">
              {photos.map((photo, index) => {
                if (!photo) return null
                const assignedSlots = Object.entries(assignment)
                  .filter(([, pIdx]) => pIdx === index)
                  .map(([slotNum]) => Number(slotNum))
                const isHighlighted = selectedSlot !== null && assignment[selectedSlot] === index
                const isAssigned = assignedSlots.length > 0
                const delay = floatDelays[index % floatDelays.length]

                return (
                  <div
                    key={index}
                    onClick={() => handlePhotoClick(index)}
                    className={`relative overflow-hidden rounded-xl transition-all duration-300 photo-float ${
                      selectedSlot !== null ? 'cursor-pointer' : 'cursor-default'
                    } ${isHighlighted
                        ? 'ring-4 ring-blue-400 ring-offset-4 ring-offset-white scale-[1.06] shadow-[0_20px_45px_rgba(59,130,246,0.35)]'
                        : isAssigned
                          ? 'shadow-[0_14px_35px_rgba(0,0,0,0.12)] ring-2 ring-blue-200'
                          : 'shadow-[0_14px_35px_rgba(0,0,0,0.10)]'
                    } ${selectedSlot !== null && !isHighlighted ? 'hover:scale-[1.04] hover:shadow-[0_18px_40px_rgba(0,0,0,0.15)]' : ''}`}
                    style={{ width: 200, height: 155, animationDelay: delay }}
                  >
                    <img src={photo} className="w-full h-full object-cover" alt={`Foto ${index + 1}`} />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/55 to-transparent pt-8 pb-3 px-3">
                      <span className="text-white text-sm font-black">Foto {index + 1}</span>
                    </div>
                    {assignedSlots.map(slot => (
                      <span key={slot} className="absolute top-2.5 right-2.5 bg-blue-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow">
                        Slot {slot}
                      </span>
                    ))}
                    {isHighlighted && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
                        <CheckCircle2 className="text-white drop-shadow-lg" size={40} />
                      </div>
                    )}
                    {selectedSlot !== null && !isHighlighted && (
                      <div className="absolute inset-0 bg-white/25 pointer-events-none" />
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleFinish}
              disabled={!allAssigned}
              className={`mt-2 py-5 px-8 font-black text-sm uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 ${
                allAssigned
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-400/30 hover:from-blue-600 hover:to-blue-700 hover:scale-[1.02] active:scale-95 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAssigned
                ? <><span>Lanjutkan ke Filter</span> <ChevronRight size={18} /></>
                : <span>Isi {photoSlots.length - filledCount} slot lagi</span>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT MARQUEE — scrolls bottom → top ── */}
      <div className="w-[150px] flex-shrink-0 relative overflow-hidden">
        <div className="marquee-up flex flex-col items-center gap-0 blur-[2px]">
          {marqueePhotos.map((photo, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-white p-[6px] border-b-2 border-blue-100"
              style={{ width: 150 }}
            >
              <img
                src={photo}
                alt=""
                className="w-full object-cover block"
                style={{ height: 90 }}
              />
            </div>
          ))}
        </div>
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-sky-50 to-transparent pointer-events-none z-10" />
      </div>
    </div>
  )
}

export default PhotoAssignmentScreen
