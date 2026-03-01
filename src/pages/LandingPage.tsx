import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Flower, ArrowRight, Check, Heart, Star, Sparkles, Crown, Palette } from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const FadeInSection: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = "",
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const FloatingPetal: React.FC<{ emoji: string; style: React.CSSProperties }> = ({ emoji, style }) => (
  <motion.span
    className="absolute text-2xl pointer-events-none select-none opacity-30"
    style={style}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 15, -10, 0],
      scale: [1, 1.08, 1],
    }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 3 }}
  >
    {emoji}
  </motion.span>
);

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const petals = [
    { emoji: "🌸", style: { top: "8%", left: "6%" } },
    { emoji: "🌿", style: { top: "18%", right: "8%" } },
    { emoji: "✨", style: { top: "60%", left: "3%" } },
    { emoji: "🌸", style: { top: "70%", right: "5%" } },
    { emoji: "🌿", style: { bottom: "12%", left: "12%" } },
    { emoji: "✨", style: { bottom: "20%", right: "10%" } },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/70 backdrop-blur-xl border-b border-border/30"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 20, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shadow-gold"
          >
            <Flower className="w-4.5 h-4.5 text-primary-foreground" />
          </motion.div>
          <span className="font-display font-semibold text-foreground text-lg tracking-tight">DreamFlower</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="gradient-gold text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold font-body shadow-gold hover:shadow-lg hover:scale-[1.03] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-muted-foreground font-body text-sm hover:text-foreground transition-colors">
                Sign In
              </Link>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/auth"
                  className="gradient-gold text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold font-body shadow-gold hover:shadow-lg transition-all duration-300"
                >
                  Get Started
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </motion.nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-36 pb-24 px-4 text-center overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsl(var(--blush)) 0%, transparent 70%)" }}
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, hsl(var(--gold-light)) 0%, transparent 70%)" }}
            animate={{ x: [0, -25, 0], y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(var(--champagne)) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Floating petals */}
        {petals.map((p, i) => (
          <FloatingPetal key={i} emoji={p.emoji} style={p.style} />
        ))}

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-champagne/60 backdrop-blur-sm border border-gold/20 rounded-full px-6 py-2.5 mb-8"
          >
            <Sparkles size={13} className="text-gold" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
              Premium Digital Invitations
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground mb-6 leading-[1.05]"
          >
            Your wedding,{" "}
            <span className="relative inline-block">
              <span className="italic bg-gradient-to-r from-gold-dark via-gold to-gold-light bg-clip-text text-transparent">
                beautifully
              </span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold)), transparent)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </span>{" "}
            shared.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed"
          >
            Create an elegant digital invitation, manage your guest list, track RSVPs, and organize seating—all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={user ? "/dashboard" : "/auth"}
                className="group gradient-gold text-primary-foreground px-9 py-4.5 rounded-2xl text-base font-semibold font-body shadow-gold hover:shadow-lg transition-all duration-300 flex items-center gap-2.5"
              >
                Create Your Invitation
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <p className="text-muted-foreground font-body text-sm">
              Starting from <span className="text-foreground font-bold text-base">€25</span>
            </p>
          </motion.div>
        </motion.div>

        {/* Preview mockup */}
        <FadeInSection delay={0.3} className="max-w-2xl mx-auto mt-20">
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative bg-card rounded-3xl border border-border/60 p-8 text-center group"
            style={{ boxShadow: "0 20px 60px -15px hsl(var(--gold) / 0.15), 0 8px 24px -8px hsl(var(--foreground) / 0.06)" }}
          >
            {/* Shimmer border effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{
                  background: "linear-gradient(135deg, transparent 30%, hsl(var(--gold) / 0.1) 50%, transparent 70%)",
                  backgroundSize: "200% 200%",
                  animation: "shimmer 3s linear infinite",
                }}
              />
            </div>

            <p className="text-xs font-body text-muted-foreground uppercase tracking-[0.25em] mb-6">Wedding Invitation</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground mb-2">Sofia</h2>
            <div className="flex items-center justify-center gap-4 my-4">
              <div className="flex-1 divider-gold max-w-20" />
              <motion.span
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="font-display text-2xl text-gold italic"
              >
                &amp;
              </motion.span>
              <div className="flex-1 divider-gold max-w-20" />
            </div>
            <h2 className="font-display text-5xl md:text-6xl text-foreground mb-5">Alessandro</h2>
            <p className="font-body text-muted-foreground text-sm mb-8">Saturday, June 14th, 2025 · Villa Rossi, Rome</p>
            <div className="grid grid-cols-4 gap-3">
              {[{ v: "127", l: "Days" }, { v: "08", l: "Hours" }, { v: "34", l: "Min" }, { v: "22", l: "Sec" }].map(({ v, l }, i) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="bg-champagne/50 backdrop-blur-sm rounded-xl p-3.5 border border-gold/10"
                >
                  <p className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">{v}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1 tracking-wider uppercase">{l}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </FadeInSection>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <Crown size={14} className="text-gold" />
              <span className="font-body text-xs tracking-[0.2em] uppercase text-gold">Premium Features</span>
              <Crown size={14} className="text-gold" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl mb-4">Everything you need</h2>
            <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
              A complete wedding management platform in one elegant package
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "🌸", title: "Beautiful Invitation Page", desc: "A stunning public page with countdown timer and RSVP form for your guests" },
              { icon: "👥", title: "Guest Management", desc: "Add, edit, and organize guests by side with full contact details" },
              { icon: "✅", title: "RSVP Tracking", desc: "Real-time dashboard showing confirmed, pending, and declined responses" },
              { icon: "🪑", title: "Seating Tables", desc: "Create tables, set capacities, and assign guests with drag-and-drop ease" },
              { icon: "🔗", title: "Shareable Link", desc: "Get a unique invitation link to share via WhatsApp, email, or anywhere" },
              { icon: "📊", title: "Live Statistics", desc: "Monitor your guest responses with a clean, real-time overview dashboard" },
            ].map(({ icon, title, desc }, i) => (
              <FadeInSection key={title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-full bg-background rounded-2xl p-7 border border-border/60 hover:border-gold/40 transition-colors duration-500 group cursor-default"
                  style={{ boxShadow: "0 4px 20px -6px hsl(var(--foreground) / 0.04)" }}
                >
                  <motion.div
                    className="text-4xl mb-5"
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {icon}
                  </motion.div>
                  <h3 className="font-display text-xl mb-2.5 group-hover:text-gold transition-colors duration-300">{title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Trust */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 floral-bg opacity-60" />
        <FadeInSection className="relative max-w-2xl mx-auto text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-8 rounded-full border border-gold/20 flex items-center justify-center"
          >
            <Palette size={24} className="text-gold" />
          </motion.div>
          <h2 className="font-display text-3xl md:text-4xl mb-4 italic text-foreground">
            "Crafted with love, designed for your perfect day"
          </h2>
          <p className="text-muted-foreground font-body text-base leading-relaxed max-w-lg mx-auto">
            Every detail matters on your wedding day. DreamFlower brings the same attention to detail to your digital invitation experience.
          </p>
          <div className="flex items-center justify-center gap-1 mt-6">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
                <Star size={18} className="text-gold fill-gold" />
              </motion.div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <FadeInSection className="max-w-md mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl mb-4">Simple pricing</h2>
          <p className="text-muted-foreground font-body text-lg mb-12">One payment, everything included</p>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative bg-background rounded-3xl border border-gold/20 p-10 group"
            style={{ boxShadow: "0 20px 60px -15px hsl(var(--gold) / 0.12), 0 8px 24px -8px hsl(var(--foreground) / 0.05)" }}
          >
            {/* Premium glow on hover */}
            <div
              className="absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10"
              style={{ background: "linear-gradient(135deg, hsl(var(--gold-light) / 0.3), hsl(var(--gold) / 0.1), hsl(var(--blush) / 0.2))", filter: "blur(20px)" }}
            />

            <motion.div
              whileHover={{ rotate: 10 }}
              className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-gold mx-auto mb-5"
            >
              <Heart size={24} className="text-primary-foreground fill-primary-foreground" />
            </motion.div>
            <h3 className="font-display text-2xl mb-3">Wedding Package</h3>
            <div className="flex items-baseline justify-center gap-2 my-5">
              <span className="font-display text-6xl font-bold bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">€25</span>
              <span className="text-muted-foreground font-body">one-time</span>
            </div>
            <div className="divider-gold mb-8" />
            <ul className="space-y-4 mb-10 text-left">
              {[
                "Elegant digital invitation page",
                "Unlimited guests",
                "RSVP tracking dashboard",
                "Seating table management",
                "Unique shareable invite link",
                "Countdown timer",
                "Photo gallery",
              ].map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3.5 text-sm font-body"
                >
                  <div className="w-5 h-5 rounded-full gradient-gold flex items-center justify-center shrink-0 shadow-sm">
                    <Check size={11} className="text-primary-foreground" />
                  </div>
                  {f}
                </motion.li>
              ))}
            </ul>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={user ? "/dashboard" : "/auth"}
                className="block w-full py-4 rounded-xl gradient-gold text-primary-foreground font-semibold font-body shadow-gold hover:shadow-lg transition-all duration-300 text-center text-base"
              >
                {user ? "Go to Dashboard" : "Get Started Now"}
              </Link>
            </motion.div>
          </motion.div>
        </FadeInSection>
      </section>

      {/* Footer */}
      <footer className="relative bg-background border-t border-border/50 py-10 px-4 text-center">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <Flower size={16} className="text-gold" />
          <span className="font-display text-sm text-foreground tracking-tight">DreamFlower Invitations</span>
        </div>
        <p className="text-xs text-muted-foreground font-body">© {new Date().getFullYear()} DreamFlower. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
