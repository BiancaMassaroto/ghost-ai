import { dark } from "@clerk/ui/themes";
import type { Appearance } from "@clerk/ui/internal";

/**
 * Clerk appearance for the whole app: Clerk's `dark` theme as the base,
 * with variables overridden by the app's own CSS custom properties
 * (see context/ui-context.md) instead of hardcoded colors.
 */
export const clerkAppearance: Appearance = {
  theme: dark,
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorBackground: "var(--bg-surface)",
    colorForeground: "var(--text-primary)",
    colorMutedForeground: "var(--text-muted)",
    colorInput: "var(--bg-subtle)",
    colorInputForeground: "var(--text-primary)",
    colorBorder: "var(--border-default)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    colorRing: "var(--accent-primary)",
    borderRadius: "var(--radius)",
  },
};
