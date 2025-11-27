import React from 'react';
import { PlannerItem, ItemType, BoothType } from '../types';
import { calculateBoothNetArea } from '../utils/geometry';
import { Maximize2, AlertTriangle } from 'lucide-react';

interface CanvasItemProps {
  item: PlannerItem;
  isSelected: boolean;
  allItems: PlannerItem[];
  onMouseDown: (e: React.MouseEvent, id: string, type: 'MOVE' | 'RESIZE') => void;
  scaleRatio: number;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({ item, isSelected, allItems, onMouseDown, scaleRatio }) => {
  const isBooth = item.type === ItemType.BOOTH;
  
  // Architectural style for walls
  const wallColor = '#0f172a'; // slate-900
  const wallThickness = 6;
  
  // Font Size Logic: Auto-scale if fontSize is undefined
  const autoFontSize = Math.max(14, Math.min(item.w, item.h) / 6);
  const fontSize = item.fontSize || (isBooth ? autoFontSize : 12);
  // Secondary font size for dimensions/area
  const secondaryFontSize = Math.max(10, fontSize * 0.5);
  
  // Dynamic Styles
  const itemStyle: React.CSSProperties = {
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.h,
    transform: `rotate(${item.rotation}deg)`,
    zIndex: isBooth ? 10 : 50, // Pillars higher
    backgroundColor: item.color || (isBooth ? '#ffffff' : '#94a3b8'),
  };

  if (!isBooth) {
       // Hatch pattern for pillars
       itemStyle.backgroundImage = 'linear-gradient(45deg, #64748b 25%, transparent 25%, transparent 50%, #64748b 50%, #64748b 75%, transparent 75%, transparent)';
       itemStyle.backgroundSize = '8px 8px';
  }

  // Container Classes
  let containerClasses = "absolute flex flex-col items-center justify-center select-none transition-all group ";
  
  if (isBooth) {
    containerClasses += "shadow-sm "; // No border here, we use manual walls
    // Subtle grid for floor if no custom color is set
    if (!item.color) {
        itemStyle.backgroundImage = 'radial-gradient(#e2e8f0 1px, transparent 1px)';
        itemStyle.backgroundSize = '10px 10px';
        // Add a very subtle border for the open sides just to define the floor area lightly
        itemStyle.boxShadow = 'inset 0 0 0 1px #f1f5f9';
    } else {
         itemStyle.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.1)';
    }
  } else {
    // Pillars
    containerClasses += "border border-slate-600 shadow-md ";
  }

  if (isSelected) {
     // We use outline or a wrapper ring for selection to not mess up dimensions
     containerClasses += "ring-2 ring-indigo-500 ring-offset-1 shadow-lg z-50 ";
  } else {
     containerClasses += "hover:shadow-md hover:ring-1 hover:ring-indigo-300 ";
  }

  // Logic to render walls based on BoothType
  const renderWalls = () => {
    if (!isBooth) return null;
    
    const Wall = ({ side }: { side: 'top' | 'bottom' | 'left' | 'right' }) => {
      const style: React.CSSProperties = { 
          position: 'absolute', 
          background: wallColor,
          zIndex: 20 
      };
      
      // Offset to make walls "center aligned" on the grid line or "inner aligned"
      const offset = -wallThickness / 2;

      if (side === 'top') { 
          Object.assign(style, { top: offset, left: offset, right: offset, height: wallThickness }); 
      }
      if (side === 'bottom') { 
          Object.assign(style, { bottom: offset, left: offset, right: offset, height: wallThickness }); 
      }
      if (side === 'left') { 
          Object.assign(style, { top: 0, bottom: 0, left: offset, width: wallThickness }); 
      }
      if (side === 'right') { 
          Object.assign(style, { top: 0, bottom: 0, right: offset, width: wallThickness }); 
      }

      return <div style={style} />;
    };

    let walls = { top: true, bottom: true, left: true, right: true };

    switch (item.boothType) {
      case BoothType.SINGLE_OPEN:
        walls.bottom = false; 
        break;
      case BoothType.DOUBLE_CORNER:
        walls.bottom = false;
        walls.right = false;
        break;
      case BoothType.DOUBLE_PARALLEL:
        walls.bottom = false;
        walls.top = false;
        break;
      case BoothType.THREE_OPEN:
        walls.bottom = false;
        walls.left = false;
        walls.right = false;
        break;
      case BoothType.ISLAND:
        walls = { top: false, bottom: false, left: false, right: false };
        break;
    }

    return (
      <>
        {walls.top && <Wall side="top" />}
        {walls.bottom && <Wall side="bottom" />}
        {walls.left && <Wall side="left" />}
        {walls.right && <Wall side="right" />}
      </>
    );
  };

