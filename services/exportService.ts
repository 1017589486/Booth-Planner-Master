import { PlannerItem, ItemType, StandType } from '../types';
import { calculateBoothNetArea, getBoundingBox } from '../utils/geometry';
import html2canvas from 'html2canvas';

interface ExportContext {
  items: PlannerItem[];
  backgroundImage: string | null;
  bgImageDimensions: { w: number; h: number } | null;
  bgImagePosition: { x: number; y: number } | null;
  scaleRatio: number;
}

const TARGET_WIDTH = 1024;
const EXPORT_PADDING = 50;

const triggerDownload = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const prepareExportData = ({ items, backgroundImage, bgImageDimensions, bgImagePosition, scaleRatio }: ExportContext, padding: number = 0) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasContent = false;

  // Calculate bounds from items using AABB for rotation support
  if (items.length > 0) {
    hasContent = true;
    items.forEach(item => {
        const box = getBoundingBox(item);
        if (box.x < minX) minX = box.x;
        if (box.y < minY) minY = box.y;
        if (box.x + box.w > maxX) maxX = box.x + box.w;
        if (box.y + box.h > maxY) maxY = box.y + box.h;
    });
  }

  // Calculate bounds from Background Image
  if (backgroundImage && bgImageDimensions) {
    hasContent = true;
    const bgX = bgImagePosition?.x || 0;
    const bgY = bgImagePosition?.y || 0;
    const bgW = bgImageDimensions.w;
    const bgH = bgImageDimensions.h;

    minX = Math.min(minX, bgX);
    minY = Math.min(minY, bgY);
    maxX = Math.max(maxX, bgX + bgW);
    maxY = Math.max(maxY, bgY + bgH);
  }

  // Default bounds if empty
  if (!hasContent) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  // Ensure finite numbers
  if (!isFinite(minX)) minX = 0;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxX)) maxX = 800;
  if (!isFinite(maxY)) maxY = 600;

  // Calculate Origin and Dimensions with Padding
  const originX = minX - padding;
  const originY = minY - padding;

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const width = contentWidth + (padding * 2);
  const height = contentHeight + (padding * 2);

  // Calculate Scale for interactive exports (HTML/Vue)
  const scale = TARGET_WIDTH / width;
  const targetHeight = height * scale;

  // Normalize items relative to the padded origin
  const exportItems = items.map(item => {
    const net = item.type === ItemType.BOOTH ? calculateBoothNetArea(item, items) : 0;
    const gross = item.w * item.h;

    // Calculate real-world area (m2)
    const netAreaM2 = (net * scaleRatio * scaleRatio) / 10000;
    const grossAreaM2 = (gross * scaleRatio * scaleRatio) / 10000;

    // Calculate real-world dimensions (m)
    const widthM = (item.w * scaleRatio) / 100;
    const heightM = (item.h * scaleRatio) / 100;

    // Swap if rotated 90/270 to match visual display
    const isRotated = Math.abs((item.rotation || 0) % 180) === 90;
    const displayWidthM = isRotated ? heightM : widthM;
    const displayHeightM = isRotated ? widthM : heightM;

    // Calculate effective font size for export consistency
    const effectiveFontSize = item.fontSize || Math.max(14, Math.min(item.w, item.h) / 6);

    return {
      ...item,
      x: item.x - originX,
      y: item.y - originY,
      netArea: net,
      grossArea: gross,
      netAreaM2,
      grossAreaM2,
      widthM,
      heightM,
      displayWidthM,
      displayHeightM,
      hasPillar: item.type === ItemType.BOOTH && net < gross,
      fontSize: effectiveFontSize,
      standType: item.type === ItemType.BOOTH ? (item.standType || StandType.STANDARD) : undefined,
      locked: item.locked // Pass through lock state
    };
  });

  // Background Style
  const bgStyle = {
    left: (bgImagePosition?.x || 0) - originX,
    top: (bgImagePosition?.y || 0) - originY,
    width: bgImageDimensions?.w || 0,
    height: bgImageDimensions?.h || 0
  };

  return {
    originalWidth: width,
    originalHeight: height,
    targetWidth: TARGET_WIDTH,
    targetHeight,
    scale,
    exportItems,
    bgStyle,
    minX,
    minY
  };
};

