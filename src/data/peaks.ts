export interface Peak {
  id: string;
  name: string;
  heightMoh: number;
  latitude: number;
  longitude: number;
  area: string;
  description: string;
}

// Orkjå (Arka) - confirmed from Peakbook UTM 32V 290334 6593617
// Nordfjell - awaiting confirmed coordinates from user
export const peaks: Peak[] = [
  {
    id: 'orkja',
    name: 'Orkjå',
    heightMoh: 174,
    latitude: 59.4286926,
    longitude: 5.3032077,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'nordfjell',
    name: 'Nordfjell',
    heightMoh: 559,
    latitude: 59.8474344,
    longitude: 5.7979750,
    area: 'Valen, Kvinnherad',
    description: '',
  },
];
