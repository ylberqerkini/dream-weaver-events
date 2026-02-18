import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Image as ImageIcon, GripVertical, X } from "lucide-react";

interface EventData {
  id: string;
  event_name: string;
  slug: string;
}

interface Photo {
  id: string;
  event_id: string;
  storage_path: string;
  caption: string | null;
  display_order: number;
  created_at: string;
  url: string;
}

const GalleryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvent();
  }, [user]);

  const fetchEvent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("events")
      .select("id, event_name, slug")
      .eq("user_id", user.id)
      .limit(1);
    if (data && data.length > 0) {
      setEvent(data[0]);
      fetchPhotos(data[0].id);
    } else {
      setLoading(false);
    }
  };

  const fetchPhotos = async (eventId: string) => {
    const { data, error } = await supabase
      .from("event_photos" as any)
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load photos");
      setLoading(false);
      return;
    }

    const photosWithUrls = (data || []).map((p: any) => {
      const { data: urlData } = supabase.storage
        .from("wedding-photos")
        .getPublicUrl(p.storage_path);
      return { ...p, url: urlData.publicUrl };
    });

    setPhotos(photosWithUrls);
    setLoading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !event) return;
    const allowed = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (allowed.length === 0) {
      toast.error("Please select image files only");
      return;
    }
    if (allowed.length + photos.length > 20) {
      toast.error("Maximum 20 photos per event");
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of allowed) {
      const ext = file.name.split(".").pop();
      const path = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("wedding-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { error: dbError } = await supabase
        .from("event_photos" as any)
        .insert({
          event_id: event.id,
          storage_path: path,
          display_order: photos.length + successCount,
        });

      if (dbError) {
        toast.error(`Failed to save ${file.name}`);
        // clean up storage
        await supabase.storage.from("wedding-photos").remove([path]);
        continue;
      }

      successCount++;
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? "s" : ""} uploaded!`);
      fetchPhotos(event.id);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    setDeletingId(photo.id);
    const { error: storageError } = await supabase.storage
      .from("wedding-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      toast.error("Failed to delete photo");
      setDeletingId(null);
      return;
    }

    const { error: dbError } = await supabase
      .from("event_photos" as any)
      .delete()
      .eq("id", photo.id);

    if (dbError) {
      toast.error("Failed to remove photo record");
    } else {
      toast.success("Photo deleted");
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    }
    setDeletingId(null);
  };

  const updateCaption = async (photoId: string, caption: string) => {
    await supabase
      .from("event_photos" as any)
      .update({ caption })
      .eq("id", photoId);
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
    );
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

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">No Event Yet</h2>
          <p className="text-muted-foreground font-body mb-6">Create your invitation first to manage photos.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="gradient-gold text-primary-foreground px-6 py-3 rounded-xl font-semibold font-body shadow-gold"
          >
            Go to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-foreground">Photo Gallery</h1>
          <p className="text-muted-foreground font-body mt-1">
            Upload photos to display on your invitation page · {photos.length}/20 photos
          </p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-gold bg-champagne/50"
              : "border-border hover:border-gold/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-gold animate-spin" />
              <p className="font-body text-muted-foreground">Uploading photos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-champagne flex items-center justify-center">
                <Upload className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="font-semibold text-foreground font-body">Drop photos here or click to browse</p>
                <p className="text-muted-foreground font-body text-sm mt-1">JPG, PNG, WebP · Max 20 photos</p>
              </div>
            </div>
          )}
        </div>

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border shadow-soft"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                {/* Delete button */}
                <button
                  onClick={() => deletePhoto(photo)}
                  disabled={deletingId === photo.id}
                  className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  {deletingId === photo.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} />
                  )}
                </button>
                {/* Caption input */}
                <div className="p-2">
                  <input
                    defaultValue={photo.caption || ""}
                    placeholder="Add caption..."
                    onBlur={(e) => {
                      const newCaption = e.target.value;
                      if (newCaption !== photo.caption) {
                        updateCaption(photo.id, newCaption);
                      }
                    }}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-body placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="font-display text-xl text-muted-foreground mb-1">No photos yet</p>
            <p className="text-muted-foreground font-body text-sm">Upload some memories to showcase on your invitation</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GalleryPage;
