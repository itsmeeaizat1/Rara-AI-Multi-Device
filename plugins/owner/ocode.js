// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// ocode.js — OPENCODE 9ROUTER: AI CODING AGENT VIA WHATSAPP (OWNER ONLY)
// ".ocode perbaiki bug di fitur cuaca" → agent 9router baca file repo,
// edit kode, lapor balik ke chat. Versi 9router dari guide OpenCode
// (TANPA install OpenCode CLI, TANPA key Groq/GLM baru — pake key
// router9v2 yang udah ada; endpoint ikut satu pintu .ai9v2 endpoint).
//
// ⚠ SANKSI KEAMANAN (padan guide): agent ini BISA mengedit file server.
// Remote code execution via WA → OWNER ONLY, gak ada pengecualian.
// Pengaman: path jail + blacklist rahasia (apikeys/.env/storage/.git)
// + shell MATI + backup otomatis (.ocode undo) + 1 tugas sekali jalan.
// ============================================================
import { novaBox } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getTioEndpoint } from "../../src/lib/config/env-loader.js";
import {
  runOcodeAgent, stopOcode, undoLast, listBackups, _ocodeState,
} from "../../src/lib/nova-ocode-agent.js";
import { router9v2Key } from "../../src/scraper/router9v2.js";
import { ROUTER9V2_DEFAULT_MODEL } from "../../src/scraper/router9v2.js";

const pluginConfig = {
    name: "ocode",
    alias: ["ocode", "9code", "ocode9", "code9"],
    category: 'owner',
    description: 'OpenCode 9Router — AI coding agent: edit/fix/bikin fitur bot langsung dari chat (owner only)',
    usage: '.ocode <tugas> | .ocode stop | .ocode status | .ocode undo | .ocode model <id9router>',
    example: '.ocode perbaiki bug di fitur cuaca\n.ocode buat fitur .halo di plugins\n.ocode status',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 2,
    energi: 0,
    isEnabled: true
}

const MAX_OUTPUT_CHARS = 3500; // lebih dari ini → kirim sebagai document

function ocodeModel(db) {
    const saved = db?.data?.ocode?.model;
    return saved || ROUTER9V2_DEFAULT_MODEL;
}

