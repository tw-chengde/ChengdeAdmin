"use client";

import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import LocalMallRounded from "@mui/icons-material/LocalMallRounded";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import TrendingDownRounded from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useOverviewViewModel } from "@/app/hooks/useOverviewViewModel";
import LoadingBackdrop from "./loading-backdrop";

export default function OverviewView() {
  const { metrics, loading, error, lastUpdated, reload } = useOverviewViewModel();

  const formattedTime = lastUpdated
    ? new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(lastUpdated)
    : "";

  return (
    <Box>
      {/* 頂部標題與工具列 */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em" }}>
            營運總覽
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
            整合 MOMO 購物網與 Mo 店+ 等跨平台即時數據，掌握全通路營收、客單價與每日走勢。
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {formattedTime && (
            <Chip
              icon={<AccessTimeRounded sx={{ fontSize: 14 }} />}
              label={`更新於 ${formattedTime}`}
              size="small"
              sx={{ bgcolor: "#f1f5f9", color: "#64748b", fontWeight: 650, fontSize: 12 }}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => void reload()}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshRounded />}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              fontWeight: 700,
              bgcolor: "white",
              "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
            }}
          >
            重新整理
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 核心 KPI 卡片區（4 欄） */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2.25,
          mb: 3,
        }}
      >
        {/* 卡片 1：當月總業績 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid #eaecf0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
              當月總業績
            </Typography>
            <Box
              sx={{
                p: 0.8,
                borderRadius: 2,
                bgcolor: "rgba(235, 113, 74, 0.1)",
                color: "var(--color-primary)",
                display: "flex",
              }}
            >
              <PaymentsRounded sx={{ fontSize: 20 }} />
            </Box>
          </Stack>

          {loading && !metrics ? (
            <Skeleton variant="text" width="70%" height={48} sx={{ mt: 1 }} />
          ) : (
            <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 850, color: "#0f172a", letterSpacing: "-.02em" }}>
              NT$ {metrics?.currentMonthRevenue.toLocaleString() ?? "0"}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1.2 }}>
            {metrics?.revenueGrowthRate !== null && metrics?.revenueGrowthRate !== undefined ? (
              <Chip
                icon={
                  metrics.revenueGrowthRate >= 0 ? (
                    <TrendingUpRounded sx={{ fontSize: "14px !important" }} />
                  ) : (
                    <TrendingDownRounded sx={{ fontSize: "14px !important" }} />
                  )
                }
                label={`${metrics.revenueGrowthRate >= 0 ? "+" : ""}${metrics.revenueGrowthRate}% vs 上月同期`}
                size="small"
                sx={{
                  fontWeight: 750,
                  fontSize: 11,
                  height: 22,
                  bgcolor: metrics.revenueGrowthRate >= 0 ? "#ecfdf3" : "#fef3f2",
                  color: metrics.revenueGrowthRate >= 0 ? "#027a48" : "#b42318",
                }}
              />
            ) : (
              <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                1 號至今日累計
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* 卡片 2：上個月總業績 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid #eaecf0",
            borderRadius: 3,
            bgcolor: "#ffffff",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
              上個月總業績
            </Typography>
            <Box
              sx={{
                p: 0.8,
                borderRadius: 2,
                bgcolor: "rgba(43, 72, 133, 0.1)",
                color: "#2b4885",
                display: "flex",
              }}
            >
              <ReceiptLongRounded sx={{ fontSize: 20 }} />
            </Box>
          </Stack>

          {loading && !metrics ? (
            <Skeleton variant="text" width="70%" height={48} sx={{ mt: 1 }} />
          ) : (
            <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 850, color: "#334155", letterSpacing: "-.02em" }}>
              NT$ {metrics?.lastMonthRevenue.toLocaleString() ?? "0"}
            </Typography>
          )}

          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1.2 }}>
            上月同期 NT$ {metrics?.lastMonthSamePeriodRevenue.toLocaleString() ?? "0"}
          </Typography>
        </Paper>

        {/* 卡片 3：當月總訂單數 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid #eaecf0",
            borderRadius: 3,
            bgcolor: "#ffffff",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
              當月總訂單數
            </Typography>
            <Box
              sx={{
                p: 0.8,
                borderRadius: 2,
                bgcolor: "rgba(16, 185, 129, 0.1)",
                color: "#059669",
                display: "flex",
              }}
            >
              <LocalMallRounded sx={{ fontSize: 20 }} />
            </Box>
          </Stack>

          {loading && !metrics ? (
            <Skeleton variant="text" width="60%" height={48} sx={{ mt: 1 }} />
          ) : (
            <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 850, color: "#0f172a", letterSpacing: "-.02em" }}>
              {metrics?.currentMonthOrders.toLocaleString() ?? "0"}{" "}
              <span style={{ fontSize: 16, fontWeight: 650, color: "#64748b" }}>筆</span>
            </Typography>
          )}

          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1.2 }}>
            上月全月 {metrics?.lastMonthOrders.toLocaleString() ?? "0"} 筆
          </Typography>
        </Paper>

        {/* 卡片 4：平均客單價 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid #eaecf0",
            borderRadius: 3,
            bgcolor: "#ffffff",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
              當月平均客單價 (AOV)
            </Typography>
            <Box
              sx={{
                p: 0.8,
                borderRadius: 2,
                bgcolor: "rgba(99, 102, 241, 0.1)",
                color: "#4f46e5",
                display: "flex",
              }}
            >
              <PaymentsRounded sx={{ fontSize: 20 }} />
            </Box>
          </Stack>

          {loading && !metrics ? (
            <Skeleton variant="text" width="60%" height={48} sx={{ mt: 1 }} />
          ) : (
            <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 850, color: "#0f172a", letterSpacing: "-.02em" }}>
              NT$ {metrics?.currentMonthAov.toLocaleString() ?? "0"}
            </Typography>
          )}

          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1.2 }}>
            上月平均 NT$ {metrics?.lastMonthAov.toLocaleString() ?? "0"}
          </Typography>
        </Paper>
      </Box>

      {/* 次要區塊：各通路平台業績拆解 */}
      <Paper elevation={0} sx={{ p: 2.8, border: "1px solid #eaecf0", borderRadius: 3, bgcolor: "#ffffff", mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              各通路平台業績拆解
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.3 }}>
              各電商通路當月與上月營收對比與佔比貢獻度
            </Typography>
          </Box>
        </Stack>

        {loading && !metrics ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
            <Skeleton variant="rounded" height={130} />
            <Skeleton variant="rounded" height={130} />
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
            {metrics?.platformStats.map((plat) => (
              <Paper
                key={plat.code}
                elevation={0}
                sx={{
                  p: 2.2,
                  border: `1px solid ${plat.borderColor}`,
                  borderRadius: 2.5,
                  bgcolor: plat.bgcolor,
                  transition: "all .2s ease",
                  "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.04)" },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}
                >
                  <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                    <Box
                      component="img"
                      src={plat.logo}
                      alt={plat.name}
                      sx={{ width: 32, height: 32, borderRadius: 1.5, objectFit: plat.logoObjectFit }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
                        {plat.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                        訂單數：{plat.currentMonthOrders} 筆 ｜ 客單價：NT$ {plat.currentMonthAov.toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "flex-end" }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 850, color: plat.color }}>
                      NT$ {plat.currentMonthRevenue.toLocaleString()}
                    </Typography>
                    <Chip
                      label={`${plat.sharePercentage}%`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: 11.5,
                        fontWeight: 800,
                        bgcolor: plat.color,
                        color: "white",
                      }}
                    />
                  </Stack>
                </Stack>

                {/* 佔比進度條 */}
                <LinearProgress
                  variant="determinate"
                  value={plat.sharePercentage}
                  sx={{
                    height: 7,
                    borderRadius: 3.5,
                    bgcolor: "rgba(0,0,0,0.06)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: plat.color,
                      borderRadius: 3.5,
                    },
                  }}
                />

                <Typography sx={{ fontSize: 12, color: "#64748b", mt: 1.2 }}>
                  上月全月：NT$ {plat.lastMonthRevenue.toLocaleString()} ({plat.lastMonthOrders} 筆)
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      {/* 底部：當月每日銷售趨勢圖表 */}
      <Paper elevation={0} sx={{ p: 2.8, border: "1px solid #eaecf0", borderRadius: 3, bgcolor: "#ffffff" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              當月每日銷售趨勢
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.3 }}>
              呈現 1 號至今每日業績走勢與累積金額變化
            </Typography>
          </Box>
        </Stack>

        {loading && !metrics ? (
          <Skeleton variant="rounded" height={180} />
        ) : metrics && metrics.dailyTrends.length > 0 ? (
          <Box sx={{ width: "100%", overflowX: "auto", pt: 2 }}>
            <DailyTrendChart trends={metrics.dailyTrends} />
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4, fontSize: 14 }}>
            尚無當月走勢數據
          </Typography>
        )}
      </Paper>

      <LoadingBackdrop open={loading && !metrics} message="正在計算全通路營運數據..." />
    </Box>
  );
}

