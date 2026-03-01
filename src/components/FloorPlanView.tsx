import React, { useRef, useState, useCallback, useEffect } from "react";
import { X, Printer, ZoomIn, ZoomOut, Maximize, RectangleHorizontal, RectangleVertical, Users, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SeatingTable {
  id: string;
  table_name: string;
  capacity: number;
  event_id: string;
  shape: string;
  position_x: number;
  position_y: number;
}

interface Guest {
  id: string;
  full_name: string;
  rsvp_status: string;
  table_id: string | null;
}

interface FloorPlanViewProps {
  tables: SeatingTable[];
  guests: Guest[];
  eventId: string;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
  onRefresh: () => void;
}

const LANDSCAPE = { w: 1122, h: 793 };
const PORTRAIT = { w: 793, h: 1122 };
const TABLE_SIZE = 100;

function getInitialPositions(tables: SeatingTable[], canvasW: number, canvasH: number): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  tables.forEach((t, i) => {
    if (t.position_x || t.position_y) {
      positions[t.id] = {
        x: Math.min(t.position_x, canvasW - TABLE_SIZE),
        y: Math.min(t.position_y, canvasH - TABLE_SIZE),
      };
    } else {
      const cols = Math.floor(canvasW / 180);
      positions[t.id] = { x: 80 + (i % cols) * 180, y: 80 + Math.floor(i / cols) * 180 };
    }
  });
  return positions;
}

/* ─── Extract table number from label ─── */
const getTableNumber = (label: string): string => {
  const match = label.match(/\d+/);
  return match ? match[0] : label.charAt(0);
};

