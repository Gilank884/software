import DraggableBox from './DraggableBox'
import DraggableFrame from './DraggableFrame'

const FrameEditor = ({
  frame,
  boxes,
  onUpdateBox,
  onDeleteBox,
  onUpdateFrame,
  frameVisible = true,
  hiddenSlotIds = [],
  selectedLayerId = null,
  onSelectLayer,
  lockedLayerIds = [],
  zoom = 1
}) => {
  return (
    <div
      className="relative bg-white shadow-2xl shrink-0 transition-transform duration-300 ease-out overflow-hidden"
      style={{
        width: 600,
        height: 900,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center'
      }}
    >
      {/* Slots Layer (Behind) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {boxes.filter(box => !hiddenSlotIds.includes(box.id)).map(box => (
          <DraggableBox
            key={box.id}
            box={box}
            onUpdate={onUpdateBox}
            onDelete={onDeleteBox}
            isSelected={selectedLayerId === box.id}
            onSelect={() => onSelectLayer(box.id)}
            isLocked={lockedLayerIds.includes(box.id)}
            zoom={zoom}
          />
        ))}
      </div>

      {/* Frame Layer (Front) */}
      {frame?.url && frameVisible ? (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <DraggableFrame
            url={frame.url}
            x={frame.x || 0}
            y={frame.y || 0}
            width={frame.width || 600}
            height={frame.height || 900}
            onUpdate={onUpdateFrame}
            isSelected={selectedLayerId === frame.id}
            onSelect={() => onSelectLayer(frame.id)}
            isLocked={lockedLayerIds.includes(frame.id)}
            zoom={zoom}
          />
        </div>
      ) : frame?.url && !frameVisible ? null : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 pointer-events-none z-10">
          <span className="text-slate-300 font-black text-4xl tracking-widest uppercase opacity-50">Upload Frame</span>
        </div>
      )}

      {/* Canvas Boundary Line (Topmost Guide - above everything) */}
      <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-50" />
    </div>
  )
}

export default FrameEditor
