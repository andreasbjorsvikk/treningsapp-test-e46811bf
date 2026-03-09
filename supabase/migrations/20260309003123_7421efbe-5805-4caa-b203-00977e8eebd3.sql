ALTER TABLE public.peaks_db
ADD COLUMN route_start_lat double precision,
ADD COLUMN route_start_lng double precision,
ADD COLUMN route_geojson jsonb,
ADD COLUMN route_distance_m integer,
ADD COLUMN route_duration_s integer,
ADD COLUMN route_status text DEFAULT 'none',
ADD COLUMN route_updated_at timestamp with time zone,
ADD COLUMN route_updated_by uuid REFERENCES auth.users(id);