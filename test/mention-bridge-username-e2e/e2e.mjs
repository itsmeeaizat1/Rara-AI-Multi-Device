// E2E — MENTION BRIDGE PAKAI USERNAME (7 Okt 2026, owner screenshot:
// notif level-up Telegram muncul "@tg_8672332446" — minta nama username
// Telegram asli dipakai, bukan ID mentah).
// Akar: m.sender bridge Telegram = "tg_<id>" (gak ada "@domain"), jadi
// "@" + m.sender.split("@")[0] balikin ID mentah apa adanya. FIX:
// bridgeMentionText(m) baca m._bridge.username (dari telegramToRaw) kalau
// user Telegram punya username; fallback pushName; fallback ID lama (WA
// & bridge user tanpa username tetap jalan kayak sebelumnya).
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? "  ✅ " : "  ❌ ") + name + (ok || !extra ? "" : " — " + extra));
  ok ? pass++ : fail++;
};

const { bridgeMentionText } = await import(R + "/src/lib/rarabridge/adapter.js");
const { telegramToRaw } = await import(R + "/src/lib/rarabridge/adapter.js");

// 1. Telegram user PUNYA username → "@username" asli, bukan ID
{
  const raw = telegramToRaw({
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: 8672332446, type: "private" },
    from: { id: 8672332446, username: "buyer_asli", first_name: "Buyer" },
    text: ".level",
  });
  const m = { sender: raw.key.participant, pushName: raw.pushName, _bridge: raw._bridge };
  check("1a. _bridge.username terbaca dari telegramToRaw", raw._bridge.username === "buyer_asli", raw._bridge.username);
  check("1b. bridgeMentionText pakai @username (BUKAN @tg_<id>)", bridgeMentionText(m) === "@buyer_asli", bridgeMentionText(m));
}

// 2. Telegram user TANPA username (banyak akun gak set username) → fallback pushName
{
  const raw = telegramToRaw({
    message_id: 2,
    date: Date.now() / 1000,
    chat: { id: 999888777, type: "private" },
    from: { id: 999888777, first_name: "Sari" }, // no username
    text: ".level",
  });
  const m = { sender: raw.key.participant, pushName: raw.pushName, _bridge: raw._bridge };
  check("2a. _bridge.username null kalau emang gak ada", raw._bridge.username === null);
  check("2b. fallback ke pushName (nama tampilan)", bridgeMentionText(m) === "@Sari", bridgeMentionText(m));
}

// 3. Telegram tanpa username DAN tanpa nama (edge-case) → fallback ID mentah (perilaku lama, gak pernah crash)
{
  const m = { sender: "tg_123456", pushName: "Telegram User", _bridge: { platform: "telegram", username: null } };
  check("3. fallback akhir ke ID mentah kalau gak ada info lain", bridgeMentionText(m) === "@tg_123456", bridgeMentionText(m));
}

// 4. WA biasa (non-bridge) — PERILAKU LAMA GAK BERUBAH (regresi penting)
{
  const m = { sender: "6289988776655@s.whatsapp.net", pushName: "Budi", _bridge: undefined };
  check("4. WA non-bridge tetap pakai nomor (gak kesentuh fix ini)", bridgeMentionText(m) === "@6289988776655", bridgeMentionText(m));
}

// 5. Discord simetri (username asli dia emang handle)
{
  const { discordToRaw } = await import(R + "/src/lib/rarabridge/adapter.js");
  const raw = discordToRaw({ id: "1", createdTimestamp: Date.now(), author: { id: "55", username: "dc_handle" }, content: ".level", channelId: "77" });
  const m = { sender: raw.key.participant, pushName: raw.pushName, _bridge: raw._bridge };
  check("5. Discord bridgeMentionText pakai @username", bridgeMentionText(m) === "@dc_handle", bridgeMentionText(m));
}

// 6. m._bridge ketempel beneran via rara-serialize.js (bukan cuma di adapter)
{
  const srcPath = R + "/src/lib/rara-serialize.js";
  const fs = await import("fs");
  const content = fs.readFileSync(srcPath, "utf-8");
  check("6. serialize.js nempelin msg._bridge → m._bridge", content.includes("if (msg._bridge) m._bridge = msg._bridge;"));
}

// 7. rara-level.js SELAMAT @... (kasus di screenshot) kini pakai bridgeMentionText
{
  const fs = await import("fs");
  const content = fs.readFileSync(R + "/src/lib/rara-level.js", "utf-8");
  check("7. levelup SELAMAT pakai bridgeMentionText (bukan m.sender.split mentah)", content.includes('SELAMAT ${bridgeMentionText(m)}'));
}

console.log(`\n===== MENTION BRIDGE USERNAME E2E: ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
