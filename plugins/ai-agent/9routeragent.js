// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 9routeragent.js — 9ROUTER LOKAL CODING AGENT VIA WHATSAPP (OWNER ONLY)
// (request owner 6 Okt 2026: "buat lg cmd baru. 9routeragent buat
// nyambung ke 9router lokal" — .ocode TETAP di router9v2, command ini
// nyambung ke 9ROUTER LOKAL rara-9router-local.js)
// ".9routeragent perbaiki bug di fitur cuaca" → agent baca file repo,
// edit kode, lapor balik ke chat. Otak = engine lokal (gateway key
// auto-provision + spawn bareng bot), model ngikut otak agent
// (.9router otak model / env AGENT_BRAIN_MODEL).
//
// REVISI OWNER 6 Okt 2026 (lanjutan): "hrs bsa browsing, ketik cmd fitur
// yg ada di rara layaknya superagent sungguhan serba bisa bkin kode,
// edit file, dll" + "hrsnya ini ai superagent beneran dr pada raraagent
// yg hanya ngandelin ai dr min1ai" → 3 aksi superagent BARU:
//   • websearch — cari di internet (puppeteer DuckDuckGo)
//   • browse — buka halaman web → judul + deskripsi + isi
//   • cmd — jalanin command Rara apa pun layaknya owner ngetik
//     (output fitur ke-capture → konteks agent). Blocklist: restart,
//     bot, self, ocode, 9routeragent, agent laen (rekursi/bahaya).
//
// ⚠ SANKSI KEAMANAN: agent ini BISA mengedit file server.
// Remote code execution via WA → OWNER ONLY, gak ada pengecualian.
// Pengaman: path jail + blacklist rahasia (apikeys/.env/storage/.git)
// + shell MATI + backup otomatis (.9routeragent undo) + 1 tugas sekali
// jalan (lock SATU untuk semua coding agent: ocode + 9routeragent).
// + GATE IZIN PER FILE: tiap file yang mau ditulis/diedit → popup
// ✅ Ijinkan / ❌ Tolak ke owner; keputusan berlaku per file per tugas;
// 3 menit tanpa jawaban → otomatis DITOLAK.
// ============================================================
import { raraBox } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard } from "../../src/lib/rara-media-result.js";
import { toSC } from "../../src/lib/styler.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  runOcodeAgent, stopOcode, undoLast, listBackups, _ocodeState,
  localChat9Router,
} from "../../src/lib/rara-ocode-agent.js";
import { router9IsUp, getRouter9Base } from "../../src/lib/rara-9router-local.js";
import { getBrainModel } from "../../src/lib/rara-agent-brain.js";
import { getPlugin } from "../../src/lib/rara-plugins.js";
import { browserWebSearch, browserPageFacts } from "../../src/scraper/rara-web-browser.js";

const pluginConfig = {
    name: "9routeragent",
    alias: ["9routeragent", "9ragent", "router9agent", "9routeragentizin"],
    category: "ai agent",
    description: '9Router LOKAL Agent — AI coding agent lewat 9router lokal: edit/fix/bikin fitur bot langsung dari chat (owner only)',
    usage: '.9routeragent <tugas> | .9routeragent stop | .9routeragent status | .9routeragent undo | .9routeragent model <id>',
    example: '.9routeragent perbaiki bug di fitur cuaca\n.9routeragent buat fitur .halo di plugins\n.9routeragent status',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 2,
    energi: 0,
    isEnabled: true
}

const MAX_OUTPUT_CHARS = 3500; // lebih dari ini → kirim sebagai document
const APPROVAL_TIMEOUT_MS = 3 * 60 * 1000; // 3 menit tanpa jawaban → auto-tolak

// izin yang nunggu jawaban owner (cuma 1 tugas jalan = maks 1 pending)
let pendingApproval = null;

// seam e2e: override gate router-up (hindarin health-check beneran di test)
const __r9a = {};
export function _setRouter9AgentGateForTest(fn) { __r9a.gate = fn; }
// seam e2e: override bridge browse/cmd (hindarin puppeteer + dispatch beneran di test)
export function _setRouter9AgentBridgesForTest(o = {}) { __r9a.browse = o.browse; __r9a.runCmd = o.runCmd; }

