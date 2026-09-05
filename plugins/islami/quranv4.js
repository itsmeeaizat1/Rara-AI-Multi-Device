// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quranv4.js - Plugin Al-Quran via equran.id API v2

const pluginConfig = {
    name: "quranv4",
    alias: ["quranv4", "quranv2"],
    category: "islami",
    description: 'Al-Quran lengkap (equran.id API v2)',
    usage: '.quranv2 <nomor surat>',
    example: '.quranv2 1',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

import { claraWrap } from "../../src/lib/nova-menu-style.js";

const API_BASE = "https://equran.id/api/v2/surat";

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
}

async function handler(m, { text, args }) {
    try {
        const rawInput = (text || m.text || args?.[0] || m.args?.[0] || "").trim();

        await m.react("🕒");

        // Jika input kosong, tampilkan daftar 114 surat dalam Modern Box
        if (!rawInput) {
            const json = await fetchJSON(API_BASE);
            const surahs = json?.data || [];
            if (!surahs.length) {
                throw new Error("Gagal ambil nih daftar surat Al-Quran.");
            }

            let lines = [];
            lines.push("");
            lines.push("Total: 114 Surat");
            lines.push("");

            const limit = Math.min(surahs.length, 10);
            for (let i = 0; i < limit; i++) {
                const s = surahs[i];
                lines.push(`${s.nomor}. ${s.namaLatin} (${s.arti}) - ${s.jumlahAyat} ayat`);
            }

            lines.push("");
            lines.push(`... dan ${surahs.length - limit} surat lainnya.`);
            lines.push("");
            lines.push(`📌 Ketik .quranv4 <nomor surat> untuk membaca.`);
            lines.push(`💡 Contoh: .quranv4 1`);

            await m.react("🐣");
            return await m.reply(claraWrap("Al-Quran V4", lines.join("\n")));
        }

        const surahNum = parseInt(rawInput, 10);
        if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
            await m.react("❗");
            return await m.reply(claraWrap("Al-Quran V4", [
                "Nomor surat tidak valid kak!",
                "",
                "📌 Masukkan nomor 1 sampai 114.",
                `💡 Contoh: .quranv4 1`,
            ], "error"));
        }

        // Ambil ayat-ayat dari surat tersebut
        const detailJson = await fetchJSON(`${API_BASE}/${surahNum}`);
        const surah = detailJson?.data;
        if (!surah || !surah.ayat || !surah.ayat.length) {
            throw new Error(`Data ayat untuk surat nomor ${surahNum} tidak ditemukan.`);
        }

        let lines = [];
        lines.push("");
        lines.push(`${surah.jumlahAyat} ayat | ${surah.tempatTurun}`);
        lines.push("");

        const ayatList = surah.ayat;
        const maxAyat = Math.min(ayatList.length, 20);

        for (let i = 0; i < maxAyat; i++) {
            const a = ayatList[i];
            lines.push(`${a.nomorAyat}. ${a.teksArab}`);
            lines.push(`${a.teksIndonesia}`);
            lines.push("");
        }

        if (ayatList.length > 20) {
            lines.push(`Catatan: Menampilkan 20 dari ${surah.jumlahAyat} ayat.`);
        } else {
            // Hapus baris pemisah kosong terakhir jika tidak dipotong
            if (lines[lines.length - 1] === "") {
                lines.pop();
            }
        }

        lines.push("");

        await m.react("🐣");
        return await m.reply(lines.join("\n"));
    } catch (error) {
        console.error("[QuranV4]", error.message);
        await m.react("❌");
        return await m.reply(claraWrap("Al-Quran V4", "Gagal memproses permintaan Al-Quran kak, coba lagi nanti ya 😥", "error"));
    }
}

export { pluginConfig as config, handler };
