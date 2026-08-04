"use client";

import { Alert, Box, Button, CircularProgress, CssBaseline, Paper, Stack, ThemeProvider, Typography } from "@mui/material";
import { useGoogleSignIn } from "@/app/hooks/useGoogleSignIn";
import { appTheme } from "@/app/theme";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function LoginScreen() {
  const { error, pending, signIn } = useGoogleSignIn();

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          py: 6,
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(circle at 50% 0%, #fff7f5 0%, #fafaf9 70%)",
        }}
      >
        {/* Decorative ambient halo */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(235, 113, 74, 0.16) 0%, rgba(255, 255, 255, 0) 70%)",
            pointerEvents: "none",
            borderRadius: "50%",
          }}
        />

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 4, sm: 5 },
            borderRadius: 4,
            bgcolor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(245, 213, 203, 0.6)",
            boxShadow: "0 20px 40px -15px rgba(235, 113, 74, 0.08), 0 0 1px 1px rgba(28, 25, 23, 0.03)",
            position: "relative",
            zIndex: 1,
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              boxShadow: "0 25px 50px -12px rgba(235, 113, 74, 0.14), 0 0 1px 1px rgba(28, 25, 23, 0.04)",
            },
          }}
        >
          <Stack spacing={3.5} sx={{ alignItems: "center" }}>
            {/* Logo */}
            <Box
              component="img"
              src="/chengde-logo.png"
              alt="誠得 logo"
              sx={{
                display: "block",
                width: { xs: 140, sm: 160 },
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 12px rgba(235, 113, 74, 0.12))",
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: "scale(1.03)",
                },
              }}
            />

            {/* Title & Subtitle */}
            <Box sx={{ textAlign: "center" }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 24, sm: 28 },
                  fontWeight: 700,
                  color: "#1c1917",
                  letterSpacing: "-0.01em",
                  mb: 0.8,
                }}
              >
                誠得管理後台
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#78716c",
                  fontSize: 14,
                  fontWeight: 400,
                }}
              >
                歡迎回來，請使用授權 Google 帳號登入
              </Typography>
            </Box>

            {/* Login Action */}
            <Box sx={{ width: "100%" }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5, fontSize: 13.5 }}>
                  {error}
                </Alert>
              )}
              <Button
                type="button"
                onClick={signIn}
                disabled={pending}
                fullWidth
                variant="outlined"
                size="large"
                startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
                sx={{
                  minHeight: 52,
                  borderRadius: 2.5,
                  borderColor: "#f3d5cb",
                  bgcolor: "#ffffff",
                  color: "#1c1917",
                  fontSize: 15,
                  fontWeight: 600,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "#eb714a",
                    bgcolor: "#fffaf8",
                    boxShadow: "0 4px 14px rgba(235, 113, 74, 0.15)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#ffffff",
                    borderColor: "#f3d5cb",
                    color: "#a8a29e",
                  },
                }}
              >
                {pending ? "前往 Google 登入…" : "使用 Google 帳號登入"}
              </Button>
            </Box>

            {/* Security Indicator */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: "#a8a29e",
                fontSize: 12,
              }}
            >
              <LockIcon />
              <Typography variant="caption" sx={{ color: "#a8a29e", fontSize: 12 }}>
                安全傳輸加密保護
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Footer info */}
        <Typography
          variant="caption"
          sx={{
            mt: 4,
            color: "#a8a29e",
            fontSize: 12,
            position: "relative",
            zIndex: 1,
          }}
        >
          © {new Date().getFullYear()} 誠得有限公司 CHENG DE CO., LTD. All Rights Reserved.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
