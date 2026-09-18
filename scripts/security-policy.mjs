import { readFile } from "node:fs/promises";

export const policyUrl = new URL("../config/security-headers.json", import.meta.url);

export async function readSecurityPolicy() {
  return JSON.parse(await readFile(policyUrl, "utf8"));
}

export function renderHeaders(policy) {
  const lines = Object.entries(policy).map(([name, value]) => `  ${name}: ${value}`);
  return `/*\n${lines.join("\n")}\n`;
}

export function renderWorker(policy) {
  return `const SECURITY_HEADERS = ${JSON.stringify(policy, null, 2)};\n\nexport default {\n  async fetch(request, env) {\n    const assetResponse = await env.ASSETS.fetch(request);\n    const response = new Response(assetResponse.body, assetResponse);\n\n    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {\n      response.headers.set(name, value);\n    }\n\n    return response;\n  },\n};\n`;
}
