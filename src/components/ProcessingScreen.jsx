import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CheckCircle2, ImageIcon, Upload, Layers } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { queueAdd, isNetworkError } from '../lib/offlineQueue';
import qrcode from 'qr.js';

const ProcessingScreen = ({
  rawPhotos,
  compositePhotos,
  selectedFrameData,
  selectedFilter,
  user,
  printQuantity = 1,
  selectedMode,
  onFinish,
  isReprint = false,
  videoClips = [],
  preUploadedRawUrls = [],
  preGeneratedSessionId = null,
}) => {
  const [progress, setProgress] = useState("Preparing Layout...");
  const [savedOffline, setSavedOffline] = useState(false);
  const canvasRef = useRef(null);
  const doneRef = useRef(false);

  const canvasFilters = {
    none: "",
    grayscale: "grayscale(100%)",
    sepia: "sepia(100%)",
    vibrant: "saturate(1.5)",
  };

  // Draws QR modules + optional pre-loaded logo Image element in center
  const drawQRCode = (ctx, data, x, y, width, height, logoImg = null) => {
    try {
      const qr = qrcode(data);
      const modules = qr.modules;

      const size = Math.min(width, height);
      const moduleSize = size / modules.length;
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;

      ctx.save();
      try {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + offsetX, y + offsetY, size, size);

        ctx.fillStyle = '#000000';
        ctx.translate(x + offsetX, y + offsetY);
        modules.forEach((row, rowIndex) => {
          row.forEach((col, colIndex) => {
            if (col) {
              ctx.fillRect(colIndex * moduleSize, rowIndex * moduleSize, moduleSize + 0.1, moduleSize + 0.1);
            }
          });
        });
      } finally {
        ctx.restore();
      }

      // Draw logo in center if provided (must be pre-loaded Image element)
      if (logoImg) {
        const logoSize = size * 0.28;
        const logoX = x + offsetX + (size - logoSize) / 2;
        const logoY = y + offsetY + (size - logoSize) / 2;
        const padding = logoSize * 0.1;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2);
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }
    } catch (err) {
      console.error("QR Draw Error:", err);
    }
  };

  // Pre-load logo images for QR slots that have one
  const preloadQrLogos = (slots) => {
    const promises = slots
      .filter(s => s.type === 'qr' && s.logoUrl)
      .map(s => new Promise((res) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res([s.logoUrl, img]);
        img.onerror = () => res([s.logoUrl, null]);
        img.src = s.logoUrl;
      }));
    return Promise.all(promises).then(entries =>
      Object.fromEntries(entries.filter(([, img]) => img !== null))
    );
  };

  useEffect(() => {
    const processAndUpload = async () => {
      if (doneRef.current) return;
      doneRef.current = true;

      try {
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        const sessionId = preGeneratedSessionId || generateUUID();

        setProgress("Generating layout...");
        const compositeBlob = await generateCompositeImage(sessionId);

        // Trigger Printing Immediately — paper size auto-detected from frame's size_type
        const selectedPrinter = localStorage.getItem('selectedPrinter') || '';
        const autoEpsonMatte = localStorage.getItem('autoEpsonMatte') === 'true';
        const frameSizeType = (selectedFrameData?.size_type || '4R').toUpperCase();
        const printerPaperSize = frameSizeType === 'A4' ? 'a4' : '4r';
        if (window.electronAPI?.printImage) {
          const reader = new FileReader();
          reader.onloadend = () => {
             window.electronAPI.printImage(reader.result, printQuantity, selectedPrinter, printerPaperSize, autoEpsonMatte);
          };
          reader.readAsDataURL(compositeBlob);
        }

        // IF REPRINT: Skip everything else and finish
        if (isReprint) {
          setProgress("Reprinting done!");
          setTimeout(() => {
            onFinish();
          }, 1500);
          return;
        }

        // Clean up local captures folder (DSLR hot-folder mode)
        if (window.electronAPI?.deleteCaptures) {
          window.electronAPI.deleteCaptures();
        }

        // ── OFFLINE-FIRST: cek jaringan sebelum upload ──
        if (!navigator.onLine) {
          setProgress("Jaringan tidak ada, menyimpan lokal...");
          await queueAdd({
            sessionId,
            userId: user?.id,
            frameId: selectedFrameData?.id,
            deviceId: user?.deviceId,
            deviceName: user?.deviceName,
            eventId: user?.eventId,
            compositeBlob,
            rawPhotoDataUrls: rawPhotos.filter(Boolean),
          });
          setSavedOffline(true);
          setProgress("Tersimpan! Akan dikirim otomatis saat online.");
          setTimeout(() => onFinish({ sessionId, compositeUrl: null, offline: true }), 2000);
          return;
        }

        // ── ONLINE: upload ke Supabase ──
        try {
          setProgress("Mengirim ke server...");

          // 1. Upload Composite
          const compositeFileName = `captures/${user?.id}/${Date.now()}_composite.png`;
          const { error: compErr } = await supabase.storage.from('frames').upload(compositeFileName, compositeBlob);
          if (compErr) throw compErr;
          const { data: { publicUrl: compositeUrl } } = supabase.storage.from('frames').getPublicUrl(compositeFileName);

          // 2. Upload Raw Photos (skip yang sudah pre-uploaded di background)
          const rawPhotoUrls = [...preUploadedRawUrls];
          const needUpload = rawPhotos.filter((p, i) => p && !rawPhotoUrls[i]);
          if (needUpload.length > 0) {
            setProgress(`Mengunggah foto...`);
          }
          for (let i = 0; i < rawPhotos.length; i++) {
            if (!rawPhotos[i] || rawPhotoUrls[i]) continue;
            setProgress(`Mengunggah foto ${i + 1}/${rawPhotos.length}...`);
            const res = await fetch(rawPhotos[i]);
            const blob = await res.blob();
            const rawFileName = `captures/${user?.id}/${sessionId}_raw_${i}.jpg`;
            const { error: rawErr } = await supabase.storage.from('frames').upload(rawFileName, blob, { upsert: true });
            if (!rawErr) {
              const { data: { publicUrl: rawUrl } } = supabase.storage.from('frames').getPublicUrl(rawFileName);
              rawPhotoUrls[i] = rawUrl;
            }
          }

          setProgress("Menyimpan ke galeri...");

          // 3. Insert to Database
          const { error: insertError } = await supabase.from('captures').insert({
            user_id: user?.id,
            frame_id: selectedFrameData?.id,
            image_url: compositeUrl,
            raw_photos: rawPhotoUrls.filter(Boolean),
            session_id: sessionId,
            device_id: user?.deviceId,
            device_name: user?.deviceName,
            event_id: user?.eventId,
          });
          if (insertError) throw insertError;

          setProgress("Selesai!");
          setTimeout(() => onFinish({ sessionId, compositeUrl, rawPhotos: rawPhotoUrls.filter(Boolean) }), 500);

        } catch (uploadErr) {
          // Jaringan terputus di tengah jalan → simpan ke antrian lokal
          if (isNetworkError(uploadErr)) {
            console.warn('[Offline] Jaringan terputus saat upload, menyimpan ke antrian lokal...');
            setProgress("Jaringan terputus, menyimpan lokal...");
            await queueAdd({
              sessionId,
              userId: user?.id,
              frameId: selectedFrameData?.id,
              deviceId: user?.deviceId,
              deviceName: user?.deviceName,
              eventId: user?.eventId,
              compositeBlob,
              rawPhotoDataUrls: rawPhotos.filter(Boolean),
            });
            setSavedOffline(true);
            setProgress("Tersimpan! Akan dikirim otomatis saat online.");
            setTimeout(() => onFinish({ sessionId, compositeUrl: null, offline: true }), 2000);
          } else {
            throw uploadErr;
          }
        }

      } catch (err) {
        console.error("Processing Error:", err);
        alert("Gagal memproses foto: " + err.message);
        onFinish({ sessionId: null, compositeUrl: null });
      }
    };

    if (user && selectedFrameData) {
      processAndUpload();
    }
  }, []);

  const getGalleryUrl = (sessionId) => {
    const galleryBase = import.meta.env.VITE_GALLERY_URL || (import.meta.env.DEV ? window.location.origin : "https://fotoku.latarcerita.com");
    return `${galleryBase}/?gallery=${sessionId}`;
  };

  const generateCompositeImage = (sessionId) => {
    return new Promise((resolve, reject) => {
      // Auto-detect size from frame's size_type; a4_plus from settings adds extra scale for A4 frames
      const frameSizeType = (selectedFrameData?.size_type || '4R').toUpperCase();
      const isA4 = frameSizeType === 'A4';
      const isA4Plus = isA4 && localStorage.getItem('selectedPaperSize') === 'a4_plus';

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const base = {
        width: selectedFrameData?.frame_width || (isA4 ? 636 : 600),
        height: selectedFrameData?.frame_height || 900
      };

      if (isA4Plus) {
        // A4 + extra scale (~300 DPI)
        const scale = 3.9;
        canvas.width = Math.ceil(base.width * scale);
        canvas.height = Math.ceil(base.height * scale);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
      } else if (isA4) {
        // A4 standard — scale 3.5 untuk ~270 DPI (kualitas bagus)
        const scale = 3.5;
        canvas.width = Math.ceil(base.width * scale);
        canvas.height = Math.ceil(base.height * scale);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
      } else {
        // 4R — scale 2 = tepat 300 DPI pada kertas 4x6 inch
        const scale = 2;
        canvas.width = base.width * scale;
        canvas.height = base.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
      }

      const loadImage = (src) => {
        return new Promise((res, rej) => {
          if (!src) return rej(new Error('Source missing'));
          const img = new Image();
          if (typeof src === 'string' && src.startsWith('http')) img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      };

      const drawAll = async () => {
        try {
          const qrLogoImgs = await preloadQrLogos(selectedFrameData.slots);
          for (const slot of selectedFrameData.slots) {
            if (slot.type === 'qr') {
              const galleryUrl = getGalleryUrl(sessionId);
              const logoImg = slot.logoUrl ? qrLogoImgs[slot.logoUrl] || null : null;
              drawQRCode(ctx, galleryUrl, slot.x, slot.y, slot.width, slot.height, logoImg);
            } else {
              const photoSrc = compositePhotos[slot.number - 1];
              if (photoSrc) {
                const img = await loadImage(photoSrc);
                ctx.save();
                if (selectedFilter && canvasFilters[selectedFilter]) {
                  ctx.filter = canvasFilters[selectedFilter];
                }
                const aspect = img.width / img.height;
                const targetAspect = slot.width / slot.height;
                let drawW, drawH, drawX, drawY;
                if (aspect > targetAspect) {
                  drawH = slot.height;
                  drawW = slot.height * aspect;
                  drawX = slot.x - (drawW - slot.width) / 2;
                  drawY = slot.y;
                } else {
                  drawW = slot.width;
                  drawH = slot.width / aspect;
                  drawX = slot.x;
                  drawY = slot.y - (drawH - slot.height) / 2;
                }
                ctx.beginPath();
                ctx.rect(slot.x, slot.y, slot.width, slot.height);
                ctx.clip();
                ctx.drawImage(img, drawX, drawY, drawW, drawH);
                ctx.restore();
              }
            }
          }
          const frameUrl = selectedFrameData.url || selectedFrameData.image_url;
          const frameImg = await loadImage(frameUrl);
          const fx = selectedFrameData.frame_x || 0;
          const fy = selectedFrameData.frame_y || 0;
          const fw = selectedFrameData.frame_width || base.width;
          const fh = selectedFrameData.frame_height || base.height;
          const fAspect = frameImg.width / frameImg.height;
          const targetFAspect = fw / fh;
          let fDrawW, fDrawH, fDrawX, fDrawY;
          if (fAspect > targetFAspect) {
            fDrawW = fw;
            fDrawH = fw / fAspect;
            fDrawX = fx;
            fDrawY = fy + (fh - fDrawH) / 2;
          } else {
            fDrawH = fh;
            fDrawW = fh * fAspect;
            fDrawX = fx + (fw - fDrawW) / 2;
            fDrawY = fy;
          }
          ctx.drawImage(frameImg, fDrawX, fDrawY, fDrawW, fDrawH);
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      drawAll();
    });
  };

  const generateGifFromPhotos = (photoUrls) => {
    return new Promise((resolve) => {
      const numPhotos = photoUrls.length;
      // Total duration 1s, so interval per frame is 1 / numPhotos
      const interval = 1 / numPhotos;

      gifshot.createGIF({
        images: photoUrls,
        gifWidth: 1080,
        gifHeight: 720,
        interval: interval,
        numFrames: numPhotos,
        frameDuration: interval * 10, // gifshot uses 1/10th of a second units for some params? No, interval is in seconds.
        sampleInterval: 10,
        numWorkers: 2
      }, (obj) => {
        if (!obj.error) {
          const image = obj.image;
          // Convert base64 to blob
          fetch(image)
            .then(res => res.blob())
            .then(blob => {
              resolve({ blob, extension: 'gif' });
            });
        } else {
          console.error("GIF creation error", obj.error);
          resolve({ blob: null, extension: 'gif' });
        }
      });
    });
  };

  const generateCompositeVideo = (videoBlobs, sessionId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const selectedPaperSize = localStorage.getItem('selectedPaperSize') || '4r';
        const isA4 = selectedPaperSize === 'a4';
        const isA4Plus = selectedPaperSize === 'a4_plus';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const base = {
          width: selectedFrameData?.frame_width || (selectedFrameData?.size_type === 'A4' ? 636 : 600),
          height: selectedFrameData?.frame_height || 900
        };

        if (isA4Plus) {
          const scale = 2.35;
          canvas.width = Math.ceil(base.width * scale); 
          canvas.height = Math.ceil(base.height * scale); 
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale); 
        } else if (isA4) {
          const scale = 2.1;
          canvas.width = Math.ceil(base.width * scale); 
          canvas.height = Math.ceil(base.height * scale); 
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale); 
        } else {
          const scale = 2;
          canvas.width = base.width * scale; 
          canvas.height = base.height * scale; 
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale); 
        }
        
        const frameUrl = selectedFrameData.url || selectedFrameData.image_url;
        
        const loadImageLocal = (src) => {
          return new Promise((res, rej) => {
            if (!src) return rej(new Error('Source missing'));
            const img = new Image();
            if (typeof src === 'string' && src.startsWith('http')) img.crossOrigin = "anonymous";
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
          });
        };

        const frameImg = await loadImageLocal(frameUrl);
        
        const videoElements = await Promise.all(videoBlobs.map(async (blob, idx) => {
          if (!blob) return null;
          return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(blob);
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.setAttribute('webkit-playsinline', 'true');
            
            const timeout = setTimeout(() => {
              console.warn(`Video ${idx} load timeout`);
              resolve(null);
            }, 5000);

            video.oncanplay = () => {
              clearTimeout(timeout);
              video.play().catch(e => console.warn("Video play error:", e));
              resolve(video);
            };
            
            video.onerror = () => {
              clearTimeout(timeout);
              console.error(`Video ${idx} error`);
              resolve(null);
            };

            video.load();
          });
        }));

        // Pre-load QR logo images
        const qrLogoImgs = await preloadQrLogos(selectedFrameData.slots);

        // Attach canvas to DOM hidden to ensure it's "active" in Electron/Chrome background
        canvas.style.position = 'fixed';
        canvas.style.top = '-9999px';
        canvas.style.left = '-9999px';
        canvas.style.visibility = 'hidden';
        document.body.appendChild(canvas);

        const stream = canvas.captureStream(30);
        
        let mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
        
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          if (canvas.parentNode) document.body.removeChild(canvas);
          resolve(finalBlob);
        };

        recorder.start();
        console.log("MediaRecorder started");
        
        // Cache QR codes to avoid regenerating them every frame
        const qrCache = {};
        const getQrCanvas = (data, width, height, logoImg = null) => {
          const key = `${data}_${width}_${height}_${logoImg ? 'logo' : 'plain'}`;
          if (qrCache[key]) return qrCache[key];

          const qrCanvas = document.createElement('canvas');
          qrCanvas.width = width;
          qrCanvas.height = height;
          const qctx = qrCanvas.getContext('2d');
          drawQRCode(qctx, data, 0, 0, width, height, logoImg);
          qrCache[key] = qrCanvas;
          return qrCanvas;
        };

        const startTime = Date.now();
        const recordingDuration = 3500; 

        const renderInterval = setInterval(() => {
          const now = Date.now();
          if (now - startTime > recordingDuration) {
            clearInterval(renderInterval);
            if (recorder.state === 'recording') recorder.stop();
            videoElements.forEach(v => {
               if (v) {
                  v.pause();
                  URL.revokeObjectURL(v.src);
               }
            });
            return;
          }

          // Clear the whole canvas using absolute coords
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw items in slots
          const galleryUrl = getGalleryUrl(sessionId);
          
          selectedFrameData.slots.forEach((slot) => {
            if (slot.type === 'qr') {
               const logoImg = slot.logoUrl ? qrLogoImgs[slot.logoUrl] || null : null;
               const qrCanvas = getQrCanvas(galleryUrl, slot.width, slot.height, logoImg);
               ctx.drawImage(qrCanvas, slot.x, slot.y);
            } else {
              const video = videoElements[slot.number - 1];
              if (video && video.readyState >= 2) {
                ctx.save();
                const aspect = video.videoWidth / video.videoHeight;
                const targetAspect = slot.width / slot.height;
                let drawW, drawH, drawX, drawY;
                
                if (aspect > targetAspect) {
                  drawH = slot.height;
                  drawW = slot.height * aspect;
                  drawX = slot.x - (drawW - slot.width) / 2;
                  drawY = slot.y;
                } else {
                  drawW = slot.width;
                  drawH = slot.width / aspect;
                  drawX = slot.x;
                  drawY = slot.y - (drawH - slot.height) / 2;
                }
                
                ctx.beginPath();
                ctx.rect(slot.x, slot.y, slot.width, slot.height);
                ctx.clip();
                
                if (selectedFilter && canvasFilters[selectedFilter]) {
                  ctx.filter = canvasFilters[selectedFilter];
                }
                
                ctx.drawImage(video, drawX, drawY, drawW, drawH);
                ctx.restore();
              }
            }
          });

          // Draw frame overlay
          const fx = selectedFrameData.frame_x || 0;
          const fy = selectedFrameData.frame_y || 0;
          const fw = selectedFrameData.frame_width || base.width;
          const fh = selectedFrameData.frame_height || base.height;
          
          const fAspect = frameImg.width / frameImg.height;
          const targetFAspect = fw / fh;
          let fDrawW, fDrawH, fDrawX, fDrawY;
          
          if (fAspect > targetFAspect) {
            fDrawW = fw;
            fDrawH = fw / fAspect;
            fDrawX = fx;
            fDrawY = fy + (fh - fDrawH) / 2;
          } else {
            fDrawH = fh;
            fDrawW = fh * fAspect;
            fDrawX = fx + (fw - fDrawW) / 2;
            fDrawY = fy;
          }
          
          ctx.drawImage(frameImg, fDrawX, fDrawY, fDrawW, fDrawH);
        }, 1000 / 30); // 30 FPS
      } catch (err) {
        console.error("Error in generateCompositeVideo:", err);
        reject(err);
      }
    });
  };

  const PARTICLES = [
    { x: '15%', delay: 0,    dur: 2.8, color: 'bg-rose-200' },
    { x: '30%', delay: 0.5,  dur: 3.2, color: 'bg-pink-200' },
    { x: '50%', delay: 0.2,  dur: 2.5, color: 'bg-rose-300' },
    { x: '65%', delay: 0.9,  dur: 3.0, color: 'bg-pink-300' },
    { x: '80%', delay: 0.4,  dur: 2.7, color: 'bg-rose-200' },
    { x: '22%', delay: 1.1,  dur: 3.4, color: 'bg-pink-100' },
    { x: '72%', delay: 0.7,  dur: 2.9, color: 'bg-rose-100' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-white select-none">

      {/* Background glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: savedOffline ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(225,29,72,0.1) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating polaroid particles */}
      {!savedOffline && PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bottom-10 pointer-events-none"
          style={{ left: p.x }}
          animate={{ y: [0, -220, 0], opacity: [0, 0.7, 0], rotate: [0, i % 2 === 0 ? 12 : -12, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        >
          <div className={`w-5 h-6 ${p.color} rounded-sm shadow-sm flex items-end justify-center pb-0.5`}>
            <div className="w-3 h-3 bg-white/60 rounded-sm" />
          </div>
        </motion.div>
      ))}

      {savedOffline ? (
        /* ── OFFLINE STATE ── */
        <motion.div
          className="z-10 flex flex-col items-center gap-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <motion.div
            className="w-28 h-28 bg-amber-50 border-4 border-amber-200 rounded-full flex items-center justify-center shadow-2xl shadow-amber-200/50"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WifiOff size={48} className="text-amber-500" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-6xl font-black text-slate-800 tracking-tighter font-caveat">Tersimpan!</h2>
            <p className="text-amber-500 text-sm font-bold font-sans mt-3 flex items-center justify-center gap-2">
              <WifiOff size={14} /> Akan otomatis terkirim saat online
            </p>
          </div>
        </motion.div>
      ) : (
        /* ── PRINTING STATE ── */
        <div className="z-10 flex flex-col items-center">

          {/* Printer illustration */}
          <div className="relative mb-16">

            {/* Glow under printer */}
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-6 bg-rose-400/20 rounded-full blur-xl"
              animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Printer body */}
            <motion.div
              className="relative w-52 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden"
              style={{ height: '88px' }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Top ridge */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-600 rounded-t-2xl" />
              {/* Paper input slot top */}
              <div className="absolute top-5 left-8 right-8 h-2 bg-slate-900 rounded-full" />
              {/* Brand label */}
              <div className="absolute top-4 left-0 right-0 flex justify-center pt-4">
                <span className="text-slate-500 text-[7px] font-black uppercase tracking-[0.35em]">Photobooth</span>
              </div>
              {/* LED strip */}
              <div className="absolute top-3 right-5 flex gap-1.5">
                <motion.div
                  className="w-2 h-2 rounded-full bg-rose-500 shadow-lg shadow-rose-500/60"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <div className="w-2 h-2 rounded-full bg-slate-600" />
              </div>
              {/* Body texture lines */}
              <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-1">
                <div className="h-px bg-slate-700/50" />
                <div className="h-px bg-slate-700/50" />
              </div>
              {/* Output slot */}
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-slate-900 rounded-b-2xl flex items-center justify-center">
                <div className="w-32 h-1 bg-slate-800 rounded-full" />
              </div>
            </motion.div>

            {/* Paper coming out */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center" style={{ height: '72px', overflow: 'visible' }}>
              <motion.div
                className="w-36 bg-white rounded-b-xl shadow-xl border border-slate-100 flex flex-col gap-1.5 px-4 pt-3 pb-3 origin-top"
                animate={{ y: ['0px', '18px', '0px'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Scan lines simulating photo printing */}
                <motion.div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-rose-300 rounded-full" animate={{ width: ['0%', '100%', '100%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
                </motion.div>
                <motion.div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-pink-200 rounded-full" animate={{ width: ['0%', '100%', '100%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.1 }} />
                </motion.div>
                <motion.div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-rose-200 rounded-full" animate={{ width: ['0%', '100%', '100%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.2 }} />
                </motion.div>
                <motion.div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-pink-300 rounded-full" animate={{ width: ['0%', '85%', '85%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.3 }} />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Title */}
          <motion.h2
            className="text-7xl font-black text-slate-800 tracking-tighter font-caveat leading-none mb-4"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {isReprint ? 'Reprinting...' : 'Printing...'}
          </motion.h2>

          {/* Progress steps */}
          <div className="flex items-center gap-3 mb-6">
            {[
              { label: 'Layout', icon: Layers },
              { label: 'Upload', icon: Upload },
              { label: 'Galeri', icon: ImageIcon },
            ].map(({ label, icon: Icon }, i) => {
              const progressStep = (() => {
                if (progress === 'Menyimpan ke galeri...') return 2;
                if (progress === 'Selesai!') return 3;
                if (progress.startsWith('Mengunggah foto') || progress === 'Mengirim ke server...') return 1;
                return 0;
              })();
              const isActive = progressStep === i;
              const isDone = progressStep > i;
              return (
                <div key={label} className="flex items-center gap-3">
                  <motion.div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isDone ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-100 text-slate-400'}`}
                    animate={isActive ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {isDone ? <CheckCircle2 size={10} /> : <Icon size={10} />}
                    {label}
                  </motion.div>
                  {i < 2 && <div className={`w-4 h-px rounded-full ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                </div>
              );
            })}
          </div>

          {/* Progress text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={progress}
              className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] font-sans"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {progress}
            </motion.p>
          </AnimatePresence>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ProcessingScreen;
