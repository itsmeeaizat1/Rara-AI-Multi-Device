// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/group/autorole.js — Auto Role Assignment System
// Command: .autorole (toggle) | .profile | .roleboard | .addpoint | .setrole

import {
  isEnabled, toggle, getUser, addChat, addPoints,
  setManualRole, getLeaderboard, getRoleInfo, resolveRole,
  formatProfile, ROLES,
} from "../../src/lib/nova-autorole.js";
import { bracketBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autorole",
  alias: ["autorole", "profile", "roleboard", "addpoint", "setrole"],
  category: "group",
  description: "Sistem role otomatis dengan poin per chat dan leaderboard",
  usage: ".autorole on/off/status | .profile @tag | .roleboard | .addpoint @tag jumlah | .setrole @tag role",
  example: ".autorole on\n.profile @user\n.addpoint @user 100\n.setrole @user vip",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

// Daftar role untuk display
function roleList() {
  return Object.entries(ROLES)
    .filter(([k]) => k !== "banned")
    .map(([k, r]) => `${r.emoji} ${r.name}`)
    .join(" → ");
}

// Parse target user dari mention, reply, atau argumen
function getTargetUser(m) {
  if (m.mentionedJid?.length) return m.mentionedJid[0];
  if (m.quoted?.sender) return m.quoted.sender;
  return null;
}

async function handler(m, { sock, conn }) {
  const sockRef = conn || sock;
  const cmd = m.command;
  const groupId = m.chat;
  const isPriv = m.isOwner || m.isAdmin;

  // ===================== .AUTOROLE (toggle) =====================
  if (cmd === "autorole") {
    if (!isPriv) {
      return m.reply(bracketBox("❗", "Akses Ditolak", [
        "Khusus admin grup / owner",
      ]), "autorole");
    }

    const sub = (m.args?.[0] || "").toLowerCase();

    if (sub === "on") {
      toggle(groupId, true);
      return m.reply(bracketBox("✅", "AutoRole", [
        "Auto Role diaktifkan di grup ini",
        "Member dapat 1 poin tiap chat",
        "Role naik otomatis sesuai syarat",
      ]), "autorole");
    }

    if (sub === "off") {
      toggle(groupId, false);
      return m.reply(bracketBox("✅", "AutoRole", [
        "Auto Role dimatikan di grup ini",
      ]), "autorole");
    }

    if (sub === "status" || !sub) {
      const on = isEnabled(groupId);
      return m.reply(bracketBox("i", "AutoRole Status", [
        `Status : ${on ? "🟢 ON" : "🔴 OFF"}`,
        "",
        "Daftar Role:",
        roleList(),
        "🚫 Banned (manual)",
        "",
        "Syarat Naik Role:",
        "⚡ Active : 50 chat + 3 hari + 100 poin",
        "🌟 Star : 200 chat + 7 hari + 500 poin",
        "👑 VIP : 500 chat + 30 hari + 1500 poin",
        "",
        `Ketik: ${m.prefix}autorole on / off`,
      ]), "autorole");
    }
  }

  // ===================== .PROFILE =====================
  if (cmd === "profile") {
    const target = getTargetUser(m) || m.sender;
    const user = getUser(groupId, target);
    const name = target === m.sender
      ? m.pushName
      : target.split("@")[0];
    const lines = formatProfile(user, name, target);
    return m.reply(bracketBox("i", "Profile", lines), "profile");
  }

  // ===================== .ROLEBOARD (leaderboard) =====================
  if (cmd === "roleboard") {
    const top = getLeaderboard(groupId, 10);
    if (!top.length) {
      return m.reply(bracketBox("i", "Top Member", [
        "Belum ada data. Aktifkan: .autorole on",
      ]), "roleboard");
    }
    const lines = top.map((u, i) => {
      const r = ROLES[u.role] || ROLES.new;
      const name = u.jid.split("@")[0];
      return `${i + 1}. ${r.emoji} ${name} — ${u.points} poin`;
    });
    return m.reply(bracketBox("🏆", "Top 10 Member", lines), "roleboard");
  }

  // ===================== .ADDPOINT (admin/owner) =====================
  if (cmd === "addpoint") {
    if (!isPriv) {
      return m.reply(bracketBox("❗", "Akses Ditolak", [
        "Khusus admin grup / owner",
      ]), "addpoint");
    }

    const target = getTargetUser(m);
    if (!target) {
      return m.reply(bracketBox("❗", "AddPoint", [
        "Tag atau reply member yang mau ditambah poinnya",
        "",
        `Contoh: ${m.prefix}addpoint @user 100`,
        `Contoh: ${m.prefix}addpoint @user -50 (kurangi)`,
      ]), "addpoint");
    }

    // Cari angka di args (skip mention text)
    const amountStr = m.args?.find((a) => /^-?\d+$/.test(a));
    if (!amountStr) {
      return m.reply(bracketBox("❗", "AddPoint", [
        "Jumlah poin tidak valid",
        "",
        `Contoh: ${m.prefix}addpoint @user 100`,
      ]), "addpoint");
    }

    const amount = parseInt(amountStr);
    const newTotal = addPoints(groupId, target, amount);
    const r = getRoleInfo(getUser(groupId, target).role) || ROLES.new;

    return m.reply(bracketBox("✅", "AddPoint", [
      `Target : @${target.split("@")[0]}`,
      `Role : ${r.emoji} ${r.name}`,
      `Perubahan : ${amount > 0 ? "+" : ""}${amount} poin`,
      `Total : ${newTotal} poin`,
    ]), "addpoint");
  }

  // ===================== .SETROLE (admin/owner) =====================
  if (cmd === "setrole") {
    if (!isPriv) {
      return m.reply(bracketBox("❗", "Akses Ditolak", [
        "Khusus admin grup / owner",
      ]), "setrole");
    }

    const target = getTargetUser(m);
    if (!target) {
      return m.reply(bracketBox("❗", "SetRole", [
        "Tag atau reply member yang mau diganti rolenya",
        "",
        `Contoh: ${m.prefix}setrole @user vip`,
        "Role: new / active / star / vip / admin / banned",
      ]), "setrole");
    }

    // Cari role di args (skip mention text)
    const roleInput = m.args?.find((a) => !a.startsWith("@") && !/^-?\d+$/.test(a));
    if (!roleInput) {
      return m.reply(bracketBox("❗", "SetRole", [
        "Role tidak valid",
        "",
        "Pilihan: new / active / star / vip / admin / banned",
      ]), "setrole");
    }

    const roleKey = resolveRole(roleInput);
    if (!roleKey) {
      return m.reply(bracketBox("❌", "SetRole", [
        `Role "${roleInput}" tidak dikenal`,
        "",
        "Pilihan: new / active / star / vip / admin / banned",
      ]), "setrole");
    }

    const roleInfo = setManualRole(groupId, target, roleKey);
    return m.reply(bracketBox("✅", "SetRole", [
      `Target : @${target.split("@")[0]}`,
      `Role : ${roleInfo.emoji} ${roleInfo.name}`,
    ]), "setrole");
  }
}

export { pluginConfig as config, handler };
