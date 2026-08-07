export type PlatformCode = "MOMO_MAIN" | "MO_STORE_PLUS";

export interface PlatformDefinition {
  code: PlatformCode;
  name: string;
  logo: string;
  logoObjectFit: "contain" | "cover";
  color: string;
  bgcolor: string;
  borderColor: string;
  gradient: string;
}
