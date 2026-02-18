
-- Create storage bucket for wedding photos
INSERT INTO storage.buckets (id, name, public) VALUES ('wedding-photos', 'wedding-photos', true);

-- RLS policies for storage objects
CREATE POLICY "Event owners can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wedding-photos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.events
    WHERE user_id = auth.uid()
    AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Event owners can delete their photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'wedding-photos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.events
    WHERE user_id = auth.uid()
    AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Anyone can view wedding photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding-photos');

-- Create event_photos table
CREATE TABLE public.event_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- Event owners can manage their photos
CREATE POLICY "Event owners can manage photos"
ON public.event_photos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_photos.event_id
    AND events.user_id = auth.uid()
  )
);

-- Public can view photos for active events
CREATE POLICY "Public can view photos for active events"
ON public.event_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_photos.event_id
    AND events.is_active = true
  )
);