/* ─── Inline SVG table visuals with clickable seats ─── */
const TableSVG: React.FC<{
  shape: string;
  capacity: number;
  tableGuests: Guest[];
  unassignedGuests: Guest[];
  label: string;
  size: number;
  onSeatClick: (seatIndex: number) => void;
  highlightEmpty?: boolean;
  onGuestDragStart?: (e: React.DragEvent, guestId: string, guestName: string) => void;
  onGuestDragEnd?: () => void;
}> = ({ shape, capacity, tableGuests, unassignedGuests, label, size, onSeatClick, highlightEmpty, onGuestDragStart, onGuestDragEnd }) => {
  const occupied = tableGuests.length;
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor =
    pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";

  const getSeatPositions = () => {
    if (shape === "head") {
      const seats: { x: number; y: number }[] = [];
      seats.push({ x: 40, y: 25 });
      seats.push({ x: 60, y: 25 });
      const remaining = capacity - 2;
      if (remaining > 0) {
        const gap = Math.min(14, 80 / (remaining + 1));
        const totalW = (remaining - 1) * gap;
        for (let i = 0; i < remaining; i++) {
          seats.push({ x: 50 - totalW / 2 + i * gap, y: 75 });
        }
      }
      return seats;
    }
    if (shape === "round") {
      const r = 32;
      return Array.from({ length: capacity }, (_, i) => {
        const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
        return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
      });
    }
    const half = 18, gap = 14, perSide = Math.ceil(capacity / 4);
    const seats: { x: number; y: number }[] = [];
    const cx = 50, cy = 50;
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy - half - 9 }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx + half + 9, y: cy - totalH / 2 + i * gap }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy + half + 9 }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx - half - 9, y: cy - totalH / 2 + i * gap }); }
    return seats;
  };

  const seats = getSeatPositions();
  const seatRadius = 6;
  const isHead = shape === "head";
  const tableNum = getTableNumber(label);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Modern table surface */}
        {shape === "head" ? (
          <>
            <rect x="18" y="33" width="64" height="24" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <rect x="20" y="35" width="60" height="20" rx="10" fill="hsl(var(--muted))" />
          </>
        ) : shape === "round" ? (
          <>
            <circle cx="50" cy="50" r="19" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="16" fill="hsl(var(--muted))" />
          </>
        ) : (
          <>
            <rect x={50 - 17} y={50 - 17} width={34} height={34} rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <rect x={50 - 14} y={50 - 14} width={28} height={28} rx="4" fill="hsl(var(--muted))" />
          </>
        )}
        {/* Bold large table number */}
        <text x="50" y={shape === "head" ? "49" : "54"} textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="'Inter', system-ui, sans-serif" fill="hsl(var(--foreground))" style={{ pointerEvents: "none" }}>
          {tableNum}
        </text>
        {/* Modern chair dots */}
        {seats.map((s, i) => {
          const isOccupied = i < occupied;
          const guest = tableGuests[i];
          const canAssign = !isOccupied && unassignedGuests.length > 0;
          const isSpecialSeat = isHead && i < 2;
          const isDropTarget = highlightEmpty && !isOccupied && occupied < capacity;
          return (
            <g key={i} style={{ cursor: (isOccupied || canAssign) ? "pointer" : "default" }} onMouseDown={(e) => { if (isOccupied || canAssign) e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); if (isOccupied || canAssign) onSeatClick(i); }}>
              {/* Chair body - modern rounded square */}
              <rect
                x={s.x - seatRadius} y={s.y - seatRadius}
                width={seatRadius * 2} height={seatRadius * 2}
                rx="3"
                fill={isOccupied ? tableColor : isDropTarget ? "hsl(var(--gold) / 0.25)" : "hsl(var(--card))"}
                stroke={isDropTarget ? "hsl(var(--gold))" : isOccupied ? tableColor : "hsl(var(--border))"}
                strokeWidth={isDropTarget ? "2" : isOccupied ? "1.5" : "1"}
                opacity={isOccupied ? 1 : isDropTarget ? 0.9 : canAssign ? 0.7 : 0.4}
                strokeDasharray={isDropTarget ? "2 1.5" : undefined}
              />
              {isSpecialSeat && isOccupied && (
                <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="5" fill="hsl(var(--primary-foreground))" style={{ pointerEvents: "none" }}>♥</text>
              )}
              {canAssign && !isOccupied && (
                <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="bold" style={{ pointerEvents: "none" }}>+</text>
              )}
              {isOccupied && guest && (() => {
                const isLeftSide = s.x < 50;
                const nameX = isLeftSide ? s.x - seatRadius - 2 : s.x + seatRadius + 2;
                const anchor = isLeftSide ? "end" : "start";
                return (
                  <>
                    <title>{guest.full_name} (drag to move, click to remove)</title>
                    <text x={nameX} y={s.y + 1.5} textAnchor={anchor} fontSize="4.5" fontWeight="600" fill="hsl(var(--foreground))" style={{ pointerEvents: "none" }} fontFamily="'Inter', sans-serif">
                      {guest.full_name.length > 12 ? guest.full_name.slice(0, 11) + "…" : guest.full_name}
                    </text>
                  </>
                );
              })()}
            </g>
          );
        })}
      </svg>
      {/* Invisible drag handles over occupied seats */}
      {seats.map((s, i) => {
        if (i >= occupied) return null;
        const guest = tableGuests[i];
        if (!guest) return null;
        const r = (isHead && i < 2) ? 9 : seatRadius;
        const pxX = (s.x / 100) * size - r * (size / 100);
        const pxY = (s.y / 100) * size - r * (size / 100);
        const pxSize = r * 2 * (size / 100);
        return (
          <div
            key={`drag-${i}`}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              onGuestDragStart?.(e, guest.id, guest.full_name);
            }}
            onDragEnd={onGuestDragEnd}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: pxX,
              top: pxY,
              width: pxSize,
              height: pxSize,
              borderRadius: "50%",
              cursor: "grab",
              zIndex: 2,
            }}
            title={`Drag ${guest.full_name} to another table`}
          />
        );
      })}
    </div>
  );
};

