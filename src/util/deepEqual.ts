/**
 * Structural equality, insensitive to object key order. Plain
 * `JSON.stringify(a) === JSON.stringify(b)` (used previously for
 * detecting an edited-but-unsaved BandSet) breaks the moment either side's
 * keys were inserted in a different order — e.g. after a round trip through
 * the scene metadata store, or when a spread pattern appends a newly added
 * optional field — even though the two objects are otherwise identical,
 * producing a false "out of sync" warning.
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
