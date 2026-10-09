// SCAFFOLD TDD — copy folder ini jadi test/<fitur>-e2e/ sebelum implementasi.
// KONTRAK (Spesifikasi Berbasis Kontrak, lihat AGENTS.md seksi 3):
//   1. Tulis skenario + mock data di file ini DULU (implementasi belum ada).
//   2. Review/setujui skenario.
//   3. Baru implementasi fitur sampai suite ini lulus semua.
// Jalankan: node test/<fitur>-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

// ── harness ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
function out(s) { console.log("   ↳ " + s); }

// ── database ASLI di tmp dir (integration test, bukan mock — QA gerbang 1) ──
import { mkdtempSync, rmSync } from "node:fs";
const tmp = mkdtempSync(require("node:os").tmpdir() + "/<fitur>-e2e-");
const { initDatabase, getDatabase, __resetDatabaseForTest } = await import(R("../../src/lib/rara-database.js"));
await initDatabase(tmp + "/rara.json");

// ── mock Baileys (pola AGENTS.md seksi 4) ────────────────────────────
const sent = [];
const mockSock = {
  sendMessage: async (jid, msg) => { sent.push({ to: jid, msg }); return { key: { id: "x" } }; },
  profilePictureUrl: async () => null,
  groupMetadata: async (jid) => ({ subject: "Grup Test", participants: [], desc: "" }),
  groupParticipantsUpdate: async () => [],
};

// ===== 1. SECTION: kasus normal =====
{
  // t("1a. <perilaku yang dijanjikan>", kondisi, "debug info kalau gagal");
  t("1a. contoh asersi", true);
}

// ===== 2. SECTION: kasus tanpa arg / arg salah → kartu usage/error =====
{
  t("2a. contoh: tanpa arg → kartu usage (bukan throw)", true);
}

// ===== 3. SECTION: input non-teks / malformed (QA gerbang 4) =====
{
  t("3a. contoh: input aneh gak throw", true);
}

// ===== 4. SECTION: state & restart (QA gerbang 2) =====
{
  // initDatabase ulang (simulasi restart) → data bertahan / sesi hangus sesuai spec
  t("4a. contoh: state tahan restart", true);
}

// ── ringkasan ────────────────────────────────────────────────────────
console.log(`\n===== <FITUR> E2E: ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail ? 1 : 0;
process.exit(fail ? 1 : 0);
