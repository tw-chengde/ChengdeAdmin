"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  bindPlatformProduct,
  loadMergeBindingPageData,
  unbindPlatformProduct,
} from "@/app/dashboard/merge-actions";
import { usePlatformSettings } from "@/app/dashboard/platform-settings-context";
import type {
  ListingStatusFilter,
  PlatformProduct,
  PlatformProductQuery,
} from "@/app/lib/platforms/product";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { Product } from "@/app/types/product";
import type { MergeBindingPageData } from "@/app/types/product-binding";
import { errorMessage } from "@/app/utils/errors";
import {
  bindingKey,
  bindingStats,
  filterPlatformProducts,
  indexBindings,
  suggestProductId,
  type BindingFilter,
} from "@/app/utils/product-bindings";
import { useMutationDialog } from "./useMutationDialog";
import { useSnackbar } from "./useSnackbar";

const emptyPageData: MergeBindingPageData = { platformProducts: [], failures: [], bindings: [], products: [] };

/**
 * 單一平台分頁的查詢狀態。
 *
 * 平台商品查詢成本高（要打各家 API），切換分頁時若直接丟掉結果，回頭就得重查一次；
 * 因此每個平台各自留一份，切回來直接沿用，只有再次按下「查詢」才覆寫。
 */
export interface ChannelState {
  /** 上次查詢的結果。查詢中或查詢失敗都保留舊內容，避免畫面突然變空。 */
  data: MergeBindingPageData;
  /** 產生 data 的查詢條件；綁定異動後的重載沿用它，而非使用者改了但沒送出的選項。 */
  query: PlatformProductQuery | null;
  /** 是否對這個平台送出過查詢（決定空清單要顯示「請按查詢」還是「查無商品」）。 */
  searched: boolean;
  loading: boolean;
  error: string | null;
}

const blankChannel: ChannelState = { data: emptyPageData, query: null, searched: false, loading: false, error: null };

/**
 * 併單管理頁的 view model。
 *
 * 把「每個平台各自的查詢快取」「前端篩選」「綁定／解綁流程」三件事從畫面裡拉出來，
 * 讓這些狀態轉換能直接用 renderHook 驗證，而不必透過 DOM 反推。
 */
