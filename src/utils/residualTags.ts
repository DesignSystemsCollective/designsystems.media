// ADR 0012/0013: once an entry has both a legacy tag and its migrated
// series/topics/tools equivalent, showing both in the meta row is
// redundant ("Into Design Systems" under both Tags and Series). This
// filters the legacy tags[] down to values that AREN'T already
// represented in one of the new facets, so the Tags block only ever
// shows genuinely unmapped leftovers - which naturally shrinks toward
// empty as more content gets migrated, rather than needing another
// one-time cleanup pass.
export function getResidualTags(
  tags: string[] | undefined,
  ...migrated: (string[] | undefined)[]
): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const migratedLower = new Set(
    migrated.flatMap((list) => (list ?? []).map((value) => value.toLowerCase())),
  );

  return tags.filter((tag) => !migratedLower.has(tag.toLowerCase()));
}
