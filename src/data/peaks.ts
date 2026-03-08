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
  {
    id: 'helgelandsfjellet',
    name: 'Helgelandsfjellet',
    heightMoh: 219,
    latitude: 59.4235376,
    longitude: 5.4096230,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'svartatjodno',
    name: 'Svartatjødno',
    heightMoh: 329,
    latitude: 59.8348605,
    longitude: 5.8165684,
    area: 'Kvinnherad',
    description: '',
  },
  {
    id: 'mjelkhaug',
    name: 'Mjelkhaug',
    heightMoh: 1005,
    latitude: 59.8648158,
    longitude: 5.8407304,
    area: 'Kvinnherad',
    description: '',
  },
  {
    id: 'sore-krokavassnuten',
    name: 'Søre Krokavassnuten',
    heightMoh: 249,
    latitude: 59.4333691,
    longitude: 5.3490423,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'lammanuten',
    name: 'Lammanuten',
    heightMoh: 631,
    latitude: 59.3838203,
    longitude: 5.7277152,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'orna',
    name: 'Ørnå',
    heightMoh: 452,
    latitude: 59.4121576,
    longitude: 5.6702351,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'presten',
    name: 'Presten',
    heightMoh: 213,
    latitude: 59.4360277,
    longitude: 5.3372080,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'sat',
    name: 'Såt',
    heightMoh: 239,
    latitude: 59.4261974,
    longitude: 5.3556784,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'alvanuten',
    name: 'Alvanuten',
    heightMoh: 224,
    latitude: 59.4281245,
    longitude: 5.4374291,
    area: 'Haugesund',
    description: '',
  },
  {
    id: 'valedalen',
    name: 'Valedalen',
    heightMoh: 475,
    latitude: 59.8442904,
    longitude: 5.8406825,
    area: 'Kvinnherad',
    description: '',
  },
  {
    id: 'vardaleitet-14b',
    name: 'Vardaleitet 14B',
    heightMoh: 0,
    latitude: 59.3965082,
    longitude: 5.3071284,
    area: 'Haugesund',
    description: '',
  },
];
