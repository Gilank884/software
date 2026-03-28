import { useRef, useEffect } from 'react'
import interact from 'interactjs'

const DraggableFrame = ({ url, x, y, width, height, onUpdate, isSelected, onSelect, isLocked = false, zoom = 1 }) => {
  const frameRef = useRef(null)
  const posRef = useRef({ x, y, width, height })
  const propsRef = useRef({ onUpdate, zoom })

  // Always keep propsRef in sync
  useEffect(() => {
    propsRef.current = { onUpdate, zoom }
  })

  // Keep posRef in sync with prop changes (from parent state updates)
  useEffect(() => {
    posRef.current = { x, y, width, height }
  }, [x, y, width, height])

  useEffect(() => {
    const node = frameRef.current
    if (!node || !isSelected || isLocked) return

    interact(node)
      .draggable({
        listeners: {
          move(event) {
            const z = propsRef.current.zoom
            posRef.current.x += event.dx / z
            posRef.current.y += event.dy / z
            node.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
          },
          end() {
            propsRef.current.onUpdate({ x: posRef.current.x, y: posRef.current.y })
          }
        }
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const z = propsRef.current.zoom
            // Use deltas instead of absolute rect to avoid zoom scaling issues
            posRef.current.width += event.deltaRect.right / z - event.deltaRect.left / z
            posRef.current.height += event.deltaRect.bottom / z - event.deltaRect.top / z
            posRef.current.x += event.deltaRect.left / z
            posRef.current.y += event.deltaRect.top / z

            node.style.width = `${posRef.current.width}px`
            node.style.height = `${posRef.current.height}px`
            node.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
          },
          end() {
            propsRef.current.onUpdate({ 
              x: posRef.current.x, 
              y: posRef.current.y, 
              width: posRef.current.width, 
              height: posRef.current.height 
            })
          }
        }
      })

    return () => {
      interact(node).unset()
    }
  }, [url, isSelected, isLocked])

  return (
    <div
      ref={frameRef}
      onClick={isLocked ? undefined : onSelect}
      className={`absolute touch-none select-none z-10 border-2 transition-[border-color,box-shadow,background-color] duration-200 cursor-pointer pointer-events-auto ${isLocked ? 'pointer-events-none opacity-80 border-transparent' : 'pointer-events-auto cursor-pointer border-transparent hover:border-slate-200'} ${isSelected && !isLocked ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] ring-4 ring-blue-500/10' : ''}`}
      style={{
        width,
        height,
        transform: `translate(${x}px, ${y}px)`,
        position: 'absolute'
      }}
    >
      <img 
        src={url} 
        className={`w-full h-full object-contain pointer-events-none transition-all ${isLocked ? 'brightness-95' : ''}`} 
        alt="Draggable Frame" 
      />
      <div className={`absolute inset-0 bg-blue-500/5 pointer-events-none transition-opacity ${isSelected && !isLocked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
    </div>
  )
}

export default DraggableFrame
