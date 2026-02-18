import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Flower, LayoutDashboard, Users, Table2, LogOut, Menu, X, ChevronRight, Crown, Images
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roles?.some((r) => r.role === "admin")) setIsAdmin(true);

      const { data: events } = await supabase
        .from("events")
        .select("id, slug")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (events) {
        setEventSlug(events.slug);
        setEventId(events.id);
      }
    };
    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ...(eventId
      ? [
          { href: `/dashboard/guests/${eventId}`, label: "Guests", icon: Users },
          { href: `/dashboard/tables/${eventId}`, label: "Seating Tables", icon: Table2 },
          { href: `/dashboard/gallery`, label: "Photo Gallery", icon: Images },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: Crown }] : []),
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-30 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <Flower className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display font-semibold text-sidebar-foreground text-sm leading-none">DreamFlower</p>
              <p className="text-xs text-sidebar-foreground/50 font-body tracking-wider mt-0.5">Invitations</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 group ${
                isActive(href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-gold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
              {isActive(href) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}

          {eventSlug && (
            <div className="pt-4">
              <p className="text-xs text-sidebar-foreground/40 font-body uppercase tracking-widest px-3 mb-2">
                Invite Link
              </p>
              <Link
                to={`/invite/${eventSlug}`}
                target="_blank"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all"
              >
                <Flower size={18} className="text-gold shrink-0" />
                <span className="truncate">View Invitation</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full gradient-blush flex items-center justify-center text-xs font-bold text-foreground">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.email}</p>
              {isAdmin && <p className="text-xs text-gold">Admin</p>}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground p-1">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Flower className="w-5 h-5 text-gold" />
            <span className="font-display font-semibold text-sm">DreamFlower</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