// ── BRIDGE BROWSING (aksi websearch/browse — hasil ASLI halaman, bukan AI) ──
const BROWSE_BRIDGE = {
  async search(q, limit) {
    const items = await browserWebSearch(q, { limit: limit || 5 });
    return items.map((it) => ({ title: it.title, url: it.url, snippet: it.snippet }));
  },
  async read(url) {
    const f = await browserPageFacts(url);
    return { title: f?.title, description: f?.description, text: f?.text }; // screenshot buffer gak dikirim ke model
  },
};

// ── BRIDGE CMD RARA — agent ngetik command fitur bot sendiri ──
// (request owner 6 Okt: "ketik cmd fitur yg ada di rara"). Command
// dieksekusi lewat getPlugin() LANGSUNG (bukan pipeline handler penuh)
// dengan mock owner + sock SILENT: semua output (reply/kartu/media)
// ke-capture jadi konteks agent, gak nge-spam chat owner.
const CMD_BLOCK = /^(restart|bot|self|mode|ocode|ocodeizin|9routeragent|9routeragentizin|aisuperagent|aiagent|agent|agentloop|ocode9)$/i;

// deskripsi singkat konten WA yang dikirim fitur (media → tipe+ukuran, bukan byte)
function describeWASend(content) {
  if (!content || typeof content !== "object") return String(content || "").slice(0, 500);
  if (content.text) return String(content.text).slice(0, 500);
  for (const k of ["image", "video", "sticker", "audio", "document", "ptv"]) {
    if (content[k]) {
      const buf = content[k];
      const size = Buffer.isBuffer(buf) ? buf.length + "B" : (buf?.url ? "url" : "?");
      const cap = content.caption ? " caption: " + String(content.caption).slice(0, 200) : "";
      return `[MEDIA ${k} ${size}]` + cap;
    }
  }
  if (content.interactiveMessage) return String(content.interactiveMessage.body?.text || "[kartu interactive]").slice(0, 500);
  if (content.react) return "[reaksi emoji]";
  if (content.poll) return "[poll: " + String(content.poll.name || "").slice(0, 80) + "]";
  if (content.delete) return "[pesan dihapus]";
  return "[pesan WA tipe lain]";
}

