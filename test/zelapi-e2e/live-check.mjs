import fs from "fs";
fs.rmSync("/tmp/zel-live", { recursive: true, force: true });
fs.mkdirSync("/tmp/zel-live", { recursive: true });
process.env.NOVA_DB_DIR = "/tmp/zel-live";
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase("/tmp/zel-live/db.json");
const scr = await import("../../src/scraper/zelapi.js");
const wait = (ms) => new Promise((s) => setTimeout(s, ms));

// 1. bingimage — harus nunjukin error cookie upstream beneran
const r1 = await scr.zelImageEndpoint("ai-image/bingimage", "danau toba");
console.log(`zbingimage: ${r1.ok ? "✅" : "❌ " + r1.error}`);
await wait(50000);
// 2. zimage — harus tetep jalan
const r2 = await scr.zelAiImage("kucing astronot lucu");
console.log(`zimage: ${r2.ok ? "✅ buffer " + r2.buffer.length + "B" : "❌ " + r2.error}`);
await wait(50000);
// 3. zchatgpt
const r3 = await scr.zelAiChat("zchatgpt", "tes singkat satu kalimat");
console.log(`zchatgpt: ${r3.ok ? "✅ " + r3.text.slice(0, 60) : "❌ " + r3.error}`);
