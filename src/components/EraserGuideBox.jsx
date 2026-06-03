import { useRef, useEffect } from 'react'
import { Move, Maximize2 } from 'lucide-react'

const EraserGuideBox = ({ box, onUpdate, zoom = 1 }) => {
  const boxRef = useRef(null)
  const posRef = useRef({ x: box.x, y: box.y, width: box.width, height: box.height })
  const propsRef = useRef({ onUpdate, zoom })

  // Always keep propsRef in sync
  useEffect(() => {
    propsRef.current = { onUpdate, zoom }
  })

  // Keep posRef in sync with prop changes
  useEffect(() => {
    posRef.current = { x: box.x, y: box.y, width: box.width, height: box.height }
  }, [box.x, box.y, box.width, box.height])

  const dragRef = useRef(null)

  useEffect(() => {
    const node = boxRef.current
    if (!node) return

    const onMouseDown = (e) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...posRef.current } }
    }

    const onMouseMove = (e) => {
      if (!dragRef.current) return
      const z = propsRef.current.zoom
      posRef.current.x = dragRef.current.startPos.x + (e.clientX - dragRef.current.startX) / z
      posRef.current.y = dragRef.current.startPos.y + (e.clientY - dragRef.current.startY) / z
      node.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
    }

    const onMouseUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      propsRef.current.onUpdate({ ...posRef.current })
    }

    node.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      node.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      ref={boxRef}
      className="absolute border-4 border-dashed border-amber-500 bg-amber-500/10 flex items-center justify-center group touch-none select-none z-[200] cursor-move shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-in zoom-in duration-300 ring-4 ring-amber-500/20"
      style={{
        width: box.width,
        height: box.height,
        transform: `translate(${box.x}px, ${box.y}px)`,
        position: 'absolute'
      }}
    >
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        <Move size={24} className="text-amber-600 animate-pulse" />
        <span className="font-black text-[10px] text-amber-700 uppercase tracking-[0.2em] bg-white/80 px-3 py-1 rounded-full shadow-sm border border-amber-200">
          Eraser Guide Box
        </span>
      </div>

      {/* Resize Indicator */}
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 text-white rounded-tl-xl flex items-center justify-center shadow-lg">
        <Maximize2 size={12} className="rotate-90" />
      </div>

      {/* Help Bubble */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-2xl animate-bounce">
        Atur Posisi & Lihat Palette di Samping 🎨
      </div>
    </div>
  )
}

export default EraserGuideBox