export function useMergeBindings() {
  const { enabledPlatforms } = usePlatformSettings();

  // 以平台為 key 的查詢結果快取。進入畫面時為空，不自動查詢。
  const [channels, setChannels] = useState<Partial<Record<PlatformCode, ChannelState>>>({});
  const [channelOverride, setChannelOverride] = useState<PlatformCode | "">("");
  const [keyword, setKeywordState] = useState("");
  const [filter, setFilterState] = useState<BindingFilter>("ALL");
  // 商品狀態是唯一會送進平台 API 的篩選條件（另一個是平台本身）。
  const [listingStatus, setListingStatus] = useState<ListingStatusFilter>("LISTED");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { snackbar, notify, close: closeSnackbar } = useSnackbar();

  // 每個平台各自記一個請求序號：同一平台只採用最後一次查詢的結果，
  // 但不同平台的查詢彼此獨立，切走再切回來仍拿得到另一個平台已經查完的結果。
  const requestIds = useRef<Partial<Record<PlatformCode, number>>>({});

  // 選中的通路若已不再啟用（例如在設定頁被停用）或尚未選過，改用第一個啟用中的平台；
  // 於 render 期間直接推導，避免在 effect 內 setState 造成多餘的連鎖重繪。
  const selectedChannel: PlatformCode | "" =
    channelOverride && enabledPlatforms.some((p) => p.code === channelOverride)
      ? channelOverride
      : (enabledPlatforms[0]?.code ?? "");
  const selectedPlatform = enabledPlatforms.find((p) => p.code === selectedChannel);

  // 目前分頁的查詢狀態；沒查過的平台一律拿到同一份空白狀態。
  //
  // data.bindings / data.products 雖然是跨平台共用的資料，各平台的快取各存一份仍安全：
  // 綁定以 (平台, 平台商品編號) 為 key，改動某個平台的綁定不會影響其他分頁列出的內容。
  const channel = (selectedChannel && channels[selectedChannel]) || blankChannel;
  const { data, loading, error: loadError } = channel;

  const patchChannel = useCallback((code: PlatformCode, patch: Partial<ChannelState>) => {
    setChannels((prev) => ({ ...prev, [code]: { ...(prev[code] ?? blankChannel), ...patch } }));
  }, []);

  const runSearch = useCallback(
    (query: PlatformProductQuery) => {
      // 以 query.platformCode 寫回，查詢途中切走分頁時結果仍會落在正確的平台上。
      const code = query.platformCode;
      const id = (requestIds.current[code] ?? 0) + 1;
      requestIds.current[code] = id;
      const isCurrent = () => requestIds.current[code] === id;

      patchChannel(code, { query, searched: true, loading: true, error: null });
      void loadMergeBindingPageData(query).then(
        (next) => {
          if (isCurrent()) patchChannel(code, { data: next, loading: false });
        },
        (error: unknown) => {
          if (isCurrent()) patchChannel(code, { loading: false, error: errorMessage(error, "載入平台商品失敗") });
        },
      );
    },
    [patchChannel],
  );

  /** 綁定異動後依「上次送出的」查詢條件重載清單。 */
  const reload = useCallback(() => {
    if (channel.query) runSearch(channel.query);
  }, [channel.query, runSearch]);

  const bind = useMutationDialog<PlatformProduct>(reload);
  const unbind = useMutationDialog<PlatformProduct>(reload);

  const bound = useMemo(() => indexBindings(data.bindings), [data.bindings]);
  const productById = useMemo(() => new Map(data.products.map((product) => [product.id, product])), [data.products]);

  const channelProducts = useMemo(
    () => data.platformProducts.filter((item) => item.platformCode === selectedChannel),
    [data.platformProducts, selectedChannel],
  );
  const visibleProducts = useMemo(
    () => filterPlatformProducts(data.platformProducts, { platformCode: selectedChannel, keyword, filter }, bound),
    [data.platformProducts, selectedChannel, keyword, filter, bound],
  );
  const stats = useMemo(() => bindingStats(channelProducts, bound), [channelProducts, bound]);

  const channelFailure = data.failures.find((failure) => failure.platformCode === selectedChannel);

  const search = useCallback(() => {
    if (!selectedChannel) return;
    runSearch({ platformCode: selectedChannel, listingStatus });
  }, [selectedChannel, listingStatus, runSearch]);

  /**
   * 切換平台分頁只換平台，不自動查詢。
   * 該平台若查過就直接顯示上次的結果，沒查過才顯示提示等使用者按下查詢。
   */
  const selectChannel = useCallback(
    (next: PlatformCode) => {
      if (!next || next === selectedChannel) return;
      setChannelOverride(next);
    },
    [selectedChannel],
  );

  const openBind = useCallback(
    (item: PlatformProduct) => {
      const existing = bound.get(bindingKey(item.platformCode, item.goodsCode));
      const preselectedId = existing?.product_id ?? suggestProductId(item, data.products);
      setSelectedProduct(preselectedId ? (productById.get(preselectedId) ?? null) : null);
      bind.open(item);
    },
    [bind, bound, data.products, productById],
  );

  const submitBind = useCallback(() => {
    const target = bind.target;
    if (!target) return;
    if (!selectedProduct) {
      bind.setError("請選擇要綁定的本地商品");
      return;
    }
    const product = selectedProduct;
    bind.submit(async () => {
      const result = await bindPlatformProduct({
        productId: product.id,
        platformCode: target.platformCode,
        goodsCode: target.goodsCode,
        goodsName: target.name,
      });
      if (result.ok) notify(`已將「${target.name}」綁定至 ${product.code} · ${product.name}`, "success");
      return result;
    }, "綁定失敗");
  }, [bind, notify, selectedProduct]);

  const submitUnbind = useCallback(() => {
    const target = unbind.target;
    if (!target) return;
    unbind.submit(async () => {
      const result = await unbindPlatformProduct(target.platformCode, target.goodsCode);
      if (result.ok) notify(`已解除「${target.name}」的綁定`, "info");
      return result;
    }, "解除綁定失敗");
  }, [notify, unbind]);

  return {
    enabledPlatforms,
    selectedChannel,
    selectedPlatform,
    selectChannel,

    data,
    loading,
    loadError,
    channelFailure,
    searched: channel.searched,
    /** 產生目前結果的查詢條件；用來提醒使用者畫面上不是新條件的結果。 */
    appliedQuery: channel.query,

    keyword,
    setKeyword: setKeywordState,
    filter,
    setFilter: setFilterState,
    listingStatus,
    setListingStatus,
    search,

    bound,
    productById,
    channelProducts,
    visibleProducts,
    stats,

    bind,
    unbind,
    openBind,
    submitBind,
    submitUnbind,
    selectedProduct,
    setSelectedProduct,

    snackbar,
    closeSnackbar,
  };
}
