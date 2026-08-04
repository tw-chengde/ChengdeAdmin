import { getAuth } from "@/auth";

// The handler is resolved per request rather than at module scope, so the auth
// instance is built only after the Worker has populated `process.env` and the
// D1 binding.
const handler = (request: Request) => getAuth().handler(request);

export { handler as GET, handler as POST };