  const netAreaPx = isBooth ? calculateBoothNetArea(item, allItems) : 0;
  const grossAreaPx = item.w * item.h;
  const hasIntrusion = netAreaPx < grossAreaPx;

  // Calculate Real World Area
  const netAreaM2 = (netAreaPx * scaleRatio * scaleRatio) / 10000;
  
  // Calculate Real World Dimensions in Meters
  const widthM = (item.w * scaleRatio) / 100;
  const heightM = (item.h * scaleRatio) / 100;

  // Swap displayed dimensions if rotated 90 or 270 degrees to match visual appearance
  const isRotated = Math.abs((item.rotation || 0) % 180) === 90;
  const displayWidthM = isRotated ? heightM : widthM;
  const displayHeightM = isRotated ? widthM : heightM;

  const formatDim = (val: number) => Number(val.toFixed(2)).toString();

  return (
    <div
      className={containerClasses}
      style={itemStyle}
      onMouseDown={(e) => onMouseDown(e, item.id, 'MOVE')}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Walls for Booths */}
      {renderWalls()}

      {/* Content Info */}
      <div 
        className="z-30 flex flex-col items-center justify-center text-center pointer-events-none p-1 w-full h-full"
        style={{ transform: `rotate(${-item.rotation}deg)` }}
      >
        {item.label && (
            <div 
                className={`font-bold px-1 leading-normal ${!item.fontColor && !isBooth ? 'text-white drop-shadow-md' : ''}`}
                style={{ 
                    fontSize: fontSize + 'px',
                    color: item.fontColor || (isBooth ? '#334155' : '#ffffff') 
                }}
            >
                {item.label}
            </div>
        )}
        
        {isBooth && (
          <div className="flex flex-col items-center mt-0.5 w-full">
            <div 
                className="text-slate-400 font-mono leading-none mb-0.5"
                style={{ fontSize: secondaryFontSize + 'px' }}
            >
                {formatDim(displayWidthM)}<span className="mx-[1px]">×</span>{formatDim(displayHeightM)} m
            </div>
            
            {/* Area display in m2 */}
            <div 
                className="text-slate-500 font-mono font-medium leading-none mb-1"
                style={{ fontSize: secondaryFontSize + 'px' }}
            >
                {netAreaM2.toFixed(2)} m²
            </div>
            
            {hasIntrusion && (
               <div 
                 className="flex items-center justify-center border"
                 style={{
                    backgroundColor: '#fef2f2', // red-50
                    borderColor: '#fecaca', // red-200
                    color: '#b91c1c', // red-700
                    borderRadius: '6px',
                    padding: '2px 6px',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                 }}
               >
                  <AlertTriangle size={secondaryFontSize} strokeWidth={2.5} style={{ display: 'block' }} />
                  <span 
                    className="font-bold font-mono" 
                    style={{ fontSize: secondaryFontSize + 'px', lineHeight: '1', position: 'relative', top: '0.5px' }}
                  >
                    {netAreaM2.toFixed(2)} m²
                  </span>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border border-indigo-500 cursor-nwse-resize flex items-center justify-center z-50 rounded-full shadow-sm hover:bg-indigo-50 hover:scale-110 transition-transform hover:shadow-md"
          onMouseDown={(e) => onMouseDown(e, item.id, 'RESIZE')}
        >
          <Maximize2 size={10} className="text-indigo-600 transform rotate-90" />
        </div>
      )}
    </div>
  );
};
