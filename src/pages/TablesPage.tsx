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

const TablesPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ table_name: "", capacity: "8" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    const [tablesRes, guestsRes] = await Promise.all([
      supabase.from("seating_tables").select("*").eq("event_id", eventId).order("table_name"),
      supabase.from("guests").select("id, full_name, rsvp_status, table_id").eq("event_id", eventId),
    ]);
    if (tablesRes.data) setTables(tablesRes.data);
    if (guestsRes.data) setGuests(guestsRes.data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTable = async () => {
    if (!form.table_name.trim()) return toast.error("Table name is required");
    const cap = parseInt(form.capacity);
    if (isNaN(cap) || cap < 1) return toast.error("Invalid capacity");
    setSaving(true);
    const { error } = await supabase.from("seating_tables").insert({
      event_id: eventId,
      table_name: form.table_name.trim(),
      capacity: cap,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Table created!");
    setForm({ table_name: "", capacity: "8" });
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

  const getTableGuests = (tableId: string) =>
    guests.filter((g) => g.table_id === tableId);

  const unassignedGuests = guests.filter((g) => !g.table_id);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
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
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold w-8 h-8" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const tableGuests = getTableGuests(table.id);
              const occupancy = tableGuests.length;
              const pct = Math.round((occupancy / table.capacity) * 100);
              return (
                <div key={table.id} className="bg-card rounded-2xl shadow-card border border-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{table.table_name}</h3>
                      <p className="text-muted-foreground font-body text-sm">
                        {occupancy}/{table.capacity} seats
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Capacity bar */}
                  <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100
                          ? "hsl(0 72% 51%)"
                          : pct >= 80
                          ? "hsl(38 92% 50%)"
                          : "hsl(var(--gold))",
                      }}
                    />
                  </div>

                  {/* Guests at this table */}
                  <div className="space-y-1.5 mb-3">
                    {tableGuests.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-sm">
                        <span className="font-body">{g.full_name}</span>
                        <button
                          onClick={() => handleAssignGuest(g.id, null)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Unassign"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Assign unassigned guest */}
                  {occupancy < table.capacity && unassignedGuests.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignGuest(e.target.value, table.id);
                          e.target.value = "";
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">+ Assign guest</option>
                      {unassignedGuests.map((g) => (
                        <option key={g.id} value={g.id}>{g.full_name}</option>
                      ))}
                    </select>
                  )}

                  {occupancy >= table.capacity && (
                    <p className="text-xs text-center text-muted-foreground font-body mt-2">Table is full</p>
                  )}
                </div>
              );
            })}

            {/* Unassigned guests card */}
            {unassignedGuests.length > 0 && (
              <div className="bg-champagne/50 rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-gold" />
                  <h3 className="font-display text-lg font-semibold">Unassigned</h3>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-3">{unassignedGuests.length} guests without a table</p>
                <div className="space-y-1.5">
                  {unassignedGuests.slice(0, 5).map((g) => (
                    <div key={g.id} className="text-sm font-body text-foreground">{g.full_name}</div>
                  ))}
                  {unassignedGuests.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{unassignedGuests.length - 5} more</p>
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
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold font-body text-sm hover:bg-muted transition-all">
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
