import DraggableBox from './DraggableBox'
import DraggableFrame from './DraggableFrame'
import EraserGuideBox from './EraserGuideBox'
import { Plus } from 'lucide-react'
import Ruler from './Ruler'

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
  zoom = 1,
  eraserGuide = null,
  onUpdateEraserGuide,
  width = 600,
  height = 900,
  canvasSize = '4R',
  pxPerCm = 58.8235 // Default for 4R
}) => {
  return (
    <div 
      className="flex flex-col items-start transition-transform duration-300 ease-out p-10"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center'
      }}
    >
      {/* Top Ruler Row */}
      <div className="flex">
        <div className="w-6 h-6 bg-white border-r border-b border-slate-200" /> {/* Corner */}
        <Ruler orientation="horizontal" length={width} zoom={zoom} pxPerCm={pxPerCm} />
      </div>

      <div className="flex">
        {/* Left Ruler */}
        <Ruler orientation="vertical" length={height} zoom={zoom} pxPerCm={pxPerCm} />

        {/* Main Canvas Area */}
        <div
          className={`relative bg-white shadow-2xl shrink-0 overflow-hidden ${eraserGuide ? 'cursor-crosshair' : ''}`}
          style={{
            width,
            height,
          }}
        >
          {/* Slots Layer (Behind) */}
          <div className={`absolute inset-0 z-0 ${eraserGuide ? 'pointer-events-none' : 'pointer-events-auto'}`}>
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
            <div className={`absolute inset-0 ${eraserGuide ? 'z-[100] pointer-events-auto' : 'z-10 pointer-events-none'}`}>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 border-2 border-dashed border-slate-200 text-slate-300 gap-4 pointer-events-none z-10">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm border border-white/40">
                <Plus size={24} strokeWidth={3} className="opacity-40" />
              </div>
              <div className="text-center px-4">
                <p className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">Void Workspace</p>
                <p className="text-[7px] text-slate-300 mt-1 font-bold uppercase tracking-widest leading-relaxed">Pilih Frame {canvasSize || '4R'} dari Library</p>
              </div>
            </div>
          )}

          {/* Canvas Boundary Line (Topmost Guide - above everything) */}
          <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-50" />

          {/* Eraser Guide Box (TOPMOST) */}
          {eraserGuide && (
            <EraserGuideBox 
              box={eraserGuide} 
              onUpdate={onUpdateEraserGuide} 
              zoom={zoom} 
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default FrameEditor