/**
 * 輕量 SVG 每日營收長條與走勢視覺化元件。
 */
function DailyTrendChart({
  trends,
}: {
  trends: Array<{
    date: string;
    label: string;
    day: number;
    revenue: number;
    orderCount: number;
    cumulativeRevenue: number;
  }>;
}) {
  const maxRevenue = Math.max(...trends.map((t) => t.revenue), 1000);
  const chartHeight = 130;

  return (
    <Box sx={{ minWidth: 600, px: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          height: chartHeight,
          gap: { xs: 0.8, sm: 1.2 },
          borderBottom: "1px solid #eaecf0",
          pb: 0.5,
        }}
      >
        {trends.map((item) => {
          const heightPercent = Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 8 : 2);
          return (
            <Tooltip
              key={item.date}
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{item.date}</Typography>
                  <Typography sx={{ fontSize: 11.5 }}>
                    單日營收：NT$ {item.revenue.toLocaleString()} ({item.orderCount} 筆)
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#cbd5e1" }}>
                    累計營收：NT$ {item.cumulativeRevenue.toLocaleString()}
                  </Typography>
                </Box>
              }
              arrow
            >
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 32,
                    height: `${heightPercent}%`,
                    bgcolor: item.revenue > 0 ? "var(--color-primary)" : "#e2e8f0",
                    borderRadius: "4px 4px 0 0",
                    transition: "all .2s ease",
                    "&:hover": {
                      bgcolor: "var(--color-primary-dark)",
                      filter: "brightness(1.1)",
                    },
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* X 軸標籤 */}
      <Box sx={{ display: "flex", gap: { xs: 0.8, sm: 1.2 }, mt: 1 }}>
        {trends.map((item) => (
          <Box key={item.date} sx={{ flex: 1, textAlign: "center" }}>
            <Typography sx={{ fontSize: 11, color: "#64748b", fontWeight: 650 }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
