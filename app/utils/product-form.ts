import type { CreateProductInput, Product } from "@/app/types/product";

/** 對話框內的表單狀態。數字欄位以字串保存，送出時才轉成數字。 */
export interface ProductFormState {
  code: string;
  name: string;
  stock: string;
  cvsMergeLimit: string;
  logisticsMergeLimit: string;
}

export const emptyProductForm: ProductFormState = {
  code: "",
  name: "",
  stock: "",
  cvsMergeLimit: "0",
  logisticsMergeLimit: "0",
};

/** 空字串視為 0，其餘交給後端的 validateProductInput 把關。 */
const toNumber = (value: string) => Number(value === "" ? 0 : value);

export function toProductFormState(product: Product): ProductFormState {
  return {
    code: product.code,
    name: product.name,
    stock: String(product.stock),
    cvsMergeLimit: String(product.cvs_merge_limit),
    logisticsMergeLimit: String(product.logistics_merge_limit),
  };
}

export function toProductInput(form: ProductFormState): CreateProductInput {
  return {
    code: form.code,
    name: form.name,
    stock: toNumber(form.stock),
    cvsMergeLimit: toNumber(form.cvsMergeLimit),
    logisticsMergeLimit: toNumber(form.logisticsMergeLimit),
  };
}
