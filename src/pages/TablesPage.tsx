import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Plus, Trash2, Users, X, Loader2 } from "lucide-react";

interface SeatingTable {
  id: string;
  table_name: string;
  capacity: number;
  event_id: string;
}

interface Guest {
  id: string;
  full_name: string;
  rsvp_status: string;
  table_id: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ─── Top-view seat dots around a round table ─── */
const RoundTableView: React.FC<{
  capacity: number;
  occupied: number;
  label: string;
}> = ({ capacity, occupied, label }) => {
  const r = 52; // radius of seat orbit
  const seats = Array.from({ length: capacity }, (_, i) => {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    return { x: 80 + r * Math.cos(angle), y: 80 + r * Math.sin(angle) };
  });
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor =
    pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";

  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* Table surface */}
      <circle
        cx="80" cy="80" r="34"
        fill="hsl(var(--champagne))"
        stroke={tableColor}
        strokeWidth="3"
      />
      {/* Label */}
      <text
        x="80" y="84"
        textAnchor="middle"
        fontSize="9"
        fontFamily="'Playfair Display', serif"
        fill="hsl(var(--foreground))"
      >
        {label.length > 9 ? label.slice(0, 8) + "…" : label}
      </text>
      {/* Seats */}
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r="10"
          fill={i < occupied ? tableColor : "hsl(var(--muted))"}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          opacity={i < occupied ? 1 : 0.5}
        />
      ))}
    </svg>
  );
};

