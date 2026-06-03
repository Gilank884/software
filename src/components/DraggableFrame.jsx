import { useRef, useEffect, useCallback } from 'react'

const HANDLE_SIZE = 10

const DraggableFrame = ({ url, x, y, width, height, onUpdate, isSelected, onSelect, isLocked = false, zoom = 1 }) => {
  const frameRef = useRef(null)
  const posRef = useRef({ x, y, width, height })
  const dragRef = useRef(null)
  const propsRef = useRef({ onUpdate, zoom })

  useEffect(() => { propsRef.current = { onUpdate, zoom } })
  useEffect(() => { posRef.current = { x, y, width, height } }, [x, y, width, height])

  const applyStyle = () => {
    const el = frameRef.current
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
    dragRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...posRef.current }
    }
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
      propsRef.current.onUpdate({ ...posRef.current })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isSelected, isLocked])

  const handles = [
    { edge: 'nw', style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'nw-resize' } },
    { edge: 'ne', style: { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'ne-resize' } },
    { edge: 'se', style: { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'se-resize' } },
    { edge: 'sw', style: { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'sw-resize' } },
    { edge: 'n', style: { top: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { edge: 's', style: { bottom: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { edge: 'e', style: { right: -HANDLE_SIZE/2, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { edge: 'w', style: { left: -HANDLE_SIZE/2, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
  ]

  return (
    <div
      ref={frameRef}
      onClick={isLocked ? undefined : onSelect}
      onMouseDown={isSelected && !isLocked ? (e) => startDrag(e, null) : undefined}
      className={`absolute touch-none select-none z-10 border-2 transition-[border-color,box-shadow] duration-200 pointer-events-auto
        ${isLocked ? 'pointer-events-none opacity-80 border-transparent' : 'border-transparent hover:border-slate-200'}
        ${isSelected && !isLocked ? 'border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.3)] ring-4 ring-rose-500/10 cursor-move' : 'cursor-pointer'}`}
      style={{ width, height, transform: `translate(${x}px, ${y}px)`, position: 'absolute' }}
    >
      <img
        src={url}
        className={`w-full h-full object-contain pointer-events-none ${isLocked ? 'brightness-95' : ''}`}
        alt="Draggable Frame"
      />
      <div className={`absolute inset-0 bg-rose-500/5 pointer-events-none transition-opacity ${isSelected && !isLocked ? 'opacity-100' : 'opacity-0'}`} />

      {isSelected && !isLocked && handles.map(({ edge, style }) => (
        <div
          key={edge}
          className="absolute bg-white border-2 border-rose-500 rounded-sm z-20"
          style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, ...style }}
          onMouseDown={(e) => { e.stopPropagation(); startDrag(e, edge) }}
        />
      ))}
    </div>
  )
}

export default DraggableFrame