function makeRunCmd(mOwner, botConfig, db) {
  return async function runCmd(raw) {
    const bare = String(raw || "").trim().replace(/^[!.#\/=]/, "").trim();
    const parts = bare.split(/\s+/).filter(Boolean);
    const name = String(parts.shift() || "").toLowerCase();
    if (!name) return "ERROR: command kosong";
    if (CMD_BLOCK.test(name)) return "ERROR: ." + name + " diblokir buat agent (restart/mode-bot/agent-lain = bahaya atau rekursi)";
    const plugin = getPlugin(name);
    if (!plugin?.handler) return "ERROR: command ." + name + " gak ditemukan di Rara (cek nama fitur di .menu)";
    const outs = [];
    const mockM = {
      isOwner: true, fromMe: true,
      chat: mOwner.chat, sender: mOwner.sender,
      args: parts, text: bare, command: name,
      reply: async (txt) => { outs.push(String(txt).slice(0, 800)); return txt; },
      react: async () => {},
      download: async () => { throw new Error("gak ada media di pesan agent"); },
    };
    const sockCap = new Proxy({ user: botConfig?.user || null }, {
      get(t, prop) {
        if (prop === "sendMessage") return async (jid, content) => { outs.push(describeWASend(content)); return { key: { id: "r9agent-" + Date.now() } }; };
        if (prop === "getName") return async (jid) => String(jid || "");
        if (prop === "readMessages" || prop === "sendPresenceUpdate" || prop === "sendReadReceipt") return async () => {};
        return t[prop];
      },
    });
    try {
      await Promise.race([
        plugin.handler(mockM, { sock: sockCap, conn: sockCap, config: botConfig, db, args: parts, text: bare }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 90 dtk")), 90000)),
      ]);
    } catch (e) {
      return "CMD ." + bare + " → ERROR: " + (e?.message || e);
    }
    const out = outs.filter(Boolean).join("\n---\n").slice(0, 4000);
    return "CMD ." + bare + " →\n" + (out || "(gak ada output — fitur mungkin nunggu media/balasan, coba fitur lain)");
  };
}

function resolveApproval(allowed, reason) {
  if (!pendingApproval) return false;
  const p = pendingApproval;
  pendingApproval = null;
  if (p.timer) clearTimeout(p.timer);
  p.resolve({ allowed: !!allowed, reason });
  return true;
}

// popup izin edit ala AI agent: ✅ Ijinkan / ❌ Tolak (pola ocode)
async function sendApprovalPopup(sock, chatJid, prefix, { path: rel, action, task, detail }) {
  const isEdit = action === "edit";
  const lines = [
    isEdit ? "Agent mau MENGEDIT file ini:" : "Agent mau MENULIS file ini:",
    "---",
    "\u{1F4C1} " + rel,
  ];
  if (isEdit) {
    lines.push("---", "\u2702\uFE0F Cari    : " + String(detail?.find || "").slice(0, 150),
      "\U0001F501 Ganti : " + String(detail?.replace || "").slice(0, 150));
  } else if (detail?.content) {
    const n = String(detail.content).split("\n").length;
    lines.push("---", "\u{1F4C4} Tulis penuh " + n + " baris" + (detail.content.length > 150 ? " (awal): " + String(detail.content).slice(0, 150).replace(/\n/g, " ") + "…" : ": " + String(detail.content).slice(0, 150)));
  }
  lines.push("---",
    "Tugas: " + String(task || "").slice(0, 100),
    "---",
    "\u23F0 3 menit tanpa jawaban \u2192 otomatis DITOLAK.",
    "Keputusan berlaku untuk file ini sampai tugas selesai.",
  );
  const body = raraBox("9RouterAgent — Minta Izin", lines);
  const rows = [
    { title: "\u2705 Ijinkan", description: "Boleh ubah file ini", id: prefix + "9routeragentizin ya" },
    { title: "\u274C Tolak", description: "File ini tidak boleh disentuh", id: prefix + "9routeragentizin tidak" },
  ];
  const buttons = [
    { name: "single_select", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    { name: "call_permission_request", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: toSC("\u2705 Ijin Edit File"),
        sections: [{ title: toSC("Jawaban Owner"), rows }],
      }),
    },
  ];
  await sock.sendMessage(chatJid, {
    interactiveMessage: {
      body: { text: body },
      footer: { text: toSC("Rara AI — 9RouterAgent") },
      header: { title: "", hasMediaAttachment: false },
      nativeFlowMessage: { buttons },
    },
  });
}

// callback onApproval buat lib — nunggu jawaban owner (klik tombol / ketik manual)
function makeApprovalCallback(sock, chatJid, prefix) {
  return async (info) => {
    await sendApprovalPopup(sock, chatJid, prefix, info);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (pendingApproval && pendingApproval.path === info.path) {
          pendingApproval = null;
          sock.sendMessage(chatJid, { text: raraBox("9RouterAgent — Izin", ["\u23F0 Waktu habis (3 mnt) — otomatis DITOLAK: " + info.path]) }).catch(() => {});
          resolve({ allowed: false, reason: "timeout" });
        }
      }, APPROVAL_TIMEOUT_MS);
      pendingApproval = { path: info.path, resolve, timer };
    });
  };
}

function router9AgentModel(db) {
    // default ngikut otak agent (.9router otak model / env AGENT_BRAIN_MODEL)
    // — override manual masih bisa via .9routeragent model <id>
    const saved = db?.data?.router9agent?.model;
    return saved || getBrainModel();
}

