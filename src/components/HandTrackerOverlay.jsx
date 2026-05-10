import React, { useEffect, useRef, useState, useCallback } from 'react';

const HandTrackerOverlay = ({ videoRef, canvasRef, isActive, onStatusChange, ghosts = [], activePortal = null }) => {
  const handsRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs for stable callbacks and data
  const onStatusChangeRef = useRef(onStatusChange);
  const ghostsRef = useRef(ghosts);
  const activePortalRef = useRef(activePortal);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    ghostsRef.current = ghosts;
    activePortalRef.current = activePortal;
    isActiveRef.current = isActive;
  }, [onStatusChange, ghosts, activePortal, isActive]);

  const draw = useCallback((handResults) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    
    // 1. Draw Background (Last Frozen Ghost)
    canvasCtx.save();
    if (activePortalRef.current) {
      canvasCtx.filter = 'blur(4px)';
    }
    
    if (ghostsRef.current.length > 0) {
      const lastGhost = ghostsRef.current[ghostsRef.current.length - 1];
      if (lastGhost.image) canvasCtx.drawImage(lastGhost.image, 0, 0, width, height);
    } else {
      // If no ghosts yet, draw live video full screen as base
      canvasCtx.drawImage(videoRef.current, 0, 0, width, height);
    }
    canvasCtx.restore();

    // 2. Draw Live Content based on Mode
    if (activePortalRef.current) {
      // PORTAL MODE: Draw live video in the fixed locked portal
      const pts = activePortalRef.current;
      canvasCtx.save();
      canvasCtx.beginPath();
      canvasCtx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => canvasCtx.lineTo(p.x, p.y));
      canvasCtx.closePath();
      canvasCtx.clip();
      canvasCtx.drawImage(videoRef.current, 0, 0, width, height);
      canvasCtx.restore();
      
      // Draw static locked border
      canvasCtx.strokeStyle = '#facc15'; // yellow
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();
    } else {
      // SCANNING MODE
      if (handResults && handResults.multiHandLandmarks && handResults.multiHandLandmarks.length === 2) {
        // Hands detected: draw live video in the moving box
        const hands = handResults.multiHandLandmarks;
        const pts = [
          { x: hands[0][8].x * width, y: hands[0][8].y * height },
          { x: hands[1][8].x * width, y: hands[1][8].y * height },
          { x: hands[1][4].x * width, y: hands[1][4].y * height },
          { x: hands[0][4].x * width, y: hands[0][4].y * height },
        ];
        
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => canvasCtx.lineTo(p.x, p.y));
        canvasCtx.closePath();
        canvasCtx.clip();
        canvasCtx.drawImage(videoRef.current, 0, 0, width, height);
        canvasCtx.restore();
        
        canvasCtx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
        canvasCtx.lineWidth = 3;
        canvasCtx.stroke();
      } else {
        // No hands: draw live video globally with low opacity to help aiming
        canvasCtx.save();
        canvasCtx.globalAlpha = 0.4;
        canvasCtx.drawImage(videoRef.current, 0, 0, width, height);
        canvasCtx.restore();
      }
    }
    
    canvasCtx.restore();
  }, [canvasRef, videoRef]);

  useEffect(() => {
    if (!isActive) {
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    const HandsClass = window.Hands;
    if (!HandsClass) return;

    const hands = new HandsClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    
    hands.onResults((results) => {
      if (isCancelled || !isActiveRef.current) return;
      draw(results);
      
      let detectedGesture = 'NONE';
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        
        const isExtended = (tip, pip) => hand[tip].y < hand[pip].y;
        
        const indexExtended = isExtended(8, 6);
        const middleExtended = isExtended(12, 10);
        const ringExtended = isExtended(16, 14);
        const pinkyExtended = isExtended(20, 18);
        const thumbUp = hand[4].y < hand[3].y && hand[4].y < hand[8].y;

        // PEACE GESTURE: Index & Middle extended, others folded
        if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
          detectedGesture = 'PEACE';
        } 
        // THUMBS UP: Thumb up, others folded
        else if (thumbUp && !indexExtended && !middleExtended && !ringExtended) {
          detectedGesture = 'THUMBS_UP';
        }
      }

      // Use a timeout to ensure state updates don't happen during render
      setTimeout(() => {
        if (isCancelled || !isActiveRef.current) return;
        if (results.multiHandLandmarks) {
          onStatusChangeRef.current({ 
            handsDetected: results.multiHandLandmarks.length,
            isLocked: results.multiHandLandmarks.length === 2,
            gesture: detectedGesture,
            results: results
          });
        } else {
          onStatusChangeRef.current({ handsDetected: 0, isLocked: false, gesture: 'NONE', results: null });
        }
      }, 0);
    });
    handsRef.current = hands;

    setIsLoaded(true);

    const processFrame = async () => {
      if (isCancelled || !isActiveRef.current || !handsRef.current) return;
      try {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await handsRef.current.send({ image: videoRef.current });
        }
      } catch (err) {
        console.error("HandTracker processing error:", err);
      }
      if (!isCancelled) {
        requestAnimationFrame(processFrame);
      }
    };

    requestAnimationFrame(processFrame);

    return () => {
      isCancelled = true;
      if (handsRef.current) {
        const h = handsRef.current;
        handsRef.current = null;
        h.close();
      }
    };
  }, [isActive, draw, videoRef]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-pink-500 font-mono text-sm animate-pulse">
          INITIALIZING PORTAL SYSTEM...
        </div>
      )}
    </div>
  );
};

export default HandTrackerOverlay;
