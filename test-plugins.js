// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// test-plugins.js — VERIFIKASI GUARD FORMAT KOTAK (lib/styler.js)
//
// Aturan owner 2026-09-07: pesan berkotak WAJIB lewat boxLeft() —
// (1) tiap baris ≤ width (default 30) karakter, (2) tiap baris isi
// diawali "│ ", (3) dikirim dalam code block. Kalimat input boleh
// sepanjang apa pun — yang memotong adalah wrapText, bukan tangan.
//
// Jalankan: node test-plugins.js

import { wrapText, boxLeft, boxMessage } from "./src/lib/styler.js";

const WIDTH = 30;
let pass = 0, fail = 0;
function ok(name) { pass++; console.log(`  ✅ ${name}`); }
function no(name, detail = "") { fail++; console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); }

console.log("── 1. wrapText: potong per kata ──");
{
  const long = "Filter jenis / sumber / mode / lokasi / jadwal yang di-set dari DM berlaku juga ke langganan global. Gunakan ON (pilih mode: DM/GRUP/GLOBAL), ONCHAT, ONGLOBAL, OFFGLOBAL, OFF, STATUS, MODE <otomatis/jadwal/darurat>, JADWAL ADD, JENIS, SUMBER, LOKASI, RADIUS — semua opsi aman dipotong otomatis tanpa menembus border kiri.";
  const url = `Ini link panjang banget ${"https://contoh.example.com/path/ke/ressssssssssssssssssssssssssource-yang-super-panjang-luar-biasa".repeat(3)} selesai.`;
  for (const [label, input] of [["kalimat 480+ char", long], ["URL super panjang", url]]) {
    const lines = wrapText(input, WIDTH);
    const bad = lines.filter((l) => l.length > WIDTH);
    bad.length === 0 ? ok(`${label}: semua baris ≤ ${WIDTH}`) : no(`${label}`, `baris ${bad[0].length} char`);
  }
}

console.log("── 2. boxLeft: prefix & struktur ──");
{
  const box = boxLeft("◆ BENCANA WATCH ◆", "Gunakan ON (DM/GRUP/GLOBAL), ONCHAT, ONGLOBAL, OFFGLOBAL, OFF, STATUS, MODE <otomatis/jadwal/darurat> — semua kalimat panjang dipotong otomatis.");
  const lines = box.split("\n");
  const [head, ...rest] = lines;
  const foot = rest.pop();
  head.startsWith("┌─「") ? ok("header ┌─「 ... 」") : no("header salah", head);
  foot === "└─「 • 」" ? ok("footer └─「 • 」") : no("footer salah", foot);
  const bad = rest.filter((l) => !l.startsWith("│ "));
  bad.length === 0 ? ok("SEMUA baris isi diawali '│ '") : no("ada baris tanpa prefix", JSON.stringify(bad[0]));
  const wide = rest.filter((l) => l.slice(2).length > WIDTH);
  wide.length === 0 ? ok(`SEMUA baris isi ≤ ${WIDTH} char`) : no("ada baris kepanjangan", wide[0]);
}

console.log("── 3. E2E .bencanawatch — output handler nyata ──");
{
  const { handler } = await import("./plugins/bencana/bencanawatch.js");
  const replies = [];
  const sock = { groupFetchAllParticipating: async () => ({}) };
  const mk = (text) => {
    const args = text.split(" ").slice(1);
    return { chat: "6281234567890@s.whatsapp.net", sender: "6281234567890@s.whatsapp.net", args,
      react: async () => {}, reply: async (t) => { replies.push(String(t)); return true; } };
  };
  for (const cmd of [".bencanawatch status", ".bencanawatch guide", ".bencanawatch onglobal", ".bencanawatch xyz"]) {
    await handler(mk(cmd), { sock });
  }
  replies.length >= 4 ? ok("4 perintah dibalas") : no("balasan kurang", String(replies.length));
  let allGuarded = true, detail = "";
  for (const r of replies) {
    if (r.startsWith("```") || r.endsWith("```")) { allGuarded = false; detail = "masih ada code block (harus font normal)"; break; }
    const lines = r.split("\n");
    const [head, ...rest] = lines;
    const foot = rest.pop();
    if (!head.startsWith("┌─「") || foot !== "└─「 • 」") { allGuarded = false; detail = "struktur kotak salah"; break; }
    const bad = rest.filter((l) => !l.startsWith("│ ") || l.slice(2).length > WIDTH);
    if (bad.length) { allGuarded = false; detail = `baris bocor: ${JSON.stringify(bad[0])}`; break; }
  }
  allGuarded ? ok("SEMUA output handler: font normal (tanpa code block) + prefix '│ ' + ≤30 char — gak ada yang nembus border") : no("output bocor", detail);
}

console.log(`\n${fail === 0 ? "🎉 SEMUA PASS" : "💥 ADA FAILURE"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