async function handler(m, { sock, args }) {
    // ⚠ GATE OWNER DI DALAM HANDLER (jangan cuma andalkat gate framework) —
    // agent bisa mengedit file server, non-owner TIDAK BOLEH sekali pun.
    if (!m.isOwner) {
        return m.reply(novaBox("OpenCode", ["Fitur ini khusus owner — agent bisa mengedit file server."]));
    }
    const argList = (args || []).map(String);
    const sub = argList[0]?.toLowerCase();
    const db = getDatabase();

    // ── .ocode stop — batalkan tugas jalan ──
    if (sub === "stop") {
        const r = stopOcode();
        await m.react(r.ok ? "\u26a1" : "\u274c");
        return m.reply(novaBox("OpenCode", [r.ok ? "Tugas dibatalkan — laporan menyusul." : "Gak ada tugas yang jalan."]));
    }

    // ── .ocode status — info agent ──
    if (sub === "status") {
        const st = _ocodeState();
        const backups = listBackups(process.cwd());
        return m.reply(novaBox("OpenCode — Status", [
            "Tugas   : " + (st.running ? "SEDANG JALAN — " + String(st.task || "").slice(0, 60) : "idle"),
            "Model   : " + ocodeModel(db),
            "Endpoint: " + getTioEndpoint().replace("/chat/completions", ""),
            "Backup  : " + (backups.length ? backups.length + " set (terbaru: " + backups[0] + ")" : "belum ada"),
            "---",
            "Shell   : MATI (mode aman — agent cuma bisa baca/edit file)",
            "Undo    : .ocode undo (balikin perubahan terakhir)",
        ]));
    }

    // ── .ocode undo — restore backup terakhir ──
    if (sub === "undo") {
        const r = undoLast(process.cwd());
        await m.react(r.ok ? "\u26a1" : "\u274c");
        return m.reply(novaBox("OpenCode — Undo", r.ok
            ? ["Backup " + r.from + " di-restore:", ...r.restored.map((f) => "- " + f), "---", "Restart bot biar kode lama kebaca ulang: pm2 restart"]
            : ["GAGAL: " + r.error]));
    }

    // ── .ocode model <id> — ganti model 9router ──
    if (sub === "model") {
        const val = argList[1];
        if (!val) {
            return m.reply(novaBox("OpenCode — Model", [
                "Aktif: " + ocodeModel(db),
                "---",
                "Ganti: .ocode model <id-9router>",
                "Daftar: .ai9v2 list",
            ]));
        }
        if (!db.data.ocode) db.data.ocode = {};
        db.data.ocode.model = val;
        await db.save();
        await m.react("\u26a1");
        return m.reply(novaBox("OpenCode — Model", ["Model coding agent diganti: " + val]));
    }

    // ── tugas baru ──
    const task = argList.join(" ").trim();
    if (!task) {
        return m.reply(novaBox("OpenCode — AI Coding Agent", [
            "Suruh aku ngoding langsung dari chat.",
            "---",
            "Contoh:",
            ".ocode perbaiki bug di fitur cuaca",
            ".ocode buat fitur .halo di plugins/fun",
            ".ocode jelaskan isi src/lib/nova-boot-doctor.js",
            "---",
            "Perintah:",
            ".ocode stop — batalkan tugas jalan",
            ".ocode status — info agent",
            ".ocode undo — balikin perubahan terakhir",
            ".ocode model <id> — ganti model 9router",
            "---",
            "Agent cuma bisa baca/edit file (shell mati).",
            "Tiap perubahan otomatis di-backup → .ocode undo.",
            "1 tugas sekaligus, maks 8 menit.",
        ]));
    }

    if (!router9v2Key()) {
        return m.reply(novaBox("OpenCode", ["Key 9router belum di-set — isi di apikeys.json (providers.router9v2) atau env ROUTER_API_KEY."]));
    }

    if (_ocodeState().running) {
        return m.reply(novaBox("OpenCode", ["Masih ada tugas yang jalan — tunggu selesai atau .ocode stop."]));
    }

    const model = ocodeModel(db);
    await m.react("\U0001f9e0");
    const t0 = Date.now();
    const result = await runOcodeAgent({
        task,
        model,
        onEvent: (ev) => { /* progress via reaksi aja biar gak spam chat */ },
    });
    const detik = Math.round((Date.now() - t0) / 1000);

    if (result.error && !result.changed.length) {
        await m.react("\u274c");
        return m.reply(novaBox("OpenCode — Gagal", [
            "Error: " + result.error,
            "---",
            "Coba lagi / tugas lebih spesifik / ganti model (.ocode model <id>).",
        ]));
    }

    await m.react(result.aborted ? "\u26a1" : "\U0001f423");

    const changed = result.changed || [];
    const lines = [
        result.aborted ? "Tugas dibatalkan sebelum tuntas." : "Selesai dalam " + detik + " dtk (" + result.iterations + " langkah).",
        "Model: " + model,
    ];
    if (changed.length) {
        lines.push("---", "File berubah:", ...changed.map((f) => "- " + f), "---", "Balikin: .ocode undo", "Deploy: cek git diff → git add -A → commit → pm2 restart");
    } else {
        lines.push("Gak ada file yang diedit (tugas analisa/jawab saja).");
    }
    const summary = (result.summary || "").slice(0, MAX_OUTPUT_CHARS);
    if ((result.summary || "").length > MAX_OUTPUT_CHARS) {
        lines.push("---", "Ringkasan panjang dikirim sebagai file.");
    }
    await m.reply(novaBox("OpenCode — Laporan", lines));

    // ringkasan agent — panjang → document, pendek → text biasa
    if (summary) {
        if ((result.summary || "").length > MAX_OUTPUT_CHARS) {
            await sock.sendMessage(m.chat, {
                document: Buffer.from(result.summary, "utf8"),
                fileName: "ocode-laporan.txt",
                mimetype: "text/plain",
                caption: novaBox("OpenCode", ["Ringkasan lengkap agent."]),
            });
        } else {
            await m.reply(summary);
        }
    }
}

export { handler, pluginConfig, ocodeModel };
