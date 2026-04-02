import React, { useEffect, useState } from 'react';
import { Camera, Monitor, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

const TestCamera = () => {
  const { status, startPreview, stopPreview, setCameraSource, setWebcamDevice, refreshWebcamDevices } = useCamera();
  const [previewRef, setPreviewRef] = useState(null);

  useEffect(() => {
    if (previewRef && status.source === 'webcam' && status.active) {
      startPreview(previewRef);
    }
    return () => stopPreview();
  }, [previewRef, status.source, status.active]);

  const handleCaptureTest = async () => {
    try {
      await camera.capture();
    } catch (err) {
      console.error("Test Capture Failed:", err);
    }
  };

  const getStatusIcon = () => {
    if (!status.active) return <AlertCircle className="text-rose-500" size={24} />;
    return <CheckCircle2 className="text-emerald-500" size={24} />;
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <Camera size={20} className="text-slate-900" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Hardware Diagnostic</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {status.isElectron ? 'Electron Environment' : 'Browser Environment'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          {getStatusIcon()}
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
            {status.name}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Preview Area */}
        <div className="aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-inner border-4 border-slate-100">
          {status.source === 'webcam' ? (
            <video
              ref={(el) => setPreviewRef(el)}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (status.lastCapturedImage || status.source === 'mock') ? (
            <div className="w-full h-full relative">
              <img 
                src={status.lastCapturedImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000'} 
                alt="Camera Preview" 
                className="w-full h-full object-cover"
              />
              {status.source === 'mock' && !status.lastCapturedImage && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Mock Preview Active</p>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                <Camera size={32} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Menunggu Pengambilan Gambar...</p>
            </div>
          )}
          
          {/* Environment Badge */}
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">
              Live Feed: {status.source}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'auto', label: 'Auto', icon: RefreshCw },
            { id: 'dslr', label: 'DSLR Folder', icon: Camera },
            { id: 'webcam', label: 'Webcam', icon: Monitor },
            { id: 'mock', label: 'Mock', icon: Settings2 }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setCameraSource(mode.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                (mode.id === 'auto' && status.isAutoDetect) || (mode.id !== 'auto' && !status.isAutoDetect && status.source === mode.id)
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <mode.icon size={18} />
              <span className="text-[9px] font-black uppercase tracking-widest">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Webcam Device Selection */}
        {status.source === 'webcam' && (
          <div className="space-y-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={12} />
                Pilih Input Kamera
              </div>
              <button 
                onClick={() => refreshWebcamDevices()}
                className="p-1 hover:bg-slate-100 rounded-md transition-all text-blue-500"
              >
                <RefreshCw size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {status.webcamDevices?.length > 0 ? (
                status.webcamDevices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => setWebcamDevice(device.id)}
                    className={`px-4 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                      status.currentWebcamId === device.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    {device.label}
                  </button>
                ))
              ) : (
                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest italic">
                   Tidak ada kamera lain ditemukan.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleCaptureTest}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg active:scale-95"
        >
          Test Hardware Capture
        </button>

        {/* Help text */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 text-blue-600">
          <RefreshCw size={16} className="shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold leading-relaxed">
            Sistem secara otomatis mendeteksi perangkat terbaik. Gunakan mode DSLR untuk hasil profesional dalam mode Electron, atau Webcam untuk kemudahan akses browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestCamera;
