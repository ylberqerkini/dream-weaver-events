
ALTER TABLE public.seating_tables
  ADD COLUMN shape text NOT NULL DEFAULT 'round',
  ADD COLUMN position_x integer NOT NULL DEFAULT 0,
  ADD COLUMN position_y integer NOT NULL DEFAULT 0;
