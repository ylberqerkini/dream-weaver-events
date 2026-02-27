import React, { useRef, useState, useCallback, useEffect } from "react";
import { X, Printer, ZoomIn, ZoomOut, Maximize, RectangleHorizontal, RectangleVertical } from "lucide-react";
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

const LANDSCAPE = { w: 1122, h: 793 };  // A4 landscape ratio (297×210mm)
const PORTRAIT = { w: 793, h: 1122 };   // A4 portrait ratio (210×297mm)
const TABLE_SIZE = 100;

function getInitialPositions(tables: SeatingTable[], canvasW: number, canvasH: number): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  tables.forEach((t, i) => {
    if (t.position_x || t.position_y) {
      // Clamp to canvas bounds
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

/* ─── Inline SVG table visuals with clickable seats ─── */
const TableSVG: React.FC<{
  shape: string;
  capacity: number;
  tableGuests: Guest[];
  unassignedGuests: Guest[];
  label: string;
  size: number;
  onSeatClick: (seatIndex: number) => void;
}> = ({ shape, capacity, tableGuests, unassignedGuests, label, size, onSeatClick }) => {
  const occupied = tableGuests.length;
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor =
    pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";

  const getSeatPositions = () => {
    if (shape === "head") {
      const seats: { x: number; y: number }[] = [];
      // Two special seats (bride & groom) at center back
      seats.push({ x: 40, y: 25 });
      seats.push({ x: 60, y: 25 });
      // Remaining along the front
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
      const r = 30;
      return Array.from({ length: capacity }, (_, i) => {
        const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
        return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
      });
    }
    const half = 16, gap = 14, perSide = Math.ceil(capacity / 4);
    const seats: { x: number; y: number }[] = [];
    const cx = 50, cy = 50;
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy - half - 9 }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx + half + 9, y: cy - totalH / 2 + i * gap }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy + half + 9 }); }
    for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx - half - 9, y: cy - totalH / 2 + i * gap }); }
    return seats;
  };

  const seats = getSeatPositions();
  const seatRadius = shape === "head" ? 7 : shape === "round" ? 7 : 6;
  const isHead = shape === "head";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {seats.map((s, i) => {
        const isOccupied = i < occupied;
        const guest = tableGuests[i];
        const canAssign = !isOccupied && unassignedGuests.length > 0;
        const isSpecialSeat = isHead && i < 2;
        return (
          <g key={i} style={{ cursor: (isOccupied || canAssign) ? "pointer" : "default" }} onClick={(e) => { e.stopPropagation(); if (isOccupied || canAssign) onSeatClick(i); }}>
            <circle cx={s.x} cy={s.y} r={isSpecialSeat ? 9 : seatRadius} fill={isOccupied ? (isSpecialSeat ? "hsl(var(--gold))" : tableColor) : canAssign ? "hsl(var(--muted))" : "hsl(var(--muted))"} stroke={isSpecialSeat ? tableColor : canAssign && !isOccupied ? "hsl(var(--gold))" : "hsl(var(--border))"} strokeWidth={isSpecialSeat ? "2" : canAssign && !isOccupied ? "1.8" : "1.2"} opacity={isOccupied ? 1 : canAssign ? 0.7 : 0.35} />
            {isSpecialSeat && (
              <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="5" fill={isOccupied ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"} style={{ pointerEvents: "none" }}>♥</text>
            )}
            {canAssign && !isOccupied && !isSpecialSeat && (
              <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="6" fill="hsl(var(--gold))" fontWeight="bold" style={{ pointerEvents: "none" }}>+</text>
            )}
            {isOccupied && guest && (
              <>
                <title>{guest.full_name} (click to remove)</title>
                <text x={s.x} y={s.y + seatRadius + 7} textAnchor="middle" fontSize="3.5" fill="hsl(var(--foreground))" style={{ pointerEvents: "none" }} fontFamily="'Inter', sans-serif">
                  {guest.full_name.length > 10 ? guest.full_name.slice(0, 9) + "…" : guest.full_name}
                </text>
              </>
            )}
          </g>
        );
      })}
      {shape === "head" ? (
        <>
          <rect x="15" y="35" width="70" height="20" rx="6" fill="hsl(var(--champagne))" stroke={tableColor} strokeWidth="2.5" />
          <text x="50" y="49" textAnchor="middle" fontSize="6" fill={tableColor} style={{ pointerEvents: "none" }}>♥</text>
        </>
      ) : shape === "round" ? (
        <circle cx="50" cy="50" r="20" fill="hsl(var(--champagne))" stroke={tableColor} strokeWidth="2.5" />
      ) : (
        <rect x={50 - 16} y={50 - 16} width={32} height={32} rx="4" fill="hsl(var(--champagne))" stroke={tableColor} strokeWidth="2.5" />
      )}
      <text x="50" y={shape === "head" ? "46" : "54"} textAnchor="middle" fontSize="7" fontFamily="'Playfair Display', serif" fill="hsl(var(--foreground))">
        {label.length > 8 ? label.slice(0, 7) + "…" : label}
      </text>
    </svg>
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

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 ${orientation}; margin: 10mm; }
          body * { visibility: hidden !important; }
          #floor-plan-printable, #floor-plan-printable * { visibility: visible !important; }
          #floor-plan-printable {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 100vw !important; height: 100vh !important;
            border: none !important; border-radius: 0 !important;
            background: #fff !important;
          }
          #floor-plan-printable .no-print { display: none !important; }
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

        {tables.length > 0 && <p className="absolute bottom-3 left-3 text-xs text-muted-foreground font-body z-10 bg-card/80 backdrop-blur-sm rounded-lg px-2 py-1 no-print">Drag tables · Click chairs to assign · Scroll to zoom</p>}
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
            return (
              <div key={table.id} style={{ position: "absolute", left: pos.x, top: pos.y, width: TABLE_SIZE, height: TABLE_SIZE, cursor: isDragging ? "grabbing" : "grab", zIndex: isDragging ? 20 : tooltip?.tableId === table.id ? 15 : 10, filter: isDragging ? "drop-shadow(0 8px 16px hsl(var(--gold) / 0.4))" : undefined, transition: isDragging ? "none" : "filter 0.15s", userSelect: "none" }} onMouseDown={(e) => handleMouseDown(e, table.id)} onClick={(e) => { e.stopPropagation(); handleTableClick(e, table.id); }}>
                <TableSVG
                  shape={table.shape}
                  capacity={table.capacity}
                  tableGuests={tableGuests}
                  unassignedGuests={unassignedGuests}
                  label={table.table_name}
                  size={TABLE_SIZE}
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
    </>
  );
};

export default FloorPlanView;
