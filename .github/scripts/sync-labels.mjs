#!/usr/bin/env node
// Creates or updates every label listed in .github/labels.yml on the current repository (needs the GitHub CLI `gh`).
// Usage: node .github/scripts/sync-labels.mjs [--dry-run] [owner/repo]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const repo = args.find((a) => !a.startsWith("--"));
const file = new URL("../labels.yml", import.meta.url);

const labels = readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => l.startsWith("- {"))
  .map((l) => {
    const name = /name:\s*("([^"]+)"|[^,}]+)/.exec(l);
    const color = /color:\s*([0-9a-fA-F]{6})/.exec(l);
    const desc = /description:\s*"([^"]*)"/.exec(l);
    if (!name || !color) throw new Error(`Cannot read label line: ${l}`);
    return { name: (name[2] ?? name[1]).trim(), color: color[1], description: desc ? desc[1] : "" };
  });

for (const { name, color, description } of labels) {
  const cmd = ["label", "create", name, "--color", color, "--description", description, "--force", ...(repo ? ["--repo", repo] : [])];
  if (dry) console.log("gh", cmd.map((c) => JSON.stringify(c)).join(" "));
  else {
    execFileSync("gh", cmd, { stdio: "inherit" });
  }
}
console.log(`${dry ? "Would sync" : "Synced"} ${labels.length} labels.`);
