import { useState, useCallback, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import PdfViewer from "@/components/PdfViewer";
import MeasurementSidebar from "@/components/MeasurementSidebar";
import { DrawnRectangle, CursorMode, CalibrationLine } from "@/types/estimation";
import { Upload, Moon, Sun } from "lucide-react";

const Index = () => {
  const [rectangles, setRectangles] = useState<DrawnRectangle[]>([]);
  const [scale, setScale] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const [cursorMode, setCursorMode] = useState<CursorMode>("add");
  const [darkMode, setDarkMode] = useState(true);
  const [calibrationLine, setCalibrationLine] = useState<CalibrationLine | null>(null);
  const [activeFloor, setActiveFloor] = useState("Floor 1");
  const [activeRoom, setActiveRoom] = useState("Room 1");
  const [combineShapes, setCombineShapes] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const recalcRectangles = useCallback((rects: DrawnRectangle[], newScale: number): DrawnRectangle[] => {
    if (newScale <= 0) return rects;
    return rects.map((r) => {
      const realWidth = r.width / newScale;
      const realHeight = r.height / newScale;
      const area = (realWidth * realHeight) / 144;
      return { ...r, realWidth, realHeight, area };
    });
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
    setRectangles((prev) => recalcRectangles(prev, newScale));
  }, [recalcRectangles]);

  const handleRectangleDrawn = useCallback(
    (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area" | "floor" | "room">) => {
      const id = crypto.randomUUID();
      setRectangles((prev) => {
        const label = `R${prev.length + 1}`;
        const realWidth = scale > 0 ? rect.width / scale : 0;
        const realHeight = scale > 0 ? rect.height / scale : 0;
        const area = (realWidth * realHeight) / 144;

        const newRect: DrawnRectangle = {
          ...rect,
          id,
          label,
          floor: activeFloor,
          room: activeRoom,
          realWidth,
          realHeight,
          area,
        };
        return [...prev, newRect];
      });
      setSelectedRectId(id);
    },
    [scale, activeFloor, activeRoom]
  );

  const handleDeleteRect = useCallback((id: string) => {
    setRectangles((prev) => prev.filter((r) => r.id !== id));
    setSelectedRectId((prev) => (prev === id ? null : prev));
  }, []);

  const handleClearAll = useCallback(() => {
    setRectangles([]);
    setSelectedRectId(null);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-toolbar text-toolbar-foreground border-b border-sidebar-border shrink-0">
        <span className="text-sm font-semibold tracking-wide uppercase">
          Blueprint Estimator
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDarkMode((d) => !d)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {!pdfFile ? (
        <div className="flex-1 flex items-center justify-center bg-muted/50">
          <div
            className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("pdf-upload-input")?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Upload a PDF</p>
              <p className="text-sm text-muted-foreground mt-1">
                Drop your countertop blueprint or floor plan here
              </p>
            </div>
            <input
              id="pdf-upload-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.type === "application/pdf") setPdfFile(file);
              }}
            />
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={75} minSize={40}>
            <PdfViewer
              rectangles={rectangles}
              onRectangleDrawn={handleRectangleDrawn}
              onDeleteRect={handleDeleteRect}
              scale={scale}
              onScaleChange={handleScaleChange}
              pdfFile={pdfFile}
              onFileLoad={setPdfFile}
              totalPages={totalPages}
              onTotalPagesChange={setTotalPages}
              selectedRectId={selectedRectId}
              onSelectRect={setSelectedRectId}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
              calibrationLine={calibrationLine}
              onCalibrationLineDrawn={setCalibrationLine}
              combineShapes={combineShapes}
              onCombineShapesChange={setCombineShapes}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={50}>
            <MeasurementSidebar
              rectangles={rectangles}
              scale={scale}
              onDeleteRect={handleDeleteRect}
              onClearAll={handleClearAll}
              selectedRectId={selectedRectId}
              onSelectRect={setSelectedRectId}
              onRequestCalibrate={() => setCursorMode("calibrate")}
              activeFloor={activeFloor}
              activeRoom={activeRoom}
              onActiveFloorChange={setActiveFloor}
              onActiveRoomChange={setActiveRoom}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default Index;
