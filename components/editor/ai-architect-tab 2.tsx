"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { Bot, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiChatFeed } from "@/hooks/use-ai-chat-feed";
import { useDesignRun } from "@/hooks/use-design-run";
import { useLatestAiStatus } from "@/hooks/use-ai-status-feed";
import { useIsAiThinking } from "@/hooks/use-ai-thinking";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

interface AiArchitectTabProps {
  /** The active project's ID — also the Liveblocks room ID (`POST /api/ai/design`'s `roomId`/`projectId`), per `26-design-agent-frontend.md`. */
  projectId: string;
}

/**
 * The AI Architect tab, per `20-ai-sidebar-shell.md`: a scrollable chat
 * surface with an empty state (starter prompt chips) and an auto-resizing
 * input.
 *
 * Chat messages are real, per `25-sidebar-chat-feed.md`: `useAiChatFeed`
 * subscribes to the room's `ai-chat` Liveblocks feed and sends new messages
 * to it, so every participant sees the same message list.
 *
 * Submitting now actually triggers AI generation, per
 * `26-design-agent-frontend.md`: the user's message is pushed to `ai-chat`
 * and, in parallel, `useDesignRun` calls `POST /api/ai/design` and tracks
 * that run's realtime status. When the run settles, a final message (a
 * generic completion message on success — not the shared status feed's
 * "latest" text, which carries no run id and so could belong to a different,
 * concurrently-started run by the time this one settles — or the run's own
 * error on failure) is pushed back to `ai-chat` as an `"assistant"`-role
 * message. This component never touches canvas nodes/edges directly —
 * `useLiveblocksFlow` (inside the canvas) picks up the design agent's writes
 * on its own.
 *
 * The shared AI generation/status state added by `24-ai-presence-state.md`
 * is a separate concern, kept on its own feed (`ai-status-feed`, never mixed
 * with `ai-chat`): `useIsAiThinking`/`useLatestAiStatus` read directly off
 * the room's Liveblocks presence and status feed, so every participant sees
 * the same "AI is working" indicator and disabled input regardless of who
 * triggered the generation — combined with `useDesignRun`'s own local
 * `isActive` (true from submit until this client's run subscription
 * settles), which covers the brief window right after submit before shared
 * presence has caught up.
 */
export function AiArchitectTab({ projectId }: AiArchitectTabProps) {
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, isSending, error } = useAiChatFeed();
  const isThinking = useIsAiThinking();
  const latestStatus = useLatestAiStatus();

  // Deliberately doesn't use `latestStatus` (the room-wide "most recent
  // status message") as this run's result: the status feed carries no run
  // id, so if a second client starts its own run before presence catches
  // up, "latest" can belong to that other run by the time this one settles
  // — posting its summary here as this run's completion message would be
  // wrong. Falls back to a generic message until status messages carry a
  // run id this callback can match against.
  const handleDesignComplete = useCallback(() => {
    void sendMessage("Design updated.", "assistant");
  }, [sendMessage]);

  const handleDesignError = useCallback(
    (message: string) => {
      void sendMessage(message, "assistant");
    },
    [sendMessage],
  );

  const designRun = useDesignRun({
    projectId,
    onComplete: handleDesignComplete,
    onError: handleDesignError,
  });

  const isGenerating = isThinking || designRun.isActive;
  const isSendDisabled = isGenerating || isSending;

  function sendDraft() {
    if (isSendDisabled) return;
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    void sendMessage(content);
    designRun.start(content);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendDraft();
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
              <Bot className="h-5 w-5" />
            </span>
            <p className="text-sm text-copy-secondary">
              Describe a system in plain English and Ghost AI will map it
              onto the canvas.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-ai-text transition-colors hover:bg-elevated"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.role === "user" ? "items-end" : "items-start",
              )}
            >
              <span className="px-1 text-xs text-copy-muted">
                {message.sender} ·{" "}
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  // Per `26-design-agent-frontend.md`'s "Chat bubbles" spec:
                  // user messages get a green accent background with
                  // readable contrast text — `--state-success` (the
                  // existing green semantic token, `text-success`/
                  // `bg-success`) rather than the literal hex the spec
                  // names, since that hex isn't one of `globals.css`'s
                  // tokens and the same spec also says not to introduce new
                  // colors. `text-canvas` (near-black) reads clearly on the
                  // bright `bg-success` fill; the light `text-copy-primary`
                  // used everywhere else would not.
                  message.role === "user"
                    ? "bg-success text-canvas"
                    : "border border-surface-border bg-elevated text-ai-text",
                )}
              >
                {message.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Status strip, per `24-ai-presence-state.md`'s shared indicator
          (driven by presence/the status feed, not local-only state, so
          every participant sees it — plus `useDesignRun`'s own local
          `isActive`, for the moment right after this client's own submit)
          and `26-design-agent-frontend.md`'s "compact bar above the input,
          dark base + green accent" styling. Shows only the single most
          recent status message, and only while a run is active, occupying
          this thin strip rather than blocking or dimming the rest of the
          tab. */}
      {isGenerating && (
        <div className="mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-success/30 bg-elevated px-3 py-2 text-xs text-success">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="truncate">
            {latestStatus?.text ?? "Ghost AI is working…"}
          </span>
        </div>
      )}

      {/* Chat send error, per `25-sidebar-chat-feed.md`'s "show a small
          error state if sending fails" — set by `useAiChatFeed` when the
          most recent `sendMessage` call failed, cleared on the next attempt. */}
      {error && (
        <p className="mb-2 shrink-0 text-xs text-destructive">{error}</p>
      )}

      <div className="flex shrink-0 items-end gap-2 border-t border-surface-border pt-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your system..."
          disabled={isSendDisabled}
          className="min-h-[72px] max-h-[160px] resize-none"
        />
        <Button
          size="icon"
          aria-label={
            isGenerating
              ? "Ghost AI is generating…"
              : isSending
                ? "Sending message…"
                : "Send message"
          }
          onClick={sendDraft}
          disabled={isSendDisabled}
          // Per `26-design-agent-frontend.md`'s "Submit button" spec:
          // green accent when enabled (`bg-success`, same token/reasoning as
          // the user chat bubble above), dimmed while disabled — for free,
          // via `Button`'s own `disabled:opacity-50` base class, so no
          // separate disabled className is needed here.
          className="mb-0.5 shrink-0 bg-success text-canvas hover:bg-success/85"
        >
          {isSendDisabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
