/** Medidas de referencia ~ mochila escolar/deportiva (cm) para EnvíoPack cuando el producto no define paquete. */
export const DEFAULT_PACKAGE_WEIGHT_KG = 1;
export const MIN_PACKAGE_WEIGHT_KG = 0.5;

export const DEFAULT_PACKAGE_DIMENSIONS_CM = {
  length: 15,
  width: 30,
  height: 45,
};

export type PackageDimensionsCm = {
  length: number;
  width: number;
  height: number;
};

const positiveNumber = (value?: number | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const effectivePackageWeightKg = (weight?: number | null) => {
  const w = positiveNumber(weight);
  return w ?? DEFAULT_PACKAGE_WEIGHT_KG;
};

export const effectivePackageDimensions = (
  dimensions?: Partial<PackageDimensionsCm> | null
): PackageDimensionsCm => ({
  length: positiveNumber(dimensions?.length) ?? DEFAULT_PACKAGE_DIMENSIONS_CM.length,
  width: positiveNumber(dimensions?.width) ?? DEFAULT_PACKAGE_DIMENSIONS_CM.width,
  height: positiveNumber(dimensions?.height) ?? DEFAULT_PACKAGE_DIMENSIONS_CM.height,
});

export const aggregatePackageForLineItems = (
  items: Array<{
    quantity: number;
    weight?: number | null;
    dimensions?: Partial<PackageDimensionsCm> | null;
  }>
): { weightKg: number; dimensions: PackageDimensionsCm } => {
  let weightKg = 0;
  let maxL = DEFAULT_PACKAGE_DIMENSIONS_CM.length;
  let maxW = DEFAULT_PACKAGE_DIMENSIONS_CM.width;
  let maxH = DEFAULT_PACKAGE_DIMENSIONS_CM.height;

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    weightKg += effectivePackageWeightKg(item.weight) * qty;
    const dim = effectivePackageDimensions(item.dimensions);
    maxL = Math.max(maxL, dim.length);
    maxW = Math.max(maxW, dim.width);
    maxH = Math.max(maxH, dim.height);
  }

  return {
    weightKg: Math.max(MIN_PACKAGE_WEIGHT_KG, Math.round(weightKg * 100) / 100),
    dimensions: { length: maxL, width: maxW, height: maxH },
  };
};
