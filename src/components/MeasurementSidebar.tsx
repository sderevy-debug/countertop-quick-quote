import { useState, useMemo } from "react";
import { DrawnRectangle } from "@/types/estimation";
import { Trash2, Ruler, ChevronDown, ChevronRight, Plus, Eye, Download, Building2, DoorOpen } from "lucide-react";

interface MeasurementSidebarProps {
  rectangles: DrawnRectangle[];
  scale: number;
  onDeleteRect: (id: string) => void;
  onClearAll: () => void;
  selectedRectId: string | null;
  onSelectRect: (id: string | null) => void;
  onRequestCalibrate: () => void;
  activeFloor: string;
  activeRoom: string;
  onActiveFloorChange: (floor: string) => void;
  onActiveRoomChange: (room: string) => void;
}

interface GroupedData {
  [floor: string]: {
    [room: string]: DrawnRectangle[];
  };
}

export default function MeasurementSidebar({
  rectangles,
  scale,
  onDeleteRect,
  onClearAll,
  selectedRectId,
  onSelectRect,
  onRequestCalibrate,
  activeFloor,
  activeRoom,
  onActiveFloorChange,
  onActiveRoomChange,
}: MeasurementSidebarProps) {
  const totalArea = rectangles.reduce((sum, r) => sum + r.area, 0);
  const isCalibrated = scale > 0;

  // Track collapsed state for floors and rooms
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set());
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());

  // New floor/room input state
  const [addingFloor, setAddingFloor] = useState(false);
  const [addingRoom, setAddingRoom] = useState<string | null>(null); // floor name if adding room
  const [newName, setNewName] = useState("");

  // Group rectangles by floor > room
  const grouped = useMemo<GroupedData>(() => {
    const result: GroupedData = {};
    for (const r of rectangles) {
      if (!result[r.floor]) result[r.floor] = {};
      if (!result[r.floor][r.room]) result[r.floor][r.room] = [];
      result[r.floor][r.room].push(r);
    }
    return result;
  }, [rectangles]);

  // Get all unique floors and rooms
  const allFloors = useMemo(() => {
    const floors = new Set<string>();
    floors.add(activeFloor);
    rectangles.forEach((r) => floors.add(r.floor));
    return Array.from(floors).sort();
  }, [rectangles, activeFloor]);

  const allRoomsForFloor = useMemo(() => {
    const rooms = new Set<string>();
    if (activeFloor) rooms.add(activeRoom);
    rectangles.filter((r) => r.floor === activeFloor).forEach((r) => rooms.add(r.room));
    return Array.from(rooms).sort();
  }, [rectangles, activeFloor, activeRoom]);

  const toggleFloor = (floor: string) => {
    setCollapsedFloors((prev) => {
      const next = new Set(prev);
      next.has(floor) ? next.delete(floor) : next.add(floor);
      return next;
    });
  };

  const toggleRoom = (key: string) => {
    setCollapsedRooms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAddFloor = () => {
    if (newName.trim()) {
      onActiveFloorChange(newName.trim());
      onActiveRoomChange("Room 1");
      setNewName("");
      setAddingFloor(false);
    }
  };

  const handleAddRoom = (floor: string) => {
    if (newName.trim()) {
      onActiveFloorChange(floor);
      onActiveRoomChange(newName.trim());
      setNewName("");
      setAddingRoom(null);
    }
  };

  const getFloorArea = (floor: string) => {
    const floorRects = rectangles.filter((r) => r.floor === floor);
    return floorRects.reduce((sum, r) => sum + r.area, 0);
  };

  const getRoomArea = (floor: string, room: string) => {
    const roomRects = rectangles.filter((r) => r.floor === floor && r.room === room);
    return roomRects.reduce((sum, r) => sum + r.area, 0);
  };

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

      {/* Active floor/room selector */}
      <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-sidebar-primary" />
          <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            Drawing to
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={activeFloor}
            onChange={(e) => {
              onActiveFloorChange(e.target.value);
              // Reset room to first available room for new floor
              const roomsForFloor = rectangles
                .filter((r) => r.floor === e.target.value)
                .map((r) => r.room);
              const firstRoom = roomsForFloor[0] || "Room 1";
              onActiveRoomChange(firstRoom);
            }}
            className="flex-1 px-2 py-1.5 text-xs font-mono bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
          >
            {allFloors.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={activeRoom}
            onChange={(e) => onActiveRoomChange(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs font-mono bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
          >
            {allRoomsForFloor.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {addingFloor ? (
            <div className="flex-1 flex gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFloor();
                  if (e.key === "Escape") { setAddingFloor(false); setNewName(""); }
                }}
                placeholder="Floor name"
                className="flex-1 px-2 py-1 text-xs bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
              />
              <button onClick={handleAddFloor} className="px-2 py-1 text-xs rounded bg-sidebar-primary text-sidebar-primary-foreground">
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAddingFloor(true); setAddingRoom(null); setNewName(""); }}
              className="flex items-center gap-1 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Floor
            </button>
          )}
          {addingRoom !== null ? (
            <div className="flex-1 flex gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRoom(activeFloor);
                  if (e.key === "Escape") { setAddingRoom(null); setNewName(""); }
                }}
                placeholder="Room name"
                className="flex-1 px-2 py-1 text-xs bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
              />
              <button onClick={() => handleAddRoom(activeFloor)} className="px-2 py-1 text-xs rounded bg-sidebar-primary text-sidebar-primary-foreground">
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAddingRoom(activeFloor); setAddingFloor(false); setNewName(""); }}
              className="flex items-center gap-1 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Room
            </button>
          )}
        </div>
      </div>

      {/* Grouped measurements */}
      <div className="flex-1 overflow-auto min-h-0">
        {rectangles.length === 0 ? (
          <div className="px-4 py-8 text-center text-sidebar-foreground/40 text-xs">
            {isCalibrated
              ? "Draw rectangles on the PDF to measure areas"
              : "Calibrate the scale first, then draw rectangles"}
          </div>
        ) : (
          <div className="py-1">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([floor, rooms]) => {
              const floorCollapsed = collapsedFloors.has(floor);
              const floorArea = getFloorArea(floor);
              return (
                <div key={floor}>
                  {/* Floor header */}
                  <button
                    onClick={() => toggleFloor(floor)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-sidebar-accent transition-colors ${
                      activeFloor === floor ? "text-sidebar-primary" : "text-sidebar-foreground/80"
                    }`}
                  >
                    {floorCollapsed ? (
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    )}
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="flex-1 text-left truncate">{floor}</span>
                    {isCalibrated && (
                      <span className="text-[10px] font-mono text-sidebar-foreground/50">
                        {floorArea.toFixed(1)} ft²
                      </span>
                    )}
                  </button>

                  {!floorCollapsed && (
                    <div>
                      {Object.entries(rooms).sort(([a], [b]) => a.localeCompare(b)).map(([room, rects]) => {
                        const roomKey = `${floor}::${room}`;
                        const roomCollapsed = collapsedRooms.has(roomKey);
                        const roomArea = getRoomArea(floor, room);
                        return (
                          <div key={roomKey}>
                            {/* Room header */}
                            <button
                              onClick={() => toggleRoom(roomKey)}
                              className={`w-full flex items-center gap-2 px-3 pl-7 py-1.5 text-xs font-medium hover:bg-sidebar-accent transition-colors ${
                                activeFloor === floor && activeRoom === room
                                  ? "text-sidebar-primary"
                                  : "text-sidebar-foreground/70"
                              }`}
                            >
                              {roomCollapsed ? (
                                <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <DoorOpen className="w-3 h-3 shrink-0" />
                              <span className="flex-1 text-left truncate">{room}</span>
                              {isCalibrated && (
                                <span className="text-[10px] font-mono text-sidebar-foreground/40">
                                  {roomArea.toFixed(1)} ft²
                                </span>
                              )}
                            </button>

                            {/* Room rectangles */}
                            {!roomCollapsed && (
                              <div className="border-l border-sidebar-border/30 ml-9">
                                {rects.map((r) => (
                                  <div
                                    key={r.id}
                                    onClick={() => onSelectRect(selectedRectId === r.id ? null : r.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] cursor-pointer transition-colors ${
                                      selectedRectId === r.id
                                        ? "bg-sidebar-primary/20"
                                        : "hover:bg-sidebar-accent/50"
                                    }`}
                                  >
                                    <span className="font-mono text-sidebar-primary font-medium w-8 shrink-0">
                                      {r.label}
                                    </span>
                                    <span className="flex-1 font-mono text-sidebar-foreground/60 text-[10px]">
                                      {isCalibrated
                                        ? `${r.realWidth.toFixed(1)}×${r.realHeight.toFixed(1)}″`
                                        : "—"}
                                    </span>
                                    <span className="font-mono font-medium text-sidebar-foreground/80 text-[10px]">
                                      {isCalibrated ? `${r.area.toFixed(2)} ft²` : "—"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteRect(r.id);
                                      }}
                                      className="p-0.5 rounded hover:bg-destructive/20 text-sidebar-foreground/30 hover:text-destructive transition-colors ml-1"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer totals + actions */}
      <div className="border-t border-sidebar-border px-4 py-3 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
            Total Area
          </span>
          <span className="text-lg font-mono font-bold text-sidebar-primary">
            {isCalibrated ? totalArea.toFixed(2) : "—"}{" "}
            <span className="text-xs font-normal text-sidebar-foreground/50">ft²</span>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-muted font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        {rectangles.length > 0 && (
          <button
            onClick={onClearAll}
            className="w-full text-xs py-1.5 rounded bg-sidebar-accent hover:bg-destructive/20 hover:text-destructive text-sidebar-foreground/60 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
