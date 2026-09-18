import { readFile } from "node:fs/promises";

const policyUrl = new URL("../config/security-headers.json", import.meta.url);

export async function readSecurityPolicy() {
  return JSON.parse(await readFile(policyUrl, "utf8"));
}
