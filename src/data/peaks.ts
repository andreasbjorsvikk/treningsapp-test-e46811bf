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
}

// Legacy static peaks - kept for reference but app now uses DB
export const peaks: Peak[] = [];
