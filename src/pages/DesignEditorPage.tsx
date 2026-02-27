import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Loader2, Save, Eye, Upload, X, Palette, Type, Image as ImageIcon, Sparkles,
} from "lucide-react";
import { TEMPLATES, FONT_OPTIONS, InviteStyles, mergeStyles, DEFAULT_STYLES } from "@/lib/templates";

interface EventData {
  id: string;
  event_name: string;
  bride_name: string;
  groom_name: string;
  event_date: string;
  location: string;
  slug: string;
  template: string;
  custom_styles: Record<string, any>;
  background_image_path: string | null;
}

const DesignEditorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [customStyles, setCustomStyles] = useState<Partial<InviteStyles>>({});
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "colors" | "fonts" | "background">("templates");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvent();
  }, [user]);

  const fetchEvent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    if (data && data.length > 0) {
      const ev = data[0] as any;
      setEvent(ev);
      setSelectedTemplate(ev.template || "classic");
      setCustomStyles(ev.custom_styles || {});
      if (ev.background_image_path) {
        const { data: urlData } = supabase.storage
          .from("wedding-photos")
          .getPublicUrl(ev.background_image_path);
        setBgImageUrl(urlData.publicUrl);
      }
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const mergedStyles = mergeStyles(selectedTemplate, customStyles);

  const updateStyle = (key: keyof InviteStyles, value: any) => {
    setCustomStyles((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const path = `${event.id}/bg-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("wedding-photos")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("wedding-photos").getPublicUrl(path);
    setBgImageUrl(urlData.publicUrl);
    updateStyle("backgroundImageUrl", urlData.publicUrl);

    await supabase
      .from("events")
      .update({ background_image_path: path } as any)
      .eq("id", event.id);

    setUploading(false);
    toast.success("Background uploaded!");
  };

  const removeBg = async () => {
    if (!event) return;
    setBgImageUrl(null);
    const newStyles = { ...customStyles };
    delete (newStyles as any).backgroundImageUrl;
    setCustomStyles(newStyles);
    await supabase
      .from("events")
      .update({ background_image_path: null } as any)
      .eq("id", event.id);
    toast.success("Background removed");
  };

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({
        template: selectedTemplate,
        custom_styles: customStyles,
      } as any)
      .eq("id", event.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Design saved! ✨");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gold w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) return null;

  const tabs = [
    { id: "templates" as const, label: "Templates", icon: Sparkles },
    { id: "colors" as const, label: "Colors", icon: Palette },
    { id: "fonts" as const, label: "Fonts", icon: Type },
    { id: "background" as const, label: "Background", icon: ImageIcon },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-foreground">Invitation Design</h1>
            <p className="text-muted-foreground font-body text-sm mt-1">
              Pick a template or customize every detail
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/invite/${event.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground text-sm font-semibold font-body hover:bg-muted transition-all"
            >
              <Eye size={14} />
              Preview
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-gold text-primary-foreground text-sm font-semibold font-body shadow-gold hover:opacity-90 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Design"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold font-body transition-all ${
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-card rounded-2xl shadow-card border border-border p-5">
              {activeTab === "templates" && (
                <div className="space-y-3">
                  <h3 className="font-display text-base mb-3">Choose Template</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplate(t.id);
                          setCustomStyles({});
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          selectedTemplate === t.id && Object.keys(customStyles).length === 0
                            ? "border-gold bg-champagne"
                            : "border-border hover:border-gold/50"
                        }`}
                      >
                        <span className="text-2xl">{t.preview}</span>
                        <div>
                          <p className="font-display text-sm">{t.name}</p>
                          <div className="flex gap-1 mt-1">
                            <span
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ background: t.styles.primaryColor }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ background: t.styles.accentColor }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ background: t.styles.backgroundColor }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "colors" && (
                <div className="space-y-4">
                  <h3 className="font-display text-base mb-3">Customize Colors</h3>
                  {([
                    ["primaryColor", "Primary / Gold"],
                    ["accentColor", "Accent"],
                    ["backgroundColor", "Background"],
                    ["textColor", "Text"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm font-body">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={mergedStyles[key] as string}
                          onChange={(e) => updateStyle(key, e.target.value)}
                          className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground font-body w-16">
                          {(mergedStyles[key] as string).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-body">Card Opacity</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={mergedStyles.cardOpacity}
                      onChange={(e) => updateStyle("cardOpacity", parseFloat(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-body">Border Radius</label>
                    <select
                      value={mergedStyles.borderRadius}
                      onChange={(e) => updateStyle("borderRadius", e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                    >
                      <option value="0.25rem">Sharp</option>
                      <option value="0.5rem">Soft</option>
                      <option value="1rem">Rounded</option>
                      <option value="1.5rem">Very Rounded</option>
                      <option value="2rem">Pill</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "fonts" && (
                <div className="space-y-4">
                  <h3 className="font-display text-base mb-3">Typography</h3>
                  <div>
                    <label className="text-sm font-body mb-1.5 block">Display Font</label>
                    <select
                      value={mergedStyles.fontDisplay}
                      onChange={(e) => updateStyle("fontDisplay", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-body mb-1.5 block">Body Font</label>
                    <select
                      value={mergedStyles.fontBody}
                      onChange={(e) => updateStyle("fontBody", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-body">Show Petals</label>
                    <button
                      onClick={() => updateStyle("showPetals", !mergedStyles.showPetals)}
                      className={`w-10 h-6 rounded-full transition-all ${
                        mergedStyles.showPetals ? "bg-gold" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-card shadow-sm transition-transform mx-1 ${
                          mergedStyles.showPetals ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {mergedStyles.showPetals && (
                    <div>
                      <label className="text-sm font-body mb-1.5 block">Petal Emoji</label>
                      <div className="flex gap-2 flex-wrap">
                        {["🌸", "🌹", "🍃", "⭐", "❄️", "💐", "🦋", "✨"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => updateStyle("petalEmoji", emoji)}
                            className={`text-xl p-2 rounded-lg border transition-all ${
                              mergedStyles.petalEmoji === emoji
                                ? "border-gold bg-champagne"
                                : "border-border hover:border-gold/50"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "background" && (
                <div className="space-y-4">
                  <h3 className="font-display text-base mb-3">Background Image</h3>
                  <p className="text-xs text-muted-foreground font-body">
                    Upload a custom background image for your invitation. Max 5MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadBg}
                    className="hidden"
                  />
                  {bgImageUrl ? (
                    <div className="relative">
                      <img
                        src={bgImageUrl}
                        alt="Background"
                        className="w-full h-40 object-cover rounded-xl border border-border"
                      />
                      <button
                        onClick={removeBg}
                        className="absolute top-2 right-2 w-7 h-7 bg-card rounded-full flex items-center justify-center shadow-sm border border-border hover:bg-muted"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-gold transition-all flex flex-col items-center gap-2 text-muted-foreground"
                    >
                      {uploading ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <Upload size={24} />
                      )}
                      <span className="text-sm font-body">
                        {uploading ? "Uploading..." : "Click to upload"}
                      </span>
                    </button>
                  )}
                  {bgImageUrl && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-2 rounded-xl border border-border text-sm font-body font-semibold hover:bg-muted transition-all"
                    >
                      {uploading ? "Uploading..." : "Replace Image"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/40" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/40" />
                  <div className="w-3 h-3 rounded-full bg-green-400/40" />
                </div>
                <span className="text-xs text-muted-foreground font-body ml-2">Live Preview</span>
              </div>
              <div
                className="p-6 min-h-[500px] overflow-y-auto max-h-[70vh]"
                style={{
                  background: bgImageUrl
                    ? `url(${bgImageUrl}) center/cover no-repeat`
                    : mergedStyles.backgroundColor,
                  color: mergedStyles.textColor,
                }}
              >
                {/* Petals preview */}
                {mergedStyles.showPetals && (
                  <div className="absolute pointer-events-none text-lg opacity-20">
                    {[...Array(4)].map((_, i) => (
                      <span
                        key={i}
                        className="inline-block animate-petal-fall"
                        style={{ animationDelay: `${i * 1.2}s` }}
                      >
                        {mergedStyles.petalEmoji}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 mb-6"
                    style={{
                      background: `${mergedStyles.primaryColor}20`,
                      borderRadius: mergedStyles.borderRadius,
                      border: `1px solid ${mergedStyles.primaryColor}40`,
                    }}
                  >
                    <span className="text-xs tracking-widest uppercase" style={{ fontFamily: mergedStyles.fontBody, color: mergedStyles.textColor }}>
                      Wedding Invitation
                    </span>
                  </div>

                  <h1
                    className="text-4xl mb-2 leading-tight"
                    style={{ fontFamily: mergedStyles.fontDisplay, color: mergedStyles.textColor }}
                  >
                    {event.bride_name}
                  </h1>
                  <div className="flex items-center justify-center gap-3 my-3">
                    <div className="flex-1 max-w-16 h-px" style={{ background: mergedStyles.primaryColor }} />
                    <span className="text-lg italic" style={{ fontFamily: mergedStyles.fontDisplay, color: mergedStyles.primaryColor }}>&</span>
                    <div className="flex-1 max-w-16 h-px" style={{ background: mergedStyles.primaryColor }} />
                  </div>
                  <h1
                    className="text-4xl leading-tight"
                    style={{ fontFamily: mergedStyles.fontDisplay, color: mergedStyles.textColor }}
                  >
                    {event.groom_name}
                  </h1>
                  <p
                    className="text-sm italic mt-3"
                    style={{ fontFamily: mergedStyles.fontDisplay, color: `${mergedStyles.textColor}99` }}
                  >
                    {event.event_name}
                  </p>
                </div>

                {/* Details card */}
                <div
                  className="p-5 mb-4"
                  style={{
                    background: bgImageUrl
                      ? `rgba(255,255,255,${mergedStyles.cardOpacity})`
                      : `${mergedStyles.accentColor}15`,
                    borderRadius: mergedStyles.borderRadius,
                    border: `1px solid ${mergedStyles.primaryColor}25`,
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span>📅</span>
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ fontFamily: mergedStyles.fontBody, opacity: 0.6 }}>Date</p>
                        <p className="text-sm" style={{ fontFamily: mergedStyles.fontDisplay }}>
                          {new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="h-px" style={{ background: `${mergedStyles.primaryColor}30` }} />
                    <div className="flex items-center gap-3">
                      <span>📍</span>
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ fontFamily: mergedStyles.fontBody, opacity: 0.6 }}>Location</p>
                        <p className="text-sm" style={{ fontFamily: mergedStyles.fontDisplay }}>{event.location}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RSVP preview */}
                <div
                  className="p-5 text-center"
                  style={{
                    background: bgImageUrl
                      ? `rgba(255,255,255,${mergedStyles.cardOpacity})`
                      : `${mergedStyles.accentColor}15`,
                    borderRadius: mergedStyles.borderRadius,
                    border: `1px solid ${mergedStyles.primaryColor}25`,
                  }}
                >
                  <h2 className="text-xl mb-3" style={{ fontFamily: mergedStyles.fontDisplay }}>RSVP</h2>
                  <div
                    className="inline-block px-6 py-2 text-sm font-semibold"
                    style={{
                      background: mergedStyles.primaryColor,
                      color: "#fff",
                      borderRadius: mergedStyles.borderRadius,
                      fontFamily: mergedStyles.fontBody,
                    }}
                  >
                    I'll be there! {mergedStyles.petalEmoji}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DesignEditorPage;
