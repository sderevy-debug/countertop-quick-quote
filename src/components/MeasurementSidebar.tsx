import { DrawnRectangle } from "@/types/estimation";
import { Trash2, Ruler } from "lucide-react";

interface MeasurementSidebarProps {
  rectangles: DrawnRectangle[];
  scale: number;
  onScaleChange: (scale: number) => void;
  onDeleteRect: (id: string) => void;
  onClearAll: () => void;
  selectedRectId: string | null;
  onSelectRect: (id: string | null) => void;
}

export default function MeasurementSidebar({
  rectangles,
  scale,
  onScaleChange,
  onDeleteRect,
  onClearAll,
  selectedRectId,
  onSelectRect,
}: MeasurementSidebarProps) {
  const totalArea = rectangles.reduce((sum, r) => sum + r.area, 0);

  return (
    <div className="w-80 flex flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-sidebar-foreground/80">
          Measurements
        </h2>
      </div>

      {/* Scale setting */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-3.5 h-3.5 text-sidebar-primary" />
          <label className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            Scale (px per inch)
          </label>
        </div>
        <input
          type="number"
          value={scale}
          onChange={(e) => onScaleChange(Number(e.target.value) || 1)}
          min={1}
          className="w-full px-3 py-1.5 text-sm font-mono bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
        />
        <p className="text-[10px] text-sidebar-foreground/40 mt-1">
          Adjust to match your PDF's actual scale
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
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
                  Draw rectangles on the PDF to measure areas
                </td>
              </tr>
            ) : (
              rectangles.map((r, i) => (
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
                    {r.realWidth.toFixed(1)}
                  </td>
                  <td className="text-right px-2 py-2 font-mono">
                    {r.realHeight.toFixed(1)}
                  </td>
                  <td className="text-right px-2 py-2 font-mono font-medium">
                    {r.area.toFixed(2)}
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
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
            Total Area
          </span>
          <span className="text-lg font-mono font-bold text-sidebar-primary">
            {totalArea.toFixed(2)} <span className="text-xs font-normal text-sidebar-foreground/50">ft²</span>
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
