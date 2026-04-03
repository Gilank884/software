import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import AuthScreen from './components/AuthScreen'
import StartScreen from './components/StartScreen'
import InstructionsScreen from './components/InstructionsScreen'
import PaymentScreen from './components/PaymentScreen'
import SessionSelectScreen from './components/SessionSelectScreen'
import CaptureScreen from './components/CaptureScreen'
import CustomizeScreen from './components/CustomizeScreen'
import ProcessingScreen from './components/ProcessingScreen'
import OutputScreen from './components/OutputScreen'
import ModeSelectScreen from './components/ModeSelectScreen'
import SelfPhotoInstructionsScreen from './components/SelfPhotoInstructionsScreen'
import SelfPhotoTimeSelectScreen from './components/SelfPhotoTimeSelectScreen'
import SelfPhotoCaptureScreen from './components/SelfPhotoCaptureScreen'
import SelfPhotoPhotoSelectScreen from './components/SelfPhotoPhotoSelectScreen'
import PrintQuantityScreen from './components/PrintQuantityScreen'
import SettingsPage from './components/SettingsPage'
import FramesPage from './components/FramesPage'
import GalleryPage from './components/GalleryPage'
import PublicGalleryScreen from './components/PublicGalleryScreen'
import AppBackground from './components/AppBackground'
import DeviceLogin from './components/DeviceLogin'
import CreatorApp from './creator/App'
import RemoteController from './components/RemoteController'
import { LogOut, Monitor } from 'lucide-react'
import { useCamera } from './hooks/useCamera'

