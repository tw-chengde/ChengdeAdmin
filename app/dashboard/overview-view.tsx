"use client";

import { ConstructionRounded } from "@mui/icons-material";
import { Box, Paper, Stack, Typography } from "@mui/material";

type OverviewViewProps = {
  user: { name: string; email: string; image?: string };
  onViewAllOrders: () => void;
};

export default function OverviewView(_props: OverviewViewProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        minHeight: 360,
        p: { xs: 4, sm: 6 },
        border: "1px solid #eee5e1",
        borderRadius: 3,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            bgcolor: "#fde4dc",
            color: "#d65730",
          }}
        >
          <ConstructionRounded sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, mb: 1 }}>
            總覽
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            這個模組功能開發中，敬請期待。
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
