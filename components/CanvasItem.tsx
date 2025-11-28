
import React from 'react';
import { PlannerItem, ItemType, BoothType } from '../types';
import { calculateBoothNetArea, getBoundingBox } from '../utils/geometry';
import { Maximize2, AlertTriangle, Lock } from 'lucide-react';

interface CanvasItemProps {
  item: PlannerItem;
  isSelected: boolean;
  allItems: PlannerItem[];
  onMouseDown: (e: React.MouseEvent, id: string, type: 'MOVE' | 'RESIZE') => void;
  scaleRatio: number;
  onToggleWall?: (itemId: string, edgeIndex: number) => void;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({ item, isSelected, allItems, onMouseDown, scaleRatio, onToggleWall }) => {
  const isBooth = item.type === ItemType.BOOTH;
  const isLocked = item.locked;
  const isPolygon = !!(item.points && item.points.length > 0);
  
  // Architectural style for walls
  const wallColor = '#0f172a'; // slate-900
  const wallThickness = 6;
  
  // Font Size Logic: Auto-scale if fontSize is undefined
  const autoFontSize = Math.max(14, Math.min(item.w, item.h) / 6);
  const fontSize = item.fontSize || (isBooth ? autoFontSize : 12);
  // Secondary font size for dimensions/area
  const secondaryFontSize = Math.max(10, fontSize * 0.5);

  // Z-Index Hierarchy:
  const baseZ = isBooth ? 10 : 30;
  const zIndex = baseZ + (isSelected ? 10 : 0);

  // Helper to convert hex to rgba for transparency
  const getPillarBg = (color?: string) => {
    const c = color || '#cbd5e1'; // Default slate-300
    // Handle standard 6-digit hex
    if (c.startsWith('#') && c.length === 7) {
        const r = parseInt(c.slice(1, 3), 16);
        const g = parseInt(c.slice(3, 5), 16);
        const b = parseInt(c.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.5)`; // 50% opacity
    }
    return c;
  };
  
  // Dynamic Styles
  const itemStyle: React.CSSProperties = {
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.h,
    transform: `rotate(${item.rotation}deg)`,
    zIndex: zIndex,
    cursor: isLocked ? 'default' : 'move',
  };

  // For Standard Rectangular Items (Not Polygon)
  if (!isPolygon) {
      itemStyle.backgroundColor = isBooth ? (item.color || '#ffffff') : getPillarBg(item.color);
      
      if (!isBooth) {
           // Hatch pattern for pillars
           itemStyle.backgroundImage = 'linear-gradient(45deg, rgba(100, 116, 139, 0.2) 25%, transparent 25%, transparent 50%, rgba(100, 116, 139, 0.2) 50%, rgba(100, 116, 139, 0.2) 75%, transparent 75%, transparent)';
           itemStyle.backgroundSize = '8px 8px';
           itemStyle.boxShadow = '2px 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)';
           itemStyle.backdropFilter = 'blur(1px)';
      } else {
           // Subtle grid for floor
           if (!item.color) {
               itemStyle.backgroundImage = 'radial-gradient(#e2e8f0 1px, transparent 1px)';
               itemStyle.backgroundSize = '10px 10px';
               itemStyle.boxShadow = 'inset 0 0 0 1px #f1f5f9';
           } else {
                itemStyle.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.1)';
           }
      }
  }

  // Container Classes
  let containerClasses = "absolute flex flex-col items-center justify-center select-none transition-all group ";
  
  // IMPORTANT: For polygons, allow clicks to pass through the bounding box container
  // Interactions will be captured by the SVG polygon itself via pointer-events-auto
  if (isPolygon) {
      containerClasses += "pointer-events-none ";
  }
  
  if (isBooth && !isPolygon) {
    containerClasses += "shadow-sm "; 
  } else if (!isBooth) {
    containerClasses += "border border-slate-500 ";
  }

  // Selection Ring
  if (isSelected) {
      if (isPolygon) {
          // For polygon, we DO NOT use the rectangular ring.
          // The visual selection is handled inside renderWalls via SVG stroke.
      } else {
          containerClasses += "ring-2 ring-indigo-500 ring-offset-1 shadow-lg ";
      }
  } else if (!isPolygon) {
     containerClasses += "hover:shadow-md hover:ring-1 hover:ring-indigo-300 ";
  }

  // Logic to render walls based on BoothType
  const renderWalls = () => {
    if (!isBooth) return null;
    
    // Polygon Rendering
    if (isPolygon && item.points) {
        // Construct points string for the fill
        const pointsStr = item.points.map(p => `${p.x * item.w},${p.y * item.h}`).join(' ');
        
        const openEdgeIndices = item.openEdgeIndices || [];
        const edges = [];
        const pts = item.points;

        for (let i = 0; i < pts.length; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];
            
            const isOpen = openEdgeIndices.includes(i);
            
            // Standard Wall (Solid)
            if (!isOpen) {
                edges.push(
                    <line 
                        key={`wall-${i}`}
                        x1={p1.x * item.w}
                        y1={p1.y * item.h}
                        x2={p2.x * item.w}
                        y2={p2.y * item.h}
                        stroke={wallColor}
                        strokeWidth={wallThickness}
                        strokeLinecap="round"
                        className="pointer-events-auto cursor-pointer"
                        onMouseDown={(e) => {
                             if (e.altKey && onToggleWall) {
                                 e.stopPropagation();
                                 onToggleWall(item.id, i);
                             }
                        }}
                    >
                         <title>按住 Alt 点击切换开口</title>
                    </line>
                );
            } else {
                // Open Wall (Dashed / Phantom)
                // We draw a faint line so it can still be clicked to close
                edges.push(
                    <line 
                        key={`open-${i}`}
                        x1={p1.x * item.w}
                        y1={p1.y * item.h}
                        x2={p2.x * item.w}
                        y2={p2.y * item.h}
                        stroke="#cbd5e1"
                        strokeWidth={wallThickness}
                        strokeLinecap="round"
                        strokeDasharray="4 6"
                        opacity="0.5"
                        className="pointer-events-auto cursor-pointer"
                         onMouseDown={(e) => {
                             if (e.altKey && onToggleWall) {
                                 e.stopPropagation();
                                 onToggleWall(item.id, i);
                             }
                        }}
                    >
                         <title>按住 Alt 点击切换开口</title>
                    </line>
                );
            }
        }

        return (
            <svg 
                width="100%" 
                height="100%" 
                style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
            >
                {/* Selection Halo / Outline - Rendered behind fill */}
                {isSelected && (
                    <polygon 
                        points={pointsStr}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="8"
                        strokeLinejoin="round"
                        className="pointer-events-none opacity-60"
                    />
                )}

                {/* Background Fill */}
                <polygon 
                    points={pointsStr}
                    fill={item.color || '#ffffff'}
                    stroke="none"
                    className="pointer-events-auto" // Capture interactions on shape only
                    style={{ cursor: isLocked ? 'default' : 'move' }}
                />
                
                {/* Actual Walls */}
                {edges}
            </svg>
        );
    }
    
    // Rectangular Rendering
    const Wall = ({ side }: { side: 'top' | 'bottom' | 'left' | 'right' }) => {
      const style: React.CSSProperties = { 
          position: 'absolute', 
          background: wallColor,
          zIndex: 20 
      };
      
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
      case BoothType.SINGLE_OPEN: walls.bottom = false; break;
      case BoothType.DOUBLE_CORNER: walls.bottom = false; walls.right = false; break;
      case BoothType.DOUBLE_PARALLEL: walls.bottom = false; walls.top = false; break;
      case BoothType.THREE_OPEN: walls.bottom = false; walls.left = false; walls.right = false; break;
      case BoothType.ISLAND: walls = { top: false, bottom: false, left: false, right: false }; break;
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
  
  // Logic: If using manual area, we ignore visual pillar intrusion warnings
  const useManualArea = item.useManualArea;
  const hasIntrusion = !useManualArea && (netAreaPx < grossAreaPx - 0.1); 

  // Calculate Real World Area
  const calculatedNetAreaM2 = (netAreaPx * scaleRatio * scaleRatio) / 10000;
  
  // Use Manual or Calculated
  const displayAreaM2 = useManualArea ? (item.manualArea || 0) : calculatedNetAreaM2;

  // Calculate Real World Dimensions in Meters
  const widthM = (item.w * scaleRatio) / 100;
  const heightM = (item.h * scaleRatio) / 100;

  // Swap displayed dimensions if rotated 90 or 270 degrees to match visual appearance
  const isRotated = Math.abs((item.rotation || 0) % 180) === 90;
  const displayWidthM = isRotated ? heightM : widthM;
  const displayHeightM = isRotated ? widthM : heightM;

  const formatDim = (val: number) => Number(val.toFixed(2)).toString();

  // Normalize rotation to 0-360
  const normalizedRot = ((item.rotation || 0) % 360 + 360) % 360;
  
  const getLockStyle = (): React.CSSProperties => {
      const style: React.CSSProperties = {
          position: 'absolute',
          zIndex: 50,
          transform: `rotate(${- (item.rotation || 0)}deg)`,
      };
      
      if (normalizedRot >= 45 && normalizedRot < 135) {
          style.top = '4px'; style.left = '4px';
      } else if (normalizedRot >= 135 && normalizedRot < 225) {
          style.bottom = '4px'; style.left = '4px';
      } else if (normalizedRot >= 225 && normalizedRot < 315) {
          style.bottom = '4px'; style.right = '4px';
      } else {
          style.top = '4px'; style.right = '4px';
      }
      return style;
  };

  const getResizeHandleStyle = (): React.CSSProperties => {
      const aabb = getBoundingBox(item);
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      
      const worldHandleX = aabb.x + aabb.w;
      const worldHandleY = aabb.y + aabb.h;
      
      const vx = worldHandleX - cx;
      const vy = worldHandleY - cy;
      
      const rad = (-(item.rotation || 0) * Math.PI) / 180;
      const localX = vx * Math.cos(rad) - vy * Math.sin(rad);
      const localY = vx * Math.sin(rad) + vy * Math.cos(rad);
      
      return {
          position: 'absolute',
          zIndex: 50,
          left: `calc(50% + ${localX}px)`,
          top: `calc(50% + ${localY}px)`,
          transform: 'translate(-50%, -50%)', 
      };
  };

  return (
    <div
      className={containerClasses}
      style={itemStyle}
      onMouseDown={(e) => onMouseDown(e, item.id, 'MOVE')}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Walls or Polygon */}
      {renderWalls()}

      {/* Lock Indicator */}
      {isLocked && (
        <div 
            style={getLockStyle()}
            className="text-slate-500 bg-white/60 rounded-full p-0.5 shadow-sm backdrop-blur-sm pointer-events-auto"
            title="已锁定"
        >
           <Lock size={12} strokeWidth={2.5} />
        </div>
      )}

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
            {/* For polygons, standard WxH might be misleading if it's irregular, so we hide it */}
            {!isPolygon && (
              <div 
                  className="text-slate-400 font-mono leading-none mb-0.5"
                  style={{ fontSize: secondaryFontSize + 'px' }}
              >
                  {formatDim(displayWidthM)}<span className="mx-[1px]">×</span>{formatDim(displayHeightM)} m
              </div>
            )}
            
            {/* Area display */}
            <div 
                className={`font-mono font-medium leading-none mb-1 ${useManualArea ? 'text-blue-600' : 'text-slate-500'}`}
                style={{ fontSize: secondaryFontSize + 'px' }}
            >
                {displayAreaM2.toFixed(2)} m²
            </div>
            
            {hasIntrusion && (
               <div 
                 className="flex items-center justify-center border shadow-sm backdrop-blur-sm"
                 style={{
                    backgroundColor: 'rgba(254, 242, 242, 0.95)',
                    borderColor: '#fecaca',
                    color: '#b91c1c',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    gap: '4px',
                    marginTop: '2px',
                    zIndex: 40
                 }}
               >
                  <AlertTriangle size={secondaryFontSize} strokeWidth={2.5} style={{ display: 'block' }} />
                  <span 
                    className="font-bold font-mono" 
                    style={{ fontSize: secondaryFontSize + 'px', lineHeight: '1', position: 'relative', top: '0.5px' }}
                  >
                    {calculatedNetAreaM2.toFixed(2)} m²
                  </span>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle - Hidden if Locked */}
      {isSelected && !isLocked && (
        <div
          style={getResizeHandleStyle()}
          className="w-6 h-6 bg-white border border-indigo-500 flex items-center justify-center z-50 rounded-full shadow-sm hover:bg-indigo-50 hover:scale-110 transition-transform hover:shadow-md cursor-nwse-resize pointer-events-auto"
          onMouseDown={(e) => onMouseDown(e, item.id, 'RESIZE')}
        >
          <Maximize2 
             size={10} 
             className="text-indigo-600" 
             style={{ transform: `rotate(${-item.rotation}deg)` }}
          />
        </div>
      )}
    </div>
  );
};
