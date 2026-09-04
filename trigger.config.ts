import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_imiznbbsigviqqyulgus",
  dirs: ["./trigger"],
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      randomize: true,
    },
  },
});
