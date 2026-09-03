import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Camera, LogOut, Settings, Printer, X, Monitor, RefreshCw, Settings2, AlertCircle, CheckCircle2, Smartphone, ZoomIn, Calendar, Wifi, WifiOff, Minimize2, Upload, Clock, Send, Aperture } from 'lucide-react'
import { QRCode } from 'react-qr-code'
import { useCamera } from '../hooks/useCamera'
import ScreenDefault from './ScreenDefault'
import { queueGetAll, queueCount, syncQueue } from '../lib/offlineQueue'

const StartScreen = ({ onStart, user, onLogout }) => {
  const { status, initCamera, startPreview, stopPreview, setCameraSource, setWebcamDevice, refreshWebcamDevices, setCameraZoom } = useCamera()
  const [showExit, setShowExit] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [phoneCameraUrl, setPhoneCameraUrl] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printers, setPrinters] = useState([])
  const [isCheckingPrinters, setIsCheckingPrinters] = useState(false)
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selectedPrinter') || '')
  const [selectedPaperSize, setSelectedPaperSize] = useState(localStorage.getItem('selectedPaperSize') || '4r')
  const [autoEpsonMatte, setAutoEpsonMatte] = useState(localStorage.getItem('autoEpsonMatte') === 'true')
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  const [showUploadLogModal, setShowUploadLogModal] = useState(false)
  const [canonDetecting, setCanonDetecting] = useState(false)
  const [canonError, setCanonError] = useState(null)
  const canonImgRef = useRef(null)
  const [pendingItems, setPendingItems] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const previewRef = useRef(null)
  const phoneCanvasRef = useRef(null)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handlePrinterTest = (e) => {
    e.stopPropagation()
    setIsPrinting(true)
    if (window.electronAPI?.printTestPage) {
      // Always A4 for test — paper size setting only applies to actual photo prints
      window.electronAPI.printTestPage(selectedPrinter, 'a4', autoEpsonMatte)
    }
    setTimeout(() => setIsPrinting(false), 5000)
  }

  const checkPrinters = async () => {
    if (!window.electronAPI?.getPrinters) return
    setIsCheckingPrinters(true)
    try {
      const printerList = await window.electronAPI.getPrinters()
      setPrinters(printerList || [])
    } catch (err) {
      console.error("Error checking printers:", err)
      setPrinters([])
    } finally {
      setIsCheckingPrinters(false)
    }
  }

  const handleStart = (e) => {
    // Only trigger onStart if clicking outside the control-card and modals
    if (e.target.closest('.control-card') === null && !showCameraModal && !showPrinterModal && !showUploadLogModal) {
      onStart()
    }
  }

  // Load phone camera URL from Electron
  useEffect(() => {
    if (window.electronAPI?.getPhoneCameraUrl) {
      window.electronAPI.getPhoneCameraUrl().then(url => setPhoneCameraUrl(url))
    }
  }, [])

  // Camera Management for Test Modal
  useEffect(() => {
    if (!showCameraModal) return;
    if (status.source === 'phone' && phoneCanvasRef.current) {
      startPreview(phoneCanvasRef.current)
    } else if (status.source === 'webcam' && previewRef.current) {
      startPreview(previewRef.current)
    } else if (status.source === 'canon' && canonImgRef.current) {
      startPreview(canonImgRef.current)
    }
    return () => {
      if (showCameraModal) stopPreview()
    }
  }, [showCameraModal, status.source])

  const handleSwitchToCanon = async () => {
    setCanonError(null)
    setCanonDetecting(true)
    await setCameraSource('canon')
    // Give the driver a moment to detect, then check status
    setTimeout(() => {
      if (!window.electronAPI?.canonDetect) {
        setCanonError('Hanya tersedia di aplikasi desktop Electron.')
      }
      setCanonDetecting(false)
    }, 3000)
  }

  const refreshPendingItems = async () => {
    const items = await queueGetAll().catch(() => [])
    setPendingItems(items)
    setPendingCount(items.length)
  }

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return
    setIsSyncing(true)
    setSyncResult(null)
    const result = await syncQueue(() => {}).catch(() => ({ synced: 0, failed: 0 }))
    await refreshPendingItems()
    setSyncResult(result)
    setIsSyncing(false)
    setTimeout(() => setSyncResult(null), 4000)
  }

  // Re-check printers whenever diagnostic menu is opened
  useEffect(() => {
    if (showExit) {
      checkPrinters()
    }
  }, [showExit])

  // Load pending count on mount and when online status changes
  useEffect(() => {
    refreshPendingItems()
  }, [isOnline])

  // Load pending items when upload log modal opens
  useEffect(() => {
    if (showUploadLogModal) refreshPendingItems()
  }, [showUploadLogModal])

  // Cleanup & Initial Check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkPrinters()
    }, 1500) // 1.5s delay to let hardware/electron settle

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center cursor-pointer group px-4 relative overflow-hidden select-none touch-none"
      onClick={handleStart}
    >
      {/* Network Status Indicator — pojok kiri bawah */}
      <div className="absolute bottom-6 left-6 z-[150] pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Camera & Printer Status — pojok kanan bawah */}
      <AnimatePresence>
        {!showExit && (() => {
          let cameraLabel = 'Tidak Terdeteksi'
          let cameraOk = false
          if (status.source === 'phone') {
            cameraOk = status.isConnected
            cameraLabel = status.isConnected ? 'iPhone — Terhubung' : 'iPhone — Menunggu...'
          } else if (status.source === 'webcam') {
            const activeDevice = status.webcamDevices?.find(d => d.id === status.currentWebcamId) || status.webcamDevices?.[0]
            cameraOk = !!activeDevice
            cameraLabel = activeDevice?.label || (status.webcamDevices?.length ? 'Webcam Aktif' : 'Tidak Terdeteksi')
          } else if (status.source === 'canon') {
            cameraOk = status.isAvailable
            cameraLabel = status.isAvailable ? (status.name || 'Canon — USB') : 'Canon — Tidak Terdeteksi'
          } else if (status.source === 'dslr') {
            cameraOk = status.isAvailable
            cameraLabel = 'DSLR Folder Watch'
          } else if (status.source === 'mock') {
            cameraOk = true
            cameraLabel = 'Mock Mode'
          }

          const printerConfigured = !!selectedPrinter
          const printerLabel = selectedPrinter || 'Belum dikonfigurasi'

          return (
            <motion.div
              key="hw-status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-6 right-6 z-[150] pointer-events-none flex flex-col items-end gap-2"
            >
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${cameraOk ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                <span className="truncate max-w-[180px]">{cameraLabel}</span>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cameraOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <Camera size={10} className="flex-shrink-0" />
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${printerConfigured ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                <span className="truncate max-w-[180px]">{printerLabel}</span>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${printerConfigured ? 'bg-slate-400' : 'bg-amber-400 animate-pulse'}`} />
                <Printer size={10} className="flex-shrink-0" />
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Settings Button in Top Right */}
      <div className="absolute top-10 right-10 z-[150]">
        <button
          onClick={(e) => { e.stopPropagation(); setShowExit(!showExit); }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg border border-white/20 active:scale-90 ${showExit ? 'bg-blue-600 text-white' : 'bg-white/10 backdrop-blur-md text-white/40 hover:text-white/80 hover:bg-white/20'}`}
        >
          {showExit ? <X size={28} /> : <Settings size={28} />}
        </button>
      </div>

      <ScreenDefault onStart={handleStart} />

      {/* Control Card (Long Press Triggered) */}
      <AnimatePresence>
        {showExit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-10 right-10 z-[100] control-card flex flex-col gap-4 pointer-events-auto"
          >
            {/* Device & Event Identity Card */}
            <div className="bg-slate-900 text-white p-4 rounded-[24px] shadow-2xl border border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Monitor size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none mb-1">Identity</p>
                  <p className="text-sm font-black tracking-tight">{user?.deviceName || 'Device'}</p>
                </div>
              </div>
              <div className="h-px bg-white/5 mx-1"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1">Event</p>
                  <p className="text-sm font-black tracking-tight">{user?.eventName || 'Global'}</p>
                </div>
              </div>
              <div className="h-px bg-white/5 mx-1"></div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${isOnline ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}>
                  {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                </div>
                <div>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>Network</p>
                  <p className="text-sm font-black tracking-tight">{isOnline ? 'Terhubung' : 'Tidak Ada Jaringan'}</p>
                </div>
              </div>
            </div>

            {/* Test Utilities Card */}
            <div className="bg-white/90 backdrop-blur-2xl border-2 border-slate-100 p-3 rounded-[24px] shadow-2xl flex flex-col gap-2">
              {(() => {
                // Resolve actual camera device label
                let cameraLabel = 'Tidak Terdeteksi'
                let cameraOk = false
                if (status.source === 'phone') {
                  cameraOk = status.isConnected
                  cameraLabel = status.isConnected ? 'iPhone — Terhubung' : 'iPhone — Menunggu...'
                } else if (status.source === 'webcam') {
                  const activeDevice = status.webcamDevices?.find(d => d.id === status.currentWebcamId) || status.webcamDevices?.[0]
                  cameraOk = !!activeDevice
                  cameraLabel = activeDevice?.label || (status.webcamDevices?.length ? 'Webcam Aktif' : 'Tidak Terdeteksi')
                } else if (status.source === 'canon') {
                  cameraOk = status.isAvailable
                  cameraLabel = status.isAvailable ? (status.name || 'Canon — USB') : 'Canon — Tidak Terdeteksi'
                } else if (status.source === 'dslr') {
                  cameraOk = status.isAvailable
                  cameraLabel = 'DSLR Folder Watch'
                } else if (status.source === 'mock') {
                  cameraOk = true
                  cameraLabel = 'Mock Mode'
                }

                // Printer — hanya tunjukkan apakah sudah dikonfigurasi, bukan "online/offline"
                // OS tidak bisa secara akurat membedakan printer dengan driver terinstall vs fisik tersambung
                const printerConfigured = !!selectedPrinter
                const printerLabel = selectedPrinter || 'Belum dikonfigurasi'

                return (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCameraModal(true); }}
                      className="flex items-center gap-3 hover:bg-blue-50 p-1.5 pr-4 rounded-xl transition-all duration-300 group/btn"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${cameraOk ? 'bg-blue-100 text-blue-600 group-hover/btn:bg-blue-600 group-hover/btn:text-white' : 'bg-rose-100 text-rose-500 group-hover/btn:bg-rose-500 group-hover/btn:text-white'}`}>
                        <Camera size={18} />
                      </div>
                      <div className="flex flex-col items-start px-1 min-w-0">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Diagnostic</span>
                        <span className="text-[11px] font-black text-slate-700">Camera Test</span>
                        <span className={`text-[9px] font-bold truncate max-w-[160px] ${cameraOk ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {`● ${cameraLabel}`}
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPrinterModal(true); }}
                      className="flex items-center gap-3 hover:bg-indigo-50 p-1.5 pr-4 rounded-xl transition-all duration-300 group/btn"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${printerConfigured ? 'bg-indigo-100 text-indigo-600 group-hover/btn:bg-indigo-600 group-hover/btn:text-white' : 'bg-amber-100 text-amber-500 group-hover/btn:bg-amber-500 group-hover/btn:text-white'}`}>
                        <Settings2 size={18} />
                      </div>
                      <div className="flex flex-col items-start px-1 min-w-0">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Configuration</span>
                        <span className="text-[11px] font-black text-slate-700">Printer Settings</span>
                        <span className={`text-[9px] font-bold truncate max-w-[160px] ${printerConfigured ? 'text-slate-500' : 'text-amber-500'}`}>
                          {`● ${printerLabel}`}
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setShowUploadLogModal(true); }}
                      className="flex items-center gap-3 hover:bg-amber-50 p-1.5 pr-4 rounded-xl transition-all duration-300 group/btn relative"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${pendingCount > 0 ? 'bg-amber-100 text-amber-600 group-hover/btn:bg-amber-500 group-hover/btn:text-white' : 'bg-slate-100 text-slate-400 group-hover/btn:bg-slate-500 group-hover/btn:text-white'}`}>
                        <Upload size={18} />
                      </div>
                      <div className="flex flex-col items-start px-1 min-w-0">
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Upload</span>
                        <span className="text-[11px] font-black text-slate-700">Pending Upload</span>
                        <span className={`text-[9px] font-bold ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {pendingCount > 0 ? `● ${pendingCount} sesi menunggu` : '● Semua terkirim'}
                        </span>
                      </div>
                      {pendingCount > 0 && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                          {pendingCount}
                        </div>
                      )}
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); window.electronAPI?.minimizeWindow?.(); }}
                      className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-4 rounded-xl transition-all duration-300 group/btn"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-slate-100 text-slate-500 group-hover/btn:bg-slate-600 group-hover/btn:text-white">
                        <Minimize2 size={18} />
                      </div>
                      <div className="flex flex-col items-start px-1 min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Window</span>
                        <span className="text-[11px] font-black text-slate-700">Minimize</span>
                        <span className="text-[9px] font-bold text-slate-400">● Kecilkan jendela</span>
                      </div>
                    </button>
                  </>
                )
              })()}

              <div className="h-px bg-slate-100 my-1 mx-2"></div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowExit(false); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Close Menu
              </button>
            </div>

            {/* Exit Device Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onLogout?.(); }}
              className="group/logout flex items-center gap-3 bg-white/90 backdrop-blur-2xl border border-rose-100 hover:border-rose-500 hover:bg-rose-50 px-4 py-3 rounded-[24px] transition-all duration-300 shadow-xl active:scale-95 cursor-pointer"
            >
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 group-hover/logout:text-white group-hover/logout:bg-rose-500 transition-all duration-300">
                <LogOut size={20} />
              </div>
              <div className="flex flex-col items-start pr-2">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Terminate</span>
                <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Exit Device</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Test Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onPointerUp={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] overflow-hidden w-full max-w-2xl shadow-2xl relative border-4 border-white/20"
            >
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 font-caveat tracking-tight">Camera Diagnostic</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Checking Hardware Connection</p>
                </div>
                <button
                  onClick={() => setShowCameraModal(false)}
                  className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="aspect-video bg-slate-900 mx-8 mb-8 rounded-[24px] overflow-hidden relative group">
                {status.source === 'canon' ? (
                  <img
                    ref={canonImgRef}
                    alt="Canon Live View"
                    className="w-full h-full object-cover"
                    style={status.cameraZoom && status.cameraZoom > 1 ? { transform: `scale(${status.cameraZoom})` } : undefined}
                    src={status.lastCapturedImage || ''}
                  />
                ) : status.source === 'phone' ? (
                  <canvas
                    ref={phoneCanvasRef}
                    width={1280}
                    height={720}
                    className="w-full h-full object-cover"
                    style={{ background: '#0f172a', ...(status.cameraZoom && status.cameraZoom > 1 ? { transform: `scale(${status.cameraZoom})` } : {}) }}
                  />
                ) : status.source === 'webcam' ? (
                  <video
                    ref={previewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={status.cameraZoom && status.cameraZoom > 1 ? { transform: `scale(${status.cameraZoom})` } : undefined}
                  />
                ) : (status.lastCapturedImage || status.source === 'mock') ? (
                  <img
                    src={status.lastCapturedImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000'}
                    alt="Camera Preview"
                    className="w-full h-full object-cover"
                    style={status.cameraZoom && status.cameraZoom > 1 ? { transform: `scale(${status.cameraZoom})` } : undefined}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Connecting to Hardware...</span>
                  </div>
                )}

                {/* Zoom-out overlay: shows padding area that will appear in captured photo */}
                {status.cameraZoom && status.cameraZoom < 1 && (() => {
                  const pad = `${((1 - status.cameraZoom) / 2 * 100).toFixed(1)}%`;
                  return (
                    <>
                      <div className="absolute inset-x-0 top-0 bg-black/75 pointer-events-none" style={{ height: pad }} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 pointer-events-none" style={{ height: pad }} />
                      <div className="absolute inset-y-0 left-0 bg-black/75 pointer-events-none" style={{ width: pad }} />
                      <div className="absolute inset-y-0 right-0 bg-black/75 pointer-events-none" style={{ width: pad }} />
                    </>
                  );
                })()}

                <div className="absolute top-6 right-6 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> LIVE
                </div>
              </div>

              {/* Source Selection Buttons */}
              <div className="px-8 pb-4 grid grid-cols-6 gap-2">
                {[
                  { id: 'auto', label: 'Auto', icon: RefreshCw },
                  { id: 'dslr', label: 'DSLR', icon: Camera },
                  { id: 'webcam', label: 'Webcam', icon: Monitor },
                  { id: 'canon', label: 'Canon', icon: Aperture, electronOnly: true },
                  { id: 'phone', label: 'Phone', icon: Smartphone, electronOnly: true },
                  { id: 'mock', label: 'Mock', icon: Settings2 }
                ].map(mode => {
                  const isActive = (mode.id === 'auto' && status.isAutoDetect) || (mode.id !== 'auto' && !status.isAutoDetect && status.source === mode.id);
                  const isDisabled = mode.electronOnly && !window.electronAPI;
                  return (
                    <button
                      key={mode.id}
                      onClick={(e) => { e.stopPropagation(); if (!isDisabled) { if (mode.id === 'canon') handleSwitchToCanon(); else setCameraSource(mode.id); } }}
                      disabled={isDisabled}
                      title={isDisabled ? 'Hanya tersedia di aplikasi desktop' : undefined}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all relative ${isDisabled
                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                        : isActive
                          ? mode.id === 'phone' ? 'bg-violet-700 border-violet-700 text-white shadow-lg' : 'bg-slate-900 border-slate-900 text-white shadow-lg'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <mode.icon size={14} />
                      <span className="text-[8px] font-black uppercase tracking-widest">{mode.label}</span>
                      {isDisabled && <span className="text-[6px] font-black text-slate-300 uppercase tracking-wide">Electron</span>}
                      {isActive && !isDisabled && (
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                          <CheckCircle2 size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Canon gphoto2 Section */}
              {status.source === 'canon' && !status.isAutoDetect && (
                <div className="mx-8 mb-6 bg-rose-50 border-2 border-rose-100 rounded-3xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Aperture size={20} className="text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Canon — USB Direct (gphoto2)</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-snug mb-3">
                        Kamera terhubung langsung via USB tanpa EOS Webcam Utility.
                      </p>
                      {canonDetecting && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                          <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          Mendeteksi kamera...
                        </div>
                      )}
                      {canonError && (
                        <div className="bg-rose-100 rounded-xl px-3 py-2 mb-3">
                          <p className="text-[10px] font-bold text-rose-700">{canonError}</p>
                        </div>
                      )}
                      {status.isAvailable && !canonDetecting && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl w-fit bg-emerald-50 border border-emerald-100">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">{status.name}</span>
                        </div>
                      )}
                      {!status.isAvailable && !canonDetecting && !canonError && (() => {
                        const isWin = navigator.userAgent.includes('Windows')
                        return (
                          <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100 space-y-2">
                            {isWin ? (
                              <>
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Windows — Install digiCamControl:</p>
                                <p className="text-[9px] font-bold text-slate-600 leading-relaxed">
                                  1. Download gratis: <span className="font-mono text-blue-600">digicamcontrol.com</span><br />
                                  2. Install & buka digiCamControl<br />
                                  3. Hubungkan kamera via USB<br />
                                  4. Klik tombol Canon di atas
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Mac — Install gphoto2:</p>
                                <code className="text-[10px] font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-100 block">brew install gphoto2</code>
                              </>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Phone Camera QR Code Section */}
              {status.source === 'phone' && !status.isAutoDetect && (
                <div className="mx-8 mb-6 bg-violet-50 border-2 border-violet-100 rounded-3xl p-5">
                  <div className="flex items-start gap-5">
                    {/* QR Code */}
                    <div className="flex-shrink-0 bg-white p-3 rounded-2xl border-2 border-violet-100 shadow-sm">
                      {phoneCameraUrl ? (
                        <QRCode value={phoneCameraUrl} size={96} bgColor="#ffffff" fgColor="#1e1b4b" />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-violet-50 rounded-xl">
                          <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone size={14} className="text-violet-600 flex-shrink-0" />
                        <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Phone Camera</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-snug mb-3">
                        Scan QR dengan browser HP, lalu izinkan akses kamera.
                      </p>
                      {phoneCameraUrl && (
                        <div className="bg-white rounded-xl px-3 py-2 border border-violet-100 mb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">URL</p>
                          <p className="text-[10px] font-bold text-violet-700 break-all">{phoneCameraUrl}</p>
                        </div>
                      )}
                      {!phoneCameraUrl && (
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                          Hanya tersedia di aplikasi desktop Electron
                        </p>
                      )}
                      {/* Connection status */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl w-fit ${status.isConnected ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                        <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${status.isConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {status.isConnected ? 'HP Terhubung' : 'Menunggu HP...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[8px] font-bold text-slate-400 leading-tight">
                    * Saat pertama buka URL di HP, Chrome/Safari akan memperingatkan sertifikat tidak valid — tap Advanced → Proceed. Ini normal karena koneksi lokal.
                  </p>
                </div>
              )}

              {/* Webcam Device Selection */}
              {status.source === 'webcam' && (
                <div className="px-8 mb-6">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor size={10} />
                      Pilih Input Kamera
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); refreshWebcamDevices(); }}
                      className="p-1 hover:bg-slate-100 rounded-md transition-all text-blue-500"
                      title="Refresh List"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {status.webcamDevices?.length > 0 ? (
                      status.webcamDevices.map(device => (
                        <button
                          key={device.id}
                          onClick={(e) => { e.stopPropagation(); setWebcamDevice(device.id); }}
                          className={`px-4 py-2 rounded-xl border text-[10px] font-bold transition-all ${status.currentWebcamId === device.id
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                            }`}
                        >
                          {device.label}
                        </button>
                      ))
                    ) : (
                      <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest italic">
                        Tidak ada kamera lain ditemukan. Pastikan sudah dicolok dan driver terpasang.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Zoom Control */}
              <div className="px-8 mb-6">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <ZoomIn size={10} />
                  Zoom Kamera
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1x', value: 1.0 },
                    { label: '1.5x', value: 1.5 },
                    { label: '2x', value: 2.0 },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={(e) => { e.stopPropagation(); setCameraZoom(opt.value); }}
                      className={`py-2 rounded-xl border text-[10px] font-bold transition-all text-center ${
                        Math.abs((status.cameraZoom || 1) - opt.value) < 0.01
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-8 pb-8 flex items-center justify-between bg-slate-50/50 pt-8 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Camera size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block leading-none mb-1">Hardware Ready</span>
                    <span className="text-xs font-black text-slate-600 leading-none">{status.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCameraModal(false)}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 hover:bg-emerald-700 transition-all"
                >
                  Konfirmasi & Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printing Notification */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
              <Printer size={16} />
            </div>
            <div className="flex flex-col items-start pr-4">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Printer Status</span>
              <span className="text-sm font-black text-white">Sedang Mencetak Test Page...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printer Configuration Modal */}
      <AnimatePresence>
        {showPrinterModal && (
          <div
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onPointerUp={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] overflow-hidden w-full max-w-md shadow-2xl relative border-2 border-white/20"
            >
              <div className="p-6 pb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 font-caveat tracking-tight">Printer Configuration</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Setup Hardware & Paper Size</p>
                </div>
                <button
                  onClick={() => setShowPrinterModal(false)}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Paper Size Selection */}
                <div className="mb-6">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Monitor size={10} /> Ukuran Kertas
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '4r', label: '4R Format', sub: '4x6 in' },
                      { id: 'a4', label: 'A4 Format', sub: '210x297 mm' },
                      { id: 'a4_plus', label: 'A4+ Format', sub: 'Large (+1.5cm)' }
                    ].map(size => (
                      <button
                        key={size.id}
                        onClick={() => { setSelectedPaperSize(size.id); localStorage.setItem('selectedPaperSize', size.id); }}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-0.5 text-left ${selectedPaperSize === size.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                          }`}
                      >
                        <span className="text-sm font-black tracking-tight">{size.label}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedPaperSize === size.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          {size.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Epson Matte Option */}
                <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 tracking-tight">Auto Epson Matte</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                        Optimalkan hasil cetak khusus Epson (Matte/High Quality)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !autoEpsonMatte;
                        setAutoEpsonMatte(newVal);
                        localStorage.setItem('autoEpsonMatte', newVal);
                      }}
                      className={`w-10 h-6 rounded-full relative transition-all duration-300 ${autoEpsonMatte ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${autoEpsonMatte ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>

                {/* Printer Device Selection */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Printer size={12} /> Pilih Perangkat Printer
                    </div>
                    <button
                      onClick={checkPrinters}
                      className="p-1 hover:bg-slate-100 rounded-md transition-all text-blue-500"
                    >
                      <RefreshCw size={10} className={isCheckingPrinters ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <button
                      onClick={() => { setSelectedPrinter(''); localStorage.removeItem('selectedPrinter'); }}
                      className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm ${!selectedPrinter
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      Default System Printer
                    </button>
                    {printers.length > 0 ? (
                      printers.map(printer => (
                        <button
                          key={printer.name}
                          onClick={() => { setSelectedPrinter(printer.name); localStorage.setItem('selectedPrinter', printer.name); }}
                          className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm flex items-center justify-between group ${selectedPrinter === printer.name
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          title={printer.name}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${printer.isDefault ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="truncate">{printer.name}</span>
                          </div>

                          {printer.isDefault && (
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${selectedPrinter === printer.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              Default
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="py-8 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                          {window.electronAPI ? "Tidak ada printer terdeteksi di sistem" : "Fitur printer hanya aktif di Software Desktop (Electron)"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex items-center justify-between bg-slate-50/50 pt-6 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black flex-shrink-0 text-[10px]">
                    {selectedPaperSize.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block leading-none mb-1">Active Profile</span>
                    <span className="text-xs font-black text-slate-600 leading-none truncate block max-w-[110px]">
                      {selectedPrinter || 'Default System'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handlePrinterTest}
                    disabled={isPrinting}
                    className="flex items-center gap-2 px-4 py-3.5 border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={13} />
                    {isPrinting ? 'Mencetak...' : 'Test Print'}
                  </button>
                  <button
                    onClick={() => setShowPrinterModal(false)}
                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Log Modal */}
      <AnimatePresence>
        {showUploadLogModal && (
          <div
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onPointerUp={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] overflow-hidden w-full max-w-md shadow-2xl relative border-2 border-white/20"
            >
              {/* Header */}
              <div className="p-6 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 font-caveat tracking-tight">Pending Upload</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sesi yang belum terkirim ke server</p>
                </div>
                <button
                  onClick={() => setShowUploadLogModal(false)}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Bar */}
              <div className={`mx-6 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3 ${isOnline ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-600 truncate">
                    {pendingCount === 0 ? 'Semua sesi sudah terkirim' : `${pendingCount} sesi menunggu jaringan`}
                  </p>
                </div>
                {syncResult && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
                    {syncResult.synced} terkirim
                  </span>
                )}
              </div>

              {/* List */}
              <div className="px-6 max-h-64 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                {pendingItems.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada yang pending</p>
                  </div>
                ) : (
                  pendingItems.map((item) => {
                    const blobUrl = item.compositeBlob ? URL.createObjectURL(item.compositeBlob) : null
                    const date = new Date(item.queuedAt)
                    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                    return (
                      <div key={item.sessionId} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        {blobUrl ? (
                          <img
                            src={blobUrl}
                            alt="Preview"
                            className="w-12 h-16 object-cover rounded-xl flex-shrink-0 border border-slate-200"
                            onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                            onError={(e) => URL.revokeObjectURL(e.target.src)}
                          />
                        ) : (
                          <div className="w-12 h-16 bg-slate-200 rounded-xl flex-shrink-0 flex items-center justify-center">
                            <Upload size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Pending</p>
                          <p className="text-[10px] font-bold text-slate-700 truncate font-mono">
                            {item.sessionId?.slice(0, 16)}...
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-slate-400">
                            <Clock size={9} />
                            <span className="text-[9px] font-bold">{dateStr} {timeStr}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {item.rawPhotoDataUrls?.filter(Boolean).length || 0} foto raw
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-5 mt-4 bg-slate-50/50 flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold text-slate-400 leading-tight">
                  Akan otomatis dikirim<br />saat jaringan tersedia
                </p>
                <button
                  onClick={handleSyncNow}
                  disabled={!isOnline || isSyncing || pendingCount === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSyncing ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send size={13} /> Kirim Sekarang</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  )
}

export default StartScreen
