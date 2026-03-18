import { DrawnRectangle } from "@/types/estimation";
import { Trash2, Ruler } from "lucide-react";

interface MeasurementSidebarProps {
  rectangles: DrawnRectangle[];
  scale: number;
  onDeleteRect: (id: string) => void;
  onClearAll: () => void;
  selectedRectId: string | null;
  onSelectRect: (id: string | null) => void;
  onRequestCalibrate: () => void;
}

export default function MeasurementSidebar({
  rectangles,
  scale,
  onDeleteRect,
  onClearAll,
  selectedRectId,
  onSelectRect,
  onRequestCalibrate,
}: MeasurementSidebarProps) {
  const totalArea = rectangles.reduce((sum, r) => sum + r.area, 0);
  const isCalibrated = scale > 0;

  return (
    <div className="w-full h-full flex flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-sidebar-foreground/80">
          Measurements
        </h2>
      </div>

      {/* Scale status */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-3.5 h-3.5 text-sidebar-primary" />
          <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            Scale
          </span>
        </div>
        {isCalibrated ? (
          <div>
            <p className="text-xs text-sidebar-foreground/60 font-mono">
              {scale.toFixed(2)} px/in
            </p>
            <button
              onClick={onRequestCalibrate}
              className="mt-2 w-full text-xs py-1.5 rounded bg-sidebar-accent hover:bg-sidebar-muted text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              Recalibrate
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-sidebar-foreground/40 mb-2">
              Draw a reference line on the PDF to set the scale
            </p>
            <button
              onClick={onRequestCalibrate}
              className="w-full text-xs py-2 rounded bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-medium transition-colors"
            >
              Calibrate Scale
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-sidebar">
            <tr className="border-b border-sidebar-border text-sidebar-foreground/60">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-right px-2 py-2 font-medium">W (in)</th>
              <th className="text-right px-2 py-2 font-medium">H (in)</th>
              <th className="text-right px-2 py-2 font-medium">Area (ft²)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rectangles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sidebar-foreground/40 text-xs">
                  {isCalibrated
                    ? "Draw rectangles on the PDF to measure areas"
                    : "Calibrate the scale first, then draw rectangles"}
                </td>
              </tr>
            ) : (
              rectangles.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-sidebar-border/50 cursor-pointer transition-colors ${
                    selectedRectId === r.id
                      ? "bg-sidebar-primary/20"
                      : "hover:bg-sidebar-accent"
                  }`}
                  onClick={() => onSelectRect(selectedRectId === r.id ? null : r.id)}
                >
                  <td className="px-4 py-2 font-mono text-sidebar-primary font-medium">
                    {r.label}
                  </td>
                  <td className="text-right px-2 py-2 font-mono">
                    {isCalibrated ? r.realWidth.toFixed(1) : "—"}
                  </td>
                  <td className="text-right px-2 py-2 font-mono">
                    {isCalibrated ? r.realHeight.toFixed(1) : "—"}
                  </td>
                  <td className="text-right px-2 py-2 font-mono font-medium">
                    {isCalibrated ? r.area.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRect(r.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/20 text-sidebar-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer totals */}
      <div className="border-t border-sidebar-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
            Total Area
          </span>
          <span className="text-lg font-mono font-bold text-sidebar-primary">
            {isCalibrated ? totalArea.toFixed(2) : "—"}{" "}
            <span className="text-xs font-normal text-sidebar-foreground/50">ft²</span>
          </span>
        </div>
        {rectangles.length > 0 && (
          <button
            onClick={onClearAll}
            className="mt-2 w-full text-xs py-1.5 rounded bg-sidebar-accent hover:bg-destructive/20 hover:text-destructive text-sidebar-foreground/60 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
