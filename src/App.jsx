import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import StartScreen from './components/StartScreen'
import CaptureScreen from './components/CaptureScreen'
import CustomizeScreen from './components/CustomizeScreen'
import ProcessingScreen from './components/ProcessingScreen'
import OutputScreen from './components/OutputScreen'
import PhotoAssignmentScreen from './components/PhotoAssignmentScreen'
import PublicGalleryScreen from './components/PublicGalleryScreen'
import AppBackground from './components/AppBackground'
import DeviceLogin from './components/DeviceLogin'
import CreatorApp from './creator/App'
import RemoteController from './components/RemoteController'
import { Maximize2, Minimize2, WifiOff, CheckCircle } from 'lucide-react'
import SettingsPage from './components/SettingsPage'
import { useCamera } from './hooks/useCamera'
import { syncQueue, queueCount } from './lib/offlineQueue'

const STEPS = {
  START: 'START',
  CUSTOMIZE_FRAME: 'CUSTOMIZE_FRAME',
  CAPTURE: 'CAPTURE',
  PHOTO_ASSIGN: 'PHOTO_ASSIGN',
  CUSTOMIZE_FILTER: 'CUSTOMIZE_FILTER',
  PROCESSING: 'PROCESSING',
  OUTPUT: 'OUTPUT',
}

