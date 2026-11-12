import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const root = new URL("../../", import.meta.url);
function git(...args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}
const metadata = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA || git("rev-parse", "HEAD"),
  branch: process.env.VERCEL_GIT_COMMIT_REF || git("branch", "--show-current"),
  api_contract: "pact-v2-personas",
};
mkdirSync(new URL("../public/assets/", import.meta.url), { recursive: true });
for (const file of [
  new URL("../public/assets/pact-build.json", import.meta.url),
  new URL("../../backend/app/build_info.json", import.meta.url),
])
  writeFileSync(file, JSON.stringify(metadata, null, 2) + "\n");
