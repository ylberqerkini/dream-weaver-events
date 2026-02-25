import React, { useRef, useState, useCallback, useEffect } from "react";
import { X, Printer } from "lucide-react";
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

const CANVAS_W = 1200;
const CANVAS_H = 800;
const TABLE_SIZE = 100;

function getInitialPositions(tables: SeatingTable[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  tables.forEach((t, i) => {
    if (t.position_x || t.position_y) {
      positions[t.id] = { x: t.position_x, y: t.position_y };
    } else {
      const cols = 5;
      positions[t.id] = { x: 80 + (i % cols) * 180, y: 80 + Math.floor(i / cols) * 180 };
    }
  });
  return positions;
}

/* ─── Inline SVG table visuals ─── */
const TableSVG: React.FC<{
  shape: string;
  capacity: number;
  occupied: number;
  label: string;
  size: number;
}> = ({ shape, capacity, occupied, label, size }) => {
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor =
    pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";

  if (shape === "round") {
    const r = 30;
    const seats = Array.from({ length: capacity }, (_, i) => {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
    });
    return (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {seats.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r="7" fill={i < occupied ? tableColor : "hsl(var(--muted))"} stroke="hsl(var(--border))" strokeWidth="1.2" opacity={i < occupied ? 1 : 0.5} />
        ))}
        <circle cx="50" cy="50" r="20" fill="hsl(var(--champagne))" stroke={tableColor} strokeWidth="2.5" />
        <text x="50" y="54" textAnchor="middle" fontSize="7" fontFamily="'Playfair Display', serif" fill="hsl(var(--foreground))">
          {label.length > 8 ? label.slice(0, 7) + "…" : label}
        </text>
      </svg>
    );
  }

  // Square
  const half = 16, gap = 14, perSide = Math.ceil(capacity / 4);
  const seats: { x: number; y: number }[] = [];
  const cx = 50, cy = 50;
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy - half - 9 }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx + half + 9, y: cy - totalH / 2 + i * gap }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy + half + 9 }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx - half - 9, y: cy - totalH / 2 + i * gap }); }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {seats.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="6" fill={i < occupied ? tableColor : "hsl(var(--muted))"} stroke="hsl(var(--border))" strokeWidth="1.2" opacity={i < occupied ? 1 : 0.5} />
      ))}
      <rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} rx="4" fill="hsl(var(--champagne))" stroke={tableColor} strokeWidth="2.5" />
      <text x="50" y="54" textAnchor="middle" fontSize="7" fontFamily="'Playfair Display', serif" fill="hsl(var(--foreground))">
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

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ tables, guests, eventId, onAssignGuest, onRefresh }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ tableId: string; pos: { x: number; y: number } } | null>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setPositions(getInitialPositions(tables));
  }, [tables]);

  useEffect(() => {
    const update = () => { if (canvasRef.current) setCanvasRect(canvasRef.current.getBoundingClientRect()); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const savePosition = useCallback(async (id: string, x: number, y: number) => {
    await supabase.from("seating_tables").update({ position_x: Math.round(x), position_y: Math.round(y) } as any).eq("id", id);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setTooltip(null);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cur = positions[id] ?? { x: 0, y: 0 };
    setDragging({ id, offsetX: e.clientX - rect.left - cur.x, offsetY: e.clientY - rect.top - cur.y });
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(CANVAS_W - TABLE_SIZE, e.clientX - rect.left - dragging.offsetX));
    const y = Math.max(0, Math.min(CANVAS_H - TABLE_SIZE, e.clientY - rect.top - dragging.offsetY));
    setPositions((prev) => ({ ...prev, [dragging.id]: { x, y } }));
  }, [dragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(CANVAS_W - TABLE_SIZE, e.clientX - rect.left - dragging.offsetX));
    const y = Math.max(0, Math.min(CANVAS_H - TABLE_SIZE, e.clientY - rect.top - dragging.offsetY));
    setPositions((prev) => ({ ...prev, [dragging.id]: { x, y } }));
    savePosition(dragging.id, x, y);
    setDragging(null);
  }, [dragging, savePosition]);

  const handleTableClick = useCallback((e: React.MouseEvent, id: string) => {
    if (dragging) return;
    const pos = positions[id] ?? { x: 0, y: 0 };
    setTooltip((prev) => prev?.tableId === id ? null : { tableId: id, pos: { x: pos.x + TABLE_SIZE, y: pos.y } });
  }, [dragging, positions]);

  const getTableGuests = (tableId: string) => guests.filter((g) => g.table_id === tableId);
  const unassignedGuests = guests.filter((g) => !g.table_id);

  const handlePrint = useCallback(() => {
    setTooltip(null);
    setTimeout(() => window.print(), 100);
  }, []);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
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
      <div id="floor-plan-printable" className="relative w-full rounded-2xl border border-border overflow-hidden" style={{ height: 560, background: "#ffffff" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(hsl(0 0% 88%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 88%) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute top-3 right-3 z-10 flex items-start gap-2 no-print">
          <button onClick={handlePrint} className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2 text-muted-foreground hover:text-foreground transition-colors" title="Print floor plan">
            <Printer size={16} />
          </button>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2.5 flex flex-col gap-1.5 text-xs font-body">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(var(--gold))" }} /><span className="text-muted-foreground">Available</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(38 92% 50%)" }} /><span className="text-muted-foreground">Almost full</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(0 72% 51%)" }} /><span className="text-muted-foreground">Full</span></div>
          </div>
        </div>
        {tables.length > 0 && <p className="absolute bottom-3 left-3 text-xs text-muted-foreground font-body z-10 bg-card/80 backdrop-blur-sm rounded-lg px-2 py-1 no-print">Drag to rearrange · Click to manage guests</p>}
        {tables.length === 0 && <div className="absolute inset-0 flex items-center justify-center"><p className="text-muted-foreground font-body text-sm">No tables yet — add one above</p></div>}

      <div ref={canvasRef} className="relative w-full h-full overflow-auto" style={{ cursor: dragging ? "grabbing" : "default" }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={() => setTooltip(null)}>
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: "relative" }}>
          {tables.map((table) => {
            const pos = positions[table.id] ?? { x: 0, y: 0 };
            const tableGuests = getTableGuests(table.id);
            const isDragging = dragging?.id === table.id;
            return (
              <div key={table.id} style={{ position: "absolute", left: pos.x, top: pos.y, width: TABLE_SIZE, height: TABLE_SIZE, cursor: isDragging ? "grabbing" : "grab", zIndex: isDragging ? 20 : tooltip?.tableId === table.id ? 15 : 10, filter: isDragging ? "drop-shadow(0 8px 16px hsl(var(--gold) / 0.4))" : undefined, transition: isDragging ? "none" : "filter 0.15s", userSelect: "none" }} onMouseDown={(e) => handleMouseDown(e, table.id)} onClick={(e) => { e.stopPropagation(); handleTableClick(e, table.id); }}>
                <TableSVG shape={table.shape} capacity={table.capacity} occupied={tableGuests.length} label={table.table_name} size={TABLE_SIZE} />
              </div>
            );
          })}
          {tooltip && (() => {
            const table = tables.find((t) => t.id === tooltip.tableId);
            if (!table) return null;
            return <TableTooltip table={table} tableGuests={getTableGuests(table.id)} unassignedGuests={unassignedGuests} onAssign={onAssignGuest} onClose={() => setTooltip(null)} pos={tooltip.pos} canvasRect={canvasRect} />;
          })()}
        </div>
      </div>
      </div>
    </>
  );
};

export default FloorPlanView;
