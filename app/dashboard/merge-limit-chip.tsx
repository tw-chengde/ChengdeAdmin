"use client";

import Chip from "@mui/material/Chip";

const mergeLimitTone = {
  cvs: { bgcolor: "#e1f5fe", color: "#0277bd" },
  logistics: { bgcolor: "#ecfdf3", color: "#027a48" },
};

const channelPrefix = {
  cvs: "超商",
  logistics: "物流",
};

/** 併單上限為 0 代表該通路不可併單，需與「上限 N 件」明顯區分。
 *  商品管理與併單管理兩頁共用同一份呈現規則。 */
export default function MergeLimitChip({
  limit,
  channel,
  showChannel = true,
}: {
  limit: number;
  channel: "cvs" | "logistics";
  showChannel?: boolean;
}) {
  const prefix = showChannel ? `${channelPrefix[channel]} ` : "";
  if (limit <= 0) {
    return (
      <Chip
        label={`${prefix}不可併單`}
        size="small"
        sx={{ fontWeight: 750, fontSize: 12, bgcolor: "#f2f4f7", color: "#667085" }}
      />
    );
  }
  return (
    <Chip
      label={`${prefix}上限 ${limit} 件`}
      size="small"
      sx={{ fontWeight: 800, fontSize: 12, ...mergeLimitTone[channel] }}
    />
  );
}
