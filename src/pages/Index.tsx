import { useState, useCallback } from "react";
import PdfViewer from "@/components/PdfViewer";
import MeasurementSidebar from "@/components/MeasurementSidebar";
import { DrawnRectangle, CursorMode } from "@/types/estimation";

const Index = () => {
  const [rectangles, setRectangles] = useState<DrawnRectangle[]>([]);
  const [scale, setScale] = useState(10); // px per inch
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const [cursorMode, setCursorMode] = useState<CursorMode>("add");

  const handleRectangleDrawn = useCallback(
    (rect: Omit<DrawnRectangle, "id" | "label" | "realWidth" | "realHeight" | "area">) => {
      const id = crypto.randomUUID();
      const label = `R${rectangles.length + 1}`;
      const realWidth = rect.width / scale; // inches
      const realHeight = rect.height / scale; // inches
      const area = (realWidth * realHeight) / 144; // sq ft

      const newRect: DrawnRectangle = {
        ...rect,
        id,
        label,
        realWidth,
        realHeight,
        area,
      };

      setRectangles((prev) => [...prev, newRect]);
      setSelectedRectId(id);
    },
    [rectangles.length, scale]
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
    <div className="flex h-screen w-full overflow-hidden">
      <PdfViewer
        rectangles={rectangles}
        onRectangleDrawn={handleRectangleDrawn}
        scale={scale}
        pdfFile={pdfFile}
        onFileLoad={setPdfFile}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onTotalPagesChange={setTotalPages}
        selectedRectId={selectedRectId}
      />
      <MeasurementSidebar
        rectangles={rectangles}
        scale={scale}
        onScaleChange={setScale}
        onDeleteRect={handleDeleteRect}
        onClearAll={handleClearAll}
        selectedRectId={selectedRectId}
        onSelectRect={setSelectedRectId}
      />
    </div>
  );
};

export default Index;
