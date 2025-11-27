import React, { useState, useEffect, useRef } from 'react';
import { PlannerItem, ItemType } from '../types';
import { PropertiesPanel } from './PropertiesPanel';
import { 
  LayoutGrid, 
  Settings, 
  FolderOpen, 
  Plus, 
  Image as ImageIcon, 
  Trash2, 
  Upload, 
  Download, 
  FileCode, 
  FileJson, 
  FileText, 
  FileImage, 
  Move, 
  Maximize, 
  Lock, 
  Unlock,
  PenTool,
  Grid
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'design' | 'canvas' | 'file'>('design');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Generate a fingerprint for selection to avoid unnecessary tab switches on re-renders
  // This ensures we only switch tabs when the selection *actually* changes (IDs change),
  // not just when the component re-renders due to other state changes (like scaleRatio).
  const selectionFingerprint = selectedItems.map(i => i.id).join(',');

  // Auto-switch to Design tab when selecting items
  useEffect(() => {
    if (selectedItems.length > 0) {
      setActiveTab('design');
    }
  }, [selectionFingerprint]);

  // Calculate visual ruler metrics
  const pxPerMeter = 100 / scaleRatio;
  let rulerWidth = pxPerMeter;
  let rulerLabel = "1 m";
  if (pxPerMeter > 160) { rulerWidth = pxPerMeter / 10; rulerLabel = "10 cm"; }
  else if (pxPerMeter < 20) { rulerWidth = pxPerMeter * 10; rulerLabel = "10 m"; }
  const displayRulerWidth = Math.min(rulerWidth, 240);

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 shrink-0 h-full font-sans">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
             <LayoutGrid className="text-white" size={20} />
        </div>
        <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">展位规划大师</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">ExpoPlanner AI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        <button 
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-all border-b-2 ${activeTab === 'design' ? 'text-blue-600 bg-white border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <PenTool size={16} />
          设计
        </button>
        <button 
          onClick={() => setActiveTab('canvas')}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-all border-b-2 ${activeTab === 'canvas' ? 'text-blue-600 bg-white border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <Grid size={16} />
          环境
        </button>
        <button 
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-all border-b-2 ${activeTab === 'file' ? 'text-blue-600 bg-white border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <FolderOpen size={16} />
          文件
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30 scrollbar-thin">
        
        {/* === DESIGN TAB === */}
        {activeTab === 'design' && (
          <div className="p-4 space-y-5">
            {/* Toolbox Section */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">组件库</h3>
               <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => addItem(ItemType.BOOTH)}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md hover:text-blue-600 transition-all group"
                 >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600">添加展位</span>
                 </button>
                 <button
                    onClick={() => addItem(ItemType.PILLAR)}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-md hover:text-slate-700 transition-all group"
                 >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-700">添加柱子</span>
                 </button>
               </div>
            </div>
            
            <div className="w-full h-px bg-slate-200 my-1"></div>

            {/* Properties Panel */}
             <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">属性面板</h3>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[200px]">
                    <PropertiesPanel
                        selectedItems={selectedItems}
                        onUpdate={onUpdateItem}
                        onDelete={onDeleteItem}
                        scaleRatio={scaleRatio}
                        onSplit={onSplitItem}
                    />
                </div>
             </div>
          </div>
        )}

        {/* === CANVAS TAB === */}
        {activeTab === 'canvas' && (
          <div className="p-4 space-y-6">
             {/* Scale Settings */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                    <Settings size={16} className="text-slate-400" /> 全局比例
                 </div>
                 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500">1 像素 (px) 等于</span>
                    <div className="flex items-center gap-2">
                        <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={scaleRatio}
                        onChange={(e) => setScaleRatio(Math.max(0.1, Number(e.target.value)))}
                        className="w-16 p-1 text-center border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-600">cm</span>
                    </div>
                 </div>
                 {/* Visual Ruler */}
                 <div className="pt-2 border-t border-slate-100">
                    <div className="flex flex-col items-center">
                        <div className="flex items-end gap-2 w-full justify-center">
                            <div className="relative h-3 border-x border-b border-slate-400" style={{ width: displayRulerWidth }}></div>
                            <span className="text-[10px] font-mono text-slate-500 translate-y-0.5">{rulerLabel}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">当前缩放: 1m ≈ {Math.round(pxPerMeter)}px</p>
                    </div>
                 </div>
             </div>

             {/* Background Map */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                    <ImageIcon size={16} className="text-slate-400" /> 底图设置
                 </div>
                 
                 <input type="file" ref={fileInputRef} onChange={onImageUpload} className="hidden" accept="image/*" />
                 
                 {!backgroundImage ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-8 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                    >
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                            <Upload size={20} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">点击上传平面图</span>
                    </button>
                 ) : (
                    <div className="space-y-4">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
                            <img src={backgroundImage} alt="BG" className="w-full h-32 object-cover opacity-80" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white rounded-full text-blue-600 shadow-sm hover:scale-110 transition-transform"
                                    title="更换"
                                >
                                    <Upload size={14} />
                                </button>
                                <button
                                    onClick={() => { clearBackground(); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="p-2 bg-white rounded-full text-red-500 shadow-sm hover:scale-110 transition-transform"
                                    title="删除"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Edit Controls */}
                        {bgImageDimensions && (
                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <button 
                                    onClick={() => setIsEditingBackground(!isEditingBackground)}
                                    className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all shadow-sm ${isEditingBackground ? 'bg-blue-500 text-white shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {isEditingBackground ? <Unlock size={14}/> : <Lock size={14}/>}
                                    {isEditingBackground ? '完成调整' : '调整位置与大小'}
                                </button>
                                
                                <div className={`grid grid-cols-2 gap-2 transition-opacity ${isEditingBackground ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">X 坐标</label>
                                        <input type="number" value={Math.round(bgImagePosition.x)} onChange={(e) => setBgImagePosition({ ...bgImagePosition, x: Number(e.target.value) })} className="w-full p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">Y 坐标</label>
                                        <input type="number" value={Math.round(bgImagePosition.y)} onChange={(e) => setBgImagePosition({ ...bgImagePosition, y: Number(e.target.value) })} className="w-full p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">宽度</label>
                                        <input type="number" value={Math.round(bgImageDimensions.w)} onChange={(e) => setBgImageDimensions({ ...bgImageDimensions, w: Number(e.target.value) })} className="w-full p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">高度</label>
                                        <input type="number" value={Math.round(bgImageDimensions.h)} onChange={(e) => setBgImageDimensions({ ...bgImageDimensions, h: Number(e.target.value) })} className="w-full p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 )}
             </div>
          </div>
        )}

        {/* === FILE TAB === */}
        {activeTab === 'file' && (
          <div className="p-4 space-y-6">
             <input type="file" ref={importInputRef} onChange={(e) => { onImportProject(e); if(importInputRef.current) importInputRef.current.value = ''; }} className="hidden" accept=".js,.json" />
             
             {/* Import Section */}
             <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">导入</h3>
                <button
                    onClick={() => importInputRef.current?.click()}
                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-500 rounded-lg group-hover:bg-orange-100 transition-colors">
                            <FolderOpen size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-700">打开项目</p>
                            <p className="text-[10px] text-slate-400">支持 .js, .json 格式</p>
                        </div>
                    </div>
                </button>
             </div>

             <div className="w-full h-px bg-slate-200"></div>

             {/* Export Section */}
             <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">导出与保存</h3>
                
                <button onClick={onExportPNG} className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-left group">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <FileImage size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-700">导出图片 (PNG)</p>
                        <p className="text-[10px] text-slate-400">高分辨率截图</p>
                    </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                     <button onClick={onExportHTML} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all gap-2">
                        <FileCode size={20} className="text-indigo-500"/>
                        <span className="text-xs font-medium text-slate-600">HTML 网页</span>
                     </button>
                     <button onClick={onExportVue} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all gap-2">
                        <FileJson size={20} className="text-emerald-500"/>
                        <span className="text-xs font-medium text-slate-600">Vue 组件</span>
                     </button>
                     <button onClick={onExportSVG} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all gap-2">
                         <div className="relative">
                            <FileImage size={20} className="text-pink-500"/>
                            <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-pink-100 text-pink-700 px-0.5 rounded">SVG</span>
                         </div>
                        <span className="text-xs font-medium text-slate-600">SVG 矢量</span>
                     </button>
                     <button onClick={onExportJS} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all gap-2">
                        <FileText size={20} className="text-slate-500"/>
                        <span className="text-xs font-medium text-slate-600">JS 数据</span>
                     </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 text-center bg-slate-50 text-[10px] text-slate-400 shrink-0">
         v1.2.0 • Auto-save enabled
      </div>
    </div>
  );
};