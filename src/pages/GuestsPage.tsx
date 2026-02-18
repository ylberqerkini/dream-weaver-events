import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Filter, Search, Loader2, X, Check, Clock, UserX
} from "lucide-react";

interface Guest {
  id: string;
  full_name: string;
  phone: string | null;
  side: string;
  rsvp_status: string;
  table_id: string | null;
  event_id: string;
}

interface SeatingTable {
  id: string;
  table_name: string;
  capacity: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GuestsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const isValidId = !!eventId && UUID_REGEX.test(eventId);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSide, setFilterSide] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    side: "bride",
    rsvp_status: "pending",
    table_id: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!isValidId) { setLoading(false); return; }
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (data) setGuests(data);
    setLoading(false);
  }, [eventId, isValidId]);

  const fetchTables = useCallback(async () => {
    if (!isValidId) return;
    const { data } = await supabase
      .from("seating_tables")
      .select("*")
      .eq("event_id", eventId);
    if (data) setTables(data);
  }, [eventId, isValidId]);

  useEffect(() => {
    fetchGuests();
    fetchTables();
  }, [fetchGuests, fetchTables]);

  const openAdd = () => {
    setEditGuest(null);
    setFormData({ full_name: "", phone: "", side: "bride", rsvp_status: "pending", table_id: "" });
    setShowForm(true);
  };

  const openEdit = (guest: Guest) => {
    setEditGuest(guest);
    setFormData({
      full_name: guest.full_name,
      phone: guest.phone ?? "",
      side: guest.side,
      rsvp_status: guest.rsvp_status,
      table_id: guest.table_id ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      full_name: formData.full_name.trim(),
      phone: formData.phone || null,
      side: formData.side,
      rsvp_status: formData.rsvp_status,
      table_id: formData.table_id || null,
      event_id: eventId!,
    };
    if (editGuest) {
      const { error } = await supabase.from("guests").update(payload).eq("id", editGuest.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Guest updated!");
    } else {
      const { error } = await supabase.from("guests").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Guest added!");
    }
    setSaving(false);
    setShowForm(false);
    fetchGuests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guest?")) return;
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Guest removed");
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const filtered = guests.filter((g) => {
    const matchSearch = g.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (g.phone?.includes(search) ?? false);
    const matchStatus = filterStatus === "all" || g.rsvp_status === filterStatus;
    const matchSide = filterSide === "all" || g.side === filterSide;
    return matchSearch && matchStatus && matchSide;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      confirmed: "bg-green-50 text-green-700 border-green-100",
      pending: "bg-amber-50 text-amber-700 border-amber-100",
      declined: "bg-red-50 text-red-600 border-red-100",
    };
    const icons: Record<string, React.ReactNode> = {
      confirmed: <Check size={10} />,
      pending: <Clock size={10} />,
      declined: <UserX size={10} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || ""}`}>
        {icons[status]} {status}
      </span>
    );
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-foreground">Guests</h1>
            <p className="text-muted-foreground font-body mt-1">{guests.length} total guests</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 gradient-gold text-primary-foreground px-4 py-2.5 rounded-xl font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all"
          >
            <Plus size={16} /> Add Guest
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guests..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Sides</option>
            <option value="bride">Bride's Side</option>
            <option value="groom">Groom's Side</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold w-8 h-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-card border border-border p-12 text-center">
            <p className="text-muted-foreground font-body">No guests found.</p>
            <button onClick={openAdd} className="mt-4 text-gold font-semibold text-sm hover:underline">
              Add your first guest
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {["Name", "Phone", "Side", "Table", "RSVP Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((guest) => {
                    const table = tables.find((t) => t.id === guest.table_id);
                    return (
                      <tr key={guest.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold font-body text-sm">{guest.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-body text-sm">{guest.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${guest.side === "bride" ? "bg-blush/30 text-blush-deep border-blush/40" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                            {guest.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-body text-sm">{table?.table_name || "—"}</td>
                        <td className="px-4 py-3">{statusBadge(guest.rsvp_status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(guest)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDelete(guest.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">{editGuest ? "Edit Guest" : "Add Guest"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Full Name *</label>
                <input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Side</label>
                  <select
                    value={formData.side}
                    onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="bride">Bride's Side</option>
                    <option value="groom">Groom's Side</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">RSVP Status</label>
                  <select
                    value={formData.rsvp_status}
                    onChange={(e) => setFormData({ ...formData, rsvp_status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
              {tables.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Assign Table</label>
                  <select
                    value={formData.table_id}
                    onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>{t.table_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold font-body text-sm hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl gradient-gold text-primary-foreground font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                {editGuest ? "Update" : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GuestsPage;
