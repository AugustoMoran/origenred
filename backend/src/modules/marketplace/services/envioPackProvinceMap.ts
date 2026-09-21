/** ISO 3166-2:AR sin prefijo AR- (EnvíoPack provincia ID). */
const PROVINCE_TO_CODE: Record<string, string> = {
  'ciudad autónoma de buenos aires': 'C',
  'caba': 'C',
  'capital federal': 'C',
  'buenos aires': 'B',
  'catamarca': 'K',
  chaco: 'H',
  chubut: 'U',
  córdoba: 'X',
  cordoba: 'X',
  corrientes: 'W',
  'entre ríos': 'E',
  'entre rios': 'E',
  formosa: 'P',
  jujuy: 'Y',
  'la pampa': 'L',
  'la rioja': 'F',
  mendoza: 'M',
  misiones: 'N',
  neuquén: 'N',
  neuquen: 'N',
  'río negro': 'R',
  'rio negro': 'R',
  salta: 'A',
  'san juan': 'J',
  'san luis': 'D',
  'santa cruz': 'Z',
  'santa fe': 'S',
  'santiago del estero': 'G',
  'tierra del fuego': 'V',
  tucumán: 'T',
  tucuman: 'T',
};

export function provinceToEnvioPackId(province?: string): string {
  const raw = (province || '').trim();
  if (!raw) return 'C';
  if (raw.length === 1) return raw.toUpperCase();
  const key = raw.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const normalized = key.normalize('NFC');
  return PROVINCE_TO_CODE[normalized] || PROVINCE_TO_CODE[key] || 'C';
}
