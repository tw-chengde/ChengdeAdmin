import { act, renderHook } from "@testing-library/react";
import assert from "node:assert/strict";
import { test } from "vitest";
import { usePagination } from "@/app/hooks/usePagination";

const items = (count: number) => Array.from({ length: count }, (_, index) => index);

test("預設每頁 25 筆，只回傳目前頁的項目", () => {
  const { result } = renderHook(() => usePagination(items(60)));

  assert.equal(result.current.page, 0);
  assert.equal(result.current.rowsPerPage, 25);
  assert.deepEqual(result.current.pagedItems, items(25));

  act(() => result.current.onPageChange(null, 1));
  assert.deepEqual(result.current.pagedItems[0], 25);
  assert.equal(result.current.pagedItems.length, 25);

  act(() => result.current.onPageChange(null, 2));
  assert.equal(result.current.pagedItems.length, 10);
});

// 篩選後結果變少時，若不夾住頁碼，畫面會停在一個空白頁上。
test("項目變少導致頁碼超出範圍時自動夾回最後一頁", () => {
  const { result, rerender } = renderHook(({ data }) => usePagination(data), {
    initialProps: { data: items(60) },
  });

  act(() => result.current.onPageChange(null, 2));
  assert.equal(result.current.page, 2);

  rerender({ data: items(10) });

  assert.equal(result.current.page, 0);
  assert.equal(result.current.pagedItems.length, 10);
});

test("清空項目時停在第一頁而不是負數頁", () => {
  const { result, rerender } = renderHook(({ data }) => usePagination(data), {
    initialProps: { data: items(60) },
  });

  act(() => result.current.onPageChange(null, 2));
  rerender({ data: [] });

  assert.equal(result.current.page, 0);
  assert.deepEqual(result.current.pagedItems, []);
});

test("改變每頁筆數會回到第一頁", () => {
  const { result } = renderHook(() => usePagination(items(200)));

  act(() => result.current.onPageChange(null, 3));
  assert.equal(result.current.page, 3);

  act(() =>
    result.current.onRowsPerPageChange({ target: { value: "50" } } as React.ChangeEvent<HTMLInputElement>),
  );

  assert.equal(result.current.rowsPerPage, 50);
  assert.equal(result.current.page, 0);
  assert.equal(result.current.pagedItems.length, 50);
});

test("resetPage 讓篩選條件改變後回到第一頁", () => {
  const { result } = renderHook(() => usePagination(items(200)));

  act(() => result.current.onPageChange(null, 4));
  act(() => result.current.resetPage());

  assert.equal(result.current.page, 0);
});
