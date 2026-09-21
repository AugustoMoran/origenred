/** Normalize ObjectId, populated doc, or string ref to a hex id string. */
export const mongoRefId = (ref: unknown): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const o = ref as { _id?: unknown; id?: unknown; user?: unknown };
    if (o._id != null) return String(o._id);
    if (o.id != null) return String(o.id);
    if (o.user != null) return mongoRefId(o.user);
  }
  return String(ref);
};
