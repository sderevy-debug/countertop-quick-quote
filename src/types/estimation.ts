export type CursorMode = "select" | "add" | "remove";

export interface DrawnRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  label: string;
  // Real-world dimensions in inches (after scale applied)
  realWidth: number;
  realHeight: number;
  area: number; // sq ft
}

export interface EstimationState {
  rectangles: DrawnRectangle[];
  scale: number; // pixels per inch on PDF
  currentPage: number;
  totalPages: number;
  pdfFile: File | null;
}
