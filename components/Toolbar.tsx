import React, { useRef } from 'react';
import { PlannerItem, ItemType } from '../types';
import { PropertiesPanel } from './PropertiesPanel';
import { Plus, LayoutGrid, Image as ImageIcon, Trash2, Upload, Download, FileCode, FileJson, FileText, FolderOpen, FileImage, Settings, Move, Maximize, Lock, Unlock } from 'lucide-react';

interface ToolbarProps {
  scaleRatio: number;
  setScaleRatio: (val: number) => void;
  backgroundImage: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearBackground: () => void;
  bgImageDimensions: { w: number; h: number } | null;
  setBgImageDimensions: (val: { w: number; h: number }) => void;
  bgImagePosition: { x: number; y: number };
  setBgImagePosition: (val: { x: number; y: number }) => void;
  addItem: (type: ItemType) => void;
  onImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onExportHTML: () => void;
  onExportVue: () => void;
  onExportSVG: () => void;
  onExportJS: () => void;
  selectedItems: PlannerItem[];
  onUpdateItem: (updates: Partial<PlannerItem>) => void;
  onDeleteItem: () => void;
  isEditingBackground: boolean;
  setIsEditingBackground: (val: boolean) => void;
  onSplitItem?: (id: string, parts: number, direction: 'horizontal' | 'vertical') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  scaleRatio,
  setScaleRatio,
  backgroundImage,
  onImageUpload,
  clearBackground,
  bgImageDimensions,
  setBgImageDimensions,
  bgImagePosition,
  setBgImagePosition,
  addItem,
  onImportProject,
  onExportPNG,
  onExportHTML,
  onExportVue,
  onExportSVG,
  onExportJS,
  selectedItems,
  onUpdateItem,
  onDeleteItem,
  isEditingBackground,
  setIsEditingBackground,
  onSplitItem
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Calculate visual ruler metrics
  // 1px = scaleRatio (cm)
  // 100cm (1m) = 100 / scaleRatio (px)
  const pxPerMeter = 100 / scaleRatio;
  let rulerWidth = pxPerMeter;
  let rulerLabel = "1 m";

  // Adjust display if too big or too small
  if (pxPerMeter > 160) {
      rulerWidth = pxPerMeter / 10;
      rulerLabel = "10 cm";
  } else if (pxPerMeter < 20) {
      rulerWidth = pxPerMeter * 10;
      rulerLabel = "10 m";
  }
  
  // Cap at 200px visual width for sidebar safety
  const displayRulerWidth = Math.min(rulerWidth, 200);

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0 overflow-y-auto">
      <div className="p-5 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutGrid className="text-blue-600" />
          展位规划大师
        </h1>
        <p className="text-xs text-slate-400 mt-1">设计您的展位平面图</p>
      </div>

      {/* Scale Settings */}
      <div className="p-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings size={12} />
          全局配置
        </p>
        <div>
          <label className="block text-xs text-slate-500 mb-1">比例设置</label>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-sm font-mono text-slate-600">1 px =</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={scaleRatio}
              onChange={(e) => setScaleRatio(Math.max(0.1, Number(e.target.value)))}
              className="w-16 p-1 text-center border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
            <span className="text-sm font-mono text-slate-600">cm</span>
          </div>
          
          {/* Visual Scale Ruler */}
          <div className="mt-3 pl-1">
             <div className="flex items-end gap-2 mb-1">
               <div className="relative">
                  <div 
                    className="h-2 border-x border-b border-slate-400 relative"
                    style={{ width: displayRulerWidth }}
                  ></div>
                  {/* Center tick if wide enough */}
                  {displayRulerWidth > 50 && (
                      <div className="absolute top-0 left-1/2 h-1 w-px bg-slate-300 transform -translate-x-1/2"></div>
                  )}
               </div>
               <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{rulerLabel}</span>
             </div>
             <p className="text-[10px] text-slate-400">
               当前: 1m ≈ {Math.round(pxPerMeter)}px
             </p>
          </div>
        </div>
      </div>

