// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-anim-runner.js — ANIMASI SIDE-SCROLLING RUNNER REUSABLE (request owner 21 Sep 2026)
// Karakter melintasi jalur tile (2 baris: pemandangan + lintasan) dalam code fence monospace,
// pesan DIEDIT frame demi frame via Baileys edit key. Skala dengan LEVEL pemain:
//   Lv 1-10  → 12 tile, 1 bioma, ±5 frame
//   Lv 11-25 → 16 tile, 2 bioma (berganti di tengah), ±8 frame
//   Lv 26-50 → 20 tile, 3 bioma, rintangan 🪨 (lompat ⬆️) + event peti 💎, ±12 frame
//   Lv 50+   → 22 tile, bioma langka (lava/langit) + sprint final 💨
// Jejak: tile yang sudah dilewati jadi ⬜. Frame terakhir: finis 🏁 + hasil.
// Fallback: edit gak didukung/gagal → return false (hasil final dikirim pesan baru oleh pemanggil).

export const BIOMA_RUNNER = {
  padang: { nama: "Padang", tanah: "🟩", adegan: ["🌲", "🌴", "🗻"], char: "🏃" },
  gurun: { nama: "Gurun", tanah: "🟫", adegan: ["🌵", "☀️", "🐪"], char: "🐪" },
  salju: { nama: "Salju", tanah: "⬜", adegan: ["🏔️", "❄️", "⛄", "🌲"], char: "⛷️" },
  pantai: { nama: "Pantai", tanah: "🟦", adegan: ["🌊", "🌴", "🐚"], char: "🏊" },
  lava: { nama: "Lava", tanah: "🟥", adegan: ["🌋", "🔥", "💀"], char: "🔥", langka: true },
  langit: { nama: "Langit", tanah: "🟪", adegan: ["☁️", "🌟", "🌙", "🪽"], char: "🪽", langka: true },
};

