import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Users, Calendar, BarChart3 } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalGuests: number;
  confirmedGuests: number;
}

interface AdminEvent {
  id: string;
  event_name: string;
  bride_name: string;
  groom_name: string;
  event_date: string;
  is_active: boolean;
  created_at: string;
  user_email?: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalEvents: 0, totalGuests: 0, confirmedGuests: 0 });
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setIsAdmin(!!data);
      if (data) fetchAdminData();
      else setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const fetchAdminData = async () => {
    const [eventsRes, guestsRes, profilesRes] = await Promise.all([
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("guests").select("rsvp_status"),
      supabase.from("profiles").select("id, email"),
    ]);

    const eventsData = eventsRes.data || [];
    const guestsData = guestsRes.data || [];
    const profilesData = profilesRes.data || [];

    setStats({
      totalUsers: profilesData.length,
      totalEvents: eventsData.length,
      totalGuests: guestsData.length,
      confirmedGuests: guestsData.filter((g) => g.rsvp_status === "confirmed").length,
    });

    // Merge email from profiles
    const merged: AdminEvent[] = eventsData.map((ev) => {
      const profile = profilesData.find((p) => p.id === ev.user_id);
      return { ...ev, user_email: profile?.email };
    });
    setEvents(merged);
    setLoading(false);
  };

  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground font-body mt-1">Platform-wide statistics and management</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold w-8 h-8" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-blush/30 text-blush-deep" },
                { label: "Total Events", value: stats.totalEvents, icon: Calendar, color: "bg-champagne text-gold" },
                { label: "Total Guests", value: stats.totalGuests, icon: Users, color: "bg-blue-50 text-blue-600" },
                { label: "Confirmed RSVPs", value: stats.confirmedGuests, icon: BarChart3, color: "bg-green-50 text-green-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card rounded-2xl shadow-card border border-border p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <p className="font-display text-3xl font-bold">{value}</p>
                  <p className="text-muted-foreground font-body text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Events table */}
            <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-display text-lg">All Events</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {["Event", "Couple", "Date", "User", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold font-body text-sm">{ev.event_name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                          {ev.bride_name} & {ev.groom_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                          {new Date(ev.event_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                          {ev.user_email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            ev.is_active
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {ev.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
