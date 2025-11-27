import { BoothType, StandType } from "./types";

export const GRID_SIZE = 5; // px per unit (Snapping grid)
export const SCALE_RATIO = 1; // 1px = 1cm (roughly for internal logic)
export const CM_PER_PX = 1; // Conversion factor: 1 px = 1 cm

export const DEFAULT_BOOTH = {
  w: 200,
  h: 200,
  type: BoothType.SINGLE_OPEN,
  standType: StandType.STANDARD
};

export const DEFAULT_PILLAR = {
  w: 40,
  h: 40
};

export const COLORS = {
  booth: 'bg-blue-100',
  boothBorder: 'border-blue-500',
  boothSelected: 'ring-2 ring-blue-600',
  pillar: 'bg-slate-500',
  pillarSelected: 'ring-2 ring-slate-800',
};