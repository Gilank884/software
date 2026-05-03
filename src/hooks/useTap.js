import { useRef } from 'react';

/**
 * Custom hook to handle high-performance, consistent tap interactions on touchscreens.
 * Fixes issues where taps are misidentified as drags/gestures and eliminates click delays.
 * Ensures compatibility with both mouse and touch.
 * 
 * @param {Function} callback - The function to execute on tap/click
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Maximum movement in pixels to still count as a tap (default: 10)
 * @returns {Object} Props to spread onto the element
 */
export const useTap = (callback, { threshold = 10 } = {}) => {
  const startPos = useRef(null);
  const lastTapTime = useRef(0);

  const onPointerDown = (e) => {
    // Only handle primary pointer (first touch or left click)
    if (e.isPrimary === false) return;
    
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e) => {
    if (!startPos.current) return;

    // Calculate distance moved
    const distX = e.clientX - startPos.current.x;
    const distY = e.clientY - startPos.current.y;
    const distance = Math.sqrt(distX * distX + distY * distY);

    // If movement is within threshold, it's a tap
    if (distance < threshold) {
      lastTapTime.current = Date.now();
      if (callback) callback(e);
    }

    startPos.current = null;
  };

  const onClick = (e) => {
    // If the event was already handled by onPointerUp (within the last 400ms),
    // we prevent the default click event to avoid double execution.
    // This allows keyboard events (Enter/Space) to still work through onClick.
    if (Date.now() - lastTapTime.current < 400) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Handle standard clicks (like from keyboard) that didn't trigger pointer events
    if (callback) callback(e);
  };

  return {
    onPointerDown,
    onPointerUp,
    onClick,
    style: { touchAction: 'manipulation' }
  };
};

export default useTap;
