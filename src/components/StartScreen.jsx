import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Camera, LogOut } from 'lucide-react'

const StartScreen = ({ onStart, user, onLogout }) => {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const handleSettingsClick = (e) => {
    e.stopPropagation() // Don't trigger onStart
    setShowPinModal(true)
    setPin('')
    setPinError(false)
  }

  const handlePinSubmit = () => {
    if (pin === '1234') {
      setShowPinModal(false)
      window.location.href = '/settings'
    } else {
      setPinError(true)
      setPin('')
    }
  }

  const handlePinKeyDown = (e) => {
    if (e.key === 'Enter') handlePinSubmit()
    if (e.key === 'Escape') setShowPinModal(false)
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center cursor-pointer group px-4 relative overflow-hidden"
      onClick={onStart}
    >
      <div className="z-10 text-center relative max-w-2xl w-full py-16 px-4">
        {/* User Info Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/5 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-950/5 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Logged in as {user?.email?.split('@')[0]}
          </span>
        </div>

        <div className="mb-6 inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-gradient-blue px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] border border-blue-100/50 shadow-lg">
          <Sparkles size={12} className="text-blue-500" fill="currentColor" /> PREMIUM PHOTOBOOTH
        </div>

        <h1 className="text-9xl font-black text-slate-800 mb-8 font-caveat relative drop-shadow-xl inline-block -rotate-3 transition-transform duration-500 group-hover/title:-rotate-1">
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [-10, 10, -10]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-12 left-16 text-blue-500 drop-shadow-lg z-20"
          >
            <Camera size={44} fill="currentColor" className="opacity-90" />
          </motion.div>
          <span className="text-gradient-blue px-4">Latar Cerita</span>
        </h1>

        {/* Simplified Prompt - Just Text */}
        <div className="flex flex-col items-center gap-4 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform duration-500">
          <span className="text-4xl font-black text-slate-800 tracking-widest font-caveat leading-none">
            Tekan Dimana saja Untuk Memulai
          </span>
        </div>
      </div>



      {/* Logout Control - Bottom Right */}
      <div className="absolute bottom-10 right-10 z-50">
        <button
          onClick={(e) => { e.stopPropagation(); onLogout?.(); }}
          className="group/logout flex items-center gap-4 bg-white/10 backdrop-blur-2xl border border-white/20 hover:border-rose-500/50 hover:bg-rose-500/10 px-6 py-3 rounded-2xl transition-all duration-500 cursor-pointer"
        >
          <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center text-slate-400 group-hover/logout:text-rose-500 group-hover/logout:scale-110 transition-all duration-500 shadow-sm">
            <LogOut size={20} />
          </div>
          <div className="flex flex-col items-start pr-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/logout:text-rose-400 transition-colors">Session</span>
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest group-hover/logout:text-rose-600 transition-colors">Exit Device</span>
          </div>
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setShowPinModal(false); }}
        >
          <div
            className="bg-white rounded-[40px] p-10 shadow-2xl w-[360px] text-center border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Settings size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Masuk ke Settings</h3>
            <p className="text-xs text-slate-400 mb-8 font-medium">Masukkan kode PIN untuk melanjutkan</p>

            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={handlePinKeyDown}
              placeholder="• • • •"
              maxLength={4}
              autoFocus
              className={`w-full text-center text-3xl font-black tracking-[1em] py-4 px-6 rounded-2xl border-2 outline-none transition-all mb-4 ${pinError ? 'border-red-400 bg-red-50 text-red-500 animate-[shake_0.3s]' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-500 focus:bg-white'}`}
            />

            {pinError && (
              <p className="text-red-500 text-xs font-black mb-4 animate-pulse">Kode PIN salah!</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                Masuk
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}

export default StartScreen
