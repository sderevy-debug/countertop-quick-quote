export type CursorMode = "select" | "add" | "remove" | "calibrate" | "add_triangle" | "add_polygon";

export type ShapeType = "rectangle" | "triangle" | "polygon";

export interface Point {
  x: number;
  y: number;
}

export interface DrawnRectangle {
  id: string;
  /** Coordinates normalized to zoom=1 */
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  label: string;
  floor: string;
  room: string;
  shapeType: ShapeType;
  /** For triangles/polygons: vertices normalized to zoom=1 */
  points?: Point[];
  // Real-world dimensions in inches (after scale applied)
  realWidth: number;
  realHeight: number;
  area: number; // sq ft
}

export interface CalibrationLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pageNumber: number;
  /** Length in pixels at zoom=1 */
  pixelLength: number;
}

/** Shoelace formula for polygon area in pixels² */
export function polygonPixelArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Bounding box of points */
export function boundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

/** Check if a point is inside a polygon (ray casting) */
export function pointInPolygon(px: number, py: number, points: Point[]): boolean {
  let inside = false;
  const n = points.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface EstimationState {
  rectangles: DrawnRectangle[];
  scale: number;
  currentPage: number;
  totalPages: number;
  pdfFile: File | null;
}
