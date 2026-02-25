import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Users, CheckCircle, Clock, XCircle, Plus, Copy, ExternalLink, Loader2, Flower, Images, MessageCircle
} from "lucide-react";

interface EventData {
  id: string;
  event_name: string;
  bride_name: string;
  groom_name: string;
  event_date: string;
  location: string;
  slug: string;
  is_active: boolean;
}

interface GuestStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<GuestStats>({ total: 0, confirmed: 0, pending: 0, declined: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [form, setForm] = useState({
    event_name: "",
    bride_name: "",
    groom_name: "",
    event_date: "",
    location: "",
  });

  useEffect(() => {
    fetchEvent();
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (data && data.length > 0) setIsAdmin(true);
  };

  const fetchEvent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    if (data && data.length > 0) {
      setEvent(data[0]);
      fetchStats(data[0].id);
    }
    setLoading(false);
  };

  const fetchStats = async (eventId: string) => {
    const { data } = await supabase
      .from("guests")
      .select("rsvp_status")
      .eq("event_id", eventId);
    if (data) {
      setStats({
        total: data.length,
        confirmed: data.filter((g) => g.rsvp_status === "confirmed").length,
        pending: data.filter((g) => g.rsvp_status === "pending").length,
        declined: data.filter((g) => g.rsvp_status === "declined").length,
      });
    }
  };

  const handlePurchaseAndCreate = async () => {
    if (!user) return;
    if (!form.event_name || !form.bride_name || !form.groom_name || !form.event_date || !form.location) {
      toast.error("Please fill in all fields");
      return;
    }
    setPurchaseLoading(true);
    // Skip mock payment for admins
    if (!isAdmin) {
      await new Promise((r) => setTimeout(r, 1500));
    }

    const slug = `${form.bride_name.toLowerCase().replace(/\s+/g, "-")}-${form.groom_name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        event_name: form.event_name,
        bride_name: form.bride_name,
        groom_name: form.groom_name,
        event_date: form.event_date,
        location: form.location,
        slug,
        is_active: true,
      })
      .select()
      .single();

    setPurchaseLoading(false);
    if (error) {
      toast.error("Failed to create event: " + error.message);
      return;
    }
    toast.success(isAdmin ? "Event created successfully! 🌸" : "Payment successful! Your invitation has been created 🌸");
    setEvent(data);
    setShowEventForm(false);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/invite/${event?.slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  const shareWhatsApp = () => {
    if (!event) return;
    const link = `${window.location.origin}/invite/${event.slug}`;
    const message = `💒 You're invited to ${event.bride_name} & ${event.groom_name}'s wedding!\n\n📅 ${new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n📍 ${event.location}\n\nRSVP here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const statsCards = [
    { label: "Total Guests", value: stats.total, icon: Users, color: "bg-blush/30 text-blush-deep" },
    { label: "Confirmed", value: stats.confirmed, icon: CheckCircle, color: "bg-green-50 text-green-600" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Declined", value: stats.declined, icon: XCircle, color: "bg-red-50 text-red-500" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gold w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl text-foreground">
            {event ? `Welcome back ✨` : "Welcome to DreamFlower"}
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {event
              ? `Managing "${event.event_name}"`
              : "Purchase your invitation to get started"}
          </p>
        </div>

        {!event ? (
          /* No event yet – purchase flow */
          <div className="max-w-2xl">
            {!showEventForm ? (
              <div className="bg-card rounded-2xl shadow-card border border-border p-8 text-center">
                <div className="w-20 h-20 rounded-full gradient-blush flex items-center justify-center mx-auto mb-6">
                  <Flower className="w-10 h-10 text-blush-deep" />
                </div>
                <h2 className="font-display text-2xl mb-3">Create Your Invitation</h2>
                <p className="text-muted-foreground font-body mb-6 max-w-md mx-auto">
                  Get a beautiful digital wedding invitation with guest management, RSVP tracking, and seating tables.
                </p>
                {isAdmin ? (
                  <div className="inline-block bg-green-50 border border-green-200 rounded-xl px-6 py-3 mb-6">
                    <span className="font-display text-lg text-green-700 font-bold">Admin Access — Free</span>
                  </div>
                ) : (
                  <div className="inline-block bg-champagne rounded-xl px-6 py-3 mb-6">
                    <span className="font-display text-3xl text-foreground font-bold">€25</span>
                    <span className="text-muted-foreground font-body ml-2">one-time payment</span>
                  </div>
                )}
                <ul className="text-sm text-muted-foreground font-body space-y-2 mb-8 text-left max-w-xs mx-auto">
                  {["Beautiful digital invitation page", "Unlimited guest management", "RSVP tracking", "Seating table management", "Unique invitation link"].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowEventForm(true)}
                  className="gradient-gold text-primary-foreground px-8 py-3.5 rounded-xl font-semibold font-body shadow-gold hover:opacity-90 transition-all"
                >
                  {isAdmin ? "Create Invitation (Admin)" : "Purchase Invitation – €25"}
                </button>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-card border border-border p-8">
                <h2 className="font-display text-2xl mb-6">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Event Name</label>
                    <input
                      value={form.event_name}
                      onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                      placeholder="Our Wedding Day"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Bride's Name</label>
                      <input
                        value={form.bride_name}
                        onChange={(e) => setForm({ ...form, bride_name: e.target.value })}
                        placeholder="Sofia"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Groom's Name</label>
                      <input
                        value={form.groom_name}
                        onChange={(e) => setForm({ ...form, groom_name: e.target.value })}
                        placeholder="Alessandro"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Event Date</label>
                    <input
                      type="date"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Location</label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Villa Rossi, Rome, Italy"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-foreground font-semibold font-body hover:bg-muted transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePurchaseAndCreate}
                    disabled={purchaseLoading}
                    className="flex-1 py-3 rounded-xl gradient-gold text-primary-foreground font-semibold font-body shadow-gold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {purchaseLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> {isAdmin ? "Creating..." : "Processing payment..."}</>
                    ) : (
                      isAdmin ? "Create Event" : "Pay €25 & Create"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Event info banner */}
            <div className="bg-card rounded-2xl shadow-card border border-border p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
                    <span className="text-xs font-body text-green-600 font-semibold uppercase tracking-wider">Active</span>
                  </div>
                  <h2 className="font-display text-xl text-foreground">{event.event_name}</h2>
                  <p className="text-muted-foreground font-body text-sm mt-0.5">
                    {event.bride_name} & {event.groom_name} · {new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-muted-foreground font-body text-sm">{event.location}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground text-sm font-semibold font-body hover:bg-muted transition-all"
                  >
                    <Copy size={14} />
                    Copy Link
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-body transition-all"
                    style={{ background: "#25D366", color: "#fff" }}
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                  <a
                    href={`/invite/${event.slug}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-gold text-primary-foreground text-sm font-semibold font-body shadow-gold hover:opacity-90 transition-all"
                  >
                    <ExternalLink size={14} />
                    Preview
                  </a>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card rounded-2xl shadow-card border border-border p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <p className="font-display text-3xl font-bold text-foreground">{value}</p>
                  <p className="text-muted-foreground font-body text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/dashboard/guests/${event.id}`)}
                className="bg-card rounded-2xl shadow-card border border-border p-6 text-left hover:border-gold transition-all group"
              >
                <Users className="text-gold mb-3" size={24} />
                <h3 className="font-display text-lg mb-1">Manage Guests</h3>
                <p className="text-muted-foreground font-body text-sm">Add, edit, and track RSVP responses</p>
                <div className="mt-4 flex items-center gap-2 text-gold text-sm font-semibold font-body">
                  Go to Guests <ChevronRight size={14} />
                </div>
              </button>
              <button
                onClick={() => navigate(`/dashboard/tables/${event.id}`)}
                className="bg-card rounded-2xl shadow-card border border-border p-6 text-left hover:border-gold transition-all group"
              >
                <div className="text-gold mb-3"><TableIcon /></div>
                <h3 className="font-display text-lg mb-1">Seating Tables</h3>
                <p className="text-muted-foreground font-body text-sm">Create tables and assign guests</p>
                <div className="mt-4 flex items-center gap-2 text-gold text-sm font-semibold font-body">
                  Go to Tables <ChevronRight size={14} />
                </div>
              </button>
              <button
                onClick={() => navigate(`/dashboard/gallery`)}
                className="bg-card rounded-2xl shadow-card border border-border p-6 text-left hover:border-gold transition-all group"
              >
                <Images className="text-gold mb-3" size={24} />
                <h3 className="font-display text-lg mb-1">Photo Gallery</h3>
                <p className="text-muted-foreground font-body text-sm">Upload photos for your invitation</p>
                <div className="mt-4 flex items-center gap-2 text-gold text-sm font-semibold font-body">
                  Manage Photos <ChevronRight size={14} />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const ChevronRight: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const TableIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

export default DashboardPage;
