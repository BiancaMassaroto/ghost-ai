import type { Project } from "@/types/project";

/**
 * Mock project data for `04-project-dialogs.md`. No API calls or persistence
 * yet — this seeds the sidebar and dialogs until real project storage lands.
 */
export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Checkout Service Redesign",
    slug: "checkout-service-redesign",
    role: "owner",
  },
  {
    id: "2",
    name: "Realtime Notification Pipeline",
    slug: "realtime-notification-pipeline",
    role: "owner",
  },
  {
    id: "3",
    name: "Payments Platform Migration",
    slug: "payments-platform-migration",
    role: "collaborator",
  },
];
