export function formatPage(data, total, page, pageSize) {
  return {
    list: data,
    total,
    page,
    pageSize,
  };
}
