
ALTER TABLE public.events 
  ADD COLUMN template text NOT NULL DEFAULT 'classic',
  ADD COLUMN custom_styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN background_image_path text DEFAULT NULL;
