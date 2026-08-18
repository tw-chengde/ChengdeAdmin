"use client";

/** 把 base64 字串轉成 Blob。Workers 沒有 `Buffer`，出貨標籤 PDF 一律以 base64 字串在前後端間傳遞。 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const payload = base64.replace(/^data:[^;,]+;base64,/, "");
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

const contentTypeByKind: Record<string, string> = {
  PDF_BASE64: "application/pdf",
  HTML: "text/html",
};

/** 觸發瀏覽器下載一份出貨文件；`PDF_BASE64` 解碼成 Blob 下載，`URL` 直接開新分頁。 */
export function downloadShipmentDocument(document: { kind: string; content: string; name: string }): void {
  if (document.kind === "URL") {
    window.open(document.content, "_blank", "noopener,noreferrer");
    return;
  }

  const blob =
    document.kind === "PDF_BASE64"
      ? base64ToBlob(document.content, contentTypeByKind.PDF_BASE64)
      : new Blob([document.content], { type: contentTypeByKind[document.kind] ?? "text/plain" });

  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.name;
  link.click();
  URL.revokeObjectURL(url);
}
