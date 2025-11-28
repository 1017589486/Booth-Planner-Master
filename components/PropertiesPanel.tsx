
import React, { useState } from 'react';
import { PlannerItem, ItemType, BoothType, StandType } from '../types';
import { Trash2, Box, Columns, RotateCw, Palette, Type, FileText, Layers, Scissors, Rows, Lock, Unlock, MousePointerClick, Calculator, MousePointer, LayoutTemplate, PaintBucket, Tag } from 'lucide-react';

interface PropertiesPanelProps {
  selectedItems: PlannerItem[];
  onUpdate: (updates: Partial<PlannerItem>) => void;
  onDelete: () => void;
  scaleRatio: number;
  onSplit?: (id: string, parts: number, direction: 'horizontal' | 'vertical') => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedItems, 
  onUpdate, 
  onDelete, 
  scaleRatio,
  onSplit
}) => {
  const [splitParts, setSplitParts] = useState(2);

  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-300 p-8 space-y-3 min-h-[200px]">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
            <MousePointerClick size={24} className="opacity-50" />
        </div>
        <div className="text-center">
            <p className="text-sm font-medium text-slate-400">未选择任何项目</p>
            <p className="text-xs mt-1 opacity-75">在画布上点击选择，或按住 Shift 多选</p>
        </div>
      </div>
    );
  }

  // Common: Check if all selected items are locked
  const allLocked = selectedItems.every(i => i.locked);
  const anyLocked = selectedItems.some(i => i.locked);

  const toggleLock = () => {
      // If all are locked, unlock all. Otherwise lock all.
      onUpdate({ locked: !allLocked });
  };

  // Multiple items selected
  if (selectedItems.length > 1) {
      const boothCount = selectedItems.filter(i => i.type === ItemType.BOOTH).length;
      const pillarCount = selectedItems.filter(i => i.type === ItemType.PILLAR).length;

      return (
        <div className="p-4 space-y-6 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-blue-500" />
              已选 {selectedItems.length} 项
            </h3>
            
            <div className="flex items-center gap-1">
                 <button
                    onClick={toggleLock}
                    className={`p-1.5 rounded-md transition-colors ${allLocked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={allLocked ? "解锁全部" : "锁定全部"}
                 >
                    {allLocked ? <Lock size={16} /> : <Unlock size={16} />}
                 </button>
                 <button
                    onClick={onDelete}
                    disabled={allLocked}
                    className={`p-1.5 rounded-md transition-colors ${allLocked ? 'text-slate-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                    title={allLocked ? "选中的项目已全部锁定，无法删除" : "删除选中项目"}
                 >
                    <Trash2 size={16} />
                 </button>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <p>包含 {boothCount} 个展位，{pillarCount} 个柱子。</p>
             {anyLocked && (
                 <p className="text-amber-600 flex items-center gap-1 font-medium">
                     <Lock size={10} /> 部分或全部项目已锁定
                 </p>
             )}
          </div>

          <div className={`space-y-4 ${allLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
             {/* Bulk Color */}
             <div>
               <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                 <Palette size={12}/> 统一背景颜色
               </label>
               <div className="flex items-center gap-2">
                  <input
                    type="color"
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    className="h-8 w-full p-0 border border-slate-200 rounded cursor-pointer"
                  />
                  <button 
                    onClick={() => onUpdate({ color: undefined })}
                    className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 hover:bg-slate-200"
                  >
                    重置
                  </button>
               </div>
             </div>
             
             {/* Bulk Font Color */}
             <div>
               <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                 <Palette size={12}/> 统一文字颜色
               </label>
               <div className="flex items-center gap-2">
                  <input
                    type="color"
                    onChange={(e) => onUpdate({ fontColor: e.target.value })}
                    className="h-8 w-full p-0 border border-slate-200 rounded cursor-pointer"
                  />
               </div>
             </div>
          </div>
        </div>
      );
  }

  // Single Item Selected
  const selectedItem = selectedItems[0];
  const isBooth = selectedItem.type === ItemType.BOOTH;
  const isLocked = !!selectedItem.locked;
  const isPolygon = !!(selectedItem.points && selectedItem.points.length > 0);
  
  // Calculate area in m2: (w * ratio * h * ratio) / 10000
  const calculatedAreaM2 = ((selectedItem.w * scaleRatio) * (selectedItem.h * scaleRatio) / 10000);

  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 pb-3 shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {isBooth ? <Box size={16} className="text-blue-500"/> : <Columns size={16} className="text-slate-500"/>}
          {isBooth ? '编辑展位' : '编辑柱子'}
        </h3>
        <div className="flex items-center gap-1">
            <button
                onClick={() => onUpdate({ locked: !isLocked })}
                className={`p-1.5 rounded-md transition-colors ${isLocked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}
                title={isLocked ? "解锁" : "锁定位置和大小"}
            >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <button
                onClick={onDelete}
                disabled={isLocked}
                className={`p-1.5 rounded-md transition-colors ${isLocked ? 'text-slate-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                title={isLocked ? "无法删除 (已锁定)" : "删除"}
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
      
      {/* Content */}
      <div className={`p-4 space-y-6 ${isLocked ? 'opacity-70' : ''}`}>
          
          {isLocked && (
             <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded text-[10px] flex items-center gap-2">
                 <Lock size={10} />
                 <span>该项目已锁定，无法移动或调整。</span>
             </div>
          )}

          {/* Group 1: Geometry & Position */}
          <div className="space-y-3 pointer-events-auto">
             <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <LayoutTemplate size={12} /> 基础布局
             </div>
             
             {/* Dimensions */}
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[10px] font-medium text-slate-500">宽度 (px)</label>
                 <input
                   type="number"
                   value={Math.round(selectedItem.w)}
                   onChange={(e) => onUpdate({ w: Number(e.target.value) })}
                   className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                   disabled={isLocked}
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-medium text-slate-500">高度 (px)</label>
                 <input
                   type="number"
                   value={Math.round(selectedItem.h)}
                   onChange={(e) => onUpdate({ h: Number(e.target.value) })}
                   className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                   disabled={isLocked}
                 />
               </div>
             </div>
             
             {/* Position */}
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[10px] font-medium text-slate-500">X 坐标</label>
                 <input
                   type="number"
                   value={Math.round(selectedItem.x)}
                   onChange={(e) => onUpdate({ x: Number(e.target.value) })}
                   className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                   disabled={isLocked}
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-medium text-slate-500">Y 坐标</label>
                 <input
                   type="number"
                   value={Math.round(selectedItem.y)}
                   onChange={(e) => onUpdate({ y: Number(e.target.value) })}
                   className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                   disabled={isLocked}
                 />
               </div>
             </div>

             {/* Rotation */}
             <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">旋转角度</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={selectedItem.rotation || 0}
                  onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
                  className="flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                  disabled={isLocked}
                />
                <button 
                   onClick={() => onUpdate({ rotation: ((selectedItem.rotation || 0) + 90) % 360 })}
                   className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors disabled:opacity-50"
                   title="顺时针旋转 90°"
                   disabled={isLocked}
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>

            {/* Area Display and Manual Override */}
            {isBooth && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                   <div className="flex items-center justify-between mb-2">
                     <label className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                        <Calculator size={10} /> 面积计算
                     </label>
                     <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={!!selectedItem.useManualArea} 
                          onChange={(e) => onUpdate({ useManualArea: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          disabled={isLocked}
                        />
                        <span>手动输入</span>
                     </label>
                   </div>
                   
                   {selectedItem.useManualArea ? (
                       <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                value={selectedItem.manualArea || ''}
                                onChange={(e) => onUpdate({ manualArea: parseFloat(e.target.value) })}
                                placeholder="输入面积..."
                                className="flex-1 p-1.5 border border-blue-300 rounded text-sm text-blue-700 font-bold font-mono focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                                disabled={isLocked}
                            />
                            <span className="text-xs font-bold text-slate-500">m²</span>
                       </div>
                   ) : (
                       <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-slate-500">自动计算:</span>
                            <span className="text-sm font-bold text-slate-700 font-mono">{calculatedAreaM2.toFixed(2)} m²</span>
                       </div>
                   )}
                   
                   {selectedItem.useManualArea && (
                     <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        * 手动模式下，面积值固定，不随形状改变。
                     </p>
                   )}
                </div>
            )}
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Group 2: Booth Properties */}
          {isBooth && (
             <div className="space-y-3 pointer-events-auto">
                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Tag size={12} /> 展位属性
                 </div>

                 {/* Stand Type */}
                 <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-500">展位类型 (性质)</label>
                  <select
                    value={selectedItem.standType || StandType.STANDARD}
                    onChange={(e) => onUpdate({ standType: e.target.value as StandType })}
                    className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-50"
                    disabled={isLocked}
                  >
                    {Object.values(StandType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Booth Opening Config */}
                {isPolygon ? (
                   <div className="space-y-1">
                       <label className="text-[10px] font-medium text-slate-500">开口配置 (异形)</label>
                       <div className="p-2 bg-blue-50 border border-blue-100 rounded text-blue-800 text-[10px]">
                          <p className="flex items-center gap-1 font-bold mb-1">
                              <MousePointer size={10} /> 交互式设置
                          </p>
                          <p>按住 <span className="font-bold bg-white px-1 rounded border border-blue-200 text-slate-700">Alt</span> 键并在画布上点击展位边线，即可切换墙体/开口。</p>
                       </div>
                   </div>
                ) : (
                    <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">开口配置</label>
                    <select
                        value={selectedItem.boothType}
                        onChange={(e) => onUpdate({ boothType: e.target.value as BoothType })}
                        className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-50"
                        disabled={isLocked}
                    >
                        {Object.values(BoothType).map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                        ))}
                    </select>
                    </div>
                )}
                
                {/* Split Functionality - Only for Rectangles */}
                {!isPolygon && onSplit && (
                    <div className="pt-2">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-medium text-slate-600 mb-2 flex items-center gap-1">
                            <Scissors size={10}/> 展位拆分
                        </label>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs text-slate-500">份数:</span>
                            <select 
                            value={splitParts}
                            onChange={(e) => setSplitParts(Number(e.target.value))}
                            className="p-1 border rounded text-xs flex-1 bg-white disabled:bg-slate-100"
                            disabled={isLocked}
                            >
                            <option value={2}>2 份</option>
                            <option value={4}>4 份</option>
                            <option value={6}>6 份</option>
                            <option value={8}>8 份</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                            onClick={() => onSplit(selectedItem.id, splitParts, 'horizontal')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-300 rounded text-[10px] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-50"
                            title="沿水平方向拆分 (左右)"
                            disabled={isLocked}
                            >
                            <Columns size={12} /> 左右
                            </button>
                            <button
                            onClick={() => onSplit(selectedItem.id, splitParts, 'vertical')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-300 rounded text-[10px] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-50"
                            title="沿垂直方向拆分 (上下)"
                            disabled={isLocked}
                            >
                            <Rows size={12} /> 上下
                            </button>
                        </div>
                        </div>
                    </div>
                )}
             </div>
          )}
          
          <div className="w-full h-px bg-slate-100"></div>
          
          {/* Group 3: Visuals */}
          {isBooth && (
             <div className="space-y-3 pointer-events-auto">
                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <PaintBucket size={12} /> 外观样式
                 </div>

                 {/* Label */}
                 <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-500">展位标签</label>
                  <input
                    type="text"
                    value={selectedItem.label || ''}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    placeholder="例如 A-101"
                    className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                    disabled={isLocked}
                  />
                </div>

                {/* Text Style */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <Type size={10}/> 文字大小 (px)
                       </label>
                       <input
                         type="number"
                         min="8"
                         max="500"
                         value={selectedItem.fontSize ?? ''}
                         placeholder="自动"
                         onChange={(e) => {
                             const val = e.target.value;
                             onUpdate({ fontSize: val ? Number(val) : undefined });
                         }}
                         className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                         disabled={isLocked}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                         <Palette size={10}/> 文字颜色
                       </label>
                       <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedItem.fontColor || '#334155'}
                            onChange={(e) => onUpdate({ fontColor: e.target.value })}
                            className="h-8 w-full p-0 border border-slate-200 rounded cursor-pointer disabled:opacity-50"
                            disabled={isLocked}
                          />
                       </div>
                    </div>
                 </div>
                 
                 {/* Background Color */}
                 <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <Palette size={10}/> 背景颜色
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={selectedItem.color || '#dbeafe'}
                            onChange={(e) => onUpdate({ color: e.target.value })}
                            className="h-8 w-full p-0 border border-slate-200 rounded cursor-pointer disabled:opacity-50"
                            disabled={isLocked}
                        />
                        <button 
                            onClick={() => onUpdate({ color: undefined })}
                            className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                            disabled={isLocked}
                        >
                            重置
                        </button>
                    </div>
                </div>
             </div>
          )}
          
          <div className="w-full h-px bg-slate-100"></div>

          {/* Group 4: Notes */}
          <div className="space-y-1 pointer-events-auto">
              <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <FileText size={10}/> 备注
              </label>
              <textarea
                value={selectedItem.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="备注信息..."
                className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[60px] disabled:bg-slate-50"
                disabled={isLocked}
              />
          </div>
      </div>
    </div>
  );
};