// aksi khusus menimpa karakter bawaan bioma (null = pakai char bioma)
export const AKSI_RUNNER = {
  lari: "🏃", panjat: "🧗", menyusur: "🧭", kabur: "💨", dungeon: "🗡️", gacha: "🎁", papan: "🛹",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── rencana per level ──
function levelPlan(level) {
  if (level <= 10) return { tiles: 12, biomaCount: 1, rintangan: 0, chest: false, sprint: false };
  if (level <= 25) return { tiles: 16, biomaCount: 2, rintangan: 0, chest: false, sprint: false };
  if (level <= 50) return { tiles: 20, biomaCount: 3, rintangan: 2, chest: true, sprint: false };
  return { tiles: 22, biomaCount: 3, rintangan: 2, chest: true, sprint: true };
}

// ── pilih bioma: umum + langka (lava/langit 6%; Lv 50+ salah satu segmen dijamin langka) ──
function pickBiomes(count, level, forced) {
  if (forced) {
    const arr = Array.isArray(forced) ? forced : [forced];
    const list = arr.map((b) => BIOMA_RUNNER[b]).filter(Boolean);
    while (list.length < count) list.push(list[list.length - 1] || BIOMA_RUNNER.padang);
    return list.slice(0, count);
  }
  const umum = ["padang", "gurun", "salju", "pantai"];
  const langka = ["lava", "langit"];
  const segs = [];
  for (let i = 0; i < count; i++) {
    if (level > 50 && i === 1) segs.push(langka[Math.floor(Math.random() * langka.length)]);
    else if (Math.random() < 0.06) segs.push(langka[Math.floor(Math.random() * langka.length)]);
    else segs.push(umum[Math.floor(Math.random() * umum.length)]);
  }
  return segs.map((id) => BIOMA_RUNNER[id]);
}

// ── renderFrame: 2 baris (pemandangan + lintasan) per posisi ──
function renderFrame({ segs, tiles, pos, charOverride, obstacleSet, jump, sprint, chest, finish, hasil }) {
  const segLen = Math.ceil(tiles / segs.length);
  const segOf = (i) => segs[Math.min(segs.length - 1, Math.floor(i / segLen))];
  // baris atas: pemandangan deterministik tersebar tiap ~4 tile
  const atas = [];
  for (let i = 0; i < tiles; i++) {
    if (i % 4 === 2) atas.push(segOf(i).adegan[(i + segs.length) % segOf(i).adegan.length]);
    else atas.push("　");
  }
  // baris bawah: jejak ⬜ untuk tile terlewati, tile bioma untuk yang belum
  const bawah = [];
  for (let i = 0; i < tiles; i++) {
    if (finish) { bawah.push(i === tiles - 1 ? "🏁" : "⬜"); continue; }
    if (i < pos) { bawah.push("⬜"); continue; } // jejak perjalanan
    if (i === pos) { bawah.push(jump ? "⬆️" : charOverride); continue; }
    bawah.push(obstacleSet.has(i) ? "🪨" : segOf(i).tanah); // tile bioma + rintangan
  }
  const lines = [atas.join("").replace(/　+$/, ""), bawah.join("")];
  if (chest) lines.push("💎 PETI HARTA DITEMUKAN DI TENGAH JALAN!");
  if (finish && hasil) lines.push(hasil);
  return "```\n" + lines.join("\n") + "\n```";
}

// ── animasiRunner: kirim + edit berulang. return true kalau animasi jalan ──
// pemakaian: animasiRunner(sock, m.chat, { level, bioma, aksi, hasil, tiles, frameMs })
export async function animasiRunner(sock, jid, opts = {}) {
  try {
    if (!sock?.sendMessage || !jid) return false;
    const level = Number(opts.level) || 1;
    const plan = levelPlan(level);
    const tiles = Math.max(8, Math.min(24, Number(opts.tiles) || plan.tiles));
    const segs = pickBiomes(plan.biomaCount, level, opts.bioma);
    const aksiChar = opts.aksi ? AKSI_RUNNER[opts.aksi] : null;
    const charOf = (pos, i) => {
      if (aksiChar) return aksiChar;
      if (plan.sprint && pos >= tiles - 3) return "💨"; // sprint final Lv 50+
      return segs[Math.min(segs.length - 1, Math.floor(pos / Math.ceil(tiles / segs.length)))].char;
    };
    // posisi rintangan (Lv 26+) tersebar, bukan di 2 tile terakhir
    const obstacleSet = new Set();
    for (let k = 0; k < plan.rintangan; k++) {
      obstacleSet.add(3 + k * Math.floor((tiles - 6) / Math.max(1, plan.rintangan)) + Math.floor(Math.random() * 2));
    }
    const chestAt = plan.chest ? Math.floor(tiles / 2) : -1;

    // susun frame: maju 2 tile per frame, lompatin rintangan (frame ⬆️), event peti 1 frame
    const frames = [];
    let pos = 0;
    let chestShown = false;
    while (pos < tiles - 1) {
      const jumpNext = obstacleSet.has(pos + 1) || obstacleSet.has(pos + 2);
      frames.push({ pos, jump: false, char: charOf(pos) });
      if (jumpNext) { frames.push({ pos, jump: true, char: charOf(pos) }); pos += 3; }
      else pos += 2;
      if (!chestShown && chestAt >= 0 && pos >= chestAt) {
        chestShown = true;
        frames.push({ pos: Math.min(pos, tiles - 1), jump: false, char: charOf(Math.min(pos, tiles - 1)), chest: true });
      }
    }
    frames.push({ pos: tiles - 1, finish: true, char: "🏁" });
    if (frames.length > 14) frames.splice(1, frames.length - 14); // durasi total aman

    // kecepatan menanjak: 900ms awal → 600ms akhir (override via opts.frameMs / env)
    const envMs = process.env.NOVA_ANIM_MS !== undefined ? Number(process.env.NOVA_ANIM_MS) : null;
    const delayOf = (i) => {
      if (opts.frameMs !== undefined) return Number(opts.frameMs);
      if (envMs !== null && !Number.isNaN(envMs)) return envMs;
      return Math.round(900 - ((900 - 600) * i) / Math.max(1, frames.length - 1));
    };

    const sentMsg = await sock.sendMessage(jid, { text: renderFrame({ segs, tiles, pos: frames[0].pos, charOverride: frames[0].char, obstacleSet, jump: frames[0].jump, chest: frames[0].chest, sprint: plan.sprint }) });
    if (!sentMsg?.key) return false; // edit gak didukung → biarkan pemanggil kirim hasil sebagai pesan baru
    for (let i = 1; i < frames.length; i++) {
      await sleep(delayOf(i));
      const f = frames[i];
      try {
        await sock.sendMessage(jid, {
          text: renderFrame({ segs, tiles, pos: f.pos, charOverride: f.char, obstacleSet, jump: f.jump, chest: f.chest, finish: f.finish, hasil: opts.hasil, sprint: plan.sprint }),
          edit: sentMsg.key,
        });
      } catch (e) {
        console.error("[anim-runner] edit gagal (animasi dihentikan, hasil via pesan baru):", e);
        return false;
      }
    }
    await sleep(delayOf(frames.length - 1)); // jeda biar frame finis sempat terbaca
    return true;
  } catch (e) {
    console.error("[anim-runner] gagal (dilewati senyap):", e);
    return false;
  }
}

export function _resetAnimRunnerForTest() { /* hook seams kalau perlu */ }
