/** Parsea campos de listing desde JSON o multipart/form-data */
export const parseListingBody = (body: Record<string, unknown>) => {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bool = (v: unknown) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  };

  let images = body.images;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }

  return {
    title: body.title ? String(body.title) : undefined,
    description: body.description ? String(body.description) : undefined,
    shortDescription: body.shortDescription ? String(body.shortDescription) : undefined,
    price: num(body.price),
    compareAtPrice: num(body.compareAtPrice),
    stock: num(body.stock),
    category: body.category ? String(body.category) : undefined,
    brand: body.brand ? String(body.brand) : undefined,
    color: body.color ? String(body.color) : undefined,
    size: body.size ? String(body.size) : undefined,
    condition: body.condition ? String(body.condition) : undefined,
    weight: num(body.weight),
    freeShipping: bool(body.freeShipping),
    allowPickup: bool(body.allowPickup),
    province: body.province ? String(body.province) : undefined,
    city: body.city ? String(body.city) : undefined,
    postalCode: body.postalCode ? String(body.postalCode) : undefined,
    status: body.status ? String(body.status) : undefined,
    seoTitle: body.seoTitle ? String(body.seoTitle) : undefined,
    seoDescription: body.seoDescription ? String(body.seoDescription) : undefined,
    images: Array.isArray(images) ? images : undefined,
  };
};
