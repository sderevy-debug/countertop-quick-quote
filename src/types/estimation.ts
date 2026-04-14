export type CursorMode = "select" | "add" | "remove" | "calibrate" | "add_triangle" | "add_polygon" | "add_edge";

export type ShapeType = "rectangle" | "triangle" | "polygon";

export type EdgeType = "backsplash" | "waterfall" | "mitered";

export interface Point {
  x: number;
  y: number;
}

export interface EdgeDesignation {
  /** Index of the starting vertex of this edge */
  edgeIndex: number;
  type: EdgeType;
  /** Depth in inches added perpendicular to the edge */
  depth: number;
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
  /** Edge designations (backsplash, waterfall, mitered) */
  edges?: EdgeDesignation[];
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

/** Get vertices of a shape (works for both rectangles and polygons) */
export function getShapeVertices(r: DrawnRectangle): Point[] {
  if (r.shapeType !== "rectangle" && r.points && r.points.length >= 3) {
    return r.points;
  }
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
}

/** Distance from point to line segment */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Calculate extra area from edge designations in sq ft */
export function edgeDesignationArea(r: DrawnRectangle, pixelsPerInch: number): number {
  if (!r.edges || r.edges.length === 0 || pixelsPerInch <= 0) return 0;
  const vertices = getShapeVertices(r);
  let totalSqIn = 0;
  for (const edge of r.edges) {
    const a = vertices[edge.edgeIndex];
    const b = vertices[(edge.edgeIndex + 1) % vertices.length];
    const edgeLenPx = Math.hypot(b.x - a.x, b.y - a.y);
    const edgeLenIn = edgeLenPx / pixelsPerInch;
    totalSqIn += edgeLenIn * edge.depth;
  }
  return totalSqIn / 144; // convert to sq ft
}

export interface EstimationState {
  rectangles: DrawnRectangle[];
  scale: number;
  currentPage: number;
  totalPages: number;
  pdfFile: File | null;
}
