import { clerkClient } from "@clerk/nextjs/server";

export interface ClerkUserSummary {
  displayName: string | null;
  imageUrl: string | null;
}

/**
 * Looks up Clerk users by email and returns a map keyed by lowercase email,
 * for enriching `ProjectCollaborator` rows with a display name and avatar
 * per `09-share-dialog.md`. Emails with no matching Clerk user are simply
 * absent from the map — callers fall back to showing the email alone.
 */
export async function getClerkUsersByEmail(
  emails: string[],
): Promise<Map<string, ClerkUserSummary>> {
  const uniqueEmails = [...new Set(emails.map((email) => email.toLowerCase()))];
  const map = new Map<string, ClerkUserSummary>();
  if (uniqueEmails.length === 0) return map;

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({
    emailAddress: uniqueEmails,
    limit: uniqueEmails.length,
  });

  for (const user of users) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      null;
    const summary: ClerkUserSummary = { displayName, imageUrl: user.imageUrl || null };

    for (const emailAddress of user.emailAddresses) {
      map.set(emailAddress.emailAddress.toLowerCase(), summary);
    }
  }

  return map;
}
