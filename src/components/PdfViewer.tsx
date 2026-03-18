import { useRef, useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { DrawnRectangle, CursorMode } from "@/types/estimation";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Upload, MousePointer, Plus, Minus, Maximize2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  rectangles: DrawnRectangle[];
  onRectangleDrawn: (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area">) => void;
  onDeleteRect: (id: string) => void;
  scale: number;
  pdfFile: File | null;
  onFileLoad: (file: File) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  selectedRectId: string | null;
  onSelectRect: (id: string | null) => void;
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
}

const CURSOR_MODES: { mode: CursorMode; icon: typeof MousePointer; label: string }[] = [
  { mode: "select", icon: MousePointer, label: "Select" },
  { mode: "add", icon: Plus, label: "Add" },
  { mode: "remove", icon: Minus, label: "Remove" },
];

export default function PdfViewer({
  rectangles,
  onRectangleDrawn,
  onDeleteRect,
  pdfFile,
  onFileLoad,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPagesChange,
  selectedRectId,
  onSelectRect,
  cursorMode,
  onCursorModeChange,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFitWidth = useCallback(() => {
    if (!scrollAreaRef.current || !pdfPageWidth) return;
    const availableWidth = scrollAreaRef.current.clientWidth - 32; // subtract padding
    const newZoom = availableWidth / pdfPageWidth;
    setZoom(Math.max(0.5, Math.min(3, newZoom)));
  }, [pdfPageWidth]);

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

  const findRectAtPoint = useCallback(
    (x: number, y: number) => {
      const pageRects = rectangles.filter((r) => r.pageNumber === currentPage);
      // Find topmost (last drawn) rect containing the point
      for (let i = pageRects.length - 1; i >= 0; i--) {
        const r = pageRects[i];
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
          return r;
        }
      }
      return null;
    },
    [rectangles, currentPage]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pdfFile) return;
      const coords = getRelativeCoords(e);

      if (cursorMode === "select") {
        const rect = findRectAtPoint(coords.x, coords.y);
        onSelectRect(rect ? rect.id : null);
        return;
      }

      if (cursorMode === "remove") {
        const rect = findRectAtPoint(coords.x, coords.y);
        if (rect) onDeleteRect(rect.id);
        return;
      }

      // "add" mode
      setStartPoint(coords);
      setCurrentPoint(coords);
      setDrawing(true);
    },
    [pdfFile, getRelativeCoords, cursorMode, findRectAtPoint, onSelectRect, onDeleteRect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || cursorMode !== "add") return;
      setCurrentPoint(getRelativeCoords(e));
    },
    [drawing, getRelativeCoords, cursorMode]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing || !startPoint || !currentPoint || cursorMode !== "add") {
      setDrawing(false);
      return;
    }

    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

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
  }, [drawing, startPoint, currentPoint, currentPage, onRectangleDrawn, cursorMode]);

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

  const cursorClass =
    cursorMode === "add" ? "cursor-crosshair" : cursorMode === "remove" ? "cursor-pointer" : "cursor-default";

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
    <div className="h-full flex flex-col min-h-0 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-toolbar text-toolbar-foreground border-b border-sidebar-border">
        {/* Cursor mode toggle */}
        <div className="flex items-center bg-sidebar-accent rounded-md p-0.5 gap-0.5">
          {CURSOR_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onCursorModeChange(mode)}
              title={label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                cursorMode === mode
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-sidebar-border mx-2" />

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
        <button
          onClick={handleFitWidth}
          title="Fit to width"
          className="p-1.5 rounded hover:bg-sidebar-accent transition-colors ml-1"
        >
          <Maximize2 className="w-4 h-4" />
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
      <div ref={scrollAreaRef} className="flex-1 overflow-auto bg-muted/30 p-4 min-h-0">
        <div className="min-w-fit flex justify-center">
        <div
          ref={containerRef}
          className={`pdf-canvas-container relative inline-block shadow-lg ${cursorClass}`}
          style={{ cursor: cursorMode === "add" ? "crosshair" : cursorMode === "remove" ? "pointer" : "default" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => onTotalPagesChange(numPages)}
          >
            <Page
              pageNumber={currentPage}
              scale={zoom}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={(page) => setPdfPageWidth(page.width)}
            />
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
                pointerEvents: cursorMode !== "add" ? "auto" : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
