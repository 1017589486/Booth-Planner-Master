export enum ItemType {
  BOOTH = 'BOOTH',
  PILLAR = 'PILLAR'
}

export enum BoothType {
  SINGLE_OPEN = '单开', // 1 side
  DOUBLE_CORNER = '双开 (转角)', // 2 sides
  DOUBLE_PARALLEL = '双开 (对通)', // 2 sides
  THREE_OPEN = '三开', // 3 sides
  ISLAND = '岛型 (全开)' // 4 sides
}

export enum StandType {
  RAW = '光地',
  STANDARD = '标摊',
  SPECIAL = '特装'
}

export interface Dimensions {
  w: number;
  h: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlannerItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color?: string; // Custom background color
  // Booth specific props
  boothType?: BoothType;
  standType?: StandType; // New property: Construction type
  label?: string;
  fontSize?: number;
  fontColor?: string;
  notes?: string; // Remarks/Notes
}

export interface Selection {
  id: string | null;
}

export interface AnalysisResult {
  totalArea: number;
  usableArea: number;
  pillarIntrusion: number;
  suggestion: string;
}