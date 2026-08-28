// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// sholatv2.js — Jadwal sholat harian per kota via myquran.com v2 API

const pluginConfig = {
    name: "sholatv2",
    alias: ["sholatv2"],
    category: 'religi',
    description: 'Jadwal sholat per kota (myquran.com v2)',
    usage: '.sholatv2 <nama kota>',
    example: '.sholatv2 jakarta',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

function getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

async function handler(m, { sock, config, db } = {}) {
    const cityInput = (m.text || m.args?.join(" ") || "").trim();

    if (!cityInput) {
        return m.reply(`╭──「 Usage 」
│ Usage: ${pluginConfig.usage}
│ Contoh: ${pluginConfig.example}
╰──────────❀`);
    }

    try {
        // API 1: List Kota
        const resKota = await fetch("https://api.myquran.com/v2/sholat/kota/semua");
        if (!resKota.ok) throw new Error(`HTTP Error ${resKota.status}`);
        const jsonKota = await resKota.json();
        const cities = jsonKota?.data || [];

        const cleanQuery = cityInput.toLowerCase();
        const matches = cities.filter(c => c.lokasi.toLowerCase().includes(cleanQuery));

        if (matches.length === 0) {
            // Hint / kota mirip
            const queryWords = cleanQuery.split(/\s+/);
            let hints = cities.filter(c => {
                const loc = c.lokasi.toLowerCase();
                return queryWords.some(w => w.length >= 2 && loc.includes(w));
            });

            if (hints.length === 0) {
                const scored = cities.map(c => {
                    const locClean = c.lokasi.toLowerCase().replace(/^(kota|kab\.)\s+/, '');
                    let score = 0;
                    for (const w of queryWords) {
                        if (w.length >= 2 && locClean.includes(w)) score += 5;
                    }
                    const dist = getLevenshteinDistance(cleanQuery, locClean);
                    score += Math.max(0, 10 - dist);
                    return { city: c, score };
                });
                scored.sort((a, b) => b.score - a.score);
                hints = scored.slice(0, 5).map(s => s.city);
            } else {
                hints = hints.slice(0, 5);
            }

            const hintList = hints.map(c => `│ • ${c.lokasi}`).join("\n");
            return m.reply(`╭──「 Kota Tidak Ditemukan 」
│ Kota "${cityInput}" tidak ditemukan.
│
│ Hint / Kota Mirip:
${hintList}
╰──────────❀`);
        }

        // Cari kota terbaik
        const selectedCity = matches.find(c => c.lokasi.toLowerCase() === cleanQuery)
            || matches.find(c => c.lokasi.toLowerCase() === 'kota ' + cleanQuery)
            || matches.find(c => c.lokasi.toLowerCase() === 'kab. ' + cleanQuery)
            || matches[0];

        // Format tanggal hari ini WIB (Asia/Jakarta)
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
        const [tahun, bulan, tanggal] = formatter.format(now).split('-');

        // API 2: Jadwal Sholat
        const resJadwal = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${selectedCity.id}/${tahun}/${bulan}/${tanggal}`);
        if (!resJadwal.ok) throw new Error(`HTTP Error ${resJadwal.status}`);
        const jsonJadwal = await resJadwal.json();
        const dataJadwal = jsonJadwal?.data;
        const jadwal = dataJadwal?.jadwal;

        if (!jadwal) {
            return m.reply(`╭──「 Error 」
│ Gagal mengambil jadwal sholat untuk ${selectedCity.lokasi}.
╰──────────❀`);
        }

        const lokasiStr = dataJadwal.lokasi || selectedCity.lokasi;
        const tanggalStr = jadwal.tanggal || `${tanggal}/${bulan}/${tahun}`;

        const resultText = `╭──「 Jadwal Sholat 」
│ ${lokasiStr} — ${tanggalStr}
│
│ Subuh: ${jadwal.subuh}
│ Terbit: ${jadwal.terbit}
│ Dzuhur: ${jadwal.dzuhur}
│ Ashar: ${jadwal.ashar}
│ Maghrib: ${jadwal.maghrib}
│ Isya: ${jadwal.isya}
╰──────────❀`;

        return m.reply(resultText);

    } catch (error) {
        console.error("[sholatv2] Error:", error);
        return m.reply(`╭──「 Error 」
│ Terjadi kesalahan: ${error.message}
╰──────────❀`);
    }
}

export { pluginConfig as config, handler };
