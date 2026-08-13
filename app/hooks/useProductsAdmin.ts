"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/app/dashboard/products-actions";
import type { Product } from "@/app/types/product";
import { errorMessage } from "@/app/utils/errors";
import { emptyProductForm, toProductFormState, toProductInput, type ProductFormState } from "@/app/utils/product-form";
import { useLatestRequest } from "./useLatestRequest";
import { useMutationDialog } from "./useMutationDialog";

/**
 * 商品管理頁的 view model：清單載入與新增／修改／刪除三個流程。
 *
 * 抽出來是為了讓這些狀態轉換能用 renderHook 直接測，
 * 而不必為了驗證「刪除失敗時對話框要留著並顯示錯誤」去渲染整棵元件樹。
 */
export function useProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const runLatest = useLatestRequest();

  const applyResult = useMemo(
    () => ({
      onSuccess: setProducts,
      onError: (error: unknown) => setLoadError(errorMessage(error, "載入商品失敗")),
      onSettled: () => setLoading(false),
    }),
    [],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    runLatest(listProducts, applyResult);
  }, [applyResult, runLatest]);

  // 初次載入。loading 預設就是 true，因此這裡不需要（也不該）同步 setState——
  // 在 effect 內直接改 state 會多觸發一次重繪。
  useEffect(() => {
    runLatest(listProducts, applyResult);
  }, [applyResult, runLatest]);

  const create = useMutationDialog<true>(reload);
  const edit = useMutationDialog<Product>(reload);
  const remove = useMutationDialog<Product>(reload);

  const [createForm, setCreateForm] = useState<ProductFormState>(emptyProductForm);
  const [editForm, setEditForm] = useState<ProductFormState>(emptyProductForm);

  const openCreate = useCallback(() => {
    setCreateForm(emptyProductForm);
    create.open(true);
  }, [create]);

  const openEdit = useCallback(
    (product: Product) => {
      setEditForm(toProductFormState(product));
      edit.open(product);
    },
    [edit],
  );

  const submitCreate = useCallback(() => {
    setSuccess(null);
    create.submit(async () => {
      const result = await createProduct(toProductInput(createForm));
      if (result.ok) {
        setCreateForm(emptyProductForm);
        setSuccess("商品已新增");
      }
      return result;
    }, "新增失敗");
  }, [create, createForm]);

  const submitEdit = useCallback(() => {
    const editing = edit.target;
    if (!editing) return;
    setSuccess(null);
    edit.submit(async () => {
      const result = await updateProduct({ id: editing.id, ...toProductInput(editForm) });
      if (result.ok) setSuccess("商品已更新");
      return result;
    }, "修改失敗");
  }, [edit, editForm]);

  const submitDelete = useCallback(() => {
    const deleting = remove.target;
    if (!deleting) return;
    setSuccess(null);
    remove.submit(async () => {
      const result = await deleteProduct(deleting.id);
      if (result.ok) setSuccess(`商品「${deleting.name}」已刪除`);
      return result;
    }, "刪除失敗");
  }, [remove]);

  return {
    products,
    loading,
    loadError,
    success,
    dismissSuccess: useCallback(() => setSuccess(null), []),
    reload,
    create,
    edit,
    remove,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    openCreate,
    openEdit,
    submitCreate,
    submitEdit,
    submitDelete,
  };
}