/* ─── Tooltip popup ─── */
const TableTooltip: React.FC<{
  table: SeatingTable;
  tableGuests: Guest[];
  unassignedGuests: Guest[];
  onAssign: (guestId: string, tableId: string | null) => void;
  onClose: () => void;
  pos: { x: number; y: number };
  canvasRect: DOMRect | null;
}> = ({ table, tableGuests, unassignedGuests, onAssign, onClose, pos, canvasRect }) => {
  const tipW = 220, tipH = 200;
  let left = pos.x + 14, top = pos.y - 20;
  if (canvasRect) {
    if (left + tipW > canvasRect.width) left = pos.x - tipW - 14;
    if (top + tipH > canvasRect.height) top = canvasRect.height - tipH - 8;
    if (top < 0) top = 8;
  }

  return (
    <div className="absolute z-30 bg-card border border-border rounded-xl shadow-card p-3 w-56 text-xs" style={{ left, top }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-semibold text-sm truncate">{table.table_name}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1 shrink-0"><X size={13} /></button>
      </div>
      <p className="text-muted-foreground mb-2 font-body">{tableGuests.length}/{table.capacity} guests</p>
      <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
        {tableGuests.map((g) => (
          <div key={g.id} className="flex items-center justify-between">
            <span className="font-body truncate">{g.full_name}</span>
            <button onClick={() => onAssign(g.id, null)} className="text-muted-foreground hover:text-destructive ml-1 shrink-0"><X size={10} /></button>
          </div>
        ))}
      </div>
      {tableGuests.length < table.capacity && unassignedGuests.length > 0 && (
        <select onChange={(e) => { if (e.target.value) { onAssign(e.target.value, table.id); e.target.value = ""; } }} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">+ Assign guest</option>
          {unassignedGuests.map((g) => (<option key={g.id} value={g.id}>{g.full_name}</option>))}
        </select>
      )}
      {tableGuests.length >= table.capacity && <p className="text-center text-muted-foreground font-body">Table full</p>}
    </div>
  );
};

/* ─── Unassigned guests sidebar panel ─── */
const GuestSidebarPanel: React.FC<{
  unassignedGuests: Guest[];
  isOpen: boolean;
  onToggle: () => void;
}> = ({ unassignedGuests, isOpen, onToggle }) => {
  const [search, setSearch] = useState("");
  const filtered = unassignedGuests.filter((g) =>
    g.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`absolute top-0 left-0 z-20 h-full flex no-print transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-[220px]"}`}
    >
      <div className="w-[220px] h-full bg-card/95 backdrop-blur-sm border-r border-border flex flex-col overflow-hidden">
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gold" />
              <span className="font-display text-sm font-semibold">Unassigned</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">{unassignedGuests.length}</span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 font-body">
              {unassignedGuests.length === 0 ? "All guests seated!" : "No matches"}
            </p>
          )}
          {filtered.map((g) => (
            <div
              key={g.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("guest-id", g.id);
                e.dataTransfer.setData("guest-name", g.full_name);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body text-foreground cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors select-none group"
            >
              <GripVertical size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{g.full_name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 capitalize">{g.rsvp_status}</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-body text-center">Drag guests onto tables</p>
        </div>
      </div>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className="self-center -ml-px bg-card/95 backdrop-blur-sm border border-l-0 border-border rounded-r-lg px-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
        title={isOpen ? "Hide guest list" : "Show guest list"}
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  );
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ tables, guests, eventId, onAssignGuest, onRefresh }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ tableId: string; pos: { x: number; y: number } } | null>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
  const [draggingGuestFromTable, setDraggingGuestFromTable] = useState<string | null>(null);

  const canvas = orientation === "landscape" ? LANDSCAPE : PORTRAIT;
  const CANVAS_W = canvas.w;
  const CANVAS_H = canvas.h;

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    setPositions(getInitialPositions(tables, CANVAS_W, CANVAS_H));
  }, [tables, CANVAS_W, CANVAS_H]);

  useEffect(() => {
    const update = () => { if (containerRef.current) setCanvasRect(containerRef.current.getBoundingClientRect()); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale };
  }, [scale, pan]);

  const savePosition = useCallback(async (id: string, x: number, y: number) => {
    await supabase.from("seating_tables").update({ position_x: Math.round(x), position_y: Math.round(y) } as any).eq("id", id);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    const c = toCanvas(e.clientX, e.clientY);
    const cur = positions[id] ?? { x: 0, y: 0 };
    setDragging({ id, offsetX: c.x - cur.x, offsetY: c.y - cur.y });
  }, [positions, toCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setPan({ x: panning.panX + (e.clientX - panning.startX), y: panning.panY + (e.clientY - panning.startY) });
      return;
    }
    if (!dragging) return;
    const c = toCanvas(e.clientX, e.clientY);
    const x = Math.max(0, Math.min(CANVAS_W - TABLE_SIZE, c.x - dragging.offsetX));
    const y = Math.max(0, Math.min(CANVAS_H - TABLE_SIZE, c.y - dragging.offsetY));
    setPositions((prev) => ({ ...prev, [dragging.id]: { x, y } }));
  }, [dragging, panning, toCanvas, CANVAS_W, CANVAS_H]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (panning) { setPanning(null); return; }
    if (!dragging) return;
    const c = toCanvas(e.clientX, e.clientY);
    const x = Math.max(0, Math.min(CANVAS_W - TABLE_SIZE, c.x - dragging.offsetX));
    const y = Math.max(0, Math.min(CANVAS_H - TABLE_SIZE, c.y - dragging.offsetY));
    setPositions((prev) => ({ ...prev, [dragging.id]: { x, y } }));
    savePosition(dragging.id, x, y);
    setDragging(null);
  }, [dragging, panning, savePosition, toCanvas, CANVAS_W, CANVAS_H]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current)) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    }
  }, [pan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * delta));
      const ratio = newScale / scale;
      setPan((prev) => ({ x: mouseX - ratio * (mouseX - prev.x), y: mouseY - ratio * (mouseY - prev.y) }));
      setScale(newScale);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [scale]);

  const handleTableClick = useCallback((e: React.MouseEvent, id: string) => {
    if (dragging) return;
    const pos = positions[id] ?? { x: 0, y: 0 };
    const screenX = pos.x * scale + pan.x + TABLE_SIZE * scale;
    const screenY = pos.y * scale + pan.y;
    setTooltip((prev) => prev?.tableId === id ? null : { tableId: id, pos: { x: screenX, y: screenY } });
  }, [dragging, positions, scale, pan]);

  const zoomIn = () => {
    const newScale = Math.min(MAX_ZOOM, scale * 1.25);
    const ratio = newScale / scale;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) { setScale(newScale); return; }
    const cx = rect.width / 2, cy = rect.height / 2;
    setPan((p) => ({ x: cx - ratio * (cx - p.x), y: cy - ratio * (cy - p.y) }));
    setScale(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(MIN_ZOOM, scale / 1.25);
    const ratio = newScale / scale;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) { setScale(newScale); return; }
    const cx = rect.width / 2, cy = rect.height / 2;
    setPan((p) => ({ x: cx - ratio * (cx - p.x), y: cy - ratio * (cy - p.y) }));
    setScale(newScale);
  };

  const fitToView = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    const fit = Math.min(scaleX, scaleY, 1) * 0.9;
    setScale(fit);
    setPan({ x: (rect.width - CANVAS_W * fit) / 2, y: (rect.height - CANVAS_H * fit) / 2 });
  };

  const toggleOrientation = () => {
    setOrientation((o) => o === "landscape" ? "portrait" : "landscape");
    setScale(1);
    setPan({ x: 0, y: 0 });
    setTooltip(null);
  };

  const getTableGuests = (tableId: string) => guests.filter((g) => g.table_id === tableId);
  const unassignedGuests = guests.filter((g) => !g.table_id);

  /* ─── Drag-and-drop handlers for guest assignment ─── */
  const handleTableDragOver = useCallback((e: React.DragEvent, tableId: string) => {
    const guestId = e.dataTransfer.types.includes("guest-id") ? true : false;
    if (!guestId) return;
    const tGuests = guests.filter((g) => g.table_id === tableId);
    const table = tables.find((t) => t.id === tableId);
    if (!table || tGuests.length >= table.capacity) {
      // Allow drop if the dragged guest is FROM this table (no-op, but don't block)
      if (draggingGuestFromTable === tableId) { e.preventDefault(); return; }
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTableId(tableId);
  }, [guests, tables, draggingGuestFromTable]);

  const handleTableDragLeave = useCallback(() => {
    setDragOverTableId(null);
  }, []);

  const handleTableDrop = useCallback((e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    setDragOverTableId(null);
    setDraggingGuestFromTable(null);
    const guestId = e.dataTransfer.getData("guest-id");
    if (!guestId) return;
    // Don't reassign if dropping on the same table
    const guest = guests.find((g) => g.id === guestId);
    if (guest?.table_id === tableId) return;
    const table = tables.find((t) => t.id === tableId);
    const tGuests = guests.filter((g) => g.table_id === tableId);
    if (!table || tGuests.length >= table.capacity) return;
    onAssignGuest(guestId, tableId);
  }, [tables, guests, onAssignGuest]);

  const handleGuestDragStart = useCallback((e: React.DragEvent, guestId: string, guestName: string, sourceTableId: string | null) => {
    e.dataTransfer.setData("guest-id", guestId);
    e.dataTransfer.setData("guest-name", guestName);
    e.dataTransfer.effectAllowed = "move";
    setDraggingGuestFromTable(sourceTableId);
  }, []);

  const handleGuestDragEnd = useCallback(() => {
    setDraggingGuestFromTable(null);
    setDragOverTableId(null);
  }, []);

  const handlePrint = useCallback(() => {
    setTooltip(null);
    const prevScale = scale;
    const prevPan = pan;
    setScale(1);
    setPan({ x: 0, y: 0 });
    setTimeout(() => {
      window.print();
      setScale(prevScale);
      setPan(prevPan);
    }, 100);
  }, [scale, pan]);

  const confirmedGuests = guests.filter((g) => g.rsvp_status === "confirmed");

  return (
    <>
      <div id="floor-plan-print-wrapper">
      <style>{`
        @media print {
          @page { size: A4 ${orientation}; margin: 8mm; }
          body * { visibility: hidden !important; }
          #floor-plan-print-wrapper, #floor-plan-print-wrapper * { visibility: visible !important; }
          #floor-plan-print-wrapper {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 100vw !important; height: 100vh !important;
            display: flex !important;
            flex-direction: row !important;
            background: #fff !important;
          }
          #floor-plan-printable {
            flex: 1 !important;
            height: 100% !important;
            border: none !important; border-radius: 0 !important;
            background: #fff !important;
            overflow: hidden !important;
          }
          #floor-plan-printable .no-print { display: none !important; }
          #print-guest-list {
            display: block !important;
            width: 220px !important;
            min-width: 220px !important;
            height: 100% !important;
            border-left: 1px solid #ddd !important;
            padding: 10px 8px !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            font-size: 9px !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          #print-guest-list h3 {
            font-size: 11px !important;
            font-weight: 700 !important;
            margin-bottom: 6px !important;
            padding-bottom: 4px !important;
            border-bottom: 1.5px solid #333 !important;
          }
          #print-guest-list .guest-row {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            padding: 2.5px 0 !important;
            border-bottom: 0.5px solid #eee !important;
          }
          #print-guest-list .guest-checkbox {
            width: 10px !important;
            height: 10px !important;
            border: 1.2px solid #555 !important;
            border-radius: 2px !important;
            flex-shrink: 0 !important;
          }
          #print-guest-list .guest-name {
            flex: 1 !important;
          }
          #print-guest-list .guest-table {
            color: #888 !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
      <div
        id="floor-plan-printable"
        ref={containerRef}
        className="relative w-full rounded-2xl border border-border overflow-hidden"
        style={{ height: orientation === "landscape" ? 560 : 750, background: "#ffffff", cursor: panning ? "grabbing" : dragging ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onClick={() => setTooltip(null)}
      >
        {/* Guest sidebar panel */}
        {unassignedGuests.length > 0 && (
          <GuestSidebarPanel
            unassignedGuests={unassignedGuests}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((o) => !o)}
          />
        )}

        <div
          className="absolute pointer-events-none"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            background: "hsl(var(--background))",
          }}
        />

        {/* Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-start gap-2 no-print">
          <div className="flex flex-col gap-1">
            <button onClick={zoomIn} className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Zoom in"><ZoomIn size={15} /></button>
            <button onClick={zoomOut} className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Zoom out"><ZoomOut size={15} /></button>
            <button onClick={fitToView} className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Fit to view"><Maximize size={15} /></button>
            <button onClick={toggleOrientation} className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" title={`Switch to ${orientation === "landscape" ? "portrait" : "landscape"}`}>
              {orientation === "landscape" ? <RectangleVertical size={15} /> : <RectangleHorizontal size={15} />}
            </button>
            <button onClick={handlePrint} className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Print"><Printer size={15} /></button>
          </div>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2.5 flex flex-col gap-1.5 text-xs font-body">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(var(--gold))" }} /><span className="text-muted-foreground">Available</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(38 92% 50%)" }} /><span className="text-muted-foreground">Almost full</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(0 72% 51%)" }} /><span className="text-muted-foreground">Full</span></div>
          </div>
        </div>

        {/* Zoom & orientation indicator */}
        <div className="absolute bottom-3 right-3 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground font-body no-print flex items-center gap-2">
          <span className="capitalize">{orientation}</span>
          <span>·</span>
          <span>{Math.round(scale * 100)}%</span>
        </div>

        {tables.length > 0 && <p className="absolute bottom-3 left-3 text-xs text-muted-foreground font-body z-10 bg-card/80 backdrop-blur-sm rounded-lg px-2 py-1 no-print">Drag tables · Drag guests between tables · Click chairs to assign · Scroll to zoom</p>}
        {tables.length === 0 && <div className="absolute inset-0 flex items-center justify-center"><p className="text-muted-foreground font-body text-sm">No tables yet — add one above</p></div>}

        <div
          ref={canvasRef}
          style={{
            width: CANVAS_W, height: CANVAS_H,
            position: "absolute",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {tables.map((table) => {
            const pos = positions[table.id] ?? { x: 0, y: 0 };
            const tableGuests = getTableGuests(table.id);
            const isDragging = dragging?.id === table.id;
            const isDragOver = dragOverTableId === table.id;
            return (
              <div
                key={table.id}
                style={{
                  position: "absolute", left: pos.x, top: pos.y,
                  width: TABLE_SIZE, height: TABLE_SIZE,
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: isDragging ? 20 : tooltip?.tableId === table.id ? 15 : 10,
                  filter: isDragging ? "drop-shadow(0 8px 16px hsl(var(--gold) / 0.4))" : isDragOver ? "drop-shadow(0 4px 12px hsl(var(--gold) / 0.6))" : undefined,
                  transition: isDragging ? "none" : "filter 0.15s",
                  userSelect: "none",
                  borderRadius: "50%",
                  outline: isDragOver ? "2px dashed hsl(var(--gold))" : "none",
                  outlineOffset: "4px",
                }}
                onMouseDown={(e) => handleMouseDown(e, table.id)}
                onClick={(e) => { e.stopPropagation(); handleTableClick(e, table.id); }}
                onDragOver={(e) => handleTableDragOver(e, table.id)}
                onDragLeave={handleTableDragLeave}
                onDrop={(e) => handleTableDrop(e, table.id)}
              >
                <TableSVG
                  shape={table.shape}
                  capacity={table.capacity}
                  tableGuests={tableGuests}
                  unassignedGuests={unassignedGuests}
                  label={table.table_name}
                  size={TABLE_SIZE}
                  highlightEmpty={isDragOver}
                  onGuestDragStart={(e, guestId, guestName) => handleGuestDragStart(e, guestId, guestName, table.id)}
                  onGuestDragEnd={handleGuestDragEnd}
                  onSeatClick={(seatIndex) => {
                    if (seatIndex < tableGuests.length) {
                      onAssignGuest(tableGuests[seatIndex].id, null);
                    } else {
                      const screenX = pos.x * scale + pan.x + TABLE_SIZE * scale;
                      const screenY = pos.y * scale + pan.y;
                      setTooltip({ tableId: table.id, pos: { x: screenX, y: screenY } });
                    }
                  }}
                />
              </div>
            );
          })}
        </div>

        {tooltip && (() => {
          const table = tables.find((t) => t.id === tooltip.tableId);
          if (!table) return null;
          return <TableTooltip table={table} tableGuests={getTableGuests(table.id)} unassignedGuests={unassignedGuests} onAssign={onAssignGuest} onClose={() => setTooltip(null)} pos={tooltip.pos} canvasRect={canvasRect} />;
        })()}
      </div>

      {/* Print-only confirmed guest checklist */}
      <div id="print-guest-list" style={{ display: "none" }}>
        <h3>✓ Confirmed Guests ({confirmedGuests.length})</h3>
        {confirmedGuests
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
          .map((g) => {
            const assignedTable = tables.find((t) => t.id === g.table_id);
            return (
              <div key={g.id} className="guest-row">
                <div className="guest-checkbox" />
                <span className="guest-name">{g.full_name}</span>
                {assignedTable && <span className="guest-table">T{getTableNumber(assignedTable.table_name)}</span>}
              </div>
            );
          })}
      </div>
      </div>
    </>
  );
};

export default FloorPlanView;
