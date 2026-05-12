import { useRef, useEffect } from 'react'
import interact from 'interactjs'
import { QRCode } from 'react-qr-code'

const DraggableBox = ({ box, onUpdate, onDelete, isSelected, onSelect, isLocked = false, zoom = 1 }) => {
  const boxRef = useRef(null)
  const posRef = useRef({ x: box.x, y: box.y, width: box.width, height: box.height })
  const propsRef = useRef({ onUpdate, zoom })

  // Always keep propsRef in sync
  useEffect(() => {
    propsRef.current = { onUpdate, zoom }
  })

  // Keep posRef in sync with prop changes (from parent state updates)
  useEffect(() => {
    posRef.current = { x: box.x, y: box.y, width: box.width, height: box.height }
  }, [box.x, box.y, box.width, box.height])

  const isQr = box.type === 'qr'

  useEffect(() => {
    const node = boxRef.current
    if (!node || !isSelected || isLocked) return

    const interactObj = interact(node)
      .draggable({
        listeners: {
          move(event) {
            const z = propsRef.current.zoom
            posRef.current.x += event.dx / z
            posRef.current.y += event.dy / z
            node.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
          },
          end() {
            propsRef.current.onUpdate(box.id, { 
              x: posRef.current.x, 
              y: posRef.current.y 
            })
          }
        }
      })

    if (!isQr) {
      interactObj.resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const z = propsRef.current.zoom
            posRef.current.width += event.deltaRect.right / z - event.deltaRect.left / z
            posRef.current.height += event.deltaRect.bottom / z - event.deltaRect.top / z
            posRef.current.x += event.deltaRect.left / z
            posRef.current.y += event.deltaRect.top / z

            node.style.width = `${posRef.current.width}px`
            node.style.height = `${posRef.current.height}px`
            node.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
          },
          end() {
            propsRef.current.onUpdate(box.id, { 
              x: posRef.current.x, 
              y: posRef.current.y, 
              width: posRef.current.width, 
              height: posRef.current.height 
            })
          }
        }
      })
    }

    return () => {
      interact(node).unset()
    }
  }, [box.id, isSelected, isLocked, isQr])

  return (
    <div
      ref={boxRef}
      onClick={isLocked ? undefined : onSelect}
      className={`absolute border-2 flex items-center justify-center group touch-none select-none z-10 transition-[border-color,box-shadow,opacity] duration-200 ${
        isLocked 
          ? 'pointer-events-none border-slate-300 bg-slate-100/10 grayscale opacity-40' 
          : 'pointer-events-auto cursor-pointer shadow-sm'
      } ${
        isSelected && !isLocked 
          ? isQr ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.5)] ring-2 ring-indigo-500/20' : 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.5)] ring-2 ring-blue-500/20' 
          : isQr ? 'border-dashed border-indigo-400 bg-indigo-400/5 hover:border-indigo-500' : 'border-dashed border-red-500 bg-red-500/5 hover:border-red-400'
      }`}
      style={{
        width: box.width,
        height: box.height,
        transform: `translate(${box.x}px, ${box.y}px)`,
        position: 'absolute'
      }}
    >
      {isLocked ? (
        <span className="font-bold text-[10px] pointer-events-none uppercase tracking-widest text-slate-400">Locked</span>
      ) : isQr ? (
        <div className="p-2 bg-white rounded-sm shadow-inner opacity-80 group-hover:opacity-100 transition-opacity">
          <QRCode 
            value="https://fotoku.latarcerita.com" 
            size={Math.max(10, Math.min(box.width, box.height) - 24)}
            level="L"
          />
        </div>
      ) : (
        <span className={`font-bold text-[10px] pointer-events-none uppercase tracking-widest ${
          isSelected 
            ? 'text-blue-600' 
            : 'text-red-400 opacity-60'
        }`}>
          {`Foto ${box.number}`}
        </span>
      )}
      
      <button
        onClick={() => onDelete(box.id)}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        &times;
      </button>
    </div>
  )
}

export default DraggableBox
