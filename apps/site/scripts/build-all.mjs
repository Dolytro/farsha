// Builds the editor (base /app/) and copies it into public/app so one Vercel project serves both.
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const site = fileURLToPath(new URL("..", import.meta.url));

execSync("pnpm --filter @farsha/web build", { cwd: root, stdio: "inherit" });
rmSync(`${site}/public/app`, { recursive: true, force: true });
cpSync(`${root}/apps/web/dist`, `${site}/public/app`, { recursive: true });
execSync("pnpm exec next build", { cwd: site, stdio: "inherit" });
