import { SellerProfile } from '../models/SellerProfile';
import { envioPackGet, isEnvioPackApiConfigured } from './envioPackApiClient';

export type EnvioPackDireccion = {
  id: number;
  nombre?: string;
  calle?: string;
  numero?: string;
  codigo_postal?: string | number;
  localidad?: string;
  provincia?: string;
};

let direccionesCache: { at: number; rows: EnvioPackDireccion[] } | null = null;

async function listDireccionesDeEnvio(empresaId?: number): Promise<EnvioPackDireccion[]> {
  if (!isEnvioPackApiConfigured()) return [];
  const now = Date.now();
  if (!empresaId && direccionesCache && direccionesCache.at > now - 5 * 60_000) {
    return direccionesCache.rows;
  }

  const data = await envioPackGet<EnvioPackDireccion[] | { direcciones?: EnvioPackDireccion[] }>(
    '/direcciones-de-envio',
    empresaId ? { empresa: empresaId } : undefined
  );

  const rows = Array.isArray(data) ? data : data?.direcciones || [];
  const normalized = rows
    .map((r: any) => ({
      id: Number(r.id),
      nombre: r.nombre,
      calle: r.calle,
      numero: r.numero,
      codigo_postal: r.codigo_postal,
      localidad: r.localidad,
      provincia: r.provincia,
    }))
    .filter((r) => r.id > 0);

  if (!empresaId) {
    direccionesCache = { at: now, rows: normalized };
  }
  return normalized;
}

function matchDireccion(rows: EnvioPackDireccion[], postalCode?: string) {
  const cp = (postalCode || '').replace(/\D/g, '').slice(0, 4);
  if (!cp) return undefined;
  return rows.find((r) => String(r.codigo_postal || '').replace(/\D/g, '').slice(0, 4) === cp);
}

export async function resolveEnvioPackDireccionEnvioId(input: {
  sellerId: string;
  shipFromSource: 'platform' | 'seller';
  shipFromPostalCode?: string;
}): Promise<number> {
  if (input.shipFromSource === 'platform') {
    const fromEnv = process.env.ENVIOPACK_PLATFORM_DIRECCION_ENVIO_ID;
    if (fromEnv) return Number(fromEnv);
    const rows = await listDireccionesDeEnvio();
    const match = matchDireccion(rows, input.shipFromPostalCode);
    if (match) return match.id;
    throw new Error(
      'Configurá ENVIOPACK_PLATFORM_DIRECCION_ENVIO_ID en el servidor o marcá un depósito predeterminado en EnvíoPack con el CP de OrigenRed.'
    );
  }

  const profile = await SellerProfile.findById(input.sellerId).select('envioPackDireccionEnvioId envioPackEmpresaId');
  if (profile?.envioPackDireccionEnvioId) return profile.envioPackDireccionEnvioId;

  const empresaId = profile?.envioPackEmpresaId;
  const rows = await listDireccionesDeEnvio(empresaId || undefined);
  const match = matchDireccion(rows, input.shipFromPostalCode);
  if (match) {
    if (profile) {
      profile.envioPackDireccionEnvioId = match.id;
      await profile.save();
    }
    return match.id;
  }

  throw new Error(
    'No hay depósito EnvíoPack para este vendedor. Agregá la dirección de despacho en EnvíoPack (Configuración > Depósitos) con el mismo CP, o ingresá el ID de depósito en Mi perfil.'
  );
}
