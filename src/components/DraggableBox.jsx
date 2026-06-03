import { useRef, useEffect, useCallback } from 'react'
import { QRCode } from 'react-qr-code'

const HANDLE = 10

const DraggableBox = ({ box, onUpdate, onDelete, isSelected, onSelect, isLocked = false, zoom = 1 }) => {
  const boxRef = useRef(null)
  const posRef = useRef({ x: box.x, y: box.y, width: box.width, height: box.height })
  const dragRef = useRef(null)
  const propsRef = useRef({ onUpdate, zoom })
  const isQr = box.type === 'qr'

  useEffect(() => { propsRef.current = { onUpdate, zoom } })
  useEffect(() => {
    posRef.current = { x: box.x, y: box.y, width: box.width, height: box.height }
  }, [box.x, box.y, box.width, box.height])

  const applyStyle = () => {
    const el = boxRef.current
    if (!el) return
    const p = posRef.current
    el.style.transform = `translate(${p.x}px, ${p.y}px)`
    el.style.width = `${p.width}px`
    el.style.height = `${p.height}px`
  }

  const startDrag = useCallback((e, edge = null) => {
    if (isLocked || !isSelected) return
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { edge, startX: e.clientX, startY: e.clientY, startPos: { ...posRef.current } }
  }, [isLocked, isSelected])

  useEffect(() => {
    if (!isSelected || isLocked) return

    const onMove = (e) => {
      if (!dragRef.current) return
      const z = propsRef.current.zoom
      const dx = (e.clientX - dragRef.current.startX) / z
      const dy = (e.clientY - dragRef.current.startY) / z
      const { edge, startPos: s } = dragRef.current

      if (!edge) {
        posRef.current.x = s.x + dx
        posRef.current.y = s.y + dy
      } else {
        let { x: nx, y: ny, width: nw, height: nh } = s
        if (edge.includes('e')) nw = Math.max(20, nw + dx)
        if (edge.includes('s')) nh = Math.max(20, nh + dy)
        if (edge.includes('w')) { nw = Math.max(20, nw - dx); nx = s.x + s.width - nw }
        if (edge.includes('n')) { nh = Math.max(20, nh - dy); ny = s.y + s.height - nh }
        posRef.current = { x: nx, y: ny, width: nw, height: nh }
      }
      applyStyle()
    }

    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      propsRef.current.onUpdate(box.id, { ...posRef.current })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isSelected, isLocked, box.id])

  const handles = [
    { edge: 'nw', style: { top: -HANDLE/2, left: -HANDLE/2, cursor: 'nw-resize' } },
    { edge: 'ne', style: { top: -HANDLE/2, right: -HANDLE/2, cursor: 'ne-resize' } },
    { edge: 'se', style: { bottom: -HANDLE/2, right: -HANDLE/2, cursor: 'se-resize' } },
    { edge: 'sw', style: { bottom: -HANDLE/2, left: -HANDLE/2, cursor: 'sw-resize' } },
    { edge: 'n', style: { top: -HANDLE/2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { edge: 's', style: { bottom: -HANDLE/2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { edge: 'e', style: { right: -HANDLE/2, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { edge: 'w', style: { left: -HANDLE/2, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
  ]

  return (
    <div
      ref={boxRef}
      onClick={isLocked ? undefined : onSelect}
      onMouseDown={isSelected && !isLocked ? (e) => startDrag(e, null) : undefined}
      className={`absolute border-2 flex items-center justify-center group touch-none select-none z-10 transition-[border-color,box-shadow,opacity] duration-200 ${
        isLocked
          ? 'pointer-events-none border-slate-300 bg-slate-100/10 grayscale opacity-40'
          : 'pointer-events-auto shadow-sm'
      } ${
        isSelected && !isLocked
          ? isQr
            ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.5)] ring-2 ring-orange-500/20 cursor-move'
            : 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(225,29,72,0.5)] ring-2 ring-rose-500/20 cursor-move'
          : isQr
            ? 'border-dashed border-orange-400 bg-orange-400/5 hover:border-orange-500 cursor-pointer'
            : 'border-dashed border-red-500 bg-red-500/5 hover:border-red-400 cursor-pointer'
      }`}
      style={{ width: box.width, height: box.height, transform: `translate(${box.x}px, ${box.y}px)`, position: 'absolute' }}
    >
      {isLocked ? (
        <span className="font-bold text-[10px] pointer-events-none uppercase tracking-widest text-slate-400">Locked</span>
      ) : isQr ? (
        <div
          className="qr-container p-1 bg-white rounded-sm shadow-inner opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-hidden"
          style={{ width: Math.max(10, Math.min(box.width, box.height) - 10), height: Math.max(10, Math.min(box.width, box.height) - 10) }}
        >
          <QRCode value="https://fotoku.latarcerita.com" size={256} style={{ width: '100%', height: '100%' }} level="L" />
        </div>
      ) : (
        <span className={`font-bold text-[10px] pointer-events-none uppercase tracking-widest ${isSelected ? 'text-rose-600' : 'text-red-400 opacity-60'}`}>
          {`Foto ${box.number}`}
        </span>
      )}

      <button
        onClick={() => onDelete(box.id)}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        &times;
      </button>

      {isSelected && !isLocked && handles.map(({ edge, style }) => (
        <div
          key={edge}
          className={`absolute z-20 rounded-sm border-2 bg-white ${isQr ? 'border-orange-500' : 'border-rose-500'}`}
          style={{ width: HANDLE, height: HANDLE, ...style }}
          onMouseDown={(e) => { e.stopPropagation(); startDrag(e, edge) }}
        />
      ))}
    </div>
  )
}

export default DraggableBox
