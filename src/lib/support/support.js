// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// support.js — Sumber tunggal link Join Grup Resmi & Saluran Resmi
//
// Dipakai: tombol popup Support (Join Grup Resmi / Ikuti Saluran Resmi),
// command .gcbot & .channelnovaofficial.
//
// Nilai yang di-set owner via .setsupport disimpan di DB (settings.support)
// dan MENIMPA default config (config.info.grupwa & config.saluran).

import config from "../../../config.js";
import { getDatabase } from "../nova-database.js";

/**
 * Ambil konfigurasi support terkini (DB override → default config).
 * @returns {{ group: { name: string, link: string }, saluran: { id: string, name: string, link: string } }}
 */
export function getSupport() {
  let stored = {};
  try {
    stored = getDatabase().setting("support") || {};
  } catch (e) {
    console.error("[support] baca setting gagal:", e.message);
  }

  return {
    group: {
      name: stored.groupName || "Grup Resmi Nova AI",
      link: stored.groupLink || config.info?.grupwa || "",
    },
    saluran: {
      id: stored.saluranId || config.saluran?.id || "@newsletter",
      name: stored.saluranName || config.saluran?.name || "Nova AI Official",
      link: stored.saluranLink || config.saluran?.link || "",
    },
  };
}

/**
 * Set / update sebagian konfigurasi support (merge, bukan replace total).
 * Field yang dikenal: groupLink, groupName, saluranLink, saluranName, saluranId
 * @param {object} patch
 * @returns {object} konfigurasi terbaru hasil merge
 */
export function setSupport(patch) {
  const db = getDatabase();
  const current = db.setting("support") || {};
  const next = { ...current, ...patch };
  db.setting("support", next);
  return getSupport();
}

/**
 * Reset semua setelan support ke default config.
 */
export function resetSupport() {
  getDatabase().setting("support", {});
  return getSupport();
}

/**
 * Status link — biar UI bisa kasih pesan yang jelas kalau belum di-set.
 * Link grup valid = diawali https://chat.whatsapp.com/
 * Link saluran valid = diawali https://whatsapp.com/channel/
 */
export function getSupportStatus() {
  const s = getSupport();
  return {
    groupSet: /^https:\/\/chat\.whatsapp\.com\/[\w.-]+/i.test(s.group.link || ""),
    saluranSet: /^https:\/\/whatsapp\.com\/channel\/[\w.-]+/i.test(s.saluran.link || ""),
    raw: s,
  };
}
