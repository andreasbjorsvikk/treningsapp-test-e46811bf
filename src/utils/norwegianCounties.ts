// Norwegian counties (fylker) with approximate center coordinates for proximity sorting
export const NORWEGIAN_COUNTIES = [
  { name: 'Agder', lat: 58.35, lng: 7.5 },
  { name: 'Innlandet', lat: 61.5, lng: 10.5 },
  { name: 'Møre og Romsdal', lat: 62.5, lng: 7.0 },
  { name: 'Nordland', lat: 67.0, lng: 14.5 },
  { name: 'Oslo', lat: 59.91, lng: 10.75 },
  { name: 'Rogaland', lat: 58.97, lng: 5.73 },
  { name: 'Troms', lat: 69.0, lng: 19.0 },
  { name: 'Trøndelag', lat: 63.43, lng: 10.4 },
  { name: 'Vestfold og Telemark', lat: 59.3, lng: 9.5 },
  { name: 'Vestland', lat: 60.8, lng: 6.0 },
  { name: 'Viken', lat: 59.7, lng: 10.0 },
  { name: 'Finnmark', lat: 70.0, lng: 25.0 },
  { name: 'Svalbard', lat: 78.0, lng: 16.0 },
] as const;

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortCountiesByProximity(counties: string[], userLat: number, userLng: number): string[] {
  return [...counties].sort((a, b) => {
    const ca = NORWEGIAN_COUNTIES.find(c => c.name === a);
    const cb = NORWEGIAN_COUNTIES.find(c => c.name === b);
    if (!ca && !cb) return a.localeCompare(b);
    if (!ca) return 1;
    if (!cb) return -1;
    const da = getDistanceKm(userLat, userLng, ca.lat, ca.lng);
    const db = getDistanceKm(userLat, userLng, cb.lat, cb.lng);
    return da - db;
  });
}

export function findUserCounty(userLat: number, userLng: number): string | null {
  let closest = NORWEGIAN_COUNTIES[0];
  let minDist = Infinity;
  for (const c of NORWEGIAN_COUNTIES) {
    const d = getDistanceKm(userLat, userLng, c.lat, c.lng);
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  }
  return closest.name;
}
