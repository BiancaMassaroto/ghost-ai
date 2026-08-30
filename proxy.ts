import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes come from Clerk's own sign-in/sign-up env vars — everything
// else is protected by default via `auth.protect()`.
const isPublicRoute = createRouteMatcher([
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}(.*)`,
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}(.*)`,
]);

// API routes skip middleware-level `auth.protect()`: for non-document
// requests Clerk's own `protect()` responds with a redirect/404 rather than
// a 401 (see its docs), which conflicts with API route contracts that
// require 401 for unauthenticated requests. Route handlers under `app/api`
// enforce auth themselves instead (see `lib/api-auth.ts`).
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req) && !isApiRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
