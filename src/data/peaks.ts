export interface Peak {
  id: string;
  name: string;
  heightMoh: number;
  latitude: number;
  longitude: number;
  area: string;
  description: string;
  imageUrl?: string | null;
  isPublished?: boolean;
  route_start_lat?: number | null;
  route_start_lng?: number | null;
  route_geojson?: any | null;
  route_distance_m?: number | null;
  route_duration_s?: number | null;
  route_status?: string | null;
}

// Legacy static peaks - kept for reference but app now uses DB
export const peaks: Peak[] = [];
