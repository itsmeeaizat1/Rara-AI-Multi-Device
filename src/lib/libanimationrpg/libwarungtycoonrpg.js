// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/warungtycoon.js — LIB ANIMASI CINEMATIC khusus Warung Tycoon (owner 25 Sep 2026)
// Gaya cuplikan Nintendo: cutscene multi-babak, durasi OTOMATIS nyesuaikan situasi jualan.
// Konvensi lib animasi per game (folder src/lib/libanimationrpg/): PURE scene-builder dari ctx —
// gak import plugin (hindari circular), semua data game dikirim lewat ctx, durasi via fr() base ms.
// Fallback channel gak dukung edit ditangani editSceneAnim (return false → pemanggil lanjut senyap).

const ANIM_BASE = process.env.WARUNG_ANIM_MS !== undefined ? Number(process.env.WARUNG_ANIM_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setWarungAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const rpFmt = (n) => new Intl.NumberFormat("id-ID").format(n);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

// ── animasi khas: CINEMATIC MULTI-BABAK gaya cuplikan Nintendo (BEDA dari semua game lain) ──

// scene builder BUKA WARUNG — jumlah scene & frame nyesuaikan SITUASI hasil jualan
// ctx: { pelanggan, terjual, omzet, kosong, eventTipe: kritikus|banjir|catering|penipu|supplier|null, eventSukses }
export function bukaCinematic(ctx) {
  const t = { tile: ctx.tile || "🏪" };
  const CUST = ["🙋", "🧑", "👩", "👴", "🧒"];
  const smoke = ["💨", "🍳"];
  const antre = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => CUST[i % CUST.length]).join(" ");
  const scenes = [];

  // SCENE 1 — warung dibuka
  scenes.push({ frames: [
    "```\n" + t.tile + " WARUNG MASIH TERTUTUP…\n🔔 Ting! Persiapan buka.\n```",
    "```\n" + t.tile + "✨ TIRAI DIBUKA!\n" + smoke[0] + " Asap dapur mulai mengepul…\n```",
  ], frameMs: fr(1), holdMs: fr(0.7) });

  // SCENE 2 — pelanggan berdatangan SATU PER SATU (makin ramai makin panjang babaknya)
  const nDatang = Math.min(ctx.pelanggan, 6);
  const f2 = [];
  for (let f = 1; f <= nDatang; f++) {
    const ekstra = f === nDatang && ctx.pelanggan > 6 ? " …+" + (ctx.pelanggan - 6) + " antre" : "";
    f2.push("```\n" + t.tile + " " + smoke[f % 2] + "  " + antre(f) + ekstra + "\n```");
  }
  if (!f2.length) f2.push("```\n" + t.tile + " " + smoke[0] + "  …sepi. Tidak ada yang datang?\n```");
  scenes.push({ frames: f2, frameMs: fr(0.64), holdMs: fr(0.7) });

  // SCENE 3 — situasi: sajian keluar ATAU pelanggan kecewa pergi
  if (ctx.kosong) {
    scenes.push({ frames: [
      "```\n" + t.tile + " 🚶🚶 Pelanggan mendekat…\n```",
      "```\n❓ WARUNG KOSONG?!\n🚶💨 Semua bubar ke warung sebelah…\n```",
    ], frameMs: fr(1), holdMs: fr(1.2) });
  } else {
    scenes.push({ frames: [
      "```\n🔥 WOK MENYALA!\n🍽️ " + ctx.terjual + " porsi keluar dapur beruntun!\n```",
      "```\n" + t.tile + "💨 " + antre(Math.min(ctx.terjual, 6)) + "\n🍽️💨 Porsi terbang ke antrean!\n```",
      "```\n😋😋😋 Pelanggan kenyang bersenang!\n" + t.tile + " makin ramai…\n```",
      "```\n💰 K a s   m u l a i   b e r d e t a k …\n```",
    ], frameMs: fr(0.85), holdMs: fr(0.7) });
  }

  // SCENE 4 — event khusus (kalau kejadian, babak ekstra muncul)
  if (ctx.eventTipe === "kritikus") {
    scenes.push(ctx.eventSukses ? { frames: [
      "```\n🎩 Seorang kritikus menyendok pelan…\n```",
      "```\n🎩⭐⭐⭐⭐ " + QQ + "LUAR BIASA!" + QQ + "\nAntrean bakal makin panjang besok!\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) } : { frames: [
      "```\n🎩 Kritikus menyendok… dicium… dicicipi…\n```",
      "```\n😖 " + QQ + "miemu… aduh." + QQ + "\nBintang turun. Dendam menunggu!\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  } else if (ctx.eventTipe === "banjir") {
    scenes.push({ frames: [
      "```\n🌧️ Hujan deras tiba-tiba!\n```",
      "```\n🌊 Kios kebanjiran!\nKas basah, omzet menyusut…\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  } else if (ctx.eventTipe === "catering") {
    scenes.push(ctx.eventSukses ? { frames: [
      "```\n📱 Telepon berdering!\n🎉 PESANAN CATERING DADAKAN!\n```",
      "```\n🍱 Bungkusan meluncur beruntun!\nDapur kerja ekstra sambil senyum.\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) } : { frames: [
      "```\n📱 Telepon berdering!\n🎉 Pesanan catering… tapi STOK KURANG.\n```",
      "```\n😰 Kamu nolak sambil gugup.\nRating dipertaruhkan!\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  } else if (ctx.eventTipe === "penipu") {
    scenes.push({ frames: [
      "```\n🤥 Anak kecil menyodor uang…\n🪙 Kok warnanya kayak mainan?\n```",
      "```\n🤥 Rugi dikit,\nuntung dapat cerita.\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  } else if (ctx.eventTipe === "supplier") {
    scenes.push({ frames: [
      "```\n📦 Supplier langganan datang!\n```",
      "```\n🎁 " + QQ + "Kelehan stok — ambil aja gratis!" + QQ + "\nGudang makin penuh.\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  }

  // SCENE 5 — hasil: kas berdetak naik + rating
  const om = Math.max(0, ctx.omzet);
  const sepertiga = Math.floor(om / 3);
  const duaPertiga = Math.floor((om * 2) / 3);
  const bintang = "★".repeat(Math.min(5, Math.max(1, ctx.rating || 3))) + "☆".repeat(5 - Math.min(5, Math.max(1, ctx.rating || 3)));
  scenes.push({ frames: [
    "```\n💰 Kas berdetak…\nRp" + rpFmt(sepertiga) + "…\n```",
    "```\n💰 Kas berdetak…\nRp" + rpFmt(duaPertiga) + "…\n```",
    "```\n" + t.tile + " OMZET HARI INI\nRp" + rpFmt(om) + " ✅  " + bintang + "\n```",
  ], frameMs: fr(0.95), holdMs: fr(1) });

  return scenes;
}

// scene builder MASAK — mini-cutscene dapur (~4 dtk, BEDA dari .cooking)
export function masakCinematic(menu, jml) {
  const nama = menu.nama.toUpperCase();
  return [
    { frames: [
      "```\n🍳 " + nama + "\n🌾 Bahan masuk wok…\n```",
      "```\n🍳 " + nama + "\n🔥 Api dinyalakan!\n```",
    ], frameMs: fr(0.8), holdMs: fr(0.4) },
    { frames: [
      "```\n🍳 " + nama + "\n  ·🔥·  teng!\n```",
      "```\n🍳 " + nama + "\n🔥·🔥·🔥  teng-teng!\n```",
    ], frameMs: fr(0.7), holdMs: fr(0.4) },
    { frames: [
      "```\n🍳 " + nama + " ✅\n🍽️ " + jml + " porsi siap dijual!\n```",
    ], frameMs: fr(1), holdMs: 0 },
  ];
}

