import { useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import gifshot from 'gifshot';
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
  videoClips = []
}) => {
  const [progress, setProgress] = useState("Preparing Layout...");
  const canvasRef = useRef(null);
  const doneRef = useRef(false);

  const canvasFilters = {
    none: "",
    grayscale: "grayscale(100%)",
    sepia: "sepia(100%)",
    vibrant: "saturate(1.5)",
  };

  const drawQRCode = (ctx, data, x, y, width, height) => {
    try {
      const qr = qrcode(data); 
      const modules = qr.modules;
      
      // QR is always square, so use the smaller dimension as the base size
      const size = Math.min(width, height);
      const moduleSize = size / modules.length;
      
      // Calculate offsets to center the QR in the slot
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;
      
      ctx.save();
      try {
        // Draw white background for the QR code to ensure scannability
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
    } catch (err) {
      console.error("QR Draw Error:", err);
    }
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
        const sessionId = generateUUID();

        setProgress("Generating layout...");
        const compositeBlob = await generateCompositeImage(sessionId);

        // Trigger Printing Immediately
        const selectedPrinter = localStorage.getItem('selectedPrinter') || '';
        const selectedPaperSize = localStorage.getItem('selectedPaperSize') || '4r';
        const autoEpsonMatte = localStorage.getItem('autoEpsonMatte') === 'true';
        if (window.electronAPI?.printImage) {
          const reader = new FileReader();
          reader.onloadend = () => {
             // Map a4_plus back to a4 for the actual printer driver paper size
             const printerPaperSize = selectedPaperSize === 'a4_plus' ? 'a4' : selectedPaperSize;
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

        setProgress("Creating Session Gallery...");
        
        // 1. Upload Composite Image
        const compositeFileName = `captures/${user?.id}/${Date.now()}_composite.png`;
        console.log('Uploading composite:', compositeFileName, 'Blob size:', compositeBlob.size);
        
        const { error: compErr } = await supabase.storage.from('frames').upload(compositeFileName, compositeBlob);
        if (compErr) {
          console.error('Composite Upload Error Details:', compErr);
          throw compErr;
        }
        
        const { data: { publicUrl: compositeUrl } } = supabase.storage.from('frames').getPublicUrl(compositeFileName);
        console.log('Composite Public URL:', compositeUrl);

        setProgress("Uploading raw photos...");
        
        // 2. Upload Raw Photos
        const rawPhotoUrls = [];
        
        for (let i = 0; i < rawPhotos.length; i++) {
          if (!rawPhotos[i]) continue;
          setProgress(`Uploading photo ${i + 1} of ${rawPhotos.length}...`);
          const res = await fetch(rawPhotos[i]);
          const blob = await res.blob();
          const rawFileName = `captures/${user?.id}/${sessionId}_raw_${i}.jpg`;
          const { error: rawErr } = await supabase.storage.from('frames').upload(rawFileName, blob);
          if (!rawErr) {
             const { data: { publicUrl: rawUrl } } = supabase.storage.from('frames').getPublicUrl(rawFileName);
             rawPhotoUrls.push(rawUrl);
          }
        }

        // 3. Generate Video
        // GIF Generation is disabled for now
        /*
        let gifUrl = null;
        if (selectedMode === 'photobooth') {
          try {
            setProgress("Generating animated GIF...");
            const { blob: gifBlob, extension } = await generateGifFromPhotos(rawPhotoUrls);
            const gifFileName = `captures/${user?.id}/${sessionId}_animation.${extension}`;
            const { error: videoErr } = await supabase.storage.from('frames').upload(gifFileName, gifBlob, {
              contentType: 'image/gif'
            });
            if (!videoErr) {
              const { data: { publicUrl: vUrl } } = supabase.storage.from('frames').getPublicUrl(gifFileName);
              gifUrl = vUrl;
            }
          } catch (vidErr) {
            console.error("Video Generation Error:", vidErr);
          }
        }
        */
        
        let finalVideoUrl = null;
        // Video generation is temporarily disabled
        if (false && selectedMode === 'photobooth' && videoClips.length > 0) {
          try {
            setProgress("Generating Framed Video...");
            const videoBlob = await generateCompositeVideo(videoClips, sessionId);
            const videoFileName = `captures/${user?.id}/${sessionId}_framed_video.webm`;
            const { error: videoErr } = await supabase.storage.from('frames').upload(videoFileName, videoBlob, {
              contentType: 'video/webm'
            });
            if (!videoErr) {
              const { data: { publicUrl: vUrl } } = supabase.storage.from('frames').getPublicUrl(videoFileName);
              finalVideoUrl = vUrl;
            }
          } catch (vidErr) {
            console.error("Video Generation Error:", vidErr);
          }
        }

        setProgress("Finalizing Gallery...");

        // 4. Insert into Database
        const insertData = {
          user_id: user?.id,
          frame_id: selectedFrameData?.id,
          image_url: compositeUrl,
          raw_photos: rawPhotoUrls,
          session_id: sessionId,
          device_id: user?.deviceId,
          device_name: user?.deviceName,
          event_id: user?.eventId
        };
        if (finalVideoUrl) insertData.video_url = finalVideoUrl;
        const { error: insertError } = await supabase.from('captures').insert(insertData);
        if (insertError) throw insertError;

        setProgress("Done!");
        
        setTimeout(() => {
            onFinish({
              sessionId,
              compositeUrl,
              rawPhotos: rawPhotoUrls,
              videoUrl: finalVideoUrl
            });
        }, 500);

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
      const selectedPaperSize = localStorage.getItem('selectedPaperSize') || '4r';
      const isA4 = selectedPaperSize === 'a4';
      const isA4Plus = selectedPaperSize === 'a4_plus';
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const base = {
        width: selectedFrameData?.frame_width || (selectedFrameData?.size_type === 'A4' ? 636 : 600),
        height: selectedFrameData?.frame_height || 900
      };

      if (isA4Plus) {
        // Enlarged version (+1.5cm effect)
        const scale = 2.35;
        canvas.width = Math.ceil(base.width * scale); 
        canvas.height = Math.ceil(base.height * scale); 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale); 
      } else if (isA4) {
        // Standard A4 Fit
        const scale = 2.1;
        canvas.width = Math.ceil(base.width * scale); 
        canvas.height = Math.ceil(base.height * scale); 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale); 
      } else {
        // Standard 4R
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
          for (const slot of selectedFrameData.slots) {
            if (slot.type === 'qr') {
              const galleryUrl = getGalleryUrl(sessionId);
              drawQRCode(ctx, galleryUrl, slot.x, slot.y, slot.width, slot.height);
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
        const getQrCanvas = (data, width, height) => {
          const key = `${data}_${width}_${height}`;
          if (qrCache[key]) return qrCache[key];
          
          const qrCanvas = document.createElement('canvas');
          qrCanvas.width = width;
          qrCanvas.height = height;
          const qctx = qrCanvas.getContext('2d');
          drawQRCode(qctx, data, 0, 0, width, height);
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
               const qrCanvas = getQrCanvas(galleryUrl, slot.width, slot.height);
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
                
                // Apply horizontal flip to un-mirror the video (standard for photobooth results)
                ctx.translate(slot.x + slot.width, 0);
                ctx.scale(-1, 1);
                ctx.translate(-slot.x, 0);

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center font-caveat relative overflow-hidden">
      <div className="z-10 text-center scale-90 md:scale-100">
        <div className="w-48 h-48 relative mb-12 mx-auto">
          <div className="absolute inset-0 border-[12px] border-blue-50 rounded-full"></div>
          <div className="absolute inset-0 border-[12px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-gradient-blue pb-2">
            <RefreshCcw size={64} className="animate-pulse" />
          </div>
        </div>

        <h2 className="text-7xl font-black text-slate-800 mb-6 animate-bounce tracking-tighter leading-none">
          {isReprint ? "Reprinting..." : "Printing..."}
        </h2>

        <div className="flex items-center justify-center gap-3">
          <div className="h-1 w-10 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-full animate-[progress_1.5s_infinite_linear]"></div>
          </div>
          <p className="text-slate-400 text-sm font-black uppercase tracking-[0.2em] font-sans">
             {progress}
          </p>
          <div className="h-1 w-10 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-full animate-[progress_1.5s_infinite_linear]"></div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes progress {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ProcessingScreen;
