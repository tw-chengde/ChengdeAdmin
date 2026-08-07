"use client";

import { useState } from "react";
import { Alert, Avatar, Box, Paper, Stack, Switch, Typography } from "@mui/material";
import type { PlatformCode } from "@/app/lib/platforms/types";
import { usePlatformSettings } from "./platform-settings-context";

export default function PlatformsView() {
  const { statuses, loading, error: loadError, toggle } = usePlatformSettings();
  const [pendingCode, setPendingCode] = useState<PlatformCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (code: PlatformCode, nextEnabled: boolean) => {
    setError(null);
    setPendingCode(code);
    toggle(code, nextEnabled)
      .then((result) => {
        if (!result.ok) setError(result.error ?? "更新平台狀態失敗");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "更新平台狀態失敗"))
      .finally(() => setPendingCode(null));
  };

  return (
    <Box>
      <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em", mb: 0.5 }}>
        設定
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: 14, mb: 3 }}>
        選擇要在訂單管理顯示與抓單的電商平台。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              載入中...
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Box sx={{ borderBottom: "1px solid #eaecf0" }} />}>
            {statuses.map((platform) => (
              <Stack
                key={platform.code}
                direction="row"
                spacing={2}
                sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2.5 }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    src={platform.logo}
                    alt={platform.name}
                    sx={{ width: 40, height: 40, borderRadius: 2 }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 750, color: "#0f172a" }}>{platform.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                      {platform.code}
                    </Typography>
                  </Box>
                </Stack>
                <Switch
                  checked={platform.enabled}
                  disabled={pendingCode === platform.code}
                  onChange={() => handleToggle(platform.code, !platform.enabled)}
                  slotProps={{ input: { "aria-label": `切換 ${platform.name}` } }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