function App() {
  const [countdown, setCountdown] = useState(null)
  const [photos, setPhotos] = useState([])
  const [currentShotIndex, setCurrentShotIndex] = useState(0)
  const [maxCaptures, setMaxCaptures] = useState(3)
  const [isReviewing, setIsReviewing] = useState(false)
  const [hasStartedSession, setHasStartedSession] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState('classic')
  const [selectedFrameData, setSelectedFrameData] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [isSpecialMode, setIsSpecialMode] = useState(false)
  const [ghosts, setGhosts] = useState([])
  const [activePortal, setActivePortal] = useState(null)
  const [videoClips, setVideoClips] = useState([])
  const [galleryData, setGalleryData] = useState(null)
  const [isReprint, setIsReprint] = useState(false)

  useEffect(() => {
    if (!isSpecialMode) {
      setGhosts([])
      setActivePortal(null)
    }
  }, [isSpecialMode])

  const { status, startPreview, stopPreview, capturePhoto: captureCamPhoto, initCamera, camera } = useCamera()

  const [loading, setLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return !params.get('gallery')
  })
  const [isCreatorMode, setIsCreatorMode] = useState(false)
  const [deviceSession, setDeviceSession] = useState(null)
  const [step, setStep] = useState(STEPS.START)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  const videoRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const canvasRef = useRef(null)
  const [galleryId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('gallery') || null
  })

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    queueCount().then(setPendingCount).catch(() => {})
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      const count = await queueCount().catch(() => 0)
      if (count === 0) return
      setSyncStatus('syncing')
      const { synced } = await syncQueue((msg) => console.log('[Sync]', msg))
      setPendingCount(await queueCount().catch(() => 0))
      if (synced > 0) {
        setSyncStatus('done')
        setTimeout(() => setSyncStatus(null), 4000)
      } else {
        setSyncStatus(null)
      }
    }
    const handleOffline = () => setSyncStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (galleryId) { setLoading(false); return }

    const host = window.location.hostname
    const path = window.location.pathname
    if (host.startsWith('creator.') || path.startsWith('/creator')) {
      setIsCreatorMode(true)
    }

    const savedDevice = localStorage.getItem('pb_device_session')
    if (savedDevice) {
      const parsed = JSON.parse(savedDevice)
      setDeviceSession(parsed)

      supabase
        .from('devices')
        .select('id, creator_id, name, available_frames, event_id, events(name, logo_url)')
        .eq('id', parsed.device_id)
        .single()
        .then(({ data }) => {
          if (data) {
            const updated = {
              ...parsed,
              device_id: data.id,
              creator_id: data.creator_id,
              name: data.name,
              available_frames: data.available_frames || [],
              event_id: data.event_id,
              events: data.events,
            }
            localStorage.setItem('pb_device_session', JSON.stringify(updated))
            setDeviceSession(updated)
          }
        })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {})
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { initCamera() }, [])

  useEffect(() => {
    if (step === STEPS.CAPTURE) {
      // Phone & DSLR both use canvas directly (no captureStream latency)
      const element = (status.source === 'dslr' || status.source === 'phone')
        ? previewCanvasRef.current
        : videoRef.current
      if (element) startPreview(element)
    } else {
      stopPreview()
    }
  }, [step, status.source])

  useEffect(() => {
    let timer
    if (step === STEPS.CAPTURE && hasStartedSession && !isReviewing && !isSpecialMode && countdown !== null) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); capturePhoto(); return null }
          return prev - 1
        })
      }, 1000)
    } else if (isSpecialMode || isReviewing || step !== STEPS.CAPTURE) {
      setCountdown(null)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [step, hasStartedSession, isReviewing, isSpecialMode, countdown === null])

  useEffect(() => {
    if (step === STEPS.CAPTURE && hasStartedSession && !isReviewing && !isSpecialMode && countdown === null) {
      const timeout = setTimeout(() => setCountdown(5), 1000)
      return () => clearTimeout(timeout)
    }
  }, [step, hasStartedSession, isReviewing, isSpecialMode, currentShotIndex, countdown === null])

  const capturePhoto = async (manualDataUrl = null) => {
    try {
      const dataUrl = manualDataUrl || await captureCamPhoto()
      const newPhotos = [...photos]
      newPhotos[currentShotIndex] = dataUrl
      setPhotos(newPhotos)
      setIsReviewing(true)
    } catch (err) {
      console.error('Capture Failed:', err)
      // Reset countdown agar user bisa coba lagi (penting untuk phone camera)
      setCountdown(null)
    }
  }

  // Always-fresh ref so the phone shutter callback gets the latest capturePhoto
  const capturePhotoRef = useRef(capturePhoto)
  capturePhotoRef.current = capturePhoto

  // Phone shutter button → skip countdown, capture immediately
  useEffect(() => {
    if (status.source !== 'phone' || !camera) return
    return camera.subscribePhoneShutter(() => {
      if (hasStartedSession && !isReviewing) {
        setCountdown(null)
        capturePhotoRef.current()
      }
    })
  }, [status.source, camera, hasStartedSession, isReviewing])

  const handleContinue = () => {
    if (currentShotIndex + 1 >= maxCaptures) {
      setStep(STEPS.PHOTO_ASSIGN)
      setIsReviewing(false)
    } else {
      setCurrentShotIndex(prev => prev + 1)
      setIsReviewing(false)
    }
    setGhosts([])
    setActivePortal(null)
  }

  const handleRetake = () => {
    const newPhotos = [...photos]
    newPhotos[currentShotIndex] = null
    setPhotos(newPhotos)
    setIsReviewing(false)
    setGhosts([])
    setActivePortal(null)
  }

  const handleCetak = () => setStep(STEPS.PROCESSING)

  const handleAddPrint = () => { setIsReprint(true); handleCetak() }

  const resetSession = () => {
    setStep(STEPS.START)
    setPhotos([])
    setCurrentShotIndex(0)
    setIsReviewing(false)
    setHasStartedSession(false)
    setSelectedFrame('classic')
    setSelectedFilter('none')
    setIsReprint(false)
    setIsSpecialMode(false)
    setGhosts([])
    setActivePortal(null)
    setVideoClips([])
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <AppBackground />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600 z-10" />
      </div>
    )
  }

  if (galleryId) return <PublicGalleryScreen galleryId={galleryId} />

  const urlParams = new URLSearchParams(window.location.search)
  const remoteSessionFromUrl = urlParams.get('remoteSession')
  if (remoteSessionFromUrl && !deviceSession) {
    return <RemoteController sessionId={remoteSessionFromUrl} />
  }

  if (isCreatorMode) return <CreatorApp />

  if (!deviceSession) return <DeviceLogin onLogin={setDeviceSession} />

  const currentUser = {
    id: deviceSession.creator_id,
    isDevice: true,
    deviceName: deviceSession.name,
    deviceId: deviceSession.device_id,
    availableFrames: deviceSession.available_frames || [],
    eventId: deviceSession.event_id,
    eventName: deviceSession.events?.name,
    eventLogo: deviceSession.events?.logo_url,
  }

  if (window.location.pathname === '/settings') {
    return <SettingsPage user={currentUser} />
  }

  return (
    <div className="h-screen relative overflow-hidden selection:bg-rose-100 selection:text-rose-900 bg-white transition-colors duration-1000">
      <AppBackground isHidden={step === STEPS.OUTPUT || step === STEPS.CUSTOMIZE_FRAME || step === STEPS.CUSTOMIZE_FILTER || step === STEPS.PHOTO_ASSIGN} />

      <div className="relative z-10 w-full min-h-screen flex flex-col">

        {step === STEPS.START && (
          <StartScreen
            onStart={() => setStep(STEPS.CUSTOMIZE_FRAME)}
            user={currentUser}
            onLogout={() => { localStorage.removeItem('pb_device_session'); setDeviceSession(null) }}
          />
        )}

        {step === STEPS.CUSTOMIZE_FRAME && (
          <CustomizeScreen
            mode="frame"
            photos={photos}
            selectedFrame={selectedFrame}
            setSelectedFrame={setSelectedFrame}
            setSelectedFrameData={setSelectedFrameData}
            selectedFilter={selectedFilter}
            onNext={() => {
              setHasStartedSession(false)
              setStep(STEPS.CAPTURE)
            }}
            onBack={resetSession}
            maxCaptures={maxCaptures}
            setMaxCaptures={setMaxCaptures}
            user={currentUser}
          />
        )}

        {step === STEPS.CAPTURE && (
          <CaptureScreen
            videoRef={videoRef}
            previewCanvasRef={previewCanvasRef}
            cameraStatus={status}
            countdown={countdown}
            currentShotIndex={currentShotIndex}
            maxCaptures={maxCaptures}
            photos={photos}
            isReviewing={isReviewing}
            hasStartedSession={hasStartedSession}
            onStartSession={() => setHasStartedSession(true)}
            onContinue={handleContinue}
            onRetake={handleRetake}
            cameraError={status.error}
            user={currentUser}
            selectedFrameData={selectedFrameData}
            isSpecialMode={isSpecialMode}
            setIsSpecialMode={setIsSpecialMode}
            ghosts={ghosts}
            setGhosts={setGhosts}
            activePortal={activePortal}
            setActivePortal={setActivePortal}
            onSpecialCapture={capturePhoto}
            setVideoClips={setVideoClips}
          />
        )}

        {step === STEPS.PHOTO_ASSIGN && (
          <PhotoAssignmentScreen
            photos={photos}
            selectedFrameData={selectedFrameData}
            onFinish={(reorderedPhotos) => {
              setPhotos(reorderedPhotos)
              setStep(STEPS.CUSTOMIZE_FILTER)
            }}
          />
        )}

        {step === STEPS.CUSTOMIZE_FILTER && (
          <CustomizeScreen
            mode="filter"
            photos={photos}
            selectedFrame={selectedFrame}
            selectedFrameData={selectedFrameData}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            onCetak={handleCetak}
            maxCaptures={maxCaptures}
            user={currentUser}
          />
        )}

        {step === STEPS.PROCESSING && (
          <ProcessingScreen
            rawPhotos={photos}
            compositePhotos={photos}
            selectedFrameData={selectedFrameData}
            selectedFilter={selectedFilter}
            user={currentUser}
            printQuantity={1}
            selectedMode="photobooth"
            isReprint={isReprint}
            videoClips={videoClips}
            onFinish={(data) => {
              if (data) setGalleryData(data)
              setStep(STEPS.OUTPUT)
              setIsReprint(false)
            }}
          />
        )}

        {step === STEPS.OUTPUT && (
          <OutputScreen
            galleryData={galleryData}
            onReset={resetSession}
            onAddPrint={handleAddPrint}
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {(syncStatus || pendingCount > 0) && (
        <div className={`fixed bottom-4 right-4 z-[999] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl transition-all font-sans ${
          syncStatus === 'done' ? 'bg-emerald-500 text-white' :
          syncStatus === 'syncing' ? 'bg-blue-500 text-white' :
          syncStatus === 'offline' ? 'bg-slate-700 text-white' :
          pendingCount > 0 ? 'bg-amber-500 text-white' : ''
        }`}>
          {syncStatus === 'done' && <><CheckCircle size={14} /> Data terkirim ke server</>}
          {syncStatus === 'syncing' && <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyinkronkan data...</>}
          {syncStatus === 'offline' && <><WifiOff size={14} /> Tidak ada jaringan</>}
          {!syncStatus && pendingCount > 0 && <><WifiOff size={14} /> {pendingCount} sesi menunggu jaringan</>}
        </div>
      )}

      <button
        onClick={toggleFullscreen}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all duration-200"
        title={isFullscreen ? 'Minimize' : 'Maximize'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  )
}

export default App
