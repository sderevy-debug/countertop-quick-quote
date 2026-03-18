import { useState, useCallback, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import PdfViewer from "@/components/PdfViewer";
import MeasurementSidebar from "@/components/MeasurementSidebar";
import { DrawnRectangle, CursorMode, CalibrationLine, polygonPixelArea, Point, boundingBox } from "@/types/estimation";
import { Upload, Moon, Sun } from "lucide-react";
import polygonClipping, { Polygon as ClipPolygon } from "polygon-clipping";

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
      let areaPx: number;
      if (r.shapeType !== "rectangle" && r.points && r.points.length >= 3) {
        areaPx = polygonPixelArea(r.points);
      } else {
        areaPx = r.width * r.height;
      }
      const areaSqIn = areaPx / (newScale * newScale);
      const area = areaSqIn / 144; // sq ft
      const realWidth = r.width / newScale;
      const realHeight = r.height / newScale;
      return { ...r, realWidth, realHeight, area };
    });
  }, []);

  // Convert a DrawnRectangle to a polygon-clipping Polygon
  const shapeToClipPoly = useCallback((r: { shapeType: string; points?: Point[]; x: number; y: number; width: number; height: number }): ClipPolygon => {
    if (r.shapeType !== "rectangle" && r.points && r.points.length >= 3) {
      const ring: [number, number][] = r.points.map((p) => [p.x, p.y]);
      ring.push([r.points[0].x, r.points[0].y]); // close ring
      return [ring];
    }
    // Rectangle → 4-point polygon
    return [
      [
        [r.x, r.y],
        [r.x + r.width, r.y],
        [r.x + r.width, r.y + r.height],
        [r.x, r.y + r.height],
        [r.x, r.y], // close ring
      ],
    ];
  }, []);

  // Check if two polygons overlap by testing if their intersection is non-empty
  const polygonsOverlap = useCallback((a: ClipPolygon, b: ClipPolygon): boolean => {
    try {
      const result = polygonClipping.intersection(a, b);
      return result.length > 0;
    } catch {
      return false;
    }
  }, []);

  const handleRectangleDrawn = useCallback(
    (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area" | "floor" | "room">) => {
      const id = crypto.randomUUID();
      setRectangles((prev) => {
        const newClipPoly = shapeToClipPoly(rect);

        if (combineShapes) {
          // Find all existing shapes on the same page that overlap the new shape
          const overlapping: DrawnRectangle[] = [];
          const nonOverlapping: DrawnRectangle[] = [];

          for (const existing of prev) {
            if (existing.pageNumber === rect.pageNumber) {
              const existingClip = shapeToClipPoly(existing);
              if (polygonsOverlap(newClipPoly, existingClip)) {
                overlapping.push(existing);
              } else {
                nonOverlapping.push(existing);
              }
            } else {
              nonOverlapping.push(existing);
            }
          }

          if (overlapping.length > 0) {
            // Union all overlapping shapes + the new shape
            let merged: ClipPolygon = newClipPoly;
            for (const ov of overlapping) {
              const ovClip = shapeToClipPoly(ov);
              try {
                const unionResult = polygonClipping.union(merged, ovClip);
                if (unionResult.length > 0) {
                  merged = unionResult[0]; // take first polygon from multipolygon
                }
              } catch {
                // If union fails, skip this shape
              }
            }

            // Convert merged polygon back to DrawnRectangle
            // Use the first ring (outer boundary), drop the closing point
            const outerRing = merged[0];
            const mergedPoints: Point[] = outerRing.slice(0, -1).map(([px, py]) => ({ x: px, y: py }));
            const bb = boundingBox(mergedPoints);
            const areaPx = polygonPixelArea(mergedPoints);
            const realWidth = scale > 0 ? bb.width / scale : 0;
            const realHeight = scale > 0 ? bb.height / scale : 0;
            const area = scale > 0 ? areaPx / (scale * scale) / 144 : 0;

            // Keep the first overlapping shape's label
            const label = overlapping[0].label;
            const mergedRect: DrawnRectangle = {
              id: overlapping[0].id, // keep first shape's ID
              x: bb.x,
              y: bb.y,
              width: bb.width,
              height: bb.height,
              pageNumber: rect.pageNumber,
              label,
              floor: overlapping[0].floor,
              room: overlapping[0].room,
              shapeType: "polygon",
              points: mergedPoints,
              realWidth,
              realHeight,
              area,
            };

            return [...nonOverlapping, mergedRect];
          }
        }

        // No combine or no overlap — add normally
        const label = `R${prev.length + 1}`;
        let areaPx: number;
        if (rect.shapeType !== "rectangle" && rect.points && rect.points.length >= 3) {
          areaPx = polygonPixelArea(rect.points);
        } else {
          areaPx = rect.width * rect.height;
        }
        const realWidth = scale > 0 ? rect.width / scale : 0;
        const realHeight = scale > 0 ? rect.height / scale : 0;
        const area = scale > 0 ? areaPx / (scale * scale) / 144 : 0;

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
    [scale, activeFloor, activeRoom, combineShapes, shapeToClipPoly, polygonsOverlap]
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
