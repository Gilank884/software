import { useState, useEffect } from 'react';
import { camera } from '../lib/camera/CameraManager';

export function useCamera() {
  const [status, setStatus] = useState(camera.getStatus());

  useEffect(() => {
    // Subscribe to status changes from CameraManager
    const unsubscribe = camera.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Initial load
    setStatus(camera.getStatus());

    return () => unsubscribe();
  }, []);

  const initCamera = async (overrideSource) => {
    await camera.init(overrideSource);
  };

  const startPreview = async (element) => {
    await camera.startPreview(element);
  };

  const stopPreview = async () => {
    await camera.stopPreview();
  };

  const capturePhoto = async () => {
    return await camera.capture();
  };

  const setCameraSource = async (source) => {
    await camera.setSource(source);
  };

  const setWebcamDevice = async (deviceId) => {
    await camera.setWebcamDevice(deviceId);
  };

  const refreshWebcamDevices = async () => {
    await camera.drivers.webcam.refreshDevices();
    camera.notify();
  };

  const setCameraZoom = (value) => {
    camera.setCameraZoom(value);
  };

  return {
    status,
    initCamera,
    startPreview,
    stopPreview,
    capturePhoto,
    setCameraSource,
    setWebcamDevice,
    refreshWebcamDevices,
    setCameraZoom,
    camera // exposing the manager for advanced use
  };
}
