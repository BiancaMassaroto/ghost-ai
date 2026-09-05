import {
  DEFAULT_NODE_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorId,
  type NodeShape,
} from "@/types/canvas";

/**
 * A pre-built diagram a user can start a canvas from, per
 * `18-starter-template.md`. Nodes/edges use the same shared canvas types
 * (`CanvasNode`/`CanvasEdge`) the live collaborative canvas itself uses, so
 * importing one is just handing the existing node/edge state flow a
 * different starting array — nothing template-specific needs to exist in
 * `types/canvas.ts` or the canvas renderers.
 */
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * Builds one template node at its default size for `shape`, per the same
 * `DEFAULT_NODE_SIZES` a hand-placed node gets from the shape panel
 * (`12-shape-panel.md`) — keeps template nodes visually consistent with
 * anything a user drags onto the canvas themselves.
 */
function templateNode(
  id: string,
  shape: NodeShape,
  color: NodeColorId,
  label: string,
  position: { x: number; y: number },
): CanvasNode {
  const size = DEFAULT_NODE_SIZES[shape];
  return {
    id,
    type: "canvasNode",
    position,
    width: size.width,
    height: size.height,
    data: { label, color, shape },
  };
}

/** Builds one template edge, optionally labeled. */
function templateEdge(id: string, source: string, target: string, label = ""): CanvasEdge {
  return { id, source, target, type: "canvasEdge", data: { label } };
}

const MICROSERVICES_TEMPLATE: CanvasTemplate = {
  id: "microservices",
  name: "Microservices Architecture",
  description: "A client talking to an API gateway that fans out to independent services sharing a database.",
  nodes: [
    templateNode("client", "circle", "neutral", "Client", { x: 40, y: 180 }),
    templateNode("gateway", "rectangle", "blue", "API Gateway", { x: 240, y: 180 }),
    templateNode("auth", "rectangle", "purple", "Auth Service", { x: 480, y: 40 }),
    templateNode("users", "rectangle", "green", "User Service", { x: 480, y: 180 }),
    templateNode("orders", "rectangle", "orange", "Order Service", { x: 480, y: 320 }),
    templateNode("db", "cylinder", "teal", "Database", { x: 720, y: 180 }),
  ],
  edges: [
    templateEdge("client-gateway", "client", "gateway"),
    templateEdge("gateway-auth", "gateway", "auth"),
    templateEdge("gateway-users", "gateway", "users"),
    templateEdge("gateway-orders", "gateway", "orders"),
    templateEdge("auth-db", "auth", "db"),
    templateEdge("users-db", "users", "db"),
    templateEdge("orders-db", "orders", "db"),
  ],
};

const CI_CD_PIPELINE_TEMPLATE: CanvasTemplate = {
  id: "ci-cd-pipeline",
  name: "CI/CD Pipeline",
  description: "A commit flows through build and test, then branches to deploy on success or rollback on failure.",
  nodes: [
    templateNode("commit", "circle", "neutral", "Commit", { x: 40, y: 140 }),
    templateNode("build", "rectangle", "blue", "Build", { x: 240, y: 140 }),
    templateNode("test", "rectangle", "purple", "Test", { x: 440, y: 140 }),
    templateNode("gate", "diamond", "orange", "Quality Gate", { x: 640, y: 100 }),
    templateNode("deploy", "rectangle", "green", "Deploy", { x: 880, y: 20 }),
    templateNode("rollback", "rectangle", "red", "Rollback", { x: 880, y: 240 }),
    templateNode("production", "cylinder", "teal", "Production", { x: 1100, y: 20 }),
  ],
  edges: [
    templateEdge("commit-build", "commit", "build"),
    templateEdge("build-test", "build", "test"),
    templateEdge("test-gate", "test", "gate"),
    templateEdge("gate-deploy", "gate", "deploy", "pass"),
    templateEdge("gate-rollback", "gate", "rollback", "fail"),
    templateEdge("deploy-production", "deploy", "production"),
  ],
};

const EVENT_DRIVEN_SYSTEM_TEMPLATE: CanvasTemplate = {
  id: "event-driven-system",
  name: "Event-Driven System",
  description: "Producers publish onto a shared event bus that fans out to independent consumers.",
  nodes: [
    templateNode("order-service", "rectangle", "blue", "Order Service", { x: 40, y: 40 }),
    templateNode("payment-service", "rectangle", "purple", "Payment Service", { x: 40, y: 260 }),
    templateNode("event-bus", "hexagon", "orange", "Event Bus", { x: 320, y: 140 }),
    templateNode("notification-service", "rectangle", "green", "Notification Service", { x: 600, y: 20 }),
    templateNode("analytics-service", "rectangle", "teal", "Analytics Service", { x: 600, y: 160 }),
    templateNode("inventory-service", "rectangle", "pink", "Inventory Service", { x: 600, y: 300 }),
    templateNode("dead-letter-queue", "cylinder", "red", "Dead Letter Queue", { x: 860, y: 300 }),
  ],
  edges: [
    templateEdge("order-bus", "order-service", "event-bus"),
    templateEdge("payment-bus", "payment-service", "event-bus"),
    templateEdge("bus-notification", "event-bus", "notification-service"),
    templateEdge("bus-analytics", "event-bus", "analytics-service"),
    templateEdge("bus-inventory", "event-bus", "inventory-service"),
    templateEdge("inventory-dlq", "inventory-service", "dead-letter-queue", "failed"),
  ],
};

/**
 * The starter template library, per `18-starter-template.md`. Rendered as
 * cards in `StarterTemplatesModal`; importing one replaces the current
 * canvas (`components/editor/canvas/canvas.tsx`'s `handleImportTemplate`).
 */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  MICROSERVICES_TEMPLATE,
  CI_CD_PIPELINE_TEMPLATE,
  EVENT_DRIVEN_SYSTEM_TEMPLATE,
];