export const exportPNG = async (element: HTMLElement, context: ExportContext) => {
  // PNG Export handles its own padding due to html2canvas specifics, pass 0 here
  const { originalWidth, originalHeight, minX, minY } = prepareExportData(context, 0);
  
  // Increase padding to be safe against shadows and stroke
  const padding = 60; 
  const width = originalWidth + (padding * 2);
  const height = originalHeight + (padding * 2);

  // Use a temporary container strategy to avoid viewport transform issues
  const tempContainer = document.createElement('div');
  Object.assign(tempContainer.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: `${width}px`,
      height: `${height}px`,
      zIndex: '-9999',
      backgroundColor: '#f8fafc',
      overflow: 'hidden'
  });

  document.body.appendChild(tempContainer);

  try {
    const clonedWorld = element.cloneNode(true) as HTMLElement;
    
    // Cleanup Selection UI artifacts
    const resizeHandles = clonedWorld.querySelectorAll('.cursor-nwse-resize');
    resizeHandles.forEach(el => el.remove());

    const selectedItems = clonedWorld.querySelectorAll('.ring-2.ring-indigo-500');
    selectedItems.forEach(el => {
        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-1', 'shadow-lg', 'z-50');
        el.classList.add('shadow-sm'); // revert to normal shadow
    });

    // Reset transform to identity and position content
    clonedWorld.style.transform = 'none';
    clonedWorld.style.transition = 'none';
    clonedWorld.style.width = '100%';
    clonedWorld.style.height = '100%';
    clonedWorld.style.position = 'absolute';
    
    // Shift content so the bounding box aligns with padding
    // minX represents the world X of the leftmost content.
    // We want that content to start at `padding` px in the temp container.
    clonedWorld.style.left = `${-minX + padding}px`;
    clonedWorld.style.top = `${-minY + padding}px`;

    tempContainer.appendChild(clonedWorld);

    const canvas = await html2canvas(tempContainer, {
      width: width,
      height: height,
      scale: 2, // 2x Resolution for better quality
      backgroundColor: '#f8fafc',
      useCORS: true,
      logging: false,
      windowWidth: width,
      windowHeight: height,
    });

    const link = document.createElement('a');
    link.download = `expo-layout-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error("Export failed:", err);
    alert("导出图片失败，请重试。");
  } finally {
    document.body.removeChild(tempContainer);
  }
};

export const exportSVG = (context: ExportContext) => {
  const { originalWidth, originalHeight, exportItems, bgStyle } = prepareExportData(context, EXPORT_PADDING);

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  let svgBody = '';

  // Background Image
  if (context.backgroundImage) {
    svgBody += `<image href="${context.backgroundImage}" x="${bgStyle.left}" y="${bgStyle.top}" width="${bgStyle.width}" height="${bgStyle.height}" />`;
  }

  exportItems.forEach(item => {
    const cx = item.w / 2;
    const cy = item.h / 2;
    const rot = item.rotation || 0;

    let itemContent = '';

    if (item.type === 'BOOTH') {
      // Floor
      const color = item.color || '#ffffff';
      itemContent += `<rect width="${item.w}" height="${item.h}" fill="${color}" stroke="#cbd5e1" stroke-width="1" />`;

      // Walls
      const t = 6;
      const offset = -t / 2;
      const wallColor = '#0f172a';

      let walls = { top: true, bottom: true, left: true, right: true };
      if (item.boothType === '单开') walls.bottom = false;
      if (item.boothType === '双开 (转角)') { walls.bottom = false; walls.right = false; }
      if (item.boothType === '双开 (对通)') { walls.bottom = false; walls.top = false; }
      if (item.boothType === '三开') { walls.bottom = false; walls.left = false; walls.right = false; }
      if (item.boothType === '岛型 (全开)') { walls.top = false; walls.bottom = false; walls.left = false; walls.right = false; }

      if (walls.top) itemContent += `<rect x="${offset}" y="${offset}" width="${item.w + t}" height="${t}" fill="${wallColor}" />`;
      if (walls.bottom) itemContent += `<rect x="${offset}" y="${item.h + offset}" width="${item.w + t}" height="${t}" fill="${wallColor}" />`;
      if (walls.left) itemContent += `<rect x="${offset}" y="0" width="${t}" height="${item.h}" fill="${wallColor}" />`;
      if (walls.right) itemContent += `<rect x="${item.w + offset}" y="0" width="${t}" height="${item.h}" fill="${wallColor}" />`;

    } else {
      // Pillar
      itemContent += `<rect width="${item.w}" height="${item.h}" fill="url(#pillarPattern)" stroke="#475569" stroke-width="1" />`;
    }

    // Text Labels
    const fontSize = item.fontSize || 12;
    const fontColor = item.fontColor || (item.type === 'BOOTH' ? '#334155' : '#ffffff');

    let textContent = '';
    if (item.label) {
      textContent += `<text x="0" y="-2" font-weight="bold" font-size="${fontSize}" fill="${fontColor}">${escapeXml(item.label)}</text>`;
    }

    if (item.type === 'BOOTH') {
      const secFontSize = Math.max(10, fontSize * 0.5);
      // Dimensions in Meters (Using Display Dimensions)
      textContent += `<text x="0" y="${fontSize}" font-size="${secFontSize}" fill="#94a3b8" font-family="monospace">${Number(item.displayWidthM.toFixed(2))}×${Number(item.displayHeightM.toFixed(2))} m</text>`;
      textContent += `<text x="0" y="${fontSize + secFontSize}" font-size="${secFontSize}" fill="#94a3b8" font-family="monospace">(${item.netAreaM2.toFixed(2)} m²)</text>`;
      if (item.hasPillar) {
        textContent += `<text x="0" y="${fontSize + (secFontSize * 2.1)}" font-size="${secFontSize}" fill="#b91c1c" font-weight="bold">⚠ ${item.netAreaM2.toFixed(2)} m²</text>`;
      }
    }
    
    // Lock Indicator in Export? Maybe skipping to keep it clean, or adding a small icon. 
    // Skipping for now to keep export clean unless requested.

    if (textContent) {
      itemContent += `<g transform="translate(${cx}, ${cy}) rotate(${-rot})"><g text-anchor="middle" dominant-baseline="middle">${textContent}</g></g>`;
    }

    svgBody += `<g transform="translate(${item.x}, ${item.y}) rotate(${rot}, ${cx}, ${cy})">${itemContent}</g>`;
  });

  const svgFull = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${originalWidth}" height="${originalHeight}" viewBox="0 0 ${originalWidth} ${originalHeight}">
  <defs>
    <pattern id="pillarPattern" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#64748b" stroke-width="2" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#f8fafc" />
  ${svgBody}
</svg>`;

  triggerDownload(svgFull, 'expo-layout.svg', 'image/svg+xml');
};

