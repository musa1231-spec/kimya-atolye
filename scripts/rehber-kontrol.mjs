import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "rehber-"));
const out = join(dir, "k.mjs");
await build({ entryPoints: ["scripts/rehber-kontrol.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error" });
try { await import(pathToFileURL(out).href); } finally { rmSync(dir, { recursive: true, force: true }); }
