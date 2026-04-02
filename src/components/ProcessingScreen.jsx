import { useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ProcessingScreen = ({ rawPhotos, compositePhotos, selectedFrameData, selectedFilter, user, printQuantity = 1, onFinish }) => {
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
        setProgress("Generating final layout...");
        const compositeBlob = await generateCompositeImage();

        // Trigger Printing Immediately
        const selectedPrinter = localStorage.getItem('selectedPrinter') || '';
        const selectedPaperSize = localStorage.getItem('selectedPaperSize') || '4r';
        if (window.electronAPI?.printImage) {
          const reader = new FileReader();
          reader.onloadend = () => {
             window.electronAPI.printImage(reader.result, printQuantity, selectedPrinter, selectedPaperSize);
          };
          reader.readAsDataURL(compositeBlob);
        }

        setProgress("Creating Session Gallery...");
        
        // 1. Upload Composite Image
        const compositeFileName = `captures/${user?.id}/${Date.now()}_composite.png`;
        const { error: compErr } = await supabase.storage.from('frames').upload(compositeFileName, compositeBlob);
        if (compErr) throw compErr;
        const { data: { publicUrl: compositeUrl } } = supabase.storage.from('frames').getPublicUrl(compositeFileName);

        setProgress("Uploading raw photos...");
        
        // 2. Upload Raw Photos (Limit concurrency or upload sequentially to avoid memory issues)
        const rawPhotoUrls = [];
        
        // Generate UUID safely (fallback for non-HTTPS local IP testing)
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
          
          // Convert base64 to blob
          const res = await fetch(rawPhotos[i]);
          const blob = await res.blob();
          
          const rawFileName = `captures/${user?.id}/${sessionId}_raw_${i}.jpg`;
          const { error: rawErr } = await supabase.storage.from('frames').upload(rawFileName, blob);
          
          if (!rawErr) {
             const { data: { publicUrl: rawUrl } } = supabase.storage.from('frames').getPublicUrl(rawFileName);
             rawPhotoUrls.push(rawUrl);
          }
        }

        setProgress("Finalizing Gallery...");

        // 3. Insert into Database
        const { error: insertError } = await supabase.from('captures').insert({
          user_id: user?.id,
          frame_id: selectedFrameData?.id,
          image_url: compositeUrl,
          raw_photos: rawPhotoUrls,
          session_id: sessionId,
          device_id: user?.deviceId,
          device_name: user?.deviceName
        });

        if (insertError) throw insertError;

        setProgress("Done!");
        
        // 4. Return Session ID and Composite URL
        setTimeout(() => {
            onFinish({
              sessionId,
              compositeUrl,
              rawPhotos: rawPhotoUrls
            });
        }, 500);

      } catch (err) {
        console.error("Processing Error:", err);
        alert("Gagal memproses foto: " + err.message);
        // Fallback finish just in case
        onFinish({ sessionId: null, compositeUrl: null });
      }
    };

    if (user && selectedFrameData) {
      processAndUpload();
    }
  }, []);

  const generateCompositeImage = () => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 1200; // High-res 300 DPI (600 * 2)
      canvas.height = 1800; // High-res 300 DPI (900 * 2)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2); // Maintain 600x900 coordinate system

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
          Printing...
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
