"use client";

import { Backdrop, Box, Stack, Typography } from "@mui/material";

export interface LoadingBackdropProps {
  /** 是否開啟遮罩 */
  open: boolean;
  /** 提示訊息 */
  message?: string;
}

/**
 * 前端呼叫非同步 API 或執行長時間作業時的品牌半透明遮罩。
 * 鎖定全畫面防止重複點擊與誤操作。
 */
export default function LoadingBackdrop({
  open,
  message = "資料處理中，請稍候...",
}: LoadingBackdropProps) {
  if (!open) return null;

  return (
    <Backdrop
      open={open}
      sx={{
        color: "#fff",
        zIndex: (theme) => theme.zIndex.modal + 1,
        bgcolor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Stack
        spacing={2.5}
        sx={{
          alignItems: "center",
          bgcolor: "rgba(255, 255, 255, 0.96)",
          px: { xs: 4, sm: 5 },
          py: { xs: 3.5, sm: 4 },
          borderRadius: 4,
          boxShadow: "0 24px 48px -12px rgba(235, 113, 74, 0.18), 0 0 1px 1px rgba(28, 25, 23, 0.05)",
          border: "1px solid rgba(245, 213, 203, 0.8)",
          maxWidth: "90vw",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo 容器與呼吸微光動畫 */}
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", py: 1 }}>
          {/* 光暈呼吸層 */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(235, 113, 74, 0.28) 0%, rgba(255, 255, 255, 0) 70%)",
              animation: "haloPulse 2s ease-in-out infinite",
              "@keyframes haloPulse": {
                "0%, 100%": { transform: "scale(0.85)", opacity: 0.5 },
                "50%": { transform: "scale(1.35)", opacity: 0.95 },
              },
            }}
          />

          {/* 誠得品牌 Logo */}
          <Box
            component="img"
            src="/chengde-logo.png"
            alt="誠得商標"
            sx={{
              position: "relative",
              zIndex: 1,
              width: { xs: 120, sm: 140 },
              height: "auto",
              objectFit: "contain",
              animation: "logoBreathe 2s ease-in-out infinite",
              "@keyframes logoBreathe": {
                "0%, 100%": {
                  transform: "scale(1)",
                  filter: "drop-shadow(0 4px 10px rgba(235, 113, 74, 0.16))",
                },
                "50%": {
                  transform: "scale(1.06)",
                  filter: "drop-shadow(0 8px 20px rgba(235, 113, 74, 0.35))",
                },
              },
            }}
          />
        </Box>

        {/* 品牌動態光束進度條 */}
        <Box
          sx={{
            width: 130,
            height: 3.5,
            borderRadius: 2,
            bgcolor: "#f5d5cb",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              width: "50%",
              height: "100%",
              borderRadius: 2,
              background: "linear-gradient(90deg, #f09273, #eb714a, #d65730)",
              animation: "trackSlide 1.5s ease-in-out infinite",
              "@keyframes trackSlide": {
                "0%": { transform: "translateX(-100%)" },
                "100%": { transform: "translateX(200%)" },
              },
            }}
          />
        </Box>

        {/* 提示文字 */}
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1c1917",
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          {message}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
