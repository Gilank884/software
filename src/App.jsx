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
import SettingsPage from './components/SettingsPage'
import FramesPage from './components/FramesPage'
import GalleryPage from './components/GalleryPage'
import AppBackground from './components/AppBackground'
import CreatorDashboard from './components/CreatorDashboard'
import DeviceLogin from './components/DeviceLogin'
import { LogOut, Monitor } from 'lucide-react'

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
  OUTPUT: 'OUTPUT'
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
  
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCreatorMode, setIsCreatorMode] = useState(false)
  const [deviceSession, setDeviceSession] = useState(null)
  const [step, setStep] = useState(STEPS.START)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Auth Management
  useEffect(() => {
    // Detect mode based on hostname
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
        .select('id, creator_id, name, payment_enabled, available_frames')
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
              available_frames: data.available_frames || []
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

  const startCamera = async () => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Kamera API tidak didukung di sistem ini.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Camera Error Log:", err)
      let msg = "Kamera tidak dapat aktif."
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Izin kamera ditolak. Mohon aktifkan di pengaturan sistem."
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "Kamera tidak ditemukan. Pastikan sudah tercolok."
      } else {
        msg = `Gagal akses kamera: ${err.message}`
      }
      setCameraError(msg)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Camera Management
  useEffect(() => {
    if (step === STEPS.CAPTURE) {
      startCamera()
      
      // Auto-start countdown ONLY if we have started the session and are NOT reviewing
      if (hasStartedSession && !isReviewing) {
        const timeout = setTimeout(() => startCountdown(), 1000)
        return () => clearTimeout(timeout)
      }
    } else {
      stopCamera()
    }
  }, [step, hasStartedSession, isReviewing, currentShotIndex])

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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      
      context.translate(canvasRef.current.width, 0)
      context.scale(-1, 1)
      context.drawImage(videoRef.current, 0, 0)
      
      const dataUrl = canvasRef.current.toDataURL('image/png')
      
      const newPhotos = [...photos]
      newPhotos[currentShotIndex] = dataUrl
      setPhotos(newPhotos)
      
      setIsReviewing(true)
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
    setTimeout(() => setStep(STEPS.OUTPUT), 3000)
  }

  const resetSession = () => {
    setStep(STEPS.START)
    setPhotos([])
    setCurrentShotIndex(0)
    setIsReviewing(false)
    setHasStartedSession(false)
    setSelectedFrame('classic')
    setSelectedFilter('none')
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

  // --- Creator Mode Branch ---
  if (isCreatorMode) {
    if (!session) {
      const isSignupPath = window.location.pathname === '/daftar'
      return <AuthScreen onAuthSuccess={setSession} initialIsLogin={!isSignupPath} />
    }
    
    // Additional path routing for creator (optional, or just use tabs in Dashboard)
    if (window.location.pathname === '/frames') {
      return <FramesPage user={session?.user} />
    }
    if (window.location.pathname === '/gallery') {
      return <GalleryPage user={session?.user} />
    }

    return <CreatorDashboard user={session?.user} onSignOut={handleSignOut} />
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
    paymentEnabled: deviceSession.payment_enabled
  }

  // Path-based routing for Settings (e.g. to logout device)
  if (window.location.pathname === '/settings') {
    return <SettingsPage user={currentUser} />
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 bg-slate-50">
      {/* Global Animated Background */}
      <AppBackground />
      
      {/* Device Status - Float Top Right */}
      <div className="fixed top-8 right-8 z-[100] flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 backdrop-blur-md border border-blue-600/20 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          {deviceSession.name}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {step === STEPS.START && (
          <StartScreen 
            onStart={() => setStep(STEPS.INSTRUCTIONS)} 
            user={currentUser}
            onLogout={() => { localStorage.removeItem('pb_device_session'); setDeviceSession(null); }}
          />
        )}
        {step === STEPS.INSTRUCTIONS && (
          <InstructionsScreen 
            onNext={() => setStep(currentUser.paymentEnabled ? STEPS.PAYMENT : STEPS.SESSION_SELECT)} 
          />
        )}
        {step === STEPS.PAYMENT && <PaymentScreen onPaymentSuccess={() => setStep(STEPS.SESSION_SELECT)} />}
        {step === STEPS.SESSION_SELECT && (
          <SessionSelectScreen 
            onSelectSession={(shots) => { setMaxCaptures(shots); setStep(STEPS.CAPTURE); }} 
            user={currentUser}
          />
        )}
        {step === STEPS.CAPTURE && (
          <CaptureScreen 
            videoRef={videoRef} 
            countdown={countdown} 
            currentShotIndex={currentShotIndex} 
            maxCaptures={maxCaptures} 
            photos={photos} 
            isReviewing={isReviewing}
            hasStartedSession={hasStartedSession}
            onStartSession={() => setHasStartedSession(true)}
            onContinue={handleContinue}
            onRetake={handleRetake}
            cameraError={cameraError}
            user={currentUser}
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
            onNext={() => setStep(STEPS.CUSTOMIZE_FILTER)}
            maxCaptures={maxCaptures}
            user={currentUser}
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
        {step === STEPS.PROCESSING && <ProcessingScreen />}
        {step === STEPS.OUTPUT && (
          <OutputScreen 
            photos={photos} 
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
