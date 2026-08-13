export interface PlatformProxyOptions {
  proxyUrl?: string;
  proxyToken?: string;
}

export interface ResolvedPlatformRequest {
  url: string;
  /** 走 proxy 時要附加的標頭；直連時為空物件。 */
  proxyHeaders: Record<string, string>;
}

/**
 * 決定實際要送出的 URL 與 proxy 標頭。
 *
 * 未設定 proxy 時直連平台；設定後改送到 proxy 的相同路徑，真正的目標主機以
 * x-target-url 告知（proxy 端會比對 allowlist 後轉發，並在轉發前移除這兩個標頭）。
 */
export function resolvePlatformRequest(
  baseUrl: string,
  path: string,
  { proxyUrl, proxyToken }: PlatformProxyOptions,
): ResolvedPlatformRequest {
  const normalizedProxyUrl = proxyUrl?.trim().replace(/\/$/, "");
  if (!normalizedProxyUrl) return { url: new URL(path, baseUrl).toString(), proxyHeaders: {} };
  if (!proxyToken) throw new Error("設定 MOMO_PROXY_URL 時也必須設定 MOMO_PROXY_TOKEN。");

  return {
    url: new URL(path, normalizedProxyUrl).toString(),
    proxyHeaders: { "x-proxy-token": proxyToken, "x-target-url": baseUrl },
  };
}
