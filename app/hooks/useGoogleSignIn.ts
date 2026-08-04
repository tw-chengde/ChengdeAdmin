"use client";

import { useCallback, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

const GOOGLE_CALLBACK_URL = "/dashboard";
const DEFAULT_SIGN_IN_ERROR = "登入失敗，請稍後再試。";
const NETWORK_ERROR = "無法啟動登入流程，請確認網路連線後再試。";

export function useGoogleSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setPending(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: GOOGLE_CALLBACK_URL,
      });

      if (signInError) {
        setError(signInError.message ?? DEFAULT_SIGN_IN_ERROR);
        setPending(false);
      }
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  }, []);

  return { error, pending, signIn };
}