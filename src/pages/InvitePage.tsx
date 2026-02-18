import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flower, MapPin, Calendar, Loader2, Images } from "lucide-react";

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

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  display_order: number;
  url: string;
}

const InvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [form, setForm] = useState({ full_name: "", phone: "", side: "bride" });
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "submitting" | "confirmed" | "declined">("idle");
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setEvent(data);
        fetchPhotos(data.id);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [slug]);

  const fetchPhotos = async (eventId: string) => {
    const { data } = await supabase
      .from("event_photos" as any)
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });

    if (data && data.length > 0) {
      const withUrls = data.map((p: any) => {
        const { data: urlData } = supabase.storage
          .from("wedding-photos")
          .getPublicUrl(p.storage_path);
        return { ...p, url: urlData.publicUrl };
      });
      setPhotos(withUrls);
    }
  };

  useEffect(() => {
    if (!event) return;
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(event.event_date).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleRSVP = async (status: "confirmed" | "declined") => {
    if (!form.full_name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setRsvpStatus("submitting");
    const { error } = await supabase.from("guests").insert({
      event_id: event!.id,
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      side: form.side,
      rsvp_status: status,
    });
    if (error) {
      toast.error("Failed to submit RSVP. Please try again.");
      setRsvpStatus("idle");
      return;
    }
    setRsvpStatus(status);
    toast.success(status === "confirmed" ? "See you at the wedding! 🌸" : "Thank you for letting us know.");
  };

  if (loading) {
    return (
      <div className="min-h-screen floral-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-gold w-8 h-8" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen floral-bg flex items-center justify-center text-center p-4">
        <div>
          <Flower className="w-12 h-12 text-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl mb-2">Invitation Not Found</h1>
          <p className="text-muted-foreground font-body">This invitation link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      {/* Falling petals */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-xl animate-petal-fall"
            style={{
              left: `${5 + i * 12}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${6 + i * 0.5}s`,
              opacity: 0.15,
            }}
          >
            🌸
          </div>
        ))}
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2 mb-8 shadow-soft">
            <Flower size={14} className="text-gold" />
            <span className="font-body text-xs tracking-widest uppercase text-muted-foreground">Wedding Invitation</span>
          </div>

          {/* Couple names */}
          <h1 className="font-display text-6xl md:text-7xl text-foreground mb-3 leading-none">
            {event.bride_name}
          </h1>
          <div className="flex items-center justify-center gap-4 my-4">
            <div className="flex-1 divider-gold max-w-24" />
            <span className="font-display text-2xl text-gold italic">&</span>
            <div className="flex-1 divider-gold max-w-24" />
          </div>
          <h1 className="font-display text-6xl md:text-7xl text-foreground leading-none">
            {event.groom_name}
          </h1>

          <p className="font-display text-xl text-muted-foreground italic mt-6 mb-8">
            {event.event_name}
          </p>
        </div>

        {/* Event details card */}
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-card border border-border/50 p-6 md:p-8 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blush/30 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-blush-deep" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-0.5">Date</p>
                <p className="font-display text-lg text-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="divider-gold" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-champagne flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-0.5">Location</p>
                <p className="font-display text-lg text-foreground">{event.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-card border border-border/50 p-6 mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-center text-xs font-body text-muted-foreground uppercase tracking-widest mb-4">Counting down to the big day</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.minutes, label: "Minutes" },
              { value: countdown.seconds, label: "Seconds" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center bg-champagne rounded-2xl p-3">
                <p className="font-display text-3xl font-bold text-foreground leading-none">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RSVP Form */}
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-card border border-border/50 p-6 md:p-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          {rsvpStatus === "confirmed" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="font-display text-2xl mb-2">See you there!</h2>
              <p className="text-muted-foreground font-body">We're so excited to celebrate with you.</p>
            </div>
          ) : rsvpStatus === "declined" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">💐</div>
              <h2 className="font-display text-2xl mb-2">Thank you</h2>
              <p className="text-muted-foreground font-body">We'll miss you and appreciate you letting us know.</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl text-center mb-6">RSVP</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Your Full Name *</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">You are invited as a guest of</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["bride", "groom"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, side: s })}
                        className={`py-2.5 rounded-xl border font-semibold font-body text-sm transition-all ${
                          form.side === s
                            ? "border-gold bg-champagne text-foreground"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {s === "bride" ? "Bride's Guest" : "Groom's Guest"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => handleRSVP("declined")}
                  disabled={rsvpStatus === "submitting"}
                  className="py-3 rounded-xl border border-border text-foreground font-semibold font-body text-sm hover:bg-muted transition-all disabled:opacity-60"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleRSVP("confirmed")}
                  disabled={rsvpStatus === "submitting"}
                  className="py-3 rounded-xl gradient-gold text-primary-foreground font-semibold font-body text-sm shadow-gold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {rsvpStatus === "submitting" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  {rsvpStatus === "submitting" ? "Sending..." : "I'll be there! 🌸"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-card border border-border/50 p-6 md:p-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-3 mb-5">
              <Images size={18} className="text-gold" />
              <h2 className="font-display text-2xl">Our Gallery</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="aspect-square rounded-2xl overflow-hidden group relative"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-xs font-body">{photo.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="divider-gold w-16" />
            <Flower size={14} className="text-gold" />
            <div className="divider-gold w-16" />
          </div>
          <p className="text-xs text-muted-foreground font-body">
            Created with <span className="text-gold font-semibold">DreamFlower Invitations</span>
          </p>
        </div>

        {/* Lightbox */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || "Wedding photo"}
                className="w-full rounded-2xl shadow-2xl max-h-[85vh] object-contain"
              />
              {lightboxPhoto.caption && (
                <p className="text-white/80 text-sm font-body text-center mt-3">{lightboxPhoto.caption}</p>
              )}
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-lg text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