/* ─── Top-view seat dots around a square table ─── */
const SquareTableView: React.FC<{
  capacity: number;
  occupied: number;
  label: string;
}> = ({ capacity, occupied, label }) => {
  const pct = capacity > 0 ? occupied / capacity : 0;
  const tableColor =
    pct >= 1 ? "hsl(0 72% 51%)" : pct >= 0.8 ? "hsl(38 92% 50%)" : "hsl(var(--gold))";

  // Distribute seats around 4 sides
  const perSide = Math.ceil(capacity / 4);
  const seats: { x: number; y: number }[] = [];
  const cx = 80, cy = 80, half = 30, gap = 20;

  // top
  for (let i = 0; i < perSide && seats.length < capacity; i++) {
    const totalW = (perSide - 1) * gap;
    seats.push({ x: cx - totalW / 2 + i * gap, y: cy - half - 14 });
  }
  // right
  for (let i = 0; i < perSide && seats.length < capacity; i++) {
    const totalH = (perSide - 1) * gap;
    seats.push({ x: cx + half + 14, y: cy - totalH / 2 + i * gap });
  }
  // bottom
  for (let i = 0; i < perSide && seats.length < capacity; i++) {
    const totalW = (perSide - 1) * gap;
    seats.push({ x: cx - totalW / 2 + i * gap, y: cy + half + 14 });
  }
  // left
  for (let i = 0; i < perSide && seats.length < capacity; i++) {
    const totalH = (perSide - 1) * gap;
    seats.push({ x: cx - half - 14, y: cy - totalH / 2 + i * gap });
  }

  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* Table surface */}
      <rect
        x={cx - half} y={cy - half}
        width={half * 2} height={half * 2}
        rx="6"
        fill="hsl(var(--champagne))"
        stroke={tableColor}
        strokeWidth="3"
      />
      {/* Label */}
      <text
        x="80" y="84"
        textAnchor="middle"
        fontSize="9"
        fontFamily="'Playfair Display', serif"
        fill="hsl(var(--foreground))"
      >
        {label.length > 9 ? label.slice(0, 8) + "…" : label}
      </text>
      {/* Seats */}
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r="9"
          fill={i < occupied ? tableColor : "hsl(var(--muted))"}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          opacity={i < occupied ? 1 : 0.5}
        />
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
  const [form, setForm] = useState({ table_name: "", capacity: "8", shape: "round" as "round" | "square" });
  const [saving, setSaving] = useState(false);
  // local shape memory keyed by table id
  const [shapeMap, setShapeMap] = useState<Record<string, "round" | "square">>({});

  const fetchData = useCallback(async () => {
    if (!isValidId) { setLoading(false); return; }
    const [tablesRes, guestsRes] = await Promise.all([
      supabase.from("seating_tables").select("*").eq("event_id", eventId).order("table_name"),
      supabase.from("guests").select("id, full_name, rsvp_status, table_id").eq("event_id", eventId),
    ]);
    if (tablesRes.data) setTables(tablesRes.data);
    if (guestsRes.data) setGuests(guestsRes.data);
    setLoading(false);
  }, [eventId, isValidId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Restore shape map from localStorage
  useEffect(() => {
    if (!eventId) return;
    const stored = localStorage.getItem(`shapeMap_${eventId}`);
    if (stored) setShapeMap(JSON.parse(stored));
  }, [eventId]);

  const saveShapeMap = (map: Record<string, "round" | "square">) => {
    setShapeMap(map);
    if (eventId) localStorage.setItem(`shapeMap_${eventId}`, JSON.stringify(map));
  };

  const handleCreateTable = async () => {
    if (!form.table_name.trim()) return toast.error("Table name is required");
    const cap = parseInt(form.capacity);
    if (isNaN(cap) || cap < 1) return toast.error("Invalid capacity");
    setSaving(true);
    const { data, error } = await supabase.from("seating_tables").insert({
      event_id: eventId,
      table_name: form.table_name.trim(),
      capacity: cap,
    }).select().single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Error"); return; }
    // store shape choice
    saveShapeMap({ ...shapeMap, [data.id]: form.shape });
    toast.success("Table created!");
    setForm({ table_name: "", capacity: "8", shape: "round" });
    setShowForm(false);
    fetchData();
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Delete this table? Guests will be unassigned.")) return;
    const { error } = await supabase.from("seating_tables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    const next = { ...shapeMap };
    delete next[id];
    saveShapeMap(next);
    toast.success("Table deleted");
    fetchData();
  };

  const handleAssignGuest = async (guestId: string, tableId: string | null) => {
    await supabase.from("guests").update({ table_id: tableId }).eq("id", guestId);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-foreground">Seating Tables</h1>
            <p className="text-muted-foreground font-body mt-1">{tables.length} tables created</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 gradient-gold text-primary-foreground px-4 py-2.5 rounded-xl font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all"
          >
            <Plus size={16} /> Add Table
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-gold w-8 h-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => {
              const tableGuests = getTableGuests(table.id);
              const occupied = tableGuests.length;
              const shape = shapeMap[table.id] ?? "round";

              return (
                <div key={table.id} className="bg-card rounded-2xl shadow-card border border-border p-5 flex flex-col gap-3">
                  {/* Top-view visual */}
                  <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                    {shape === "round" ? (
                      <RoundTableView capacity={table.capacity} occupied={occupied} label={table.table_name} />
                    ) : (
                      <SquareTableView capacity={table.capacity} occupied={occupied} label={table.table_name} />
                    )}
                  </div>

                  {/* Info row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold leading-tight">{table.table_name}</h3>
                      <p className="text-muted-foreground font-body text-xs mt-0.5">
                        {occupied}/{table.capacity} seats · {shape}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Guests list */}
                  <div className="space-y-1 flex-1">
                    {tableGuests.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs">
                        <span className="font-body text-foreground truncate">{g.full_name}</span>
                        <button
                          onClick={() => handleAssignGuest(g.id, null)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
                          title="Unassign"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Assign dropdown */}
                  {occupied < table.capacity && unassignedGuests.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) { handleAssignGuest(e.target.value, table.id); e.target.value = ""; }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">+ Assign guest</option>
                      {unassignedGuests.map((g) => (
                        <option key={g.id} value={g.id}>{g.full_name}</option>
                      ))}
                    </select>
                  )}
                  {occupied >= table.capacity && (
                    <p className="text-xs text-center text-muted-foreground font-body">Table full</p>
                  )}
                </div>
              );
            })}

            {/* Unassigned card */}
            {unassignedGuests.length > 0 && (
              <div className="bg-champagne/50 rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-gold" />
                  <h3 className="font-display text-lg font-semibold">Unassigned</h3>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-3">
                  {unassignedGuests.length} guests without a table
                </p>
                <div className="space-y-1.5">
                  {unassignedGuests.slice(0, 6).map((g) => (
                    <div key={g.id} className="text-sm font-body text-foreground">{g.full_name}</div>
                  ))}
                  {unassignedGuests.length > 6 && (
                    <p className="text-xs text-muted-foreground">+{unassignedGuests.length - 6} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add table modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 w-full max-w-sm animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">New Table</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Shape picker */}
              <div>
                <label className="block text-sm font-semibold mb-2">Table Shape</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["round", "square"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, shape: s })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.shape === s
                          ? "border-primary bg-champagne/60"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {/* Mini preview */}
                      <svg viewBox="0 0 60 60" className="w-12 h-12">
                        {s === "round" ? (
                          <>
                            <circle cx="30" cy="30" r="12" fill="hsl(var(--champagne))" stroke="hsl(var(--gold))" strokeWidth="2" />
                            {[0,60,120,180,240,300].map((deg, i) => {
                              const rad = (deg * Math.PI) / 180;
                              return <circle key={i} cx={30 + 20 * Math.cos(rad)} cy={30 + 20 * Math.sin(rad)} r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />;
                            })}
                          </>
                        ) : (
                          <>
                            <rect x="18" y="18" width="24" height="24" rx="3" fill="hsl(var(--champagne))" stroke="hsl(var(--gold))" strokeWidth="2" />
                            {/* top seats */}
                            {[22, 38].map((x, i) => <circle key={`t${i}`} cx={x} cy="11" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />)}
                            {/* bottom seats */}
                            {[22, 38].map((x, i) => <circle key={`b${i}`} cx={x} cy="49" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />)}
                            {/* left */}
                            <circle cx="11" cy="30" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                            {/* right */}
                            <circle cx="49" cy="30" r="4" fill="hsl(var(--gold-light))" stroke="hsl(var(--border))" strokeWidth="1" />
                          </>
                        )}
                      </svg>
                      <span className="text-xs font-semibold font-body capitalize text-foreground">{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Table Name</label>
                <input
                  value={form.table_name}
                  onChange={(e) => setForm({ ...form, table_name: e.target.value })}
                  placeholder="Table 1, VIP Table, Family..."
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold font-body text-sm hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl gradient-gold text-primary-foreground font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
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
