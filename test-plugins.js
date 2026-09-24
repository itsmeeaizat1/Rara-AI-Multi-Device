// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// test-plugins.js — VERIFIKASI FORMAT TANPA GARIS (lib/styler.js + nova-menu-style.js)
//
// Aturan owner 2026-09-07 (rework): pesan berkotak TANPA garis box-drawing —
// header 「 title 」 doang, isi polos tanpa prefix │, tanpa footer, tanpa
// wrap 30-char (gak ada border yang bisa putus, WhatsApp wrap natural).
// wrapText tetap diekspor (dipakai util lain) tapi boxLeft gak pakai lagi.
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

console.log("── 2. boxLeft: format tanpa garis ──");
{
  const box = boxLeft("Bencana Watch", "Gunakan ON (DM/GRUP/GLOBAL), ONCHAT, ONGLOBAL, OFFGLOBAL, OFF, STATUS, MODE <otomatis/jadwal/darurat> — semua opsi aman.");
  const lines = box.split("\n");
  const [head, ...rest] = lines;
  head.startsWith("「 ") && head.endsWith(" 」") ? ok("header 「 ... 」") : no("header salah", head);
  /[╭╰│├└┌┐┘┃]/.test(box) ? no("masih ada garis box-drawing", box) : ok("BERSIH: gak ada garis ╭╰│├└ di output");
  rest.some((l) => l.trim()) ? ok("isi tetap ada di bawah header") : no("isi hilang");
}

console.log("── 3. E2E .dsw (disastersystemwatch) — output handler nyata ──");
{
  // FIX v24.1.0: plugin sudah di-rename dari .bencanawatch → plugins/bencana/disastersystemwatch.js
  // (command utama .dsw). Import lama nunjuk file yang sudah tidak ada → test selalu gagal.
  const { handler } = await import("./plugins/bencana/disastersystemwatch.js");
  const replies = [];
  const sock = { groupFetchAllParticipating: async () => ({}) };
  const mk = (text) => {
    const args = text.split(" ").slice(1);
    return { chat: "6281234567890@s.whatsapp.net", sender: "6281234567890@s.whatsapp.net", args,
      react: async () => {}, reply: async (t) => { replies.push(String(t)); return true; } };
  };
  for (const cmd of [".dsw status", ".dsw guide", ".dsw onglobal", ".dsw xyz"]) {
    await handler(mk(cmd), { sock });
  }
  replies.length >= 4 ? ok("4 perintah dibalas") : no("balasan kurang", String(replies.length));
  let allGuarded = true, detail = "";
  for (const r of replies) {
    if (r.startsWith("```") || r.endsWith("```")) { allGuarded = false; detail = "masih ada code block (harus font normal)"; break; }
    const head = r.split("\n")[0];
    if (!(head.startsWith("「 ") || head.startsWith("「✦") || head.startsWith("「 ✦"))) { allGuarded = false; detail = "header 「 title 」 gak ada: " + head; break; }
    if (/[╭╰│├└┌┐┘┃]/.test(r)) { allGuarded = false; detail = "masih ada garis box-drawing"; break; }
  }
  allGuarded ? ok("SEMUA output handler: font normal + header 「 title 」 + tanpa garis box-drawing") : no("output bocor", detail);
}

console.log(`\n${fail === 0 ? "🎉 SEMUA PASS" : "💥 ADA FAILURE"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
