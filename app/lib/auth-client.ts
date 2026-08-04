import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. No `baseURL` needed — the auth routes are
 * served from the same origin at /api/auth/*.
 */
export const authClient = createAuthClient();
