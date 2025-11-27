import { PlannerItem, ItemType } from "../types";

/**
 * Calculates the Axis-Aligned Bounding Box (AABB) for a potentially rotated item.
 * This allows for more accurate intersection checks, especially for 90-degree rotations.
 */
export const getBoundingBox = (item: PlannerItem) => {
  // If no rotation, return original rect
  if (!item.rotation || item.rotation === 0) {
    return { x: item.x, y: item.y, w: item.w, h: item.h };
  }

  // Calculate center
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;

  // Convert to radians
  const rad = (item.rotation * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  // Calculate new width and height based on rotation
  // For 90 degrees: newW = h, newH = w
  const newW = item.w * absCos + item.h * absSin;
  const newH = item.w * absSin + item.h * absCos;

  // Calculate new top-left
  const newX = cx - newW / 2;
  const newY = cy - newH / 2;

  return { x: newX, y: newY, w: newW, h: newH };
};

/**
 * Calculates the intersection area between two rectangles (considering rotation via AABB).
 */
export const getIntersectionArea = (r1: PlannerItem, r2: PlannerItem): number => {
  const box1 = getBoundingBox(r1);
  const box2 = getBoundingBox(r2);

  const xOverlap = Math.max(0, Math.min(box1.x + box1.w, box2.x + box2.w) - Math.max(box1.x, box2.x));
  const yOverlap = Math.max(0, Math.min(box1.y + box1.h, box2.y + box2.h) - Math.max(box1.y, box2.y));
  
  return xOverlap * yOverlap;
};

/**
 * Calculates the usable area of a booth by subtracting overlapping pillars.
 */
export const calculateBoothNetArea = (booth: PlannerItem, allItems: PlannerItem[]): number => {
  const boothArea = booth.w * booth.h;
  let lostArea = 0;

  const pillars = allItems.filter(i => i.type === ItemType.PILLAR);

  pillars.forEach(pillar => {
    lostArea += getIntersectionArea(booth, pillar);
  });

  return Math.max(0, boothArea - lostArea);
};