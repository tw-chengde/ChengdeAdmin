export interface Product {
  id: number;
  code: string;
  name: string;
  stock: number;
  created_at: string;
}

export interface CreateProductInput {
  code: string;
  name: string;
  stock: number;
}

export interface UpdateProductInput extends CreateProductInput {
  id: number;
}

/** 新增／修改／刪除共用的結果型別。失敗時 error 為可直接顯示的中文訊息。 */
export interface ProductMutationResult {
  ok: boolean;
  error?: string;
}
