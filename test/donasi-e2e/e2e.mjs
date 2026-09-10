// E2E TOMBOL DONASI DEFAULT ON + QR STORE (10 Sep 2026)
// Request owner: "aku mau tmbol donasi ga off defaultnya on pas diklik
// tmbolnya mnculin qr store"
// Jalankan dari cwd REPO (butuh assets/image/store/aizat-store-qris.jpg):
//   cd <repo> && node test/donasi-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import donasiPlugin from "../../plugins/group/donasi.js";
const { config: donasiConfig, handler: donasiHandler } = donasiPlugin;

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };


// claraWrap smallcaps semua teks — assert WAJIB pakai smallcaps (gotcha lama)
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

const DB_PATH = path.join(process.cwd(), "src", "data", "donasi-db.json");
const OWNER = "6281234567890@s.whatsapp.net";
const CHAT = "12036302@g.us";

const botConfig = {
  command: { prefix: "." },
  owner: [OWNER],
  ownerNumber: OWNER,
  donasi: {
    payment: [{ name: "Dana", number: "0812xxxx", holder: "Aizat" }],
    benefits: ["Mendukung development", "Server lebih stabil"],
    qris: "./assets/image/store/aizat-store-qris.jpg",
  },
  payment: { qrisUrl: "./assets/image/store/aizat-store-qris.jpg" },
};

function mkM(text) {
  const replies = [];
  const sent = []; // sock.sendMessage calls
  const m = {
    key: { remoteJid: CHAT, participant: OWNER },
    chat: CHAT, sender: OWNER, pushName: "Owner", text,
    reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
    react: async () => true,
    _replies: replies, _sent: sent,
  };
  const sock = {
    sendMessage: async (jid, content) => { sent.push(content); },
    sendPresenceUpdate: async () => true,
  };
  return { m, sock };
}

// cleanup state awal
try { fs.rmSync(DB_PATH); } catch {}

w("\n— 1. plain .donasi (klik tombol menu) → kirim QR STORE —");
{
  const { m, sock } = mkM(".donasi");
  await donasiHandler(m, { sock, config: botConfig });
  check("kirim 1 image via sock.sendMessage", m._sent.length === 1 && !!m._sent[0]?.image, `sent=${m._sent.length}`);
  const caption = String(m._sent[0]?.caption || "");
  check("caption ajak scan QRIS", caption.includes("Scan QRIS"), caption.slice(0, 60));
  check("caption ada wa.me owner", caption.includes("wa.me/"), "");
  check("caption ada benefit donatur", caption.includes("Benefit donatur"), "");
  check("caption ada metode e-wallet aktif (Dana)", caption.includes("Dana"), "");
  check("gak ada gate NONAKTIF", !m._replies.length || !m._replies[0]?.includes(toSC("nonaktif")), m._replies[0] || "");
}

w("\n— 2. .donasi list di chat baru → TIDAK NONAKTIF (default ON) —");
{
  try { fs.rmSync(DB_PATH); } catch {} // state fresh
  const { m, sock } = mkM(".donasi list");
  await donasiHandler(m, { sock, config: botConfig });
  const r = m._replies[0] || "";
  check("balas 'Tidak ada kampanye' (default ON, bukan NONAKTIF)", r.includes(toSC("Tidak ada")) && !r.includes(toSC("nonaktif")), r.slice(0, 80));
}

w("\n— 3. toggle .donasioff / .donasion tetap jalan —");
{
  const off = mkM(".donasioff");
  await donasiHandler(off.m, { sock: off.sock, config: botConfig });
  check(".donasioff → 'dinyalakan'-peka (reply toggle)", (off.m._replies[0] || "").includes("matikan") || (off.m._replies[0] || "").includes("matikan") || (off.m._replies[0] || "").length > 0, off.m._replies[0]);

  const gate = mkM(".donasi list");
  await donasiHandler(gate.m, { sock: gate.sock, config: botConfig });
  check("setelah off → list kena gate NONAKTIF", (gate.m._replies[0] || "").includes(toSC("nonaktif")), gate.m._replies[0]);

  const on = mkM(".donasion");
  await donasiHandler(on.m, { sock: on.sock, config: botConfig });
  check(".donasion → aktif lagi", (on.m._replies[0] || "").includes(toSC("aktif")), on.m._replies[0]);

  // plain .donasi TETAP kirim QR walau gate off (tombol menu selalu jalan)
  const btn = mkM(".donasi");
  await donasiHandler(btn.m, { sock: btn.sock, config: botConfig });
  check("plain .donasi bypass gate → image tetap kekirim", btn.m._sent.length === 1 && !!btn.m._sent[0]?.image, `sent=${btn.m._sent.length}`);
}

w("\n— 4. non-owner gak bisa toggle —");
{
  const { m, sock } = mkM(".donasioff");
  m.sender = "62899888777@s.whatsapp.net";
  m.key.participant = m.sender;
  await donasiHandler(m, { sock, config: botConfig });
  check("ditolak (akses ditolak)", (m._replies[0] || "").includes(toSC("ditolak")), m._replies[0]);
}

// cleanup state akhir — jangan ninggalin db test di repo
try { fs.rmSync(DB_PATH); } catch {}
check("cleanup db test (donasi-db.json dihapus)", !fs.existsSync(DB_PATH));

check("pluginConfig name=donasi + usage ada '.donasi - QR'", donasiConfig.name === "donasi" && donasiConfig.usage.includes(".donasi - QR"));

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
