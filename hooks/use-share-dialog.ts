"use client";

import { useCallback, useState } from "react";

import type { Collaborator } from "@/types/collaborator";

interface UseShareDialogOptions {
  projectId: string;
  isOwner: boolean;
}

/**
 * Owns the Share dialog's open state, the collaborator list, the invite
 * form, and copy-link feedback, per `09-share-dialog.md`. Invite and remove
 * are no-ops when `isOwner` is false — the dialog itself never renders the
 * controls for a collaborator, but the guard keeps the hook safe to call
 * either way.
 */
export function useShareDialog({ projectId, isOwner }: UseShareDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [link, setLink] = useState("");

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`);
      if (!response.ok) throw new Error("Failed to load collaborators");
      const data = (await response.json()) as { collaborators: Collaborator[] };
      setCollaborators(data.collaborators);
    } catch {
      setError("Couldn't load collaborators.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const open = useCallback(() => {
    setIsOpen(true);
    setLink(`${window.location.origin}/editor/${projectId}`);
    setInviteEmail("");
    setInviteError(null);
    setIsCopied(false);
    void fetchCollaborators();
  }, [fetchCollaborators, projectId]);

  const close = useCallback(() => setIsOpen(false), []);

  const invite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email || !isOwner || isInviting) return;

    setIsInviting(true);
    setInviteError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { collaborators?: Collaborator[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to invite collaborator");
      setCollaborators(data.collaborators ?? []);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Couldn't invite that email.");
    } finally {
      setIsInviting(false);
    }
  }, [inviteEmail, isOwner, isInviting, projectId]);

  const remove = useCallback(
    async (collaboratorId: string) => {
      if (!isOwner || removingId) return;

      setRemovingId(collaboratorId);
      setError(null);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators/${collaboratorId}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("Failed to remove collaborator");
        const data = (await response.json()) as { collaborators: Collaborator[] };
        setCollaborators(data.collaborators);
      } catch {
        setError("Couldn't remove that collaborator. Try again.");
      } finally {
        setRemovingId(null);
      }
    },
    [isOwner, removingId, projectId],
  );

  const copyLink = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link.");
    }
  }, [link]);

  return {
    isOpen,
    open,
    close,
    link,
    collaborators,
    isLoading,
    error,
    inviteEmail,
    setInviteEmail,
    isInviting,
    inviteError,
    invite,
    removingId,
    remove,
    isCopied,
    copyLink,
  };
}

export type UseShareDialogResult = ReturnType<typeof useShareDialog>;
