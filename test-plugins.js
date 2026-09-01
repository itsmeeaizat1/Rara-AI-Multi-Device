// NOVA AI WHATSAPP BOT — test-plugins.js
// Syntax + import check untuk semua plugin
// Jalankan: node test-plugins.js

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, "plugins");

let passed = 0;
let failed = 0;
const errors = [];

// Recursively find all .js files in plugins/
function findPlugins(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPlugins(fullPath));
    } else if (entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findPlugins(pluginsDir);
console.log(`\n🧪 Testing ${files.length} plugins...\n`);

for (const file of files) {
  const relPath = path.relative(__dirname, file);
  try {
    const fileUrl = pathToFileURL(file).href;
    await import(fileUrl);
    passed++;
  } catch (e) {
    failed++;
    errors.push({ file: relPath, error: e.message });
    console.log(`❌ ${relPath}: ${e.message}`);
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${files.length}`);

if (failed > 0) {
  console.log(`\n⚠️  Error details:`);
  for (const e of errors) {
    console.log(`  ❌ ${e.file}: ${e.error}`);
  }
  process.exit(1);
} else {
  console.log(`\n🎉 Semua plugin OK!`);
}
