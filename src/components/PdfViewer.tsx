import { useRef, useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { DrawnRectangle } from "@/types/estimation";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Upload } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  rectangles: DrawnRectangle[];
  onRectangleDrawn: (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area">) => void;
  scale: number;
  pdfFile: File | null;
  onFileLoad: (file: File) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  selectedRectId: string | null;
}

export default function PdfViewer({
  rectangles,
  onRectangleDrawn,
  pdfFile,
  onFileLoad,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPagesChange,
  selectedRectId,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfFile]);

  const getRelativeCoords = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const pageEl = container.querySelector(".react-pdf__Page") as HTMLElement;
      if (!pageEl) return { x: 0, y: 0 };
      const rect = pageEl.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pdfFile) return;
      const coords = getRelativeCoords(e);
      setStartPoint(coords);
      setCurrentPoint(coords);
      setDrawing(true);
    },
    [pdfFile, getRelativeCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      setCurrentPoint(getRelativeCoords(e));
    },
    [drawing, getRelativeCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing || !startPoint || !currentPoint) {
      setDrawing(false);
      return;
    }

    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // Minimum size threshold
    if (width > 10 && height > 10) {
      onRectangleDrawn({
        x: Math.min(startPoint.x, currentPoint.x),
        y: Math.min(startPoint.y, currentPoint.y),
        width,
        height,
        pageNumber: currentPage,
      });
    }

    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [drawing, startPoint, currentPoint, currentPage, onRectangleDrawn]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileLoad(file);
    }
  };

  const drawingRect =
    drawing && startPoint && currentPoint
      ? {
          left: Math.min(startPoint.x, currentPoint.x),
          top: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        }
      : null;

  const pageRects = rectangles.filter((r) => r.pageNumber === currentPage);

  if (!pdfFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50">
        <div
          className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Upload a PDF</p>
            <p className="text-sm text-muted-foreground mt-1">
              Drop your countertop blueprint or floor plan here
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-toolbar text-toolbar-foreground border-b border-sidebar-border">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded hover:bg-sidebar-accent disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-mono min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded hover:bg-sidebar-accent disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-sidebar-border mx-2" />

        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-mono min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded bg-sidebar-accent hover:bg-sidebar-muted transition-colors"
        >
          Change PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* PDF Area */}
      <div className="flex-1 overflow-auto bg-muted/30 flex justify-center p-4">
        <div
          ref={containerRef}
          className="pdf-canvas-container relative inline-block shadow-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => onTotalPagesChange(numPages)}
          >
            <Page pageNumber={currentPage} scale={zoom} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {/* Drawing overlay */}
          <div className="drawing-overlay" />

          {/* Active drawing rectangle */}
          {drawingRect && (
            <div
              className="drawing-rect"
              style={{
                left: drawingRect.left,
                top: drawingRect.top,
                width: drawingRect.width,
                height: drawingRect.height,
              }}
            />
          )}

          {/* Completed rectangles */}
          {pageRects.map((r) => (
            <div
              key={r.id}
              className="completed-rect"
              style={{
                left: r.x,
                top: r.y,
                width: r.width,
                height: r.height,
                borderColor: selectedRectId === r.id ? "hsl(var(--primary))" : undefined,
                background: selectedRectId === r.id ? "hsl(var(--primary) / 0.15)" : undefined,
              }}
            >
              <span className="rect-label">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