async function handler(m, { sock, args, config: botConfig }) {
    const prefix = botConfig?.command?.prefix || ".";
    // ⚠ GATE OWNER DI DALAM HANDLER — agent bisa mengedit file server.
    if (!m.isOwner) {
        return m.reply(raraBox("9RouterAgent", ["Fitur ini khusus owner — agent bisa mengedit file server."]));
    }
    const argList = (args || []).map(String);
    const sub = argList[0]?.toLowerCase();
    const db = getDatabase();

    // ── .9routeragentizin <ya|tidak> — jawaban izin edit file ──
    // wajib SEBELUM lock-check biar bisa dijawab pas tugas lagi jalan
    if (sub === "izin") {
        if (!pendingApproval) {
            return m.reply(raraBox("9RouterAgent — Izin", ["Gak ada permintaan izin yang nunggu jawaban."]));
        }
        const v = String(argList[1] || "").toLowerCase();
        const ya = /^(ya|yes|y|ok|oke|ijinkan|boleh|allow|b)$/.test(v);
        const p = pendingApproval;
        resolveApproval(ya);
        await m.react(ya ? "\u2705" : "\u274c");
        return m.reply(raraBox("9RouterAgent — Izin", ya
            ? ["DIIJINKAN — agent lanjut nulis " + p.path]
            : ["DITOLAK — agent lanjut TANPA ngubah " + p.path]));
    }

    // ── .9routeragent stop — batalkan tugas jalan (+ pending izin ikut ditolak) ──
    if (sub === "stop") {
        const hadPending = !!pendingApproval;
        resolveApproval(false, "stopped");
        const r = stopOcode();
        await m.react(r.ok || hadPending ? "\u26a1" : "\u274c");
        return m.reply(raraBox("9RouterAgent", [
            r.ok ? "Tugas dibatalkan — laporan menyusul." : (hadPending ? "Permintaan izin dibatalkan." : "Gak ada tugas yang jalan."),
        ]));
    }

    // ── .9routeragent status — info agent ──
    if (sub === "status") {
        const st = _ocodeState();
        const backups = listBackups(process.cwd());
        return m.reply(raraBox("9RouterAgent — Status", [
            "Tugas   : " + (st.running ? "SEDANG JALAN — " + String(st.task || "").slice(0, 60) : "idle"),
            "Izin    : " + (pendingApproval ? "NUNGGU JAWABAN — " + pendingApproval.path + " (jawab: .9routeragentizin ya|tidak)" : "-"),
            "Model   : " + router9AgentModel(db),
            "Otak    : 9ROUTER LOKAL (ngikut .9router otak model)",
            "Endpoint: " + getRouter9Base() + " (lokal)",
            "Key     : gateway otomatis (rara-bot)",
            "Backup  : " + (backups.length ? backups.length + " set (terbaru: " + backups[0] + ")" : "belum ada"),
            "---",
            "Shell   : MATI (mode aman — baca/edit file + tool MCP eksternal via aksi mcp)",
            "Browse  : websearch + browse (puppeteer, hasil asli halaman)",
            "Cmd Rara: bisa (jalanin fitur bot; blokir: restart/bot/self/agent)",
            "Undo    : .9routeragent undo (balikin perubahan terakhir)",
        ]));
    }

    // ── .9routeragent undo — restore backup terakhir ──
    if (sub === "undo") {
        const r = undoLast(process.cwd());
        await m.react(r.ok ? "\u26a1" : "\u274c");
        return m.reply(raraBox("9RouterAgent — Undo", r.ok
            ? ["Backup " + r.from + " di-restore:", ...r.restored.map((f) => "- " + f), "---", "Restart bot biar kode lama kebaca ulang."]
            : ["GAGAL: " + r.error]));
    }

    // ── .9routeragent model <id> — ganti model 9router lokal ──
    if (sub === "model") {
        const val = argList[1];
        if (!val) {
            return m.reply(raraBox("9RouterAgent — Model", [
                "Aktif: " + router9AgentModel(db),
                "Default: ngikut otak agent (env AGENT_BRAIN_MODEL / .9router otak model)",
                "---",
                "Ganti: .9routeragent model <id-9router-lokal>",
                "Daftar: .9router model <kata>",
            ]));
        }
        if (!db.data.router9agent) db.data.router9agent = {};
        db.data.router9agent.model = val;
        await db.save();
        await m.react("\u26a1");
        return m.reply(raraBox("9RouterAgent — Model", ["Model coding agent lokal diganti: " + val]));
    }

    // ── tugas baru ──
    const task = argList.join(" ").trim();
    if (!task) {
        return m.reply(raraBox("9RouterAgent — AI Coding Agent Lokal", [
            "Suruh aku ngoding langsung dari chat — lewat 9ROUTER LOKAL.",
            "---",
            "Contoh:",
            ".9routeragent perbaiki bug di fitur cuaca",
            ".9routeragent buat fitur .halo di plugins/fun",
            ".9routeragent jelaskan isi src/lib/rara-boot-doctor.js",
            "---",
            "Perintah:",
            ".9routeragent stop — batalkan tugas jalan",
            ".9routeragent status — info agent",
            ".9routeragentizin ya|tidak — jawab izin edit file",
            ".9routeragent undo — balikin perubahan terakhir",
            ".9routeragent model <id> — ganti model 9router lokal",
            "---",
            "Serba bisa: baca/edit/bikin file, browsing (websearch/browse),",
            "jalanin fitur bot (cmd), tool MCP — shell tetap mati.",
            "Tiap perubahan otomatis di-backup → .9routeragent undo.",
            "1 tugas sekaligus, maks 8 menit. Otak: 9router lokal.",
        ]));
    }

    // GATE 9ROUTER LOKAL (bukan v2/cloudku): router wajib hidup dulu —
    // router9IsUp health-check cepat + cache 3 dtk, gak pernah trigger
    // spawn 30 dtk di jalur pesan (komentar rara-agent-brain).
    const routerUp = await (__r9a.gate ? __r9a.gate() : router9IsUp());
    if (!routerUp) {
        return m.reply(raraBox("9RouterAgent", ["9Router LOKAL belum jalan — ketik .9router status / .9router restart (owner)."]));
    }

    if (_ocodeState().running) {
        return m.reply(raraBox("9RouterAgent", ["Masih ada tugas yang jalan (ocode / 9routeragent share lock) — tunggu selesai atau .9routeragent stop."]));
    }

    const model = router9AgentModel(db);
    await m.react("\U0001f9e0");
    const t0 = Date.now();
    const result = await runOcodeAgent({
        task,
        model,
        chat: localChat9Router, // ← 9ROUTER LOKAL (kode/eksekusi tetap di lib yang sama)
        // aksi superagent: browsing (puppeteer) + cmd fitur Rara
        browse: __r9a.browse !== undefined ? __r9a.browse : BROWSE_BRIDGE,
        runCmd: __r9a.runCmd !== undefined ? __r9a.runCmd : makeRunCmd(m, botConfig, db),
        onEvent: (ev) => { /* progress via reaksi aja biar gak spam chat */ },
        // GATE IZIN PER FILE — tiap write/edit ditanya dulu ke owner
        onApproval: makeApprovalCallback(sock, m.chat, prefix),
    });
    const detik = Math.round((Date.now() - t0) / 1000);

    if (result.error && !result.changed.length) {
        await m.react("\u274c");
        return m.reply(raraBox("9RouterAgent — Gagal", [
            "Error: " + result.error,
            "---",
            "Coba lagi / tugas lebih spesifik / ganti model (.9routeragent model <id>).",
        ]));
    }

    await m.react(result.aborted ? "\u26a1" : "\U0001f423");

    const changed = result.changed || [];
    const lines = [
        result.aborted ? "Tugas dibatalkan sebelum tuntas." : "Selesai dalam " + detik + " dtk (" + result.iterations + " langkah).",
        "Model: " + model + " (9router lokal)",
    ];
    if (changed.length) {
        lines.push("---", "File berubah:", ...changed.map((f) => "- " + f), "---", "Balikin: .9routeragent undo", "Deploy: cek git diff → git add -A → commit → restart bot");
    } else if (result.denied?.length) {
        lines.push("Semua edit DITOLAK owner — gak ada file yang berubah.");
    } else {
        lines.push("Gak ada file yang diedit (tugas analisa/jawab saja).");
    }
    const summary = (result.summary || "").slice(0, MAX_OUTPUT_CHARS);
    if ((result.summary || "").length > MAX_OUTPUT_CHARS) {
        lines.push("---", "Ringkasan panjang dikirim sebagai file.");
    }
    await m.reply(raraBox("9RouterAgent — Laporan", lines));

    // ringkasan agent — panjang → document, pendek → text biasa
    if (summary) {
        if ((result.summary || "").length > MAX_OUTPUT_CHARS) {
            const laporanBuf = Buffer.from(result.summary, "utf8");
            let cap = raraBox("9RouterAgent", ["Ringkasan lengkap agent."]);
            try {
                const card = mediaResultCard({
                    header: "9routeragent",
                    request: [["Fitur", "Laporan agent 9RouterAgent"], ["Berkas", "9routeragent-laporan.txt"], ["Karakter", String(result.summary.length)]],
                    size: laporanBuf.length,
                });
                if (card) cap = card;
            } catch {}
            await sock.sendMessage(m.chat, {
                document: laporanBuf,
                fileName: "9routeragent-laporan.txt",
                mimetype: "text/plain",
                caption: cap,
            });
        } else {
            await m.reply(summary);
        }
    }
}

export { handler, pluginConfig, router9AgentModel, pluginConfig as config };
