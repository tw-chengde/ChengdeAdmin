import type { PickingGroup } from "@/app/types/picking";
import { productLabel } from "@/app/utils/product-bindings";

interface PickingSheetPrintViewProps {
  /** 依目前篩選（搜尋關鍵字／只看未綁定）過濾後、與畫面同步的品項組。 */
  groups: PickingGroup[];
  printedAt: string;
}

/**
 * 揀貨單專用列印版面：與畫面上的檢視表格分開設計，欄位、字級、勾選框皆為紙本作業最佳化，
 * 而非直接沿用畫面樣式。只在 @media print 時顯示（見 app/globals.css 的 .print-only 規則）。
 */
export default function PickingSheetPrintView({ groups, printedAt }: PickingSheetPrintViewProps) {
  return (
    <div className="print-only print-area picking-print-sheet" data-testid="picking-print-sheet" aria-hidden="true">
      <div className="picking-print-header">
        <h1>跨平台出貨總揀單</h1>
        <div className="picking-print-meta">
          <span>列印時間：{printedAt}</span>
          <span>揀貨人簽名：＿＿＿＿＿＿＿＿＿＿</span>
        </div>
      </div>

      <table className="picking-print-table">
        <thead>
          <tr>
            <th className="col-check">確認</th>
            <th className="col-product">商品</th>
            <th>平台</th>
            <th>平台商品編號</th>
            <th>規格</th>
            <th className="col-qty">數量</th>
            <th className="col-orders">訂單編號</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={7} className="col-empty">
                沒有符合篩選條件的品項。
              </td>
            </tr>
          ) : (
            groups.map((group) => {
              const productName = group.product ? productLabel(group.product) : group.fallbackName;
              return group.lines.map((line, index) => (
                <tr key={line.key}>
                  <td className="col-check">
                    <span className="picking-print-checkbox" />
                  </td>
                  {index === 0 && (
                    <td rowSpan={group.lines.length} className="col-product">
                      <div className="picking-print-product-name">{productName}</div>
                    </td>
                  )}
                  <td>{line.channelName}</td>
                  <td className="mono">{line.goodsCode ?? "—"}</td>
                  <td>{line.spec || "—"}</td>
                  <td className="col-qty">{line.totalQty}</td>
                  <td className="col-orders">{line.orderNos.join("、")}</td>
                </tr>
              ));
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
