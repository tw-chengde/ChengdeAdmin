import { useCallback, useMemo, useState, type ChangeEvent } from "react";

export interface Pagination<T> {
  /** 已夾在有效範圍內的頁碼，可直接交給 TablePagination。 */
  page: number;
  rowsPerPage: number;
  /** 目前這一頁要顯示的項目。 */
  pagedItems: T[];
  onPageChange: (event: unknown, next: number) => void;
  onRowsPerPageChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** 篩選條件改變時回到第一頁。 */
  resetPage: () => void;
}

/**
 * 表格分頁。
 *
 * 篩選後結果變少時，目前頁碼可能已超出範圍；於 render 期間夾住即可，
 * 不需要另開一個 effect 去修正 state（那會多一次重繪，而且中間那一幀是空的）。
 */
export function usePagination<T>(items: T[], initialRowsPerPage = 25): Pagination<T> {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);

  const pagedItems = useMemo(
    () => items.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage),
    [items, safePage, rowsPerPage],
  );

  const onRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  }, []);

  const resetPage = useCallback(() => setPage(0), []);

  return {
    page: safePage,
    rowsPerPage,
    pagedItems,
    onPageChange: (_event, next) => setPage(next),
    onRowsPerPageChange,
    resetPage,
  };
}
