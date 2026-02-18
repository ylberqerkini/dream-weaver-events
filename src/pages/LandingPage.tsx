import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Flower, ArrowRight, Check, Heart, Star } from "lucide-react";

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shadow-gold">
            <Flower className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">DreamFlower</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="gradient-gold text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold font-body shadow-gold hover:opacity-90 transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-muted-foreground font-body text-sm hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link
                to="/auth"
                className="gradient-gold text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold font-body shadow-gold hover:opacity-90 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center floral-bg">
        <div className="max-w-3xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-champagne border border-border rounded-full px-5 py-2 mb-8">
            <Star size={12} className="text-gold fill-gold" />
            <span className="font-body text-xs tracking-widest uppercase text-muted-foreground">
              Beautiful Digital Wedding Invitations
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl text-foreground mb-6 leading-tight">
            Your wedding,{" "}
            <span className="italic text-gold">beautifully</span>{" "}
            shared.
          </h1>

          <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Create an elegant digital invitation, manage your guest list, track RSVPs, and organize seating—all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="gradient-gold text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold font-body shadow-gold hover:opacity-90 transition-all flex items-center gap-2"
            >
              Create Your Invitation
              <ArrowRight size={18} />
            </Link>
            <p className="text-muted-foreground font-body text-sm">Starting from <span className="text-foreground font-bold">€25</span></p>
          </div>
        </div>

        {/* Preview mockup */}
        <div className="max-w-2xl mx-auto mt-16 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="bg-card rounded-3xl shadow-card border border-border p-8 text-center">
            <p className="text-xs font-body text-muted-foreground uppercase tracking-widest mb-6">Wedding Invitation</p>
            <h2 className="font-display text-5xl text-foreground mb-2">Sofia</h2>
            <div className="flex items-center justify-center gap-4 my-3">
              <div className="flex-1 divider-gold max-w-16" />
              <span className="font-display text-xl text-gold italic">&</span>
              <div className="flex-1 divider-gold max-w-16" />
            </div>
            <h2 className="font-display text-5xl text-foreground mb-4">Alessandro</h2>
            <p className="font-body text-muted-foreground text-sm mb-6">Saturday, June 14th, 2025 · Villa Rossi, Rome</p>
            <div className="grid grid-cols-4 gap-3">
              {[{ v: "127", l: "Days" }, { v: "08", l: "Hours" }, { v: "34", l: "Min" }, { v: "22", l: "Sec" }].map(({ v, l }) => (
                <div key={l} className="bg-champagne rounded-xl p-3">
                  <p className="font-display text-2xl font-bold">{v}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl mb-4">Everything you need</h2>
            <p className="text-muted-foreground font-body">A complete wedding management platform in one elegant package</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🌸",
                title: "Beautiful Invitation Page",
                desc: "A stunning public page with countdown timer and RSVP form for your guests",
              },
              {
                icon: "👥",
                title: "Guest Management",
                desc: "Add, edit, and organize guests by side with full contact details",
              },
              {
                icon: "✅",
                title: "RSVP Tracking",
                desc: "Real-time dashboard showing confirmed, pending, and declined responses",
              },
              {
                icon: "🪑",
                title: "Seating Tables",
                desc: "Create tables, set capacities, and assign guests with drag-and-drop ease",
              },
              {
                icon: "🔗",
                title: "Shareable Link",
                desc: "Get a unique invitation link to share via WhatsApp, email, or anywhere",
              },
              {
                icon: "📊",
                title: "Live Statistics",
                desc: "Monitor your guest responses with a clean, real-time overview dashboard",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-background rounded-2xl p-6 border border-border hover:border-gold transition-colors">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-display text-xl mb-2">{title}</h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 floral-bg">
        <div className="max-w-md mx-auto text-center">
          <h2 className="font-display text-4xl mb-4">Simple pricing</h2>
          <p className="text-muted-foreground font-body mb-10">One payment, everything included</p>
          <div className="bg-card rounded-3xl shadow-card border border-border p-8">
            <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center shadow-gold mx-auto mb-4">
              <Heart size={22} className="text-primary-foreground fill-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl mb-2">Wedding Package</h3>
            <div className="flex items-baseline justify-center gap-2 my-4">
              <span className="font-display text-5xl font-bold text-foreground">€25</span>
              <span className="text-muted-foreground font-body">one-time</span>
            </div>
            <div className="divider-gold mb-6" />
            <ul className="space-y-3 mb-8 text-left">
              {[
                "Elegant digital invitation page",
                "Unlimited guests",
                "RSVP tracking dashboard",
                "Seating table management",
                "Unique shareable invite link",
                "Countdown timer",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm font-body">
                  <div className="w-5 h-5 rounded-full gradient-gold flex items-center justify-center shrink-0">
                    <Check size={11} className="text-primary-foreground" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="block w-full py-3.5 rounded-xl gradient-gold text-primary-foreground font-semibold font-body shadow-gold hover:opacity-90 transition-all text-center"
            >
              {user ? "Go to Dashboard" : "Get Started Now"}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Flower size={16} className="text-gold" />
          <span className="font-display text-sm text-foreground">DreamFlower Invitations</span>
        </div>
        <p className="text-xs text-muted-foreground font-body">© {new Date().getFullYear()} DreamFlower. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
