import { createTheme } from "@mui/material/styles";

export const brand = {
  primary: "#eb714a",
  primaryLight: "#f09273",
  primaryDark: "#d65730",
  background: "#fafaf9",
  surface: "#ffffff",
  text: "#1c1917",
  textSecondary: "#78716c",
  border: "#eee5e1",
} as const;

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.primary,
      light: brand.primaryLight,
      dark: brand.primaryDark,
      contrastText: brand.surface,
    },
    background: {
      default: brand.background,
      paper: brand.surface,
    },
    text: {
      primary: brand.text,
      secondary: brand.textSecondary,
    },
  },
  typography: {
    fontFamily: "var(--font-noto-sans-tc), Microsoft JhengHei, sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { boxShadow: "none" } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: brand.border } } },
  },
});