export const exportHTML = (context: ExportContext) => {
  const { originalWidth, originalHeight, exportItems, bgStyle } = prepareExportData(context, EXPORT_PADDING);

  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Expo Layout Interactive</title>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; width: 100vw; height: 100vh; }
    .layout-wrapper { position: relative; background: #e2e8f0; overflow: hidden; width: 100%; height: 100%; cursor: grab; }
    .layout-wrapper:active { cursor: grabbing; }
    /* Pattern background for canvas similar to app */
    .bg-grid {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background-size: 40px 40px;
        background-image: linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                          linear-gradient(to bottom, #cbd5e1 1px, transparent 1px);
        opacity: 0.3;
        pointer-events: none;
    }
    .layout-scaler { transform-origin: 0 0; position: absolute; top: 0; left: 0; width: ${originalWidth}px; height: ${originalHeight}px; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .bg-img { position: absolute; z-index: 0; pointer-events: none; }
    .item { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: box-shadow 0.2s; user-select: none; }
    .booth { background-color: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); z-index: 10; }
    .booth-pattern { background-image: radial-gradient(#e2e8f0 1px, transparent 1px); background-size: 10px 10px; }
    .booth:hover { z-index: 100 !important; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); border-color: #6366f1; }
    .pillar { background-color: #94a3b8; border: 1px solid #475569; z-index: 50; color: white; cursor: pointer; background-image: linear-gradient(45deg, #64748b 25%, transparent 25%, transparent 50%, #64748b 50%, #64748b 75%, transparent 75%, transparent); background-size: 8px 8px; }
    .pillar:hover { border-color: #1e293b; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
    .label-container { pointer-events: none; text-align: center; line-height: 1.2; padding: 4px; color: #334155; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
    .label-main { font-weight: bold; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .label-sub { color: #94a3b8; font-family: monospace; margin-bottom: 1px; }
    .label-area { color: #64748b; font-family: monospace; margin-bottom: 4px; }
    .label-alert { margin-top: 0; display: inline-flex; align-items: center; justify-content: center; color: #b91c1c; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 6px; border: 1px solid #fecaca; white-space: nowrap; line-height: 1; }
    .pillar .label-main { color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
    .wall { position: absolute; background: #0f172a; }
    
    /* UI Overlay */
    .ui-overlay { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 8px 16px; border-radius: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; gap: 12px; align-items: center; font-size: 14px; color: #475569; z-index: 1000; }
    .ui-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 600; color: #475569; transition: all 0.2s; }
    .ui-btn:hover { background: #e2e8f0; color: #0f172a; }

    /* Modal Styles */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
    .modal { background: white; width: 320px; border-radius: 12px; padding: 0; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); overflow: hidden; animation: modalIn 0.2s ease-out; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .modal-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { margin: 0; font-size: 18px; color: #0f172a; }
    .close-icon { cursor: pointer; font-size: 20px; color: #94a3b8; }
    .close-icon:hover { color: #475569; }
    .modal-body { padding: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; }
    .info-val { font-weight: 600; color: #0f172a; }
    .text-red { color: #dc2626; }
    .modal-footer { padding: 16px 20px; border-top: 1px solid #e2e8f0; text-align: right; }
    .btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div id="wrapper" class="layout-wrapper">
     <div class="bg-grid"></div>
     <div id="scaler" class="layout-scaler">
        <div id="container"></div>
     </div>
     <div class="ui-overlay">
        <span>滚轮缩放 / 拖拽平移</span>
        <button class="ui-btn" onclick="resetView()">重置视图</button>
     </div>
  </div>
  <div id="modal" class="modal-overlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><h3 id="m-title">Details</h3><span class="close-icon" onclick="closeModal()">×</span></div>
      <div class="modal-body" id="m-body"></div>
      <div class="modal-footer"><button class="btn" onclick="closeModal()">关闭</button></div>
    </div>
  </div>
  <script>
    const items = ${JSON.stringify(exportItems)};
    const bgImage = "${context.backgroundImage || ''}";
    const container = document.getElementById('container');
    const bgStyle = ${JSON.stringify(bgStyle)};
    const originalWidth = ${originalWidth};
    const originalHeight = ${originalHeight};
    const wrapper = document.getElementById('wrapper');
    const scaler = document.getElementById('scaler');

    let view = { scale: 1, x: 0, y: 0 };
    let isDragging = false;
    let startX = 0, startY = 0;

    // Initialize View
    function initView() {
       const wrapperW = wrapper.clientWidth;
       const wrapperH = wrapper.clientHeight;
       // Initial fit: Fit width with some padding, center it
       const padding = 40;
       const scale = Math.min((wrapperW - padding) / originalWidth, (wrapperH - padding) / originalHeight, 1);
       
       view.scale = scale;
       view.x = (wrapperW - originalWidth * scale) / 2;
       view.y = (wrapperH - originalHeight * scale) / 2;
       updateTransform();
    }
    
    function resetView() {
        initView();
    }

    function updateTransform() {
        scaler.style.transform = \`translate(\${view.x}px, \${view.y}px) scale(\${view.scale})\`;
    }

    // Zoom Handler
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = -Math.sign(e.deltaY);
        const scaleChange = Math.exp(delta * zoomIntensity);
        
        const newScale = Math.min(Math.max(0.05, view.scale * scaleChange), 10);
        
        // Calculate world coordinates before zoom
        const worldX = (mouseX - view.x) / view.scale;
        const worldY = (mouseY - view.y) / view.scale;
        
        // Update view
        view.scale = newScale;
        view.x = mouseX - worldX * newScale;
        view.y = mouseY - worldY * newScale;
        
        updateTransform();
    }, { passive: false });

    // Pan Handler
    wrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - view.x;
        startY = e.clientY - view.y;
        wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        view.x = e.clientX - startX;
        view.y = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        wrapper.style.cursor = 'grab';
    });
    
    document.addEventListener('DOMContentLoaded', initView);

    if (bgImage) {
        const img = document.createElement('img'); img.src = bgImage; img.className = 'bg-img'; 
        img.style.left = bgStyle.left + 'px'; 
        img.style.top = bgStyle.top + 'px';
        img.style.width = bgStyle.width + 'px';
        img.style.height = bgStyle.height + 'px';
        container.appendChild(img);
    }

    function renderWalls(el, type) {
       const t = 6; const off = -t/2;
       const style = (css) => { const d = document.createElement('div'); d.className = 'wall'; Object.assign(d.style, css); el.appendChild(d); };
       let top=true, bottom=true, left=true, right=true;
       if(type === '单开') bottom=false;
       if(type === '双开 (转角)') { bottom=false; right=false; }
       if(type === '双开 (对通)') { bottom=false; top=false; }
       if(type === '三开') { bottom=false; left=false; right=false; }
       if(type === '岛型 (全开)') { top=false; bottom=false; left=false; right=false; }
       if(top) style({top: off+'px', left: off+'px', right: off+'px', height: t+'px'});
       if(bottom) style({bottom: off+'px', left: off+'px', right: off+'px', height: t+'px'});
       if(left) style({top: 0, bottom: 0, left: off+'px', width: t+'px'});
       if(right) style({top: 0, bottom: 0, right: off+'px', width: t+'px'});
    }

    items.forEach(item => {
       const el = document.createElement('div');
       el.className = 'item ' + (item.type === 'BOOTH' ? 'booth' : 'pillar');
       el.style.left = item.x + 'px'; el.style.top = item.y + 'px'; el.style.width = item.w + 'px'; el.style.height = item.h + 'px';
       el.style.transform = \`rotate(\${item.rotation || 0}deg)\`;
       if(item.color) el.style.backgroundColor = item.color;
       else if (item.type === 'BOOTH') el.classList.add('booth-pattern');
       if(item.type === 'BOOTH') renderWalls(el, item.boothType);
       el.onclick = (e) => {
           e.stopPropagation();
           showInfo(item);
       };

       const lc = document.createElement('div'); lc.className = 'label-container'; lc.style.transform = \`rotate(-\${item.rotation || 0}deg)\`;
       let labelHtml = '';
       if(item.label) {
           const fSize = (item.fontSize || 12) + 'px';
           const fColor = item.fontColor || (item.type === 'BOOTH' ? '#334155' : '#ffffff');
           labelHtml += \`<div class="label-main" style="font-size: \${fSize}; color: \${fColor}">\${item.label}</div>\`;
       }
       if(item.type === 'BOOTH') {
           const fontSize = item.fontSize || 12;
           const secFontSize = Math.max(10, fontSize * 0.5) + 'px';
           labelHtml += \`<div class="label-sub" style="font-size: \${secFontSize}">\${Number(item.displayWidthM.toFixed(2))}×\${Number(item.displayHeightM.toFixed(2))} m</div>\`;
           labelHtml += \`<div class="label-area" style="font-size: \${secFontSize}">(\${item.netAreaM2.toFixed(2)} m²)</div>\`;
           if (item.hasPillar) labelHtml += \`<div class="label-alert" style="font-size: \${secFontSize}">⚠ \${item.netAreaM2.toFixed(2)} m²</div>\`;
       }
       lc.innerHTML = labelHtml; el.appendChild(lc); container.appendChild(el);
    });

    function showInfo(item) {
        const modal = document.getElementById('modal');
        const title = document.getElementById('m-title');
        const body = document.getElementById('m-body');
        title.innerText = item.label || (item.type === 'BOOTH' ? '展位详情' : '柱子详情');
        let content = '';
        if (item.type === 'BOOTH') {
             content += \`<div class="info-row"><span class="info-label">开口配置</span><span class="info-val">\${item.boothType}</span></div>\`;
             if (item.standType) {
                content += \`<div class="info-row"><span class="info-label">摊位类型</span><span class="info-val">\${item.standType}</span></div>\`;
             }
        }
        else content += \`<div class="info-row"><span class="info-label">类型</span><span class="info-val">建筑柱</span></div>\`;
        content += \`<div class="info-row"><span class="info-label">尺寸 (W x H)</span><span class="info-val">\${Number(item.displayWidthM.toFixed(2))} x \${Number(item.displayHeightM.toFixed(2))} m</span></div>\`;
        if (item.type === 'BOOTH') {
            if (item.hasPillar) {
                content += \`<div class="info-row"><span class="info-label">总面积</span><span class="info-val">\${item.grossAreaM2.toFixed(2)} m²</span></div>
                <div class="info-row"><span class="info-label text-red">柱子占用</span><span class="info-val text-red">-\${(item.grossAreaM2 - item.netAreaM2).toFixed(2)} m²</span></div>
                <div class="info-row"><span class="info-label">净面积</span><span class="info-val">\${item.netAreaM2.toFixed(2)} m²</span></div>\`;
            } else {
                content += \`<div class="info-row"><span class="info-label">面积</span><span class="info-val">\${item.grossAreaM2.toFixed(2)} m²</span></div>\`;
            }
            if (item.notes) content += \`<div class="info-row" style="display:block; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;"><span class="info-label" style="display:block; margin-bottom: 4px;">备注</span><span class="info-val" style="font-weight: 400; color: #334155; white-space: pre-wrap;">\${item.notes}</span></div>\`;
        } else {
            content += \`<div class="info-row"><span class="info-label">占地面积</span><span class="info-val">\${item.grossAreaM2.toFixed(2)} m²</span></div>\`;
        }
        body.innerHTML = content; modal.style.display = 'flex';
    }
    function closeModal() { document.getElementById('modal').style.display = 'none'; }
  </script>
</body>
</html>`;
  triggerDownload(htmlContent, 'expo-interactive-map.html', 'text/html');
};

export const exportVue = (context: ExportContext) => {
  const { originalWidth, originalHeight, targetWidth, targetHeight, scale, exportItems, bgStyle } = prepareExportData(context, EXPORT_PADDING);

  const vueContent = `
<template>
  <div class="expo-planner-export">
    <div class="layout-wrapper" 
         ref="wrapperRef"
         @wheel.prevent="handleWheel"
         @mousedown="handleMouseDown"
         @mousemove="handleMouseMove"
         @mouseup="handleMouseUp"
         @mouseleave="handleMouseUp"
         :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
    >
       <div class="bg-grid"></div>
       <div class="layout-scaler" :style="scalerStyle">
            <img v-if="bgImage" :src="bgImage" class="bg-img" :style="bgImgStyle" alt="Background" />
            <div
                v-for="item in items"
                :key="item.id"
                :class="['item', item.type === 'BOOTH' ? 'booth' : 'pillar']"
                :style="getItemStyle(item)"
                @click.stop="showInfo(item)"
            >
                <template v-if="item.type === 'BOOTH'">
                <div v-if="getWalls(item.boothType).top" class="wall wall-top"></div>
                <div v-if="getWalls(item.boothType).bottom" class="wall wall-bottom"></div>
                <div v-if="getWalls(item.boothType).left" class="wall wall-left"></div>
                <div v-if="getWalls(item.boothType).right" class="wall wall-right"></div>
                </template>

                <div class="label-container" :style="{ transform: 'rotate(' + (-item.rotation || 0) + 'deg)' }">
                <div 
                    v-if="item.label" 
                    class="label-main"
                    :style="{ fontSize: (item.fontSize || 12) + 'px', color: item.fontColor || (item.type === 'BOOTH' ? '#334155' : '#ffffff') }"
                >{{ item.label }}</div>
                <template v-if="item.type === 'BOOTH'">
                    <div class="label-sub" :style="{ fontSize: Math.max(10, (item.fontSize || 12) * 0.5) + 'px' }">{{ Number(item.displayWidthM.toFixed(2)) }}×{{ Number(item.displayHeightM.toFixed(2)) }} m</div>
                    <div class="label-area" :style="{ fontSize: Math.max(10, (item.fontSize || 12) * 0.5) + 'px' }">({{ item.netAreaM2.toFixed(2) }} m²)</div>
                    <div v-if="item.hasPillar" class="label-alert" :style="{ fontSize: Math.max(10, (item.fontSize || 12) * 0.5) + 'px' }">⚠ {{ item.netAreaM2.toFixed(2) }} m²</div>
                </template>
                </div>
            </div>
       </div>
       
       <div class="ui-overlay">
          <span>滚轮缩放 / 拖拽平移</span>
          <button class="ui-btn" @click.stop="resetView">重置视图</button>
       </div>
    </div>
    <!-- Modal -->
    <div v-if="selectedItem" class="modal-overlay" @click="selectedItem = null">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedItem.label || (selectedItem.type === 'BOOTH' ? '展位详情' : '柱子详情') }}</h3>
          <span class="close-icon" @click="selectedItem = null">×</span>
        </div>
        <div class="modal-body">
           <div class="info-row">
             <span class="info-label">{{ selectedItem.type === 'BOOTH' ? '开口配置' : '类型' }}</span>
             <span class="info-val">{{ selectedItem.type === 'BOOTH' ? selectedItem.boothType : '建筑柱' }}</span>
           </div>
           <div v-if="selectedItem.type === 'BOOTH' && selectedItem.standType" class="info-row">
             <span class="info-label">摊位类型</span>
             <span class="info-val">{{ selectedItem.standType }}</span>
           </div>
           <div class="info-row">
             <span class="info-label">尺寸 (W x H)</span>
             <span class="info-val">{{ Number(selectedItem.displayWidthM.toFixed(2)) }} x {{ Number(selectedItem.displayHeightM.toFixed(2)) }} m</span>
           </div>
           <template v-if="selectedItem.type === 'BOOTH'">
              <template v-if="selectedItem.hasPillar">
                <div class="info-row"><span class="info-label">总面积</span><span class="info-val">{{ selectedItem.grossAreaM2.toFixed(2) }} m²</span></div>
                <div class="info-row"><span class="info-label text-red">柱子占用</span><span class="info-val text-red">-{{ (selectedItem.grossAreaM2 - selectedItem.netAreaM2).toFixed(2) }} m²</span></div>
                <div class="info-row"><span class="info-label">净面积</span><span class="info-val">{{ selectedItem.netAreaM2.toFixed(2) }} m²</span></div>
              </template>
              <div v-else class="info-row"><span class="info-label">面积</span><span class="info-val">{{ selectedItem.grossAreaM2.toFixed(2) }} m²</span></div>
              <div v-if="selectedItem.notes" class="info-row" style="display:block; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;"><span class="info-label" style="display:block; margin-bottom: 4px;">备注</span><span class="info-val" style="font-weight: 400; color: #334155; white-space: pre-wrap;">{{ selectedItem.notes }}</span></div>
           </template>
           <div v-else class="info-row"><span class="info-label">占地面积</span><span class="info-val">{{ selectedItem.grossAreaM2.toFixed(2) }} m²</span></div>
        </div>
        <div class="modal-footer"><button class="btn" @click="selectedItem = null">关闭</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';

const originalWidth = ${originalWidth}; const originalHeight = ${originalHeight};
const bgImage = "${context.backgroundImage || ''}"; const bgStyle = ${JSON.stringify(bgStyle)}; const items = ${JSON.stringify(exportItems)};
const selectedItem = ref(null);
const wrapperRef = ref(null);

// View State
const view = ref({ x: 0, y: 0, scale: ${scale} });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

const scalerStyle = computed(() => ({
  width: originalWidth + 'px',
  height: originalHeight + 'px',
  transform: \`translate(\${view.value.x}px, \${view.value.y}px) scale(\${view.value.scale})\`,
  transformOrigin: '0 0',
}));

const bgImgStyle = computed(() => ({
    left: bgStyle.left + 'px',
    top: bgStyle.top + 'px',
    width: bgStyle.width + 'px',
    height: bgStyle.height + 'px'
}));

const getItemStyle = (item) => {
  const style = { left: item.x + 'px', top: item.y + 'px', width: item.w + 'px', height: item.h + 'px', transform: \`rotate(\${item.rotation || 0}deg)\`, zIndex: item.type === 'PILLAR' ? 50 : 10, backgroundColor: item.color || (item.type === 'BOOTH' ? '#ffffff' : '#94a3b8') };
  if (item.type === 'BOOTH' && !item.color) { style.backgroundImage = 'radial-gradient(#e2e8f0 1px, transparent 1px)'; style.backgroundSize = '10px 10px'; }
  if (item.type === 'PILLAR') { style.backgroundImage = 'linear-gradient(45deg, #64748b 25%, transparent 25%, transparent 50%, #64748b 50%, #64748b 75%, transparent 75%, transparent); style.backgroundSize = '8px 8px'; }
  return style;
};
const getWalls = (type) => {
  let walls = { top: true, bottom: true, left: true, right: true };
  if(type === '单开') walls.bottom = false;
  if(type === '双开 (转角)') { walls.bottom = false; walls.right = false; }
  if(type === '双开 (对通)') { walls.bottom = false; walls.top = false; }
  if(type === '三开') { walls.bottom = false; walls.left = false; walls.right = false; }
  if(type === '岛型 (全开)') { walls.top = false; walls.bottom = false; walls.left = false; walls.right = false; }
  return walls;
};
const showInfo = (item) => { selectedItem.value = item; };

const resetView = () => {
    if (!wrapperRef.value) return;
    const rect = wrapperRef.value.getBoundingClientRect();
    const padding = 40;
    const s = Math.min((rect.width - padding) / originalWidth, (rect.height - padding) / originalHeight, 1);
    view.value = {
        scale: s,
        x: (rect.width - originalWidth * s) / 2,
        y: (rect.height - originalHeight * s) / 2
    };
};

const handleWheel = (e) => {
    if (!wrapperRef.value) return;
    const rect = wrapperRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomIntensity = 0.1;
    const delta = -Math.sign(e.deltaY);
    const scaleChange = Math.exp(delta * zoomIntensity);
    const newScale = Math.min(Math.max(0.05, view.value.scale * scaleChange), 10);
    
    const worldX = (mouseX - view.value.x) / view.value.scale;
    const worldY = (mouseY - view.value.y) / view.value.scale;
    
    view.value = {
        scale: newScale,
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale
    };
};

const handleMouseDown = (e) => {
    isDragging.value = true;
    dragStart.value = { x: e.clientX - view.value.x, y: e.clientY - view.value.y };
};

const handleMouseMove = (e) => {
    if (!isDragging.value) return;
    e.preventDefault();
    view.value.x = e.clientX - dragStart.value.x;
    view.value.y = e.clientY - dragStart.value.y;
};

const handleMouseUp = () => {
    isDragging.value = false;
};

onMounted(() => {
    resetView();
});
</script>
<style scoped>
.expo-planner-export { font-family: 'Inter', system-ui, sans-serif; width: 100%; height: calc(100vh - 80px); background: #f1f5f9; display: flex; overflow: hidden; }
.layout-wrapper { flex: 1; position: relative; background: #e2e8f0; overflow: hidden; user-select: none; }
.layout-scaler { transform-origin: 0 0; position: absolute; top: 0; left: 0; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
.bg-img { position: absolute; z-index: 0; pointer-events: none; }
.bg-grid {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;
    background-size: 40px 40px;
    background-image: linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                      linear-gradient(to bottom, #cbd5e1 1px, transparent 1px);
    opacity: 0.3;
}
.item { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: box-shadow 0.2s; user-select: none; }
.booth:hover { z-index: 100 !important; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); border-color: #6366f1; }
.booth { background-color: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); z-index: 10; }
.pillar { background-color: #94a3b8; border: 1px solid #475569; color: white; z-index: 50; }
.pillar:hover { border-color: #1e293b; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.label-container { pointer-events: none; text-align: center; line-height: 1.2; padding: 4px; color: #334155; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
.label-main { font-weight: bold; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
.label-sub { color: #94a3b8; font-family: monospace; margin-bottom: 1px; }
.label-area { color: #64748b; font-family: monospace; margin-bottom: 4px; }
.label-alert { margin-top: 0; display: inline-flex; align-items: center; justify-content: center; color: #b91c1c; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 6px; border: 1px solid #fecaca; white-space: nowrap; line-height: 1; }
.pillar .label-main { color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.wall { position: absolute; background: #0f172a; }
.wall-top { top: -3px; left: -3px; right: -3px; height: 6px; }
.wall-bottom { bottom: -3px; left: -3px; right: -3px; height: 6px; }
.wall-left { top: 0; bottom: 0; left: -3px; width: 6px; }
.wall-right { top: 0; bottom: 0; right: -3px; width: 6px; }

.ui-overlay { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 8px 16px; border-radius: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; gap: 12px; align-items: center; font-size: 14px; color: #475569; z-index: 1000; }
.ui-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 600; color: #475569; transition: all 0.2s; }
.ui-btn:hover { background: #e2e8f0; color: #0f172a; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal { background: white; width: 320px; border-radius: 12px; padding: 0; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); overflow: hidden; }
.modal-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 18px; color: #0f172a; }
.close-icon { cursor: pointer; font-size: 20px; color: #94a3b8; }
.close-icon:hover { color: #475569; }
.modal-body { padding: 20px; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
.info-row:last-child { margin-bottom: 0; }
.info-label { color: #64748b; }
.info-val { font-weight: 600; color: #0f172a; }
.text-red { color: #dc2626; }
.modal-footer { padding: 16px 20px; border-top: 1px solid #e2e8f0; text-align: right; }
.btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn:hover { background: #1d4ed8; }
</style>
`;
  triggerDownload(vueContent, 'ExpoMap.vue', 'text/plain');
};

export const exportJS = (context: ExportContext) => {
  const data = {
    bgImage: context.backgroundImage,
    bgImageDimensions: context.bgImageDimensions,
    bgImagePosition: context.bgImagePosition,
    items: context.items,
    scaleRatio: context.scaleRatio
  };

  const jsContent = `
/**
 * ExpoPlanner Data Export
 * Generated at: ${new Date().toLocaleString()}
 */
export const expoData = ${JSON.stringify(data, null, 2)};
`;

  triggerDownload(jsContent, 'expo-data.js', 'text/javascript');
};