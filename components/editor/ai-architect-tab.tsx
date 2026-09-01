"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Bot, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

/**
 * The AI Architect tab, per `20-ai-sidebar-shell.md`: a scrollable chat
 * surface with an empty state (starter prompt chips) and an auto-resizing
 * input. No AI generation or backend logic yet — sending a message only
 * appends it to local state so the message bubble styling has something to
 * render; nothing is sent anywhere and no assistant reply is generated.
 */
export function AiArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const messageCounter = useRef(0);

  function sendDraft() {
    const content = draft.trim();
    if (!content) return;
    messageCounter.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${messageCounter.current}`,
        role: "user",
        content,
      },
    ]);
    setDraft("");
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
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
                    : "border border-surface-border bg-elevated text-ai-text",
                )}
              >
                {message.content}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-surface-border pt-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your system..."
          className="min-h-[72px] max-h-[160px] resize-none"
        />
        <Button
          size="icon"
          aria-label="Send message"
          onClick={sendDraft}
          className="mb-0.5 shrink-0 bg-accent text-accent-foreground hover:bg-accent/80"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
