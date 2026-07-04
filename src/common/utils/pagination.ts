export function formatPage(data, total, pageNum, pageSize) {
  return {
    list: data,
    total,
    pageNum,
    pageSize,
  };
}
