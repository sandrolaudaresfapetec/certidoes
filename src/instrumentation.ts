export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const possiblePaths = [
        path.join(process.cwd(), "env-config.json"),
        path.join(__dirname, "..", "env-config.json"),
        path.join(__dirname, "env-config.json"),
        "/var/task/env-config.json",
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const config = JSON.parse(fs.readFileSync(p, "utf-8"));
          for (const [key, value] of Object.entries(config)) {
            if (!process.env[key] && value) {
              process.env[key] = value as string;
            }
          }
          console.log(`[instrumentation] Loaded env config from ${p}`);
          break;
        }
      }
    } catch (e) {
      console.error("[instrumentation] Failed to load env config:", e);
    }
  }
}
