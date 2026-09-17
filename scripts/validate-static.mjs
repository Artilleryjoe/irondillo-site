#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pages = (await readdir(root)).filter((name) => name.endsWith(".html")).sort();
const failures = [];
const securityHeaders = new Set([
  "content-security-policy",
  "permissions-policy",
  "referrer-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
]);

function fail(page, message) {
  failures.push(`${page}: ${message}`);
}

function attributes(tag) {
  return new Map(
    [...tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
      .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? ""]),
  );
}

async function validateReference(page, attribute, reference) {
  if (!reference || reference.startsWith("#") || reference.startsWith("//")) return;

  let url;
  try {
    url = new URL(reference, "https://irondillo.com/");
  } catch {
    fail(page, `${attribute} has an invalid URL: ${reference}`);
    return;
  }

  if (url.origin !== "https://irondillo.com") return;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    fail(page, `${attribute} has invalid percent-encoding: ${reference}`);
    return;
  }

  const relativePath = decodedPath.replace(/^\/+/, "") || "index.html";
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    fail(page, `${attribute} escapes the site root: ${reference}`);
    return;
  }

  try {
    await access(target);
  } catch {
    fail(page, `${attribute} points to a missing file: ${reference}`);
  }
}

for (const page of pages) {
  const html = await readFile(path.join(root, page), "utf8");

  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) fail(page, "missing an html lang attribute");
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(html)) fail(page, "missing a non-empty title");
  if (!/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']+["'][^>]*>/i.test(html)) {
    fail(page, "missing a non-empty meta description");
  }
  if (!/<h1\b[^>]*>[^]*?<\/h1>/i.test(html)) fail(page, "missing an h1 heading");

  for (const match of html.matchAll(/<(a|img|script|link)\b[^>]*>/gi)) {
    const tagName = match[1].toLowerCase();
    const attrs = attributes(match[0]);
    const referenceAttribute = tagName === "a" || tagName === "link" ? "href" : "src";
    if (attrs.has(referenceAttribute)) {
      await validateReference(page, referenceAttribute, attrs.get(referenceAttribute));
    }
    if (tagName === "img" && (!attrs.has("alt") || !attrs.get("alt").trim())) {
      fail(page, `image is missing non-empty alt text: ${attrs.get("src") ?? "unknown source"}`);
    }
    if (tagName === "a" && attrs.get("target")?.toLowerCase() === "_blank") {
      const rel = new Set((attrs.get("rel") ?? "").toLowerCase().split(/\s+/));
      if (!rel.has("noopener") || !rel.has("noreferrer")) {
        fail(page, `target=_blank link must use rel="noopener noreferrer": ${attrs.get("href") ?? "unknown target"}`);
      }
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*\bhttp-equiv=["']([^"']+)["'][^>]*>/gi)) {
    if (securityHeaders.has(match[1].toLowerCase())) {
      fail(page, `must not emulate the ${match[1]} security header with a meta tag`);
    }
  }
}

if (failures.length) {
  console.error(`Static validation failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Static validation passed for ${pages.length} HTML files.`);
}
