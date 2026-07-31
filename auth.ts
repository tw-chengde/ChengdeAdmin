import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Lazy config: on Workers, bindings are only copied into `process.env` inside
// the fetch handler (see worker/index.ts), which runs after this module is
// evaluated. The function form defers env reads to request time.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      checks: [],
    }),
  ],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
}));
