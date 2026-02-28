import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import FloorPlanView from "@/components/FloorPlanView";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Users, X, Loader2, LayoutGrid, Map } from "lucide-react";

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ─── Extract number from table name ─── */
const getTableNumber = (label: string): string => {
  const match = label.match(/\d+/);
  return match ? match[0] : label.charAt(0);
};

/* ─── Modern round table with bold number ─── */
const RoundTableView: React.FC<{ capacity: number; occupied: number; label: string }> = ({ capacity, occupied, label }) => {
  const r = 52;
  const seats = Array.from({ length: capacity }, (_, i) => {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    return { x: 80 + r * Math.cos(angle), y: 80 + r * Math.sin(angle) };
  });
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor = pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      <circle cx="80" cy="80" r="30" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <circle cx="80" cy="80" r="25" fill="hsl(var(--muted))" />
      <text x="80" y="88" textAnchor="middle" fontSize="24" fontWeight="800" fontFamily="'Inter', system-ui, sans-serif" fill="hsl(var(--foreground))">{getTableNumber(label)}</text>
      {seats.map((s, i) => (
        <rect key={i} x={s.x - 9} y={s.y - 9} width="18" height="18" rx="5"
          fill={i < occupied ? tableColor : "hsl(var(--card))"}
          stroke={i < occupied ? tableColor : "hsl(var(--border))"}
          strokeWidth={i < occupied ? "1.5" : "1"}
          opacity={i < occupied ? 1 : 0.45}
        />
      ))}
    </svg>
  );
};

/* ─── Modern square table with bold number ─── */
const SquareTableView: React.FC<{ capacity: number; occupied: number; label: string }> = ({ capacity, occupied, label }) => {
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor = pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";
  const perSide = Math.ceil(capacity / 4);
  const seats: { x: number; y: number }[] = [];
  const cx = 80, cy = 80, half = 28, gap = 20;
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy - half - 14 }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx + half + 14, y: cy - totalH / 2 + i * gap }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalW = (perSide - 1) * gap; seats.push({ x: cx - totalW / 2 + i * gap, y: cy + half + 14 }); }
  for (let i = 0; i < perSide && seats.length < capacity; i++) { const totalH = (perSide - 1) * gap; seats.push({ x: cx - half - 14, y: cy - totalH / 2 + i * gap }); }
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      <rect x={cx - 24} y={cy - 24} width="48" height="48" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x={cx - 20} y={cy - 20} width="40" height="40" rx="6" fill="hsl(var(--muted))" />
      <text x="80" y="88" textAnchor="middle" fontSize="24" fontWeight="800" fontFamily="'Inter', system-ui, sans-serif" fill="hsl(var(--foreground))">{getTableNumber(label)}</text>
      {seats.map((s, i) => (
        <rect key={i} x={s.x - 8} y={s.y - 8} width="16" height="16" rx="4"
          fill={i < occupied ? tableColor : "hsl(var(--card))"}
          stroke={i < occupied ? tableColor : "hsl(var(--border))"}
          strokeWidth={i < occupied ? "1.5" : "1"}
          opacity={i < occupied ? 1 : 0.45}
        />
      ))}
    </svg>
  );
};

/* ─── Modern head table with bold number ─── */
const HeadTableView: React.FC<{ capacity: number; occupied: number; label: string }> = ({ capacity, occupied, label }) => {
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor = pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";
  const seats: { x: number; y: number; isSpecial: boolean }[] = [];
  seats.push({ x: 65, y: 50, isSpecial: true });
  seats.push({ x: 95, y: 50, isSpecial: true });
  const remaining = capacity - 2;
  if (remaining > 0) {
    const gap = Math.min(20, 120 / (remaining + 1));
    const totalW = (remaining - 1) * gap;
    for (let i = 0; i < remaining; i++) {
      seats.push({ x: 80 - totalW / 2 + i * gap, y: 110, isSpecial: false });
    }
  }
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      <rect x="30" y="62" width="100" height="30" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="34" y="66" width="92" height="22" rx="10" fill="hsl(var(--muted))" />
      <text x="80" y="82" textAnchor="middle" fontSize="16" fontWeight="800" fontFamily="'Inter', system-ui, sans-serif" fill="hsl(var(--foreground))">{getTableNumber(label)}</text>
      {seats.map((s, i) => (
        <g key={i}>
          <rect x={s.x - (s.isSpecial ? 10 : 8)} y={s.y - (s.isSpecial ? 10 : 8)}
            width={s.isSpecial ? 20 : 16} height={s.isSpecial ? 20 : 16}
            rx={s.isSpecial ? 6 : 4}
            fill={i < occupied ? (s.isSpecial ? "hsl(var(--gold))" : tableColor) : "hsl(var(--card))"}
            stroke={i < occupied ? (s.isSpecial ? tableColor : tableColor) : "hsl(var(--border))"}
            strokeWidth={s.isSpecial ? "2" : "1"}
            opacity={i < occupied ? 1 : 0.45}
          />
          {s.isSpecial && <text x={s.x} y={s.y + 2} textAnchor="middle" fontSize="8" fill={i < occupied ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"} style={{ pointerEvents: "none" }}>♥</text>}
        </g>
      ))}
    </svg>
  );
};

const TablesPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const isValidId = !!eventId && UUID_REGEX.test(eventId);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ table_name: "", capacity: "8", shape: "round" as "round" | "square" | "head" });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"grid" | "floorplan">("grid");

  const fetchData = useCallback(async () => {
    if (!isValidId) { setLoading(false); return; }
    const [tablesRes, guestsRes] = await Promise.all([
      supabase.from("seating_tables").select("*").eq("event_id", eventId).order("table_name"),
      supabase.from("guests").select("id, full_name, rsvp_status, table_id").eq("event_id", eventId),
    ]);
    if (tablesRes.data) setTables(tablesRes.data as any);
    if (guestsRes.data) setGuests(guestsRes.data);
    setLoading(false);
  }, [eventId, isValidId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateTable = async () => {
    if (!form.table_name.trim()) return toast.error("Table name is required");
    const cap = parseInt(form.capacity);
    if (isNaN(cap) || cap < 1) return toast.error("Invalid capacity");
    setSaving(true);
    const { error } = await supabase.from("seating_tables").insert({
      event_id: eventId,
      table_name: form.table_name.trim(),
      capacity: cap,
      shape: form.shape,
    } as any).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Table created!");
    setForm({ table_name: "", capacity: "8", shape: "round" as "round" | "square" | "head" });
    setShowForm(false);
    fetchData();
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Delete this table? Guests will be unassigned.")) return;
    const { error } = await supabase.from("seating_tables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Table deleted");
    fetchData();
  };

  const handleAssignGuest = async (guestId: string, tableId: string | null) => {
    await supabase.from("guests").update({ table_id: tableId }).eq("id", guestId);
    fetchData();
  };

  const handleUpdateCapacity = async (tableId: string, newCapacity: number) => {
    if (newCapacity < 1 || newCapacity > 50) return;
    const tableGuests = getTableGuests(tableId);
    if (newCapacity < tableGuests.length) return toast.error("Remove guests first");
    const { error } = await supabase.from("seating_tables").update({ capacity: newCapacity } as any).eq("id", tableId);
    if (error) { toast.error(error.message); return; }
    fetchData();
  };

  const getTableGuests = (tableId: string) => guests.filter((g) => g.table_id === tableId);
  const unassignedGuests = guests.filter((g) => !g.table_id);

  if (!isValidId) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="font-display text-2xl mb-2">No event found</h2>
          <p className="text-muted-foreground font-body">Please create your invitation first from the dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-foreground">Seating Tables</h1>
            <p className="text-muted-foreground font-body mt-1">{tables.length} tables · {guests.filter(g => g.table_id).length}/{guests.length} guests seated</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted rounded-xl p-1 gap-1">
              <button onClick={() => setView("grid")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold font-body transition-all ${view === "grid" ? "bg-card shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid size={14} /> Grid
              </button>
              <button onClick={() => setView("floorplan")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold font-body transition-all ${view === "floorplan" ? "bg-card shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Map size={14} /> Floor Plan
              </button>
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 gradient-gold text-primary-foreground px-4 py-2.5 rounded-xl font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all">
              <Plus size={16} /> Add Table
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold w-8 h-8" /></div>
        ) : view === "floorplan" ? (
          <FloorPlanView tables={tables} guests={guests} eventId={eventId!} onAssignGuest={handleAssignGuest} onRefresh={fetchData} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => {
              const tableGuests = getTableGuests(table.id);
              const occupied = tableGuests.length;
              return (
                <div key={table.id} className="bg-card rounded-2xl shadow-card border border-border p-5 flex flex-col gap-3">
                  <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                    {table.shape === "head" ? (
                      <HeadTableView capacity={table.capacity} occupied={occupied} label={table.table_name} />
                    ) : table.shape === "square" ? (
                      <SquareTableView capacity={table.capacity} occupied={occupied} label={table.table_name} />
                    ) : (
                      <RoundTableView capacity={table.capacity} occupied={occupied} label={table.table_name} />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold leading-tight">Table {getTableNumber(table.table_name)}</h3>
                      <p className="text-muted-foreground font-body text-xs mt-0.5">{occupied}/{table.capacity} seats · {table.shape}</p>
                    </div>
                    <button onClick={() => handleDeleteTable(table.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 size={14} /></button>
                  </div>
                  {/* Chair capacity editor */}
                  <div className="flex items-center justify-center gap-3 py-1">
                    <button onClick={() => handleUpdateCapacity(table.id, table.capacity - 1)} disabled={table.capacity <= 1 || table.capacity <= occupied} className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="font-body text-sm font-semibold text-foreground min-w-[60px] text-center">{table.capacity} chairs</span>
                    <button onClick={() => handleUpdateCapacity(table.id, table.capacity + 1)} disabled={table.capacity >= 50} className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="space-y-1 flex-1">
                    {tableGuests.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs">
                        <span className="font-body text-foreground truncate">{g.full_name}</span>
                        <button onClick={() => handleAssignGuest(g.id, null)} className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0" title="Unassign"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                  {occupied < table.capacity && unassignedGuests.length > 0 && (
                    <select onChange={(e) => { if (e.target.value) { handleAssignGuest(e.target.value, table.id); e.target.value = ""; } }} className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">+ Assign guest</option>
                      {unassignedGuests.map((g) => (<option key={g.id} value={g.id}>{g.full_name}</option>))}
                    </select>
                  )}
                  {occupied >= table.capacity && <p className="text-xs text-center text-muted-foreground font-body">Table full</p>}
                </div>
              );
            })}
            {unassignedGuests.length > 0 && (
              <div className="bg-champagne/50 rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3"><Users size={18} className="text-gold" /><h3 className="font-display text-lg font-semibold">Unassigned</h3></div>
                <p className="text-muted-foreground font-body text-sm mb-3">{unassignedGuests.length} guests without a table</p>
                <div className="space-y-1.5">
                  {unassignedGuests.slice(0, 6).map((g) => (<div key={g.id} className="text-sm font-body text-foreground">{g.full_name}</div>))}
                  {unassignedGuests.length > 6 && <p className="text-xs text-muted-foreground">+{unassignedGuests.length - 6} more</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 w-full max-w-sm animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">New Table</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Table Shape</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["round", "square", "head"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, shape: s, ...(s === "head" ? { capacity: "2", table_name: form.table_name || "Bride & Groom" } : {}) })} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${form.shape === s ? "border-primary bg-champagne/60" : "border-border bg-background hover:bg-muted"}`}>
                      <svg viewBox="0 0 60 60" className="w-12 h-12">
                        {s === "round" ? (
                          <>
                            <circle cx="30" cy="30" r="12" fill="hsl(var(--champagne))" stroke="hsl(var(--gold))" strokeWidth="2" />
                            {[0,60,120,180,240,300].map((deg, i) => { const rad = (deg * Math.PI) / 180; return <circle key={i} cx={30 + 20 * Math.cos(rad)} cy={30 + 20 * Math.sin(rad)} r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />; })}
                          </>
                        ) : s === "square" ? (
                          <>
                            <rect x="18" y="18" width="24" height="24" rx="3" fill="hsl(var(--champagne))" stroke="hsl(var(--gold))" strokeWidth="2" />
                            {[22, 38].map((x, i) => <circle key={`t${i}`} cx={x} cy="11" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />)}
                            {[22, 38].map((x, i) => <circle key={`b${i}`} cx={x} cy="49" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />)}
                            <circle cx="11" cy="30" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                            <circle cx="49" cy="30" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                          </>
                        ) : (
                          <>
                            <rect x="10" y="22" width="40" height="14" rx="4" fill="hsl(var(--champagne))" stroke="hsl(var(--gold))" strokeWidth="2" />
                            <text x="30" y="33" textAnchor="middle" fontSize="8" fill="hsl(var(--gold))">♥</text>
                            <circle cx="22" cy="15" r="5" fill="hsl(var(--gold-light))" stroke="hsl(var(--gold))" strokeWidth="1.5" />
                            <circle cx="38" cy="15" r="5" fill="hsl(var(--gold-light))" stroke="hsl(var(--gold))" strokeWidth="1.5" />
                            <circle cx="22" cy="47" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                            <circle cx="38" cy="47" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                          </>
                        )}
                      </svg>
                      <span className="text-xs font-semibold font-body capitalize text-foreground">{s === "head" ? "Bride & Groom" : s}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Table Name</label>
                <input value={form.table_name} onChange={(e) => setForm({ ...form, table_name: e.target.value })} placeholder="Table 1, VIP Table, Family..." className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Capacity</label>
                <input type="number" min="1" max="50" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold font-body text-sm hover:bg-muted transition-all">Cancel</button>
              <button onClick={handleCreateTable} disabled={saving} className="flex-1 py-2.5 rounded-xl gradient-gold text-primary-foreground font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TablesPage;
