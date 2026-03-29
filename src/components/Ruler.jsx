import React from 'react'

const Ruler = ({ orientation = 'horizontal', length = 600, zoom = 1, pxPerCm = 59.0551181102 }) => {
  const totalCm = Math.ceil(length / pxPerCm)
  
  // Array of cm markers
  const markers = []
  for (let cm = 0; cm <= totalCm; cm++) {
    // 10 mm ticks per cm
    for (let mm = 0; mm < 10; mm++) {
      const precisionPosition = (cm * 10 + mm) * (pxPerCm / 10)
      if (precisionPosition > length) break
      
      let type = 'minor' // 1mm
      if (mm === 0) type = 'major' // 1cm
      else if (mm === 5) type = 'half' // 5mm
      
      markers.push({
        position: precisionPosition,
        cm: cm,
        mm: mm,
        type
      })
    }
  }

  const isHorizontal = orientation === 'horizontal'

  return (
    <div 
      className={`relative bg-white overflow-hidden select-none border-slate-200 ${isHorizontal ? 'h-6 w-full border-b' : 'w-6 h-full border-r'}`}
      style={{ 
        width: isHorizontal ? length : 24,
        height: isHorizontal ? 24 : length,
      }}
    >
      {markers.map((m, i) => (
        <React.Fragment key={i}>
          <div 
            className={`absolute bg-slate-300 transition-all ${isHorizontal ? 'bottom-0' : 'right-0'}`}
            style={{
              [isHorizontal ? 'left' : 'top']: `${m.position}px`,
              [isHorizontal ? 'width' : 'height']: '1px',
              [isHorizontal ? 'height' : 'width']: m.type === 'major' ? '12px' : m.type === 'half' ? '8px' : '4px',
            }}
          />
          {m.type === 'major' && (
            <span 
              className="absolute text-slate-900 font-black text-[7px] tracking-tighter"
              style={{
                [isHorizontal ? 'left' : 'top']: `${m.position + 3}px`,
                [isHorizontal ? 'top' : 'left']: isHorizontal ? '2px' : '3px',
                transform: isHorizontal ? 'none' : 'rotate(-90deg)',
                transformOrigin: 'left top'
              }}
            >
              {m.cm}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default Ruler
