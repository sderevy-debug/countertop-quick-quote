import { useRef, useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { DrawnRectangle, CursorMode, CalibrationLine } from "@/types/estimation";
import { ZoomIn, ZoomOut, Upload, MousePointer, Minus, Maximize2, Square, Triangle, Hexagon } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  rectangles: DrawnRectangle[];
  onRectangleDrawn: (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area" | "floor" | "room">) => void;
  onDeleteRect: (id: string) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  pdfFile: File | null;
  onFileLoad: (file: File) => void;
  totalPages: number;
  onTotalPagesChange: (total: number) => void;
  selectedRectId: string | null;
  onSelectRect: (id: string | null) => void;
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  calibrationLine: CalibrationLine | null;
  onCalibrationLineDrawn: (line: CalibrationLine) => void;
  combineShapes: boolean;
  onCombineShapesChange: (val: boolean) => void;
}

const TOOL_MODES: { mode: CursorMode; icon: typeof MousePointer; label: string }[] = [
  { mode: "select", icon: MousePointer, label: "Select" },
  { mode: "remove", icon: Minus, label: "Remove" },
];

const SHAPE_MODES: { mode: CursorMode; icon: typeof Square; label: string }[] = [
  { mode: "add", icon: Square, label: "Rectangle" },
  { mode: "add_triangle", icon: Triangle, label: "Triangle" },
  { mode: "add_polygon", icon: Hexagon, label: "Polygon" },
];

export default function PdfViewer({
  rectangles,
  onRectangleDrawn,
  onDeleteRect,
  scale,
  onScaleChange,
  pdfFile,
  onFileLoad,
  totalPages,
  onTotalPagesChange,
  selectedRectId,
  onSelectRect,
  cursorMode,
  onCursorModeChange,
  calibrationLine,
  onCalibrationLineDrawn,
  combineShapes,
  onCombineShapesChange,
}: PdfViewerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawingPage, setDrawingPage] = useState<number | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calibration line drawing state
  const [calStartPoint, setCalStartPoint] = useState<{ x: number; y: number; page: number } | null>(null);
  const [calCurrentPoint, setCalCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [calDrawing, setCalDrawing] = useState(false);

  // Calibration input state
  const [showCalInput, setShowCalInput] = useState(false);
  const [calLengthValue, setCalLengthValue] = useState("");
  const [calUnit, setCalUnit] = useState<"ft" | "in">("ft");
  const [pendingCalLine, setPendingCalLine] = useState<CalibrationLine | null>(null);
  const calInputRef = useRef<HTMLInputElement>(null);

  const handleFitWidth = useCallback(() => {
    if (!scrollAreaRef.current || !pdfPageWidth) return;
    const availableWidth = scrollAreaRef.current.clientWidth - 32;
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

  useEffect(() => {
    if (showCalInput && calInputRef.current) {
      calInputRef.current.focus();
    }
  }, [showCalInput]);

  const getPageAndCoords = useCallback(
    (e: React.MouseEvent): { pageNumber: number; x: number; y: number } | null => {
      const target = e.target as HTMLElement;
      const pageWrapper = target.closest("[data-page-number]") as HTMLElement;
      if (!pageWrapper) return null;
      const pageNumber = parseInt(pageWrapper.dataset.pageNumber!, 10);
      const rect = pageWrapper.getBoundingClientRect();
      return {
        pageNumber,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const findRectAtPoint = useCallback(
    (pageNumber: number, x: number, y: number) => {
      // x, y are in zoomed pixels; rects are stored at zoom=1
      const nx = x / zoom;
      const ny = y / zoom;
      const pageRects = rectangles.filter((r) => r.pageNumber === pageNumber);
      for (let i = pageRects.length - 1; i >= 0; i--) {
        const r = pageRects[i];
        if (nx >= r.x && nx <= r.x + r.width && ny >= r.y && ny <= r.y + r.height) {
          return r;
        }
      }
      return null;
    },
    [rectangles, zoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pdfFile) return;
      const info = getPageAndCoords(e);
      if (!info) return;

      if (cursorMode === "select") {
        const rect = findRectAtPoint(info.pageNumber, info.x, info.y);
        onSelectRect(rect ? rect.id : null);
        return;
      }

      if (cursorMode === "remove") {
        const rect = findRectAtPoint(info.pageNumber, info.x, info.y);
        if (rect) onDeleteRect(rect.id);
        return;
      }

      if (cursorMode === "calibrate") {
        setCalStartPoint({ x: info.x, y: info.y, page: info.pageNumber });
        setCalCurrentPoint({ x: info.x, y: info.y });
        setCalDrawing(true);
        return;
      }

      // drawing mode (add, add_triangle, add_polygon)
      setDrawingPage(info.pageNumber);
      setStartPoint({ x: info.x, y: info.y });
      setCurrentPoint({ x: info.x, y: info.y });
      setDrawing(true);
    },
    [pdfFile, getPageAndCoords, cursorMode, findRectAtPoint, onSelectRect, onDeleteRect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (cursorMode === "calibrate" && calDrawing && calStartPoint) {
        const target = e.target as HTMLElement;
        const pageWrapper = target.closest("[data-page-number]") as HTMLElement;
        if (!pageWrapper || parseInt(pageWrapper.dataset.pageNumber!, 10) !== calStartPoint.page) return;
        const rect = pageWrapper.getBoundingClientRect();
        setCalCurrentPoint({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        return;
      }

      if (!drawing || !isDrawMode(cursorMode) || drawingPage === null) return;
      const target = e.target as HTMLElement;
      const pageWrapper = target.closest("[data-page-number]") as HTMLElement;
      if (!pageWrapper || parseInt(pageWrapper.dataset.pageNumber!, 10) !== drawingPage) return;
      const rect = pageWrapper.getBoundingClientRect();
      setCurrentPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [drawing, cursorMode, drawingPage, calDrawing, calStartPoint]
  );

  const handleMouseUp = useCallback(() => {
    // Calibration line finish
    if (cursorMode === "calibrate" && calDrawing && calStartPoint && calCurrentPoint) {
      const dx = (calCurrentPoint.x - calStartPoint.x) / zoom;
      const dy = (calCurrentPoint.y - calStartPoint.y) / zoom;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);

      if (pixelLength > 5) {
        const line: CalibrationLine = {
          startX: calStartPoint.x / zoom,
          startY: calStartPoint.y / zoom,
          endX: calCurrentPoint.x / zoom,
          endY: calCurrentPoint.y / zoom,
          pageNumber: calStartPoint.page,
          pixelLength,
        };
        setPendingCalLine(line);
        setShowCalInput(true);
        setCalLengthValue("");
      }

      setCalDrawing(false);
      setCalStartPoint(null);
      setCalCurrentPoint(null);
      return;
    }

    if (!drawing || !startPoint || !currentPoint || !isDrawMode(cursorMode) || drawingPage === null) {
      setDrawing(false);
      setDrawingPage(null);
      return;
    }

    // Normalize to zoom=1
    const x = Math.min(startPoint.x, currentPoint.x) / zoom;
    const y = Math.min(startPoint.y, currentPoint.y) / zoom;
    const width = Math.abs(currentPoint.x - startPoint.x) / zoom;
    const height = Math.abs(currentPoint.y - startPoint.y) / zoom;

    if (width > 5 && height > 5) {
      onRectangleDrawn({
        x,
        y,
        width,
        height,
        pageNumber: drawingPage,
      });
    }

    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setDrawingPage(null);
  }, [drawing, startPoint, currentPoint, drawingPage, onRectangleDrawn, cursorMode, zoom, calDrawing, calStartPoint, calCurrentPoint]);

  const handleCalibrationSubmit = useCallback(() => {
    if (!pendingCalLine || !calLengthValue) return;
    const numVal = parseFloat(calLengthValue);
    if (isNaN(numVal) || numVal <= 0) return;

    const realLengthInches = calUnit === "ft" ? numVal * 12 : numVal;
    const newScale = pendingCalLine.pixelLength / realLengthInches;

    onScaleChange(newScale);
    onCalibrationLineDrawn(pendingCalLine);
    setShowCalInput(false);
    setPendingCalLine(null);
    setCalLengthValue("");
    onCursorModeChange("add");
  }, [pendingCalLine, calLengthValue, calUnit, onScaleChange, onCalibrationLineDrawn, onCursorModeChange]);

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

  const cursorStyle =
    isDrawMode(cursorMode) ? "crosshair"
      : cursorMode === "remove" ? "pointer"
      : cursorMode === "calibrate" ? "crosshair"
      : "default";

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (!pdfFile) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/50">
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
      <div className="flex items-center gap-2 px-4 py-2 bg-toolbar text-toolbar-foreground border-b border-sidebar-border shrink-0">
        {/* Tool modes */}
        <div className="flex items-center bg-sidebar-accent rounded-md p-0.5 gap-0.5">
          {TOOL_MODES.map(({ mode, icon: Icon, label }) => (
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

        <div className="w-px h-5 bg-sidebar-border mx-1" />

        {/* Shape modes */}
        <div className="flex items-center bg-sidebar-accent rounded-md p-0.5 gap-0.5">
          {SHAPE_MODES.map(({ mode, icon: Icon, label }) => (
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

        <div className="w-px h-5 bg-sidebar-border mx-1" />

        {/* Combine Shapes checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={combineShapes}
            onChange={(e) => onCombineShapesChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-sidebar-border accent-sidebar-primary cursor-pointer"
          />
          <span className="text-xs text-sidebar-foreground/70">Combine Shapes</span>
        </label>

        <div className="w-px h-5 bg-sidebar-border mx-2" />

        <span className="text-sm font-mono">
          {totalPages} {totalPages === 1 ? "page" : "pages"}
        </span>

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

      {/* Calibration hint banner */}
      {cursorMode === "calibrate" && !showCalInput && (
        <div className="px-4 py-2 bg-warning/20 text-warning text-xs font-medium text-center shrink-0 border-b border-sidebar-border">
          Draw a line along a known dimension on the blueprint
        </div>
      )}

      {/* PDF Area - all pages continuous */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto bg-muted/30 p-4 min-h-0 relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: cursorStyle }}
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => onTotalPagesChange(numPages)}
        >
          <div className="flex flex-col items-center gap-4">
            {pages.map((pageNum) => {
              const pageRects = rectangles.filter((r) => r.pageNumber === pageNum);
              return (
                <div
                  key={pageNum}
                  data-page-number={pageNum}
                  className="relative shadow-lg"
                  onMouseDown={handleMouseDown}
                >
                  <Page
                    pageNumber={pageNum}
                    scale={zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={(page) => {
                      if (pageNum === 1) setPdfPageWidth(page.width);
                    }}
                  />

                  {/* Drawing overlay for this page */}
                  <div className="absolute inset-0 z-10" />

                  {/* Active drawing rectangle */}
                  {drawingRect && drawingPage === pageNum && (
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

                  {/* Active calibration line */}
                  {calDrawing && calStartPoint && calCurrentPoint && calStartPoint.page === pageNum && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12, overflow: "visible" }}>
                      <line
                        x1={calStartPoint.x}
                        y1={calStartPoint.y}
                        x2={calCurrentPoint.x}
                        y2={calCurrentPoint.y}
                        stroke="hsl(var(--warning))"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                      />
                      <circle cx={calStartPoint.x} cy={calStartPoint.y} r={4} fill="hsl(var(--warning))" />
                      <circle cx={calCurrentPoint.x} cy={calCurrentPoint.y} r={4} fill="hsl(var(--warning))" />
                    </svg>
                  )}

                  {/* Pending calibration line (during input) */}
                  {pendingCalLine && pendingCalLine.pageNumber === pageNum && showCalInput && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12, overflow: "visible" }}>
                      <line
                        x1={pendingCalLine.startX * zoom}
                        y1={pendingCalLine.startY * zoom}
                        x2={pendingCalLine.endX * zoom}
                        y2={pendingCalLine.endY * zoom}
                        stroke="hsl(var(--warning))"
                        strokeWidth={2.5}
                      />
                      <circle cx={pendingCalLine.startX * zoom} cy={pendingCalLine.startY * zoom} r={4} fill="hsl(var(--warning))" />
                      <circle cx={pendingCalLine.endX * zoom} cy={pendingCalLine.endY * zoom} r={4} fill="hsl(var(--warning))" />
                    </svg>
                  )}

                  {/* Completed rectangles for this page (stored at zoom=1, rendered at current zoom) */}
                  {pageRects.map((r) => (
                    <div
                      key={r.id}
                      className="completed-rect"
                      style={{
                        left: r.x * zoom,
                        top: r.y * zoom,
                        width: r.width * zoom,
                        height: r.height * zoom,
                        borderColor: selectedRectId === r.id ? "hsl(var(--primary))" : undefined,
                        background: selectedRectId === r.id ? "hsl(var(--primary) / 0.15)" : undefined,
                        pointerEvents: cursorMode !== "add" && cursorMode !== "calibrate" ? "auto" : "none",
                      }}
                    />
                  ))}

                  {/* Page number label */}
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-foreground/70 text-background px-1.5 py-0.5 rounded z-20">
                    {pageNum}
                  </div>
                </div>
              );
            })}
          </div>
        </Document>

        {/* Calibration length input popup */}
        {showCalInput && pendingCalLine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg shadow-xl p-5 w-80">
              <h3 className="text-sm font-semibold text-foreground mb-1">Set Scale</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Enter the real-world length of the line you drew.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  ref={calInputRef}
                  type="number"
                  step="any"
                  min="0"
                  value={calLengthValue}
                  onChange={(e) => setCalLengthValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCalibrationSubmit();
                    if (e.key === "Escape") {
                      setShowCalInput(false);
                      setPendingCalLine(null);
                    }
                  }}
                  placeholder="Length"
                  className="flex-1 px-3 py-2 text-sm font-mono bg-muted border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex bg-muted rounded border border-border overflow-hidden">
                  <button
                    onClick={() => setCalUnit("ft")}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      calUnit === "ft"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ft
                  </button>
                  <button
                    onClick={() => setCalUnit("in")}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      calUnit === "in"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    in
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCalInput(false);
                    setPendingCalLine(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCalibrationSubmit}
                  disabled={!calLengthValue || parseFloat(calLengthValue) <= 0}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Apply Scale
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
