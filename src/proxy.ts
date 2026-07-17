import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server-side gate for /profile/*: redirects before any protected page HTML
// is ever sent, instead of relying only on the client-side redirect in
// profile/layout.tsx (which briefly renders before running).
//
// This only checks that an access-token cookie is *present* — it does not
// verify the token, since that would mean an extra Supabase round trip on
// every navigation. Token validity is still checked by checkAuth() client-side
// and, more importantly, independently re-checked by the backend on every API
// call — this proxy only closes the "unauthenticated user briefly sees the
// protected page" gap, it is not the security boundary.
export function proxy(request: NextRequest) {
    const hasSession = request.cookies.has("sb-access-token");

    if (!hasSession) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/profile/:path*"],
};
