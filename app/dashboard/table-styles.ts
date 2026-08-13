/**
 * 表格標題（TableHead）儲存格與固定欄位（sticky column）的共用樣式設定。
 */
export const headCell = { color: "#667085", fontSize: 12, fontWeight: 750 };

export const stickyActionCell = {
  position: "sticky" as const,
  right: 0,
  zIndex: 2,
  borderLeft: "1px solid #eaecf0",
};
