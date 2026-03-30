import React from 'react';

const CreatorBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#f8fafc]">
      {/* Subtle Gradient Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/50"></div>
      
      {/* Soft Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-100/30 rounded-full blur-[140px] animate-pulse duration-[10000ms]"></div>
      
      {/* Fine Workspace Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_0.8px,transparent_0.8px)] [background-size:24px_24px] opacity-40"></div>
      
      {/* Subtle Glass Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>
    </div>
  );
};

export default CreatorBackground;
