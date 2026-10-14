export function normalizePage(data) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content
    : data && typeof data === 'object' ? [data] : [];
  const paged = Array.isArray(data?.content);
  const page = paged ? data.number ?? 0 : 0;
  const total = paged ? data.totalElements ?? items.length : items.length;
  const hasNext = paged && (typeof data.last === 'boolean' ? !data.last
    : page + 1 < (data.totalPages ?? 1));
  return { items, page, total, hasNext };
}

export function mergePage(previous, incoming) {
  return [...new Map([...previous, ...incoming].map(item => [item.id, item])).values()];
}
