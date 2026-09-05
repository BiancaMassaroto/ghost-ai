"use client";

import { Check, Link2, Mail, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UseShareDialogResult } from "@/hooks/use-share-dialog";

interface ShareDialogProps {
  share: UseShareDialogResult;
  /** Owners can invite/remove; collaborators see a read-only list. */
  isOwner: boolean;
}

function initialsFor(displayName: string | null, email: string) {
  return (displayName ?? email).trim().slice(0, 1).toUpperCase() || "?";
}

/**
 * Share dialog opened from the editor navbar, per `09-share-dialog.md`.
 * Owners can copy the project link, invite collaborators by email, and
 * remove existing ones; collaborators see the same list read-only. All
 * state and network calls live in `useShareDialog` — this component is
 * purely presentational.
 */
export function ShareDialog({ share, isOwner }: ShareDialogProps) {
  const {
    isOpen,
    close,
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
  } = share;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription className="text-copy-secondary">
            {isOwner
              ? "Invite collaborators, copy the workspace link, and manage access."
              : "People with access to this project."}
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-elevated px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-copy-primary">Workspace link</p>
              <p className="text-xs text-copy-muted">
                Share a direct link with teammates after you grant them access.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copyLink}
              className="shrink-0 gap-1.5 rounded-full"
            >
              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {isCopied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        )}

        {isOwner && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              invite();
            }}
          >
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-copy-muted" />
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="shrink-0 rounded-full"
              disabled={!inviteEmail.trim() || isInviting}
            >
              {isInviting ? "Inviting…" : "Invite"}
            </Button>
          </form>
        )}
        {inviteError && <p className="px-0.5 text-xs text-destructive">{inviteError}</p>}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-sm font-medium text-copy-primary">People with access</p>
            <p className="text-xs text-copy-muted">{collaborators.length} total</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-surface-border">
            {isLoading ? (
              <p className="px-3 py-4 text-sm text-copy-secondary">Loading…</p>
            ) : collaborators.length === 0 ? (
              <p className="px-3 py-4 text-sm text-copy-secondary">No collaborators yet.</p>
            ) : (
              <ScrollArea className="max-h-56">
                <ul className="divide-y divide-surface-border">
                  {collaborators.map((collaborator) => (
                    <li
                      key={collaborator.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <Avatar size="sm">
                        {collaborator.imageUrl && (
                          <AvatarImage src={collaborator.imageUrl} alt="" />
                        )}
                        <AvatarFallback>
                          {initialsFor(collaborator.displayName, collaborator.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate text-sm font-medium text-copy-primary">
                          {collaborator.displayName ?? collaborator.email}
                        </span>
                        {collaborator.displayName && (
                          <span className="truncate text-xs text-copy-muted">
                            {collaborator.email}
                          </span>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full border border-surface-border-subtle bg-subtle px-2 py-0.5 text-[10px] font-semibold tracking-wide text-copy-muted uppercase">
                        Collaborator
                      </span>

                      {isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${collaborator.email}`}
                          className="shrink-0"
                          onClick={() => remove(collaborator.id)}
                          disabled={removingId === collaborator.id}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>

        {error && <p className="px-0.5 text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
