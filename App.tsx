
import React, { useState, useRef, useEffect } from 'react';
import { PlannerItem, ItemType, BoothType, StandType } from './types';
import { DEFAULT_BOOTH, DEFAULT_PILLAR, GRID_SIZE } from './constants';
import { CanvasItem } from './components/CanvasItem';
import { Toolbar } from './components/Toolbar';
import { exportPNG, exportHTML, exportVue, exportSVG, exportJS } from './services/exportService';
import { ZoomIn, GripHorizontal, RefreshCcw, Image as ImageIcon, PenTool, CheckCircle } from 'lucide-react';
import { getBoundingBox, normalizePoints } from './utils/geometry';

const App: React.FC = () => {
  const [items, setItems] = useState<PlannerItem[]>([]);
  // Changed from single ID to a Set of IDs for batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgImageDimensions, setBgImageDimensions] = useState<{ w: number, h: number } | null>(null);
  const [bgImagePosition, setBgImagePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [scaleRatio, setScaleRatio] = useState<number>(10); // 1px = 10cm by default
  const [isEditingBackground, setIsEditingBackground] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Polygon Drawing State
  const [drawingPoints, setDrawingPoints] = useState<{x: number, y: number}[]>([]);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  // Viewport State (Pan & Zoom)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  
  // Drag State (Item Move/Resize OR View Pan OR BG Move OR Drawing)
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    type: 'ITEM_MOVE' | 'ITEM_RESIZE' | 'PAN' | 'BG_MOVE' | null;
    initialItemsState: Record<string, { x: number, y: number, w: number, h: number, rotation: number }>;
    startX: number;
    startY: number;
    initialViewX: number;
    initialViewY: number;
    activeResizeId: string | null;
    initialBgPos?: { x: number, y: number };
  }>({
    isDragging: false,
    type: null,
    initialItemsState: {},
    startX: 0,
    startY: 0,
    initialViewX: 0,
    initialViewY: 0,
    activeResizeId: null,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Actions ---

  const addItem = (type: ItemType) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: PlannerItem = {
      id,
      type,
      x: (100 - view.x) / view.scale, 
      y: (100 - view.y) / view.scale,
      w: type === ItemType.BOOTH ? DEFAULT_BOOTH.w : DEFAULT_PILLAR.w,
      h: type === ItemType.BOOTH ? DEFAULT_BOOTH.h : DEFAULT_PILLAR.h,
      rotation: 0,
      boothType: type === ItemType.BOOTH ? DEFAULT_BOOTH.type : undefined,
      standType: type === ItemType.BOOTH ? DEFAULT_BOOTH.standType : undefined,
      label: type === ItemType.BOOTH ? `B-${items.length + 1}` : undefined,
      // Leave fontSize undefined for booths to allow auto-scaling
      fontSize: type === ItemType.BOOTH ? undefined : 12,
      fontColor: type === ItemType.BOOTH ? '#334155' : '#ffffff',
      locked: false,
    };
    
    // Ensure it's safely on screen if the calc above is weird
    if (newItem.x < 0) newItem.x = 100;
    if (newItem.y < 0) newItem.y = 100;

    setItems([...items, newItem]);
    setSelectedIds(new Set([id]));
  };

  const updateItem = (updates: Partial<PlannerItem>) => {
    if (selectedIds.size === 0) return;
    setItems(prev => prev.map(item => selectedIds.has(item.id) ? { ...item, ...updates } : item));
  };

  const deleteItem = () => {
    if (selectedIds.size === 0) return;
    
    const lockedItemsIds = items.filter(i => selectedIds.has(i.id) && i.locked).map(i => i.id);
    
    setItems(prev => prev.filter(item => {
        if (!selectedIds.has(item.id)) return true;
        return item.locked === true;
    }));

    if (lockedItemsIds.length > 0) {
        setSelectedIds(new Set(lockedItemsIds));
    } else {
        setSelectedIds(new Set());
    }
  };
  
  const handleToggleWall = (itemId: string, edgeIndex: number) => {
    setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        
        const currentOpenEdges = item.openEdgeIndices || [];
        const isOpen = currentOpenEdges.includes(edgeIndex);
        
        let newOpenEdges;
        if (isOpen) {
            newOpenEdges = currentOpenEdges.filter(i => i !== edgeIndex);
        } else {
            newOpenEdges = [...currentOpenEdges, edgeIndex];
        }
        
        return {
            ...item,
            openEdgeIndices: newOpenEdges
        };
    }));
  };

  const handleSplitItem = (id: string, parts: number, direction: 'horizontal' | 'vertical') => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== ItemType.BOOTH) return;
    
    // Disable split for polygon items for now as geometry is complex
    if (item.points && item.points.length > 0) {
        alert("暂不支持自定义形状的自动拆分");
        return;
    }

    const { w, h, x, y, rotation } = item;
    const rad = ((rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const parentCx = x + w / 2;
    const parentCy = y + h / 2;

    const newItems: PlannerItem[] = [];
    const isRotated = Math.abs((rotation || 0) % 180) === 90;
    const wantHorizontalVisual = direction === 'horizontal';
    const splitWidth = isRotated ? !wantHorizontalVisual : wantHorizontalVisual;
    
    const childW = splitWidth ? w / parts : w;
    const childH = splitWidth ? h : h / parts;

    for (let i = 0; i < parts; i++) {
        let offsetX = 0;
        let offsetY = 0;

        if (splitWidth) {
            const childLocalX = (i * childW) + (childW / 2); 
            offsetX = childLocalX - (w / 2); 
        } else {
            const childLocalY = (i * childH) + (childH / 2);
            offsetY = childLocalY - (h / 2);
        }

        const rotatedOffsetX = offsetX * cos - offsetY * sin;
        const rotatedOffsetY = offsetX * sin + offsetY * cos;

        const childCx = parentCx + rotatedOffsetX;
        const childCy = parentCy + rotatedOffsetY;

        const childX = childCx - (childW / 2);
        const childY = childCy - (childH / 2);
        
        const newId = Math.random().toString(36).substr(2, 9);
        
        newItems.push({
            ...item,
            id: newId,
            x: childX,
            y: childY,
            w: childW,
            h: childH,
            label: `${item.label || 'B'}-${i + 1}`,
            locked: false, 
            useManualArea: item.useManualArea,
            manualArea: item.useManualArea ? (item.manualArea ? item.manualArea / parts : 0) : undefined
        });
    }

    setItems(prev => {
        const remaining = prev.filter(i => i.id !== id);
        return [...remaining, ...newItems];
    });
    
    setSelectedIds(new Set(newItems.map(i => i.id)));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setBackgroundImage(res);
        const img = new Image();
        img.onload = () => {
             setBgImageDimensions({ w: img.width, h: img.height });
             setBgImagePosition({ x: 0, y: 0 });
        };
        img.src = res;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBackground = () => {
    setBackgroundImage(null);
    setBgImageDimensions(null);
    setBgImagePosition({ x: 0, y: 0 });
    setIsEditingBackground(false);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        let jsonData;
        const exportPrefix = "export const expoData =";
        const startIndex = text.indexOf(exportPrefix);

        if (startIndex !== -1) {
          let jsonStr = text.substring(startIndex + exportPrefix.length);
          jsonStr = jsonStr.trim().replace(/;$/, '');
          jsonData = JSON.parse(jsonStr);
        } else {
          jsonData = JSON.parse(text);
        }

        if (jsonData && Array.isArray(jsonData.items)) {
          setItems(jsonData.items);
          
          if (jsonData.bgImage) {
            setBackgroundImage(jsonData.bgImage);
            
            if (jsonData.bgImageDimensions) {
                setBgImageDimensions(jsonData.bgImageDimensions);
            } else {
                const img = new Image();
                img.onload = () => {
                  setBgImageDimensions({ w: img.width, h: img.height });
                };
                img.src = jsonData.bgImage;
            }

            if (jsonData.bgImagePosition) {
                setBgImagePosition(jsonData.bgImagePosition);
            } else {
                setBgImagePosition({ x: 0, y: 0 });
            }
          } else {
            setBackgroundImage(null);
            setBgImageDimensions(null);
            setBgImagePosition({ x: 0, y: 0 });
          }

          if (jsonData.scaleRatio) {
            setScaleRatio(jsonData.scaleRatio);
          }
          
          setSelectedIds(new Set());
          setIsEditingBackground(false);
          alert("项目已成功导入！");
        } else {
          alert("文件格式错误：找不到项目数据。");
        }
      } catch (error) {
        console.error("Import failed", error);
        alert("导入失败：无法解析文件。请确保上传的是正确的 .js 或 .json 导出文件。");
      }
    };
    reader.readAsText(file);
  };

  const resetView = () => {
    setView({ x: 0, y: 0, scale: 1 });
  };

  // Export Handlers
  const getExportContext = () => ({ items, backgroundImage, bgImageDimensions, bgImagePosition, scaleRatio });

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const worldEl = canvasRef.current.querySelector('[data-id="world-container"]') as HTMLElement;
    if (worldEl) exportPNG(worldEl, getExportContext());
  };

  const handleExportSVG = () => exportSVG(getExportContext());
  const handleExportHTML = () => exportHTML(getExportContext());
  const handleExportVue = () => exportVue(getExportContext());
  const handleExportJS = () => exportJS(getExportContext());

  // --- Drawing Logic ---
  
  const finishDrawing = () => {
      if (drawingPoints.length < 3) {
          setDrawingPoints([]);
          setCursorPos(null);
          return;
      }
      
      const normalized = normalizePoints(drawingPoints);
      if (!normalized) return;

      const id = Math.random().toString(36).substr(2, 9);
      const newItem: PlannerItem = {
           id,
           type: ItemType.BOOTH,
           x: normalized.x,
           y: normalized.y,
           w: normalized.w,
           h: normalized.h,
           rotation: 0,
           points: normalized.points,
           // boothType is ignored for polygons now
           standType: DEFAULT_BOOTH.standType,
           label: `B-${items.length + 1}`,
           useManualArea: true, // Enable manual area by default for custom shapes
           manualArea: 0,
           locked: false,
           openEdgeIndices: [] // Default all walls closed
       };
       
       setItems(prev => [...prev, newItem]);
       setSelectedIds(new Set([id]));
       setDrawingPoints([]);
       setCursorPos(null);
       setIsDrawing(false);
  };

  // --- Mouse Event Handlers ---

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isEditingBackground && backgroundImage && bgImageDimensions) {
          // Background Zoom
          const zoomIntensity = 0.05; 
          const delta = -Math.sign(e.deltaY);
          const scaleChange = Math.exp(delta * zoomIntensity);

          const worldMouseX = (mouseX - view.x) / view.scale;
          const worldMouseY = (mouseY - view.y) / view.scale;

          const oldW = bgImageDimensions.w;
          const oldH = bgImageDimensions.h;
          const newW = oldW * scaleChange;
          const newH = oldH * scaleChange;

          const newBgX = worldMouseX - (worldMouseX - bgImagePosition.x) * scaleChange;
          const newBgY = worldMouseY - (worldMouseY - bgImagePosition.y) * scaleChange;

          setBgImageDimensions({ w: newW, h: newH });
          setBgImagePosition({ x: newBgX, y: newBgY });
      } else {
          // View Zoom
          const zoomIntensity = 0.1;
          const delta = -Math.sign(e.deltaY);
          const scaleChange = Math.exp(delta * zoomIntensity);
          
          const currentScale = view.scale;
          const newScale = Math.min(Math.max(0.1, currentScale * scaleChange), 5);
          
          const viewX = view.x;
          const viewY = view.y;
          
          const worldX = (mouseX - viewX) / currentScale;
          const worldY = (mouseY - viewY) / currentScale;
          
          const newViewX = mouseX - worldX * newScale;
          const newViewY = mouseY - worldY * newScale;

          setView({
            scale: newScale,
            x: newViewX,
            y: newViewY
          });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [view, isEditingBackground, backgroundImage, bgImageDimensions, bgImagePosition]);

  const handleMouseDownItem = (e: React.MouseEvent, id: string, type: 'MOVE' | 'RESIZE') => {
    if (isEditingBackground) return; 
    if (isDrawing) return; // Ignore item interaction when drawing

    e.stopPropagation(); 
    const existingItem = items.find(i => i.id === id);
    if (!existingItem) return;

    // Ctrl+Click or Meta+Click to Duplicate
    if (type === 'MOVE' && (e.ctrlKey || e.metaKey)) {
      const newId = Math.random().toString(36).substr(2, 9);
      const offset = 10; // Slight visual offset
      
      const newItem: PlannerItem = {
        ...existingItem,
        id: newId,
        x: existingItem.x + offset,
        y: existingItem.y + offset,
        locked: false, // Reset locked for duplicated item
      };

      setItems(prev => [...prev, newItem]);
      setSelectedIds(new Set([newId]));

      setDragState({
        isDragging: true,
        type: 'ITEM_MOVE',
        initialItemsState: {
          [newId]: { 
            x: newItem.x, 
            y: newItem.y, 
            w: newItem.w, 
            h: newItem.h, 
            rotation: newItem.rotation || 0 
          }
        },
        activeResizeId: null,
        startX: e.clientX,
        startY: e.clientY,
        initialViewX: 0,
        initialViewY: 0,
      });
      return;
    }

    let newSelection = new Set(selectedIds);
    let isMultiSelect = e.shiftKey;

    if (type === 'MOVE') {
        if (isMultiSelect) {
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
        } else {
            if (!newSelection.has(id)) {
                newSelection = new Set([id]);
            }
        }
    } else {
        newSelection = new Set([id]);
    }

    setSelectedIds(newSelection);

    const initialStates: Record<string, { x: number, y: number, w: number, h: number, rotation: number }> = {};
    newSelection.forEach(sid => {
        const it = items.find(i => i.id === sid);
        if (it) {
            initialStates[sid] = { 
                x: it.x, 
                y: it.y, 
                w: it.w, 
                h: it.h, 
                rotation: it.rotation || 0 
            };
        }
    });

    if (existingItem.locked) {
        return;
    }
    
    setDragState({
      isDragging: true,
      type: type === 'MOVE' ? 'ITEM_MOVE' : 'ITEM_RESIZE',
      initialItemsState: initialStates,
      activeResizeId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialViewX: 0, 
      initialViewY: 0, 
    });
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // If not clicking an item (bubbled up here), we generally clear selection.
    // HOWEVER, if we just Alt-Clicked a wall, that event should have been stopped.
    // If it reaches here, it means it's a genuine canvas click.
    setSelectedIds(new Set());
    
    if (isEditingBackground && backgroundImage) {
       setDragState({
         isDragging: true,
         type: 'BG_MOVE',
         initialItemsState: {},
         activeResizeId: null,
         startX: e.clientX,
         startY: e.clientY,
         initialViewX: view.x, 
         initialViewY: view.y,
         initialBgPos: { ...bgImagePosition }
       });
    } else if (isDrawing) {
       // Polygon Drawing Mode
       const container = canvasRef.current;
       if (!container) return;

       const rect = container.getBoundingClientRect();
       const mouseX = e.clientX - rect.left;
       const mouseY = e.clientY - rect.top;

       const worldX = (mouseX - view.x) / view.scale;
       const worldY = (mouseY - view.y) / view.scale;
       
       // Check if close to start point to close the loop
       if (drawingPoints.length > 2) {
           const start = drawingPoints[0];
           const dx = start.x - worldX;
           const dy = start.y - worldY;
           const dist = Math.sqrt(dx*dx + dy*dy);
           
           // If within 10 screen pixels (converted to world)
           if (dist < (10 / view.scale)) {
               finishDrawing();
               return;
           }
       }
       
       setDrawingPoints(prev => [...prev, { x: worldX, y: worldY }]);

    } else {
      setDragState({
        isDragging: true,
        type: 'PAN',
        initialItemsState: {},
        activeResizeId: null,
        startX: e.clientX,
        startY: e.clientY,
        initialViewX: view.x, 
        initialViewY: view.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Update cursor pos for drawing line
    if (isDrawing) {
         const container = canvasRef.current;
         if (container) {
             const rect = container.getBoundingClientRect();
             const mouseX = e.clientX - rect.left;
             const mouseY = e.clientY - rect.top;
             
             const worldX = (mouseX - view.x) / view.scale;
             const worldY = (mouseY - view.y) / view.scale;
             setCursorPos({ x: worldX, y: worldY });
         }
    }

    if (!dragState.isDragging) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (dragState.type === 'PAN') {
      setView({
        ...view,
        x: dragState.initialViewX + dx,
        y: dragState.initialViewY + dy
      });
    } else if (dragState.type === 'BG_MOVE' && dragState.initialBgPos) {
      const worldDx = dx / view.scale;
      const worldDy = dy / view.scale;
      
      setBgImagePosition({
          x: dragState.initialBgPos.x + worldDx,
          y: dragState.initialBgPos.y + worldDy
      });
    } else if (dragState.type === 'ITEM_MOVE') {
      const worldDx = dx / view.scale;
      const worldDy = dy / view.scale;

      const snappedDx = Math.round(worldDx / GRID_SIZE) * GRID_SIZE;
      const snappedDy = Math.round(worldDy / GRID_SIZE) * GRID_SIZE;
      
      const initialItemsState = dragState.initialItemsState;

      setItems(prev => prev.map((item: PlannerItem) => {
        if (item.locked) return item; 
        
        const initialState = initialItemsState[item.id as string];
        if (!initialState) return item;
        
        return {
          ...item,
          x: initialState.x + snappedDx,
          y: initialState.y + snappedDy
        };
      }));

    } else if (dragState.type === 'ITEM_RESIZE' && dragState.activeResizeId) {
       const activeResizeId = dragState.activeResizeId as string;
       
       setItems(prev => prev.map(item => {
          if (item.id !== activeResizeId) return item;
          if (item.locked) return item;
          
          const initialItem = dragState.initialItemsState[activeResizeId];
          if (!initialItem) return item;

          // Reconstruct a minimal planner item for geometry calc
          const proxyItem = {
              ...initialItem,
              id: activeResizeId,
              type: ItemType.BOOTH 
          } as PlannerItem;
          
          const aabb = getBoundingBox(proxyItem);
          const cx = initialItem.x + initialItem.w / 2;
          const cy = initialItem.y + initialItem.h / 2;
          const worldHandleX = aabb.x + aabb.w;
          const worldHandleY = aabb.y + aabb.h;

          // Vector from Center to Handle (World)
          const vx = worldHandleX - cx;
          const vy = worldHandleY - cy;

          // Rotate to Local (-rotation)
          const rad = (-initialItem.rotation * Math.PI) / 180;
          const hx = vx * Math.cos(rad) - vy * Math.sin(rad);
          const hxAbs = Math.abs(hx);
          const hy = vx * Math.sin(rad) + vy * Math.cos(rad);
          const hyAbs = Math.abs(hy);

          // Determine Signs
          const signW = hxAbs < 1 ? 0 : Math.sign(hx);
          const signH = hyAbs < 1 ? 0 : Math.sign(hy);

          // Mouse Delta in Local
          const worldDx = dx / view.scale;
          const worldDy = dy / view.scale;
          
          // Rotate world delta to local space
          const localDx = worldDx * Math.cos(rad) - worldDy * Math.sin(rad);
          const localDy = worldDx * Math.sin(rad) + worldDy * Math.cos(rad);

          // Calculate proposed deltas
          const dW = localDx * signW;
          const dH = localDy * signH;

          const rawNewW = initialItem.w + dW;
          const rawNewH = initialItem.h + dH;

          // Snap and Clamp
          const newW = Math.max(GRID_SIZE, Math.round(rawNewW / GRID_SIZE) * GRID_SIZE);
          const newH = Math.max(GRID_SIZE, Math.round(rawNewH / GRID_SIZE) * GRID_SIZE);

          // Calculate effective delta to adjust center
          const effectiveDW = newW - initialItem.w;
          const effectiveDH = newH - initialItem.h;

          // Center shift in Local
          const cslX = (effectiveDW / 2) * signW;
          const cslY = (effectiveDH / 2) * signH;

          // Rotate back to World (+rotation)
          const radWorld = (initialItem.rotation * Math.PI) / 180;
          const cswX = cslX * Math.cos(radWorld) - cslY * Math.sin(radWorld);
          const cswY = cslX * Math.sin(radWorld) + cslY * Math.cos(radWorld);

          const oldCx = initialItem.x + initialItem.w / 2;
          const oldCy = initialItem.y + initialItem.h / 2;
          const newCx = oldCx + cswX;
          const newCy = oldCy + cswY;

          const newX = newCx - newW / 2;
          const newY = newCy - newH / 2;

          return { ...item, x: newX, y: newY, w: newW, h: newH };
       }));
    }
  };

  const handleMouseUp = () => {
    if (dragState.isDragging) {
      setDragState(prev => ({ ...prev, isDragging: false, type: null, initialItemsState: {}, activeResizeId: null }));
    }
  };

  // --- Keyboard Event Handlers ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to cancel drawing or clear selection
      if (e.key === 'Escape') {
          if (isDrawing) {
              if (drawingPoints.length > 0) {
                  setDrawingPoints([]);
                  setCursorPos(null);
              } else {
                  setIsDrawing(false);
                  setCursorPos(null);
              }
              setDragState(prev => ({ ...prev, isDragging: false, type: null }));
              return;
          }
          if (selectedIds.size > 0) {
              setSelectedIds(new Set());
              return;
          }
      }
      
      if (e.key === 'Enter' && isDrawing) {
          finishDrawing();
          return;
      }

      const target = e.target as HTMLElement;
      // Prevent triggering if user is typing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (selectedIds.size === 0) return;

      // Delete Support
      if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteItem();
          return;
      }

      // Arrow Key Movement Support
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          
          const step = e.shiftKey ? 10 : 1; // 1px default, 10px with Shift
          let dx = 0;
          let dy = 0;

          switch (e.key) {
              case 'ArrowUp': dy = -step; break;
              case 'ArrowDown': dy = step; break;
              case 'ArrowLeft': dx = -step; break;
              case 'ArrowRight': dx = step; break;
          }

          setItems(prev => prev.map(item => {
             if (selectedIds.has(item.id)) {
                 if (item.locked) return item; // Respect lock for keyboard move
                 return { ...item, x: item.x + dx, y: item.y + dy };
             }
             return item;
          }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, items, isDrawing, drawingPoints]); 

  // Fix: Added `view` to dependencies so `handleMouseMove` always uses current view coordinates
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, view, isDrawing]); 

  const selectedItems = items.filter(i => selectedIds.has(i.id));

  // Canvas Cursor Logic
  let cursorClass = 'cursor-default';
  if (isEditingBackground) cursorClass = 'cursor-move';
  else if (isDrawing) cursorClass = 'cursor-crosshair';
  else if (dragState.type === 'PAN') cursorClass = 'cursor-grabbing';

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden select-none">
      
      <Toolbar 
        scaleRatio={scaleRatio}
        setScaleRatio={setScaleRatio}
        backgroundImage={backgroundImage}
        onImageUpload={handleImageUpload}
        clearBackground={clearBackground}
        bgImageDimensions={bgImageDimensions}
        setBgImageDimensions={setBgImageDimensions}
        bgImagePosition={bgImagePosition}
        setBgImagePosition={setBgImagePosition}
        addItem={addItem}
        onImportProject={handleImportProject}
        onExportPNG={handleExportPNG}
        onExportHTML={handleExportHTML}
        onExportVue={handleExportVue}
        onExportSVG={handleExportSVG}
        onExportJS={handleExportJS}
        selectedItems={selectedItems}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        isEditingBackground={isEditingBackground}
        setIsEditingBackground={setIsEditingBackground}
        onSplitItem={handleSplitItem}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
      />

      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {isEditingBackground ? (
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-bold animate-pulse">
                   <ImageIcon size={14} />
                   <span>正在编辑背景：拖拽移动，滚轮缩放</span>
               </div>
            ) : isDrawing ? (
               <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold animate-pulse">
                   <PenTool size={14} />
                   <span>多边形绘制：点击确定顶点，双击或回车完成，ESC 取消</span>
               </div>
            ) : (
                <>
                    <div className="flex items-center gap-1">
                    <ZoomIn size={14} />
                    <span>滚轮缩放</span>
                    </div>
                    <div className="flex items-center gap-1">
                    <GripHorizontal size={14} />
                    <span>拖拽画布</span>
                    </div>
                    <div className="flex items-center gap-1">
                    <span>Shift 多选</span>
                    </div>
                    <div className="flex items-center gap-1">
                    <span>Ctrl+点击 复制</span>
                    </div>
                    <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1">
                        <span className="font-medium">快捷键:</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="bg-slate-100 border border-slate-200 px-1 rounded text-[10px]">↑↓←→</span>
                        <span>移动</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="bg-slate-100 border border-slate-200 px-1 rounded text-[10px]">Del</span>
                        <span>删除</span>
                    </div>
                </>
            )}
             <div className="flex items-center gap-1 ml-auto">
               <span>当前比例: {Math.round(view.scale * 100)}%</span>
            </div>
          </div>
          <button 
            onClick={resetView}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            title="重置视图"
          >
             <RefreshCcw size={16} />
          </button>
        </div>

        <div 
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden bg-slate-50 ${cursorClass}`}
          onMouseDown={handleMouseDownCanvas}
          onDoubleClick={() => isDrawing && finishDrawing()}
        >
           <div 
              className="absolute inset-0 bg-grid pointer-events-none opacity-50"
              style={{ 
                backgroundPosition: `${view.x}px ${view.y}px`,
                backgroundSize: `${20 * view.scale}px ${20 * view.scale}`
              }} 
           />

           <div
             data-id="world-container"
             className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
             style={{
               transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
             }}
           >
              {backgroundImage && bgImageDimensions && (
                <img 
                  src={backgroundImage} 
                  alt="Plan Background" 
                  className={`absolute select-none ${isEditingBackground ? 'opacity-90 outline outline-2 outline-blue-500' : 'pointer-events-none'}`}
                  style={{
                    left: bgImagePosition.x,
                    top: bgImagePosition.y,
                    width: bgImageDimensions.w,
                    height: bgImageDimensions.h,
                    maxWidth: 'none',
                    zIndex: 0
                  }}
                  draggable={false}
                />
              )}

              {/* Dim items when editing background to focus attention */}
              <div style={{ opacity: isEditingBackground ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {items.map(item => (
                    <CanvasItem
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    allItems={items}
                    onMouseDown={handleMouseDownItem}
                    scaleRatio={scaleRatio}
                    onToggleWall={handleToggleWall}
                    />
                ))}
              </div>

              {/* Render Temporary Drawing Path */}
              {isDrawing && (
                  <svg 
                     style={{ 
                         position: 'absolute', 
                         top: 0, 
                         left: 0, 
                         overflow: 'visible', 
                         pointerEvents: 'none', 
                         zIndex: 999 
                     }}
                     // Using 1px ensures DOM presence without blocking clicks if pointer-events fails
                     width="1"
                     height="1"
                     className="overflow-visible"
                  >
                     {/* Dynamic Filled Polygon Preview */}
                     {drawingPoints.length > 0 && cursorPos && (
                        <polygon 
                            points={[...drawingPoints, cursorPos].map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(99, 102, 241, 0.2)"
                            stroke="none"
                        />
                     )}

                     {/* Closing Line Preview (Cursor to Start) */}
                     {drawingPoints.length > 0 && cursorPos && (
                        <line 
                           x1={cursorPos.x}
                           y1={cursorPos.y}
                           x2={drawingPoints[0].x}
                           y2={drawingPoints[0].y}
                           stroke="#818cf8"
                           strokeWidth="1.5"
                           strokeDasharray="4"
                           opacity="0.5"
                        />
                     )}

                     {/* Lines between confirmed points */}
                     <polyline 
                         points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                         fill="none"
                         stroke="#4f46e5"
                         strokeWidth="2"
                         strokeDasharray="4"
                     />
                     
                     {/* Line from last point to cursor */}
                     {drawingPoints.length > 0 && cursorPos && (
                         <line 
                            x1={drawingPoints[drawingPoints.length - 1].x}
                            y1={drawingPoints[drawingPoints.length - 1].y}
                            x2={cursorPos.x}
                            y2={cursorPos.y}
                            stroke="#818cf8"
                            strokeWidth="1.5"
                            strokeDasharray="4"
                         />
                     )}
                     
                     {/* Points */}
                     {drawingPoints.map((p, i) => (
                         <circle 
                             key={i} 
                             cx={p.x} 
                             cy={p.y} 
                             r={4 / view.scale} 
                             fill="#4f46e5" 
                             stroke="white" 
                             strokeWidth="1" 
                         />
                     ))}
                  </svg>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
