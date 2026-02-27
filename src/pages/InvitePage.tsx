import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flower, MapPin, Calendar, Loader2, Images } from "lucide-react";
import { mergeStyles, InviteStyles, DEFAULT_STYLES } from "@/lib/templates";

interface EventData {
  id: string;
  event_name: string;
  bride_name: string;
  groom_name: string;
  event_date: string;
  location: string;
  slug: string;
  is_active: boolean;
  template: string;
  custom_styles: Record<string, any>;
  background_image_path: string | null;
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
  const [styles, setStyles] = useState<InviteStyles>(DEFAULT_STYLES);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

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
        const ev = data as any;
        setEvent(ev);
        setStyles(mergeStyles(ev.template || "classic", ev.custom_styles || {}));
        if (ev.background_image_path) {
          const { data: urlData } = supabase.storage
            .from("wedding-photos")
            .getPublicUrl(ev.background_image_path);
          setBgImageUrl(urlData.publicUrl);
        }
        fetchPhotos(ev.id);
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
      const [y, m, d] = event.event_date.split("-").map(Number);
      const target = new Date(y, m - 1, d).getTime();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: styles.backgroundColor }}>
        <Loader2 className="animate-spin w-8 h-8" style={{ color: styles.primaryColor }} />
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

  // Parse date as local (not UTC) to avoid timezone shift
  const [year, month, day] = event.event_date.split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);
  const formattedDate = eventDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cardBg = bgImageUrl
    ? `rgba(255,255,255,${styles.cardOpacity})`
    : `${styles.accentColor}15`;
  const cardBorder = `1px solid ${styles.primaryColor}25`;

  return (
    <div
      className="min-h-screen"
      style={{
        background: bgImageUrl
          ? `url(${bgImageUrl}) center/cover no-repeat fixed`
          : styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      {/* Overlay for bg image readability */}
      {bgImageUrl && (
        <div className="fixed inset-0 pointer-events-none" style={{ background: `${styles.backgroundColor}88` }} />
      )}

      {/* Falling petals */}
      {styles.showPetals && (
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
              {styles.petalEmoji}
            </div>
          ))}
        </div>
      )}

      <div className="relative max-w-2xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center animate-fade-up">
          <div
            className="inline-flex items-center gap-2 backdrop-blur-sm px-5 py-2 mb-8 shadow-soft"
            style={{
              background: `${styles.primaryColor}15`,
              border: `1px solid ${styles.primaryColor}30`,
              borderRadius: styles.borderRadius,
            }}
          >
            <Flower size={14} style={{ color: styles.primaryColor }} />
            <span className="text-xs tracking-widest uppercase" style={{ fontFamily: styles.fontBody, opacity: 0.7 }}>
              Wedding Invitation
            </span>
          </div>

          {/* Couple names */}
          <h1 className="text-6xl md:text-7xl mb-3 leading-none" style={{ fontFamily: styles.fontDisplay }}>
            {event.bride_name}
          </h1>
          <div className="flex items-center justify-center gap-4 my-4">
            <div className="flex-1 max-w-24 h-px" style={{ background: `linear-gradient(90deg, transparent, ${styles.primaryColor}, transparent)` }} />
            <span className="text-2xl italic" style={{ fontFamily: styles.fontDisplay, color: styles.primaryColor }}>&</span>
            <div className="flex-1 max-w-24 h-px" style={{ background: `linear-gradient(90deg, transparent, ${styles.primaryColor}, transparent)` }} />
          </div>
          <h1 className="text-6xl md:text-7xl leading-none" style={{ fontFamily: styles.fontDisplay }}>
            {event.groom_name}
          </h1>

          <p className="text-xl italic mt-6 mb-8" style={{ fontFamily: styles.fontDisplay, opacity: 0.7 }}>
            {event.event_name}
          </p>
        </div>

        {/* Event details card */}
        <div
          className="backdrop-blur-sm p-6 md:p-8 mb-6 animate-fade-up"
          style={{ background: cardBg, border: cardBorder, borderRadius: styles.borderRadius, animationDelay: "0.1s" }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: `${styles.accentColor}30`, borderRadius: styles.borderRadius }}>
                <Calendar size={18} style={{ color: styles.accentColor }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ fontFamily: styles.fontBody, opacity: 0.6 }}>Date</p>
                <p className="text-lg" style={{ fontFamily: styles.fontDisplay }}>{formattedDate}</p>
              </div>
            </div>
            <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${styles.primaryColor}, transparent)` }} />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: `${styles.primaryColor}20`, borderRadius: styles.borderRadius }}>
                <MapPin size={18} style={{ color: styles.primaryColor }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ fontFamily: styles.fontBody, opacity: 0.6 }}>Location</p>
                <p className="text-lg" style={{ fontFamily: styles.fontDisplay }}>{event.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div
          className="backdrop-blur-sm p-6 mb-6 animate-fade-up"
          style={{ background: cardBg, border: cardBorder, borderRadius: styles.borderRadius, animationDelay: "0.2s" }}
        >
          <p className="text-center text-xs uppercase tracking-widest mb-4" style={{ fontFamily: styles.fontBody, opacity: 0.6 }}>
            Counting down to the big day
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.minutes, label: "Minutes" },
              { value: countdown.seconds, label: "Seconds" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="text-center p-3"
                style={{ background: `${styles.primaryColor}15`, borderRadius: styles.borderRadius }}
              >
                <p className="text-3xl font-bold leading-none" style={{ fontFamily: styles.fontDisplay }}>
                  {String(value).padStart(2, "0")}
                </p>
                <p className="text-xs mt-1 uppercase tracking-wider" style={{ fontFamily: styles.fontBody, opacity: 0.6 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RSVP Form */}
        <div
          className="backdrop-blur-sm p-6 md:p-8 animate-fade-up"
          style={{ background: cardBg, border: cardBorder, borderRadius: styles.borderRadius, animationDelay: "0.3s" }}
        >
          {rsvpStatus === "confirmed" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl mb-2" style={{ fontFamily: styles.fontDisplay }}>See you there!</h2>
              <p style={{ fontFamily: styles.fontBody, opacity: 0.7 }}>We're so excited to celebrate with you.</p>
            </div>
          ) : rsvpStatus === "declined" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">💐</div>
              <h2 className="text-2xl mb-2" style={{ fontFamily: styles.fontDisplay }}>Thank you</h2>
              <p style={{ fontFamily: styles.fontBody, opacity: 0.7 }}>We'll miss you and appreciate you letting us know.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl text-center mb-6" style={{ fontFamily: styles.fontDisplay }}>RSVP</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: styles.fontBody }}>Your Full Name *</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 focus:outline-none transition-all"
                    style={{
                      borderRadius: styles.borderRadius,
                      border: `1px solid ${styles.primaryColor}30`,
                      background: `${styles.backgroundColor}cc`,
                      fontFamily: styles.fontBody,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: styles.fontBody }}>Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="w-full px-4 py-3 focus:outline-none transition-all"
                    style={{
                      borderRadius: styles.borderRadius,
                      border: `1px solid ${styles.primaryColor}30`,
                      background: `${styles.backgroundColor}cc`,
                      fontFamily: styles.fontBody,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: styles.fontBody }}>You are invited as a guest of</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["bride", "groom"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, side: s })}
                        className="py-2.5 font-semibold text-sm transition-all"
                        style={{
                          borderRadius: styles.borderRadius,
                          border: `1px solid ${form.side === s ? styles.primaryColor : styles.primaryColor + "30"}`,
                          background: form.side === s ? `${styles.primaryColor}20` : "transparent",
                          fontFamily: styles.fontBody,
                        }}
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
                  className="py-3 font-semibold text-sm transition-all disabled:opacity-60"
                  style={{
                    borderRadius: styles.borderRadius,
                    border: `1px solid ${styles.primaryColor}30`,
                    fontFamily: styles.fontBody,
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleRSVP("confirmed")}
                  disabled={rsvpStatus === "submitting"}
                  className="py-3 font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    borderRadius: styles.borderRadius,
                    background: styles.primaryColor,
                    color: "#fff",
                    fontFamily: styles.fontBody,
                  }}
                >
                  {rsvpStatus === "submitting" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  {rsvpStatus === "submitting" ? "Sending..." : `I'll be there! ${styles.petalEmoji}`}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div
            className="backdrop-blur-sm p-6 md:p-8 mt-6 animate-fade-up"
            style={{ background: cardBg, border: cardBorder, borderRadius: styles.borderRadius, animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <Images size={18} style={{ color: styles.primaryColor }} />
              <h2 className="text-2xl" style={{ fontFamily: styles.fontDisplay }}>Our Gallery</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="aspect-square overflow-hidden group relative"
                  style={{ borderRadius: styles.borderRadius }}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-xs" style={{ fontFamily: styles.fontBody }}>{photo.caption}</p>
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
            <div className="w-16 h-px" style={{ background: `linear-gradient(90deg, transparent, ${styles.primaryColor}, transparent)` }} />
            <Flower size={14} style={{ color: styles.primaryColor }} />
            <div className="w-16 h-px" style={{ background: `linear-gradient(90deg, transparent, ${styles.primaryColor}, transparent)` }} />
          </div>
          <p className="text-xs" style={{ fontFamily: styles.fontBody, opacity: 0.6 }}>
            Created with <span style={{ color: styles.primaryColor, fontWeight: 600 }}>DreamFlower Invitations</span>
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
                className="w-full shadow-2xl max-h-[85vh] object-contain"
                style={{ borderRadius: styles.borderRadius }}
              />
              {lightboxPhoto.caption && (
                <p className="text-white/80 text-sm text-center mt-3" style={{ fontFamily: styles.fontBody }}>{lightboxPhoto.caption}</p>
              )}
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors"
                style={{ background: styles.backgroundColor, color: styles.textColor }}
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
