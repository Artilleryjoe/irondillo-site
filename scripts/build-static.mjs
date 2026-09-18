import { execFile } from "node:child_process";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const rootExtensions = new Set([".html", ".xml", ".txt"]);
const rootFiles = ["CNAME", "styles.css"];
const execFileAsync = promisify(execFile);

async function deploymentSha() {
  const environmentSha = process.env.DEPLOYMENT_SHA || process.env.GITHUB_SHA;
  if (environmentSha) return environmentSha;

  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
  return stdout.trim();
}

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && rootExtensions.has(extname(entry.name))) {
    await cp(resolve(root, entry.name), resolve(output, entry.name));
  }
}

for (const file of rootFiles) {
  await cp(resolve(root, file), resolve(output, file));
}

await cp(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });

const sha = await deploymentSha();
if (!/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error(`Deployment SHA must be a 40-character Git commit hash, received: ${sha}`);
}
await writeFile(resolve(output, "deployment.json"), `${JSON.stringify({ sha: sha.toLowerCase() })}\n`);
