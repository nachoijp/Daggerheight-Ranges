/**
 * Structural equality, insensitive to key order — unlike comparing
 * JSON.stringify output, which differs once keys come back from the scene
 * metadata, or a spread adds one, in another order.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  // Union of both sides' keys (not just a length check) so a key explicitly
  // set to undefined compares equal to that same key being absent
  // altogether — matches how JSON.stringify already treated the two as
  // identical (it drops undefined-valued keys), which BandSet/Band's own
  // `field?: T` optional properties rely on.
  const keys = new Set([...Object.keys(aRecord), ...Object.keys(bRecord)]);
  for (const key of keys) {
    if (!deepEqual(aRecord[key], bRecord[key])) {
      return false;
    }
  }
  return true;
}
