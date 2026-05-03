import { useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import gifshot from 'gifshot';

const ProcessingScreen = ({ 
  rawPhotos, 
  compositePhotos, 
  selectedFrameData, 
  selectedFilter, 
  user, 
  printQuantity = 1, 
  selectedMode, 
  onFinish,
  isReprint = false 
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

  useEffect(() => {
    const processAndUpload = async () => {
      if (doneRef.current) return;
      doneRef.current = true;

      try {
        setProgress("Generating layout...");
        const compositeBlob = await generateCompositeImage();

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
        const { error: compErr } = await supabase.storage.from('frames').upload(compositeFileName, compositeBlob);
        if (compErr) throw compErr;
        const { data: { publicUrl: compositeUrl } } = supabase.storage.from('frames').getPublicUrl(compositeFileName);

        setProgress("Uploading raw photos...");
        
        // 2. Upload Raw Photos
        const rawPhotoUrls = [];
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
        const gifUrl = null;

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
        if (gifUrl) insertData.gif_url = gifUrl;
        const { error: insertError } = await supabase.from('captures').insert(insertData);
        if (insertError) throw insertError;

        setProgress("Done!");
        
        setTimeout(() => {
            onFinish({
              sessionId,
              compositeUrl,
              rawPhotos: rawPhotoUrls,
              gifUrl
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

  const generateCompositeImage = () => {
    return new Promise((resolve, reject) => {
      const selectedPaperSize = localStorage.getItem('selectedPaperSize') || '4r';
      const isA4 = selectedPaperSize === 'a4';
      const isA4Plus = selectedPaperSize === 'a4_plus';
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (isA4Plus) {
        // Enlarged version (+1.5cm effect)
        canvas.width = 1350; 
        canvas.height = 1950; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(-35, -40); 
        ctx.scale(2.35, 2.35); 
      } else if (isA4) {
        // Standard A4 Fit
        canvas.width = 1240; 
        canvas.height = 1840; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(-10, -10);
        ctx.scale(2.1, 2.1); 
      } else {
        // Standard 4R
        canvas.width = 1200; 
        canvas.height = 1800; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2); 
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
          const frameUrl = selectedFrameData.url || selectedFrameData.image_url;
          const frameImg = await loadImage(frameUrl);
          const fx = selectedFrameData.frame_x || 0;
          const fy = selectedFrameData.frame_y || 0;
          const fw = selectedFrameData.frame_width || 600;
          const fh = selectedFrameData.frame_height || 900;
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
