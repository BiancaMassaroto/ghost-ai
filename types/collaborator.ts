export interface Collaborator {
  id: string;
  email: string;
  /** Clerk display name for this email, or `null` if no Clerk user was found. */
  displayName: string | null;
  /** Clerk avatar URL for this email, or `null` if no Clerk user was found. */
  imageUrl: string | null;
}
