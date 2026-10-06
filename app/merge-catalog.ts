type CatalogEntry = { id: string; title: string; url?: string; projectId?: string };

// Keep entries from every source; match hosted apps by stable identity first.
export function mergeCatalog<T extends CatalogEntry>(...sources: T[][]): T[] {
  const result: T[] = [];
  for (const source of sources) for (const entry of source) {
    const index = result.findIndex((item) => item.id === entry.id ||
      (!!entry.projectId && item.projectId === entry.projectId));
    if (index < 0) result.push(entry);
    else result[index] = { ...result[index], ...entry, id: result[index].id };
  }
  return result;
}
