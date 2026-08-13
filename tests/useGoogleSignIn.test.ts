import { act, renderHook, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const signInSocial = vi.fn();

vi.mock("@/app/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: (input: unknown) => signInSocial(input),
    },
  },
}));

const { useGoogleSignIn } = await import("@/app/hooks/useGoogleSignIn");

beforeEach(() => {
  vi.clearAllMocks();
});

test("useGoogleSignIn sends users to the dashboard after Google authentication", async () => {
  signInSocial.mockResolvedValue({ error: null });
  const { result } = renderHook(() => useGoogleSignIn());

  await act(async () => {
    await result.current.signIn();
  });

  assert.deepEqual(signInSocial.mock.calls[0][0], {
    provider: "google",
    callbackURL: "/dashboard",
  });
  assert.equal(result.current.error, null);
  assert.equal(result.current.pending, true);
});

test("useGoogleSignIn exposes provider and network failures without leaving the UI pending", async () => {
  const { result, rerender } = renderHook(() => useGoogleSignIn());
  signInSocial.mockResolvedValue({ error: { message: "Access denied" } });

  await act(async () => {
    await result.current.signIn();
  });
  assert.equal(result.current.error, "Access denied");
  assert.equal(result.current.pending, false);

  signInSocial.mockRejectedValue(new Error("offline"));
  rerender();
  await act(async () => {
    await result.current.signIn();
  });
  await waitFor(() => assert.equal(result.current.pending, false));
  assert.notEqual(result.current.error, null);
});