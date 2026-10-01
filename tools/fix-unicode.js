#!/usr/bin/env node
// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * tools/fix-unicode.js
 * Auto-convert \uXXXX escape sequences back to readable Unicode characters.
 * Handles surrogate pairs (emoji) properly.
 *
 * Usage: node tools/fix-unicode.js [file_or_directory]
 * Default: scans src/ and plugins/
 */

import fs from "fs";
import path from "path";

const UNICODE_RE = /\\u([0-9a-fA-F]{4})/g;

function replaceUnicodeEscapes(content) {
  const matches = [...content.matchAll(UNICODE_RE)];
  if (matches.length === 0) return { content, count: 0 };

  let result = "";
  let lastEnd = 0;
  let i = 0;
  let count = 0;

  while (i < matches.length) {
    const m = matches[i];
    result += content.slice(lastEnd, m.index);
    const codePoint = parseInt(m[1], 16);

    // Check for surrogate pair (emoji like \uD83C\uDF39 → 🌹)
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < matches.length) {
      const next = matches[i + 1];
      if (next.index === m.index + m[0].length) {
        const lowCP = parseInt(next[1], 16);
        if (lowCP >= 0xdc00 && lowCP <= 0xdfff) {
          const fullCP = 0x10000 + ((codePoint - 0xd800) << 10) + (lowCP - 0xdc00);
          result += String.fromCodePoint(fullCP);
          count += 2;
          lastEnd = next.index + next[0].length;
          i += 2;
          continue;
        }
      }
    }

    // Standalone surrogate — keep as-is
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      result += m[0];
    } else {
      result += String.fromCodePoint(codePoint);
      count++;
    }

    lastEnd = m.index + m[0].length;
    i++;
  }

  result += content.slice(lastEnd);
  return { content: result, count };
}

function scanDir(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      scanDir(full, results);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const original = fs.readFileSync(full, "utf-8");
      const { content, count } = replaceUnicodeEscapes(original);
      if (count > 0) {
        fs.writeFileSync(full, content, "utf-8");
        results.push({ file: full, count });
      }
    }
  }
}

const target = process.argv[2] || ".";
const results = [];

if (fs.statSync(target).isFile() && target.endsWith(".js")) {
  const original = fs.readFileSync(target, "utf-8");
  const { content, count } = replaceUnicodeEscapes(original);
  if (count > 0) {
    fs.writeFileSync(target, content, "utf-8");
    results.push({ file: target, count });
  }
} else {
  for (const dir of ["src", "plugins"]) {
    if (fs.existsSync(dir)) scanDir(dir, results);
  }
}

if (results.length === 0) {
  console.log("✅ No unicode escape sequences found. All clean!");
} else {
  let total = 0;
  for (const r of results) {
    console.log(`✅ ${r.file} — ${r.count} escapes converted`);
    total += r.count;
  }
  console.log(`\nDone: ${results.length} files, ${total} escapes fixed.`);
}