      {/* Map Settings */}
      <div className="p-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">地图设置</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImageUpload}
          className="hidden"
          accept="image/*"
        />
        {!backgroundImage ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 hover:bg-slate-50 hover:border-blue-300 transition-all text-slate-500 hover:text-blue-600 group"
          >
            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <ImageIcon size={18} />
            </div>
            <span className="text-sm">上传背景图</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative w-full h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group">
              <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-75" />
              <button
                onClick={() => {
                   clearBackground();
                   if(fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title="清除背景"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between">
               <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
               >
                  <Upload size={12} />
                  更换图片
               </button>
            </div>

            {/* Background Image Adjustments */}
            {bgImageDimensions && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                 
                 <button 
                    onClick={() => setIsEditingBackground(!isEditingBackground)}
                    className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium transition-colors border ${isEditingBackground ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-inner' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}
                 >
                    {isEditingBackground ? <Unlock size={12}/> : <Lock size={12}/>}
                    {isEditingBackground ? '完成调整' : '调整位置/大小'}
                 </button>
                 {isEditingBackground && <p className="text-[10px] text-blue-600 text-center leading-tight">在画布上拖拽以移动，滚轮缩放背景。</p>}

                 <div className="grid grid-cols-2 gap-2 opacity-75 hover:opacity-100 transition-opacity">
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                          <Move size={10} /> X 坐标
                       </label>
                       <input
                          type="number"
                          value={Math.round(bgImagePosition.x)}
                          onChange={(e) => setBgImagePosition({ ...bgImagePosition, x: Number(e.target.value) })}
                          className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                          <Move size={10} className="rotate-90" /> Y 坐标
                       </label>
                       <input
                          type="number"
                          value={Math.round(bgImagePosition.y)}
                          onChange={(e) => setBgImagePosition({ ...bgImagePosition, y: Number(e.target.value) })}
                          className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                          <Maximize size={10} /> 宽度
                       </label>
                       <input
                          type="number"
                          value={Math.round(bgImageDimensions.w)}
                          onChange={(e) => setBgImageDimensions({ ...bgImageDimensions, w: Math.max(1, Number(e.target.value)) })}
                          className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                          <Maximize size={10} className="rotate-90" /> 高度
                       </label>
                       <input
                          type="number"
                          value={Math.round(bgImageDimensions.h)}
                          onChange={(e) => setBgImageDimensions({ ...bgImageDimensions, h: Math.max(1, Number(e.target.value)) })}
                          className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                       />
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">添加对象</p>
        <button
          onClick={() => addItem(ItemType.BOOTH)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all group text-left"
        >
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Plus size={18} />
          </div>
          <span className="text-sm font-medium">添加展位</span>
        </button>

        <button
          onClick={() => addItem(ItemType.PILLAR)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all group text-left"
        >
          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
            <Plus size={18} />
          </div>
          <span className="text-sm font-medium">添加柱子</span>
        </button>
      </div>

      <div className="mt-auto">
        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 space-y-2">
          <input
            type="file"
            ref={importInputRef}
            onChange={(e) => {
                onImportProject(e);
                if(importInputRef.current) importInputRef.current.value = '';
            }}
            className="hidden"
            accept=".js,.json,.txt"
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs mb-2"
            title="导入 JS/JSON 项目文件"
          >
            <FolderOpen size={14} />
            导入项目数据
          </button>

          <button
            onClick={onExportPNG}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs mb-2"
            title="保存为图片"
          >
            <Download size={14} />
            保存为图片
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExportHTML}
              className="flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs"
              title="保存为交互式网页 (HTML)"
            >
              <FileCode size={14} />
              导出 HTML
            </button>
            <button
              onClick={onExportVue}
              className="flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs"
              title="保存为 Vue 组件"
            >
              <FileJson size={14} />
              导出 Vue
            </button>
            <button
              onClick={onExportSVG}
              className="flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs"
              title="保存为 SVG 矢量图"
            >
              <FileImage size={14} />
              导出 SVG
            </button>
            <button
              onClick={onExportJS}
              className="flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-2 rounded-lg font-medium transition-colors shadow-sm text-xs"
              title="导出数据 (JS)"
            >
              <FileText size={14} />
              导出数据 (JS)
            </button>
          </div>
        </div>

        <PropertiesPanel
          selectedItems={selectedItems}
          onUpdate={onUpdateItem}
          onDelete={onDeleteItem}
          scaleRatio={scaleRatio}
          onSplit={onSplitItem}
        />
      </div>
    </div>
  );
};