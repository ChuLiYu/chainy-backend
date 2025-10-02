import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Resolve paths relative to the repository root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

// Each handler becomes its own bundle directory under dist/.
const handlers = [
  {
    name: "redirect",
    entryPoint: path.join(projectRoot, "handlers", "redirect.ts"),
  },
  {
    name: "create",
    entryPoint: path.join(projectRoot, "handlers", "create.ts"),
  },
  {
    name: "authorizer",
    entryPoint: path.join(projectRoot, "handlers", "authorizer.ts"),
  },
  {
    name: "googleAuth",
    entryPoint: path.join(projectRoot, "handlers", "googleAuth.ts"),
  },
];

async function run() {
  // Clean previous builds to avoid stale artefacts.
  await rm(distDir, { recursive: true, force: true });

  for (const handler of handlers) {
    const outputDir = path.join(distDir, handler.name);
    await mkdir(outputDir, { recursive: true });

    // Bundle each handler with esbuild targeting the Lambda runtime.
    await build({
      entryPoints: [handler.entryPoint],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      outfile: path.join(outputDir, "index.js"),
      sourcemap: true,
      logLevel: "info",
      minify: false,
    });
  }
}

run().catch((error) => {
  console.error("Failed to build Lambda handlers", error);
  process.exitCode = 1;
});
