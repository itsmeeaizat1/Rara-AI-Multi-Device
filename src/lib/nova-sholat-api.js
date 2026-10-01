// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import NodeCache from 'node-cache'
import moment from 'moment-timezone'
import { novaWrap } from './nova-menu-style.js'
import { formatRemaining } from './nova-countdown.js'
const BASE_URL = 'https://api.myquran.com/v2/sholat';
const cache = new NodeCache({ stdTTL: 86400 });

async function searchKota(query) {
    const key = `kota_${query.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { data } = await axios.get(`${BASE_URL}/kota/cari/${encodeURIComponent(query)}`, { timeout: 10000 });
    if (data?.status && Array.isArray(data.data) && data.data.length > 0) {
        const result = data.data[0];
        cache.set(key, result);
        return result;
    }
    return null;
}

async function fetchAllKota() {
    const cached = cache.get('all_kota');
    if (cached) return cached;

    const { data } = await axios.get(`${BASE_URL}/kota/semua`, { timeout: 15000 });
    if (data?.status && Array.isArray(data.data)) {
        cache.set('all_kota', data.data);
        return data.data;
    }
    throw new Error('Gagal mengambil daftar kota');
}

async function getTodaySchedule(kotaId) {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const key = `jadwal_${kotaId}_${year}_${month}_${day}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { data } = await axios.get(`${BASE_URL}/jadwal/${kotaId}/${year}/${month}/${day}`, { timeout: 10000 });
    if (data?.status && data.data) {
        cache.set(key, data.data);
        return data.data;
    }
    throw new Error('Gagal mengambil jadwal sholat');
}

function extractPrayerTimes(jadwalData) {
    const j = jadwalData.jadwal || jadwalData;
    return {
        imsak: j.imsak || '-',
        subuh: j.subuh || '-',
        terbit: j.terbit || '-',
        dhuha: j.dhuha || '-',
        dzuhur: j.dzuhur || '-',
        ashar: j.ashar || '-',
        maghrib: j.maghrib || '-',
        isya: j.isya || '-'
    };
}

function clearCache() {
    cache.flushAll();
}


// ═══════════════════════════════════════════════════════════════════
// SHOLAT BERIKUTNYA + LIVE COUNTDOWN (13 Sep 2026, variasi fitur polos
// batch 4: ".jadwalsholat gak ada pelengkap kyk penghitung" ala .afk)
// ═══════════════════════════════════════════════════════════════════

// cuma 5 waktu sholat — imsak/terbit/dhuha bukan sholat
const PRAYER_SEQUENCE = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']
const PRAYER_LABELS = { subuh: 'Subuh', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' }

function prayerEpoch(timeStr, addDays = 0) {
    return moment.tz(timeStr, 'HH:mm', 'Asia/Jakarta').add(addDays, 'days').valueOf()
}

/**
 * Hitung sholat berikutnya dari jadwal hari ini (WIB).
 * Semua udah lewat hari ini → Subuh BESOK (isTomorrow).
 * @returns {{key,name,timeStr,targetTs,isTomorrow}|null}
 */
function computeNextPrayer(times) {
    const now = Date.now()
    const valid = (s) => typeof s === 'string' && /^\d{1,2}:\d{2}$/.test(s.trim())
    for (const p of PRAYER_SEQUENCE) {
        const t = times?.[p]
        if (!valid(t)) continue
        const ts = prayerEpoch(t.trim())
        if (ts > now) return { key: p, name: PRAYER_LABELS[p], timeStr: t.trim(), targetTs: ts, isTomorrow: false }
    }
    const s = times?.subuh
    if (valid(s)) {
        return { key: 'subuh', name: PRAYER_LABELS.subuh, timeStr: s.trim(), targetTs: prayerEpoch(s.trim(), 1), isTomorrow: true }
    }
    return null
}

/**
 * Kartu countdown sholat (dipakai initialCard/tickCard runLiveTicker).
 * remainingMs <= 0 → kartu "SUDAH WAKTU".
 */
function buildSholatCountdownCard(next, remainingMs, lokasi) {
    const done = Number(remainingMs) <= 0
    const besok = next.isTomorrow ? ' (besok)' : ''
    const lok = lokasi ? `📍 ${lokasi}\n` : ''
    if (done) {
        return novaWrap(`Waktunya ${next.name}`,
            `🕌 *SUDAH WAKTU ${next.name.toUpperCase()}*\n` +
            `🕘 pukul ${next.timeStr} WIB${besok}\n` +
            lok +
            `\n_yuk sholat dulu, jangan ditunda! 🤲_`)
    }
    return novaWrap(`Menuju ${next.name}`,
        `🕒 *${formatRemaining(remainingMs)}* lagi\n` +
        `🕘 pukul ${next.timeStr} WIB${besok}\n` +
        lok +
        `\n_jangan lupa sholat ya! 🤲_`)
}

export { searchKota, fetchAllKota, getTodaySchedule, extractPrayerTimes, clearCache, computeNextPrayer, buildSholatCountdownCard, PRAYER_SEQUENCE, PRAYER_LABELS }