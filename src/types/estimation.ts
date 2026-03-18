export type CursorMode = "select" | "add" | "remove" | "calibrate" | "add_triangle" | "add_polygon";

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

export interface EstimationState {
  rectangles: DrawnRectangle[];
  scale: number; // pixels per inch at zoom=1
  currentPage: number;
  totalPages: number;
  pdfFile: File | null;
}