// --- Constants ---
const STEPS = {
  START: 'START',
  INSTRUCTIONS: 'INSTRUCTIONS',
  PAYMENT: 'PAYMENT',
  SESSION_SELECT: 'SESSION_SELECT',
  CAPTURE: 'CAPTURE',
  CUSTOMIZE_FRAME: 'CUSTOMIZE_FRAME',
  CUSTOMIZE_FILTER: 'CUSTOMIZE_FILTER',
  PROCESSING: 'PROCESSING',
  OUTPUT: 'OUTPUT',

  // Self Photo Steps
  MODE_SELECT: 'MODE_SELECT',
  SP_INSTRUCTIONS: 'SP_INSTRUCTIONS',
  SP_TIME_SELECT: 'SP_TIME_SELECT',
  SP_CAPTURE: 'SP_CAPTURE',
  SP_PHOTO_SELECT: 'SP_PHOTO_SELECT',
  SP_PRINT_QUANTITY: 'SP_PRINT_QUANTITY'
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
  const [cameraError, setCameraError] = useState(null)

  // Self Photo Specific State
  const [selfPhotoDuration, setSelfPhotoDuration] = useState(5) // minutes
  const [printQuantity, setPrintQuantity] = useState(1)
  const [selectedSelfPhotos, setSelectedSelfPhotos] = useState([]) // indices of selected photos
  
  // Use professional camera system
  const { status, startPreview, stopPreview, capturePhoto: captureCamPhoto, initCamera } = useCamera()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(() => {
    // Skip loading state entirely if we're rendering a public gallery via QR
    const params = new URLSearchParams(window.location.search)
    return !params.get('gallery')
  })
  const [isCreatorMode, setIsCreatorMode] = useState(false)
  const [deviceSession, setDeviceSession] = useState(null)
  const [step, setStep] = useState(STEPS.START)
  const [selectedMode, setSelectedMode] = useState(null) // 'photobooth' | 'self_photo'
  const [galleryData, setGalleryData] = useState(null)

  const videoRef = useRef(null)
  const previewCanvasRef = useRef(null) // Added for DSLR MJPEG preview
  const canvasRef = useRef(null)
  // Read gallery param synchronously so it's available on first render
  const [galleryId, setGalleryId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('gallery') || null
  })

  // Remote Control Session Management
  const [activeRemoteSessionId, setActiveRemoteSessionId] = useState(null)
  
  // Effect to generate session ID when entering Self Photo capture
  useEffect(() => {
    if (step === STEPS.SP_CAPTURE && !activeRemoteSessionId) {
       setActiveRemoteSessionId(`studio-${Math.random().toString(36).substring(2, 9)}`)
    } else if (step !== STEPS.SP_CAPTURE && activeRemoteSessionId) {
       setActiveRemoteSessionId(null)
    }
  }, [step])

  // Auth & URL Management
  useEffect(() => {
    // If gallery param exists it was already read synchronously above — skip full init
    if (galleryId) {
      setLoading(false)
      return
    }

    const host = window.location.hostname
    if (host.startsWith('creator.')) {
      setIsCreatorMode(true)
    }

    // Check for device session and refresh from DB to get latest config
    const savedDevice = localStorage.getItem('pb_device_session')
    if (savedDevice) {
      const parsed = JSON.parse(savedDevice)
      setDeviceSession(parsed)

      // Background refresh
      supabase
        .from('devices')
        .select('id, creator_id, name, payment_enabled, available_frames, enable_photobooth, enable_self_photo, self_photo_durations')
        .eq('id', parsed.device_id)
        .single()
        .then(({ data }) => {
          if (data) {
            const updated = {
              ...parsed,
              device_id: data.id,
              creator_id: data.creator_id,
              name: data.name,
              payment_enabled: data.payment_enabled,
              enable_photobooth: data.enable_photobooth ?? true,
              enable_self_photo: data.enable_self_photo ?? false,
              available_frames: data.available_frames || [],
              self_photo_durations: data.self_photo_durations || [5, 10, 15]
            }
            localStorage.setItem('pb_device_session', JSON.stringify(updated))
            setDeviceSession(updated)
          }
        })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Camera initialization happens automatically via Hook/Manager
  // but we can manually trigger it here if needed
  useEffect(() => {
    initCamera()
  }, [])


  // Camera Management
  useEffect(() => {
    if (step === STEPS.CAPTURE || step === STEPS.SP_CAPTURE) {
      const element = status.source === 'dslr' ? previewCanvasRef.current : videoRef.current
      if (element) startPreview(element)

      // Auto-start countdown ONLY if we have started the photobooth session and are NOT reviewing
      if (step === STEPS.CAPTURE && hasStartedSession && !isReviewing) {
        const timeout = setTimeout(() => startCountdown(), 1000)
        return () => clearTimeout(timeout)
      }
    } else {
      stopPreview()
    }
  }, [step, hasStartedSession, isReviewing, currentShotIndex, status.source])

  const startCountdown = () => {
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          capturePhoto()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const capturePhoto = async () => {
    try {
      const dataUrl = await captureCamPhoto()
      
      const newPhotos = [...photos]
      newPhotos[currentShotIndex] = dataUrl
      setPhotos(newPhotos)

      setIsReviewing(true)
    } catch (err) {
      console.error("Capture Failed:", err)
    }
  }

  const handleContinue = () => {
    if (currentShotIndex + 1 >= maxCaptures) {
      setStep(STEPS.CUSTOMIZE_FRAME)
      setIsReviewing(false)
    } else {
      setCurrentShotIndex(prev => prev + 1)
      setIsReviewing(false)
    }
  }

  const handleRetake = () => {
    const newPhotos = [...photos]
    newPhotos[currentShotIndex] = null
    setPhotos(newPhotos)
    setIsReviewing(false)
  }

  const handleCetak = () => {
    setStep(STEPS.PROCESSING)
  }

  const resetSession = () => {
    setStep(STEPS.START)
    setPhotos([])
    setCurrentShotIndex(0)
    setIsReviewing(false)
    setHasStartedSession(false)
    setSelectedFrame('classic')
    setSelectedFilter('none')
    setSelectedMode(null)
    setSelfPhotoDuration(5)
    setPrintQuantity(1)
    setSelectedSelfPhotos([])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setStep(STEPS.START)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <AppBackground />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 z-10"></div>
      </div>
    )
  }

  // --- Public Gallery Route ---
  if (galleryId) {
    return <PublicGalleryScreen galleryId={galleryId} />
  }

  // --- Remote Controller Route (Safe detection via query param) ---
  const urlParams = new URLSearchParams(window.location.search);
  const remoteSessionFromUrl = urlParams.get('remoteSession');
  if (remoteSessionFromUrl && !deviceSession) {
    return <RemoteController sessionId={remoteSessionFromUrl} />
  }

  // --- Creator Mode Branch ---
  if (isCreatorMode) {
    return <CreatorApp />
  }

  // --- Device Mode Branch ---
  if (!deviceSession) {
    return <DeviceLogin onLogin={setDeviceSession} />
  }

  // If in Device Mode, the "owner" of the content is the creator_id
  const currentUser = {
    id: deviceSession.creator_id,
    isDevice: true,
    deviceName: deviceSession.name,
    deviceId: deviceSession.device_id,
    availableFrames: deviceSession.available_frames || [],
    paymentEnabled: deviceSession.payment_enabled,
    enablePhotobooth: deviceSession.enable_photobooth ?? true,
    enableSelfPhoto: deviceSession.enable_self_photo ?? false,
    selfPhotoDurations: deviceSession.self_photo_durations || [5, 10, 15]
  }

  // --- Handlers for Start Flow ---
  const handleStart = () => {
    // Determine where to go based on device config
    if (currentUser.enablePhotobooth && currentUser.enableSelfPhoto) {
      setStep(STEPS.MODE_SELECT)
    } else if (currentUser.enableSelfPhoto && !currentUser.enablePhotobooth) {
      setSelectedMode('self_photo')
      setStep(STEPS.SP_INSTRUCTIONS)
    } else {
      setSelectedMode('photobooth')
      setStep(STEPS.INSTRUCTIONS)
    }
  }

  const handleModeSelection = (mode) => {
    setSelectedMode(mode);
    if (mode === 'self_photo') {
      setStep(STEPS.SP_INSTRUCTIONS);
    } else {
      setStep(STEPS.INSTRUCTIONS);
    }
  }

  // Path-based routing for Settings (e.g. to logout device)
  if (window.location.pathname === '/settings') {
    return <SettingsPage user={currentUser} />
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 bg-slate-50">
      <AppBackground />

      {/* Main Content Area */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {step === STEPS.START && (
          <StartScreen
            onStart={handleStart}
            user={currentUser}
            onLogout={() => { localStorage.removeItem('pb_device_session'); setDeviceSession(null); }}
          />
        )}

        {step === STEPS.MODE_SELECT && (
          <ModeSelectScreen
            onSelect={handleModeSelection}
          />
        )}

        {/* Photobooth Flow */}
        {step === STEPS.INSTRUCTIONS && (
          <InstructionsScreen
            onNext={() => setStep(currentUser.paymentEnabled ? STEPS.PAYMENT : STEPS.SESSION_SELECT)}
          />
        )}
        {step === STEPS.PAYMENT && <PaymentScreen onPaymentSuccess={() => {
          if (selectedMode === 'self_photo') {
            setStep(STEPS.PROCESSING)
            setTimeout(() => setStep(STEPS.OUTPUT), 3000)
          } else {
            setStep(STEPS.SESSION_SELECT)
          }
        }} mode={selectedMode} selfPhotoDuration={selfPhotoDuration} printQuantity={printQuantity} />}
        {step === STEPS.SESSION_SELECT && (
          <SessionSelectScreen
            onSelectSession={(shots) => { setMaxCaptures(shots); setStep(STEPS.CAPTURE); }}
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
            maxCaptures={selectedMode === 'self_photo' ? maxCaptures : maxCaptures}
            photos={photos}
            isReviewing={isReviewing}
            hasStartedSession={hasStartedSession}
            onStartSession={() => setHasStartedSession(true)}
            onContinue={handleContinue}
            onRetake={handleRetake}
            cameraError={status.error}
            user={currentUser}
          />
        )}

        {/* Self Photo Flow specific screens */}
        {step === STEPS.SP_INSTRUCTIONS && (
          <SelfPhotoInstructionsScreen
            onNext={() => setStep(STEPS.SP_TIME_SELECT)}
          />
        )}
        {step === STEPS.SP_TIME_SELECT && (
          <SelfPhotoTimeSelectScreen
            durations={currentUser.selfPhotoDurations}
            onSelectDuration={(duration) => { setSelfPhotoDuration(duration); setStep(STEPS.SP_CAPTURE); }}
          />
        )}
        {step === STEPS.SP_CAPTURE && (
          <SelfPhotoCaptureScreen
            videoRef={videoRef}
            previewCanvasRef={previewCanvasRef}
            cameraStatus={status}
            durationMinutes={selfPhotoDuration}
            photos={photos}
            setPhotos={setPhotos}
            onFinish={() => setStep(STEPS.CUSTOMIZE_FRAME)}
            cameraError={status.error}
            remoteSessionId={activeRemoteSessionId}
            captureCamPhoto={captureCamPhoto}
          />
        )}
        {step === STEPS.SP_PHOTO_SELECT && (
          <SelfPhotoPhotoSelectScreen
            photos={photos}
            selectedFrameData={selectedFrameData}
            selectedPhotos={selectedSelfPhotos}
            setSelectedPhotos={setSelectedSelfPhotos}
            onNext={() => setStep(STEPS.CUSTOMIZE_FILTER)}
          />
        )}
        {step === STEPS.SP_PRINT_QUANTITY && (
          <PrintQuantityScreen
            quantity={printQuantity}
            setQuantity={setPrintQuantity}
            onNext={() => setStep(currentUser.paymentEnabled ? STEPS.PAYMENT : STEPS.PROCESSING)}
          />
        )}
        {step === STEPS.CUSTOMIZE_FRAME && (
          <CustomizeScreen
            mode="frame"
            appMode={selectedMode}
            photos={photos}
            selectedFrame={selectedFrame}
            setSelectedFrame={setSelectedFrame}
            setSelectedFrameData={setSelectedFrameData}
            selectedFilter={selectedFilter}
            onNext={() => {
              if (selectedMode === 'self_photo') {
                setStep(STEPS.SP_PHOTO_SELECT)
              } else {
                setStep(STEPS.CUSTOMIZE_FILTER)
              }
            }}
            maxCaptures={maxCaptures}
            setMaxCaptures={setMaxCaptures}
            user={currentUser}
          />
        )}
        {step === STEPS.CUSTOMIZE_FILTER && (
          <CustomizeScreen
            mode="filter"
            appMode={selectedMode}
            photos={selectedMode === 'self_photo' ? selectedSelfPhotos.map(i => photos[i]) : photos}
            selectedFrame={selectedFrame}
            selectedFrameData={selectedFrameData}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            onCetak={selectedMode === 'self_photo' ? () => setStep(STEPS.SP_PRINT_QUANTITY) : handleCetak}
            maxCaptures={maxCaptures}
            user={currentUser}
          />
        )}
        {step === STEPS.PROCESSING && <ProcessingScreen
          rawPhotos={photos}
          compositePhotos={selectedMode === 'self_photo' ? selectedSelfPhotos.map(i => photos[i]) : photos}
          selectedFrameData={selectedFrameData}
          selectedFilter={selectedFilter}
          user={currentUser}
          printQuantity={printQuantity}
          selectedMode={selectedMode}
          onFinish={(data) => {
            setGalleryData(data)
            setStep(STEPS.OUTPUT)
          }}
        />}
        {step === STEPS.OUTPUT && (
          <OutputScreen
            galleryData={galleryData}
            selectedFrame={selectedFrame}
            selectedFrameData={selectedFrameData}
            selectedFilter={selectedFilter}
            onReset={resetSession}
            user={currentUser}
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default App
