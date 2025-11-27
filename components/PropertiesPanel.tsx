import React, { useState } from 'react';
import { PlannerItem, ItemType, BoothType, StandType } from '../types';
import { Trash2, Box, Columns, RotateCw, Palette, Type, FileText, Layers, Scissors, Rows, Lock, Unlock, MousePointerClick } from 'lucide-react';

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
      <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 space-y-3 min-h-[200px]">
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
  
  // Calculate area in m2: (w * ratio * h * ratio) / 10000
  const areaM2 = ((selectedItem.w * scaleRatio) * (selectedItem.h * scaleRatio) / 10000).toFixed(2);

  return (
    <div className="p-4 space-y-5 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
      
      {isLocked && (
         <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded text-[10px] flex items-center gap-2">
             <Lock size={10} />
             <span>该项目已锁定，无法移动或调整大小。</span>
         </div>
      )}

      <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500">宽度 (px)</label>
            <input
              type="number"
              value={Math.round(selectedItem.w)}
              onChange={(e) => onUpdate({ w: Number(e.target.value) })}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500">高度 (px)</label>
            <input
              type="number"
              value={Math.round(selectedItem.h)}
              onChange={(e) => onUpdate({ h: Number(e.target.value) })}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={isLocked}
            />
          </div>
        </div>
        
         <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500">X 坐标</label>
            <input
              type="number"
              value={Math.round(selectedItem.x)}
              onChange={(e) => onUpdate({ x: Number(e.target.value) })}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500">Y 坐标</label>
            <input
              type="number"
              value={Math.round(selectedItem.y)}
              onChange={(e) => onUpdate({ y: Number(e.target.value) })}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={isLocked}
            />
          </div>
        </div>
        
        {/* Calculated Area Display */}
        {isBooth && (
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <label className="text-xs font-medium text-blue-500">预估面积</label>
                <span className="text-sm font-bold text-blue-700 font-mono">{areaM2} m²</span>
            </div>
        )}

        {/* Rotation */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-slate-500">旋转角度</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={selectedItem.rotation || 0}
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
              className="flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={isLocked}
            />
            <button 
               onClick={() => onUpdate({ rotation: ((selectedItem.rotation || 0) + 90) % 360 })}
               className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
               title="顺时针旋转 90°"
               disabled={isLocked}
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Booth Split Functionality */}
        {isBooth && onSplit && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block text-[10px] font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Scissors size={10}/> 展位拆分
            </label>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500">份数:</span>
              <select 
                value={splitParts}
                onChange={(e) => setSplitParts(Number(e.target.value))}
                className="p-1 border rounded text-xs flex-1 bg-white"
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
        )}
      </div>
      
      {/* Visual Properties */}
      
      {isBooth && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">展位标签</label>
              <input
                type="text"
                value={selectedItem.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="例如 A-101"
                className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Text Style Controls */}
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
                     className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
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
                        className="h-8 w-full p-0 border border-slate-200 rounded cursor-pointer"
                      />
                   </div>
                </div>
             </div>

            {/* Booth Configuration */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">开口配置</label>
              <select
                value={selectedItem.boothType}
                onChange={(e) => onUpdate({ boothType: e.target.value as BoothType })}
                className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                {Object.values(BoothType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Stand Type Configuration */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">展位类型 (性质)</label>
              <select
                value={selectedItem.standType || StandType.STANDARD}
                onChange={(e) => onUpdate({ standType: e.target.value as StandType })}
                className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                {Object.values(StandType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Picker */}
            <div className="space-y-1">
               <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                 <Palette size={10}/> 背景颜色
               </label>
               <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedItem.color || '#dbeafe'}
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

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <FileText size={10}/> 备注
              </label>
              <textarea
                value={selectedItem.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="备注信息..."
                className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[50px]"
              />
            </div>
          </div>
      )}
    </div>
  );
};