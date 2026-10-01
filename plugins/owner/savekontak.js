import { raraWrap } from "../../src/lib/rara-menu-style.js";
// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {
    name: "savekontak",
    alias: ["savekontak"],
    category: "owner",
    description: "Menyimpan kontak dari grup menjadi file VCF",
    usage: ".savekontak <nama>",
    example: ".savekontak Fulan",
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
};

async function handler(m, { sock, args }) {
    if (args[0] === "get") {
        const target = args[1];
        const baseName = args.slice(2).join(" ") || "User";

        const chats = await sock.groupFetchAllParticipating();
        let groups = [];
        if (target === "all") {
            groups = Object.values(chats);
        } else {
            if (chats[target]) {
                groups.push(chats[target]);
            } else {
                return m.reply(raraWrap("savekontak", "❌ Grup tidak ditemukan."));
            }
        }

        if (groups.length === 0) {
            return m.reply(raraWrap("Savekontak", "❌ Bot tidak berada di grup mana pun."));
        }

        

        let vcards = "";
        let count = 0;
        let index = 1;
        const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        const contactArray = [];

        for (const group of groups) {
            for (const participant of group.participants) {
                if (participant.id === botId) continue;

                const number = participant.id.split("@")[0];
                const name = `${baseName} ${index}`;
                const singleVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`;

                vcards += singleVcard + "\n";
                contactArray.push({ vcard: singleVcard });
                count++;
                index++;
            }
        }

        if (count === 0) {
            return m.reply(raraWrap("Savekontak", "❌ Tidak ada kontak yang bisa diekstrak."));
        }

        await sock.sendMessage(m.chat, {
            document: Buffer.from(vcards, "utf8"),
            fileName: `${baseName}_${count}_Kontak.vcf`,
            mimetype: "text/vcard",
            caption: `✅ *Berhasil mengekstrak ${count} kontak ke dalam VCF.*`
        }, { quoted: m });

        await sock.sendMessage(m.chat, {
            contacts: {
                displayName: `${count} Kontak`,
                contacts: contactArray
            }
        }, { quoted: m });

        return;
    }

    const baseName = args.join(" ") || "User";
    const chats = await sock.groupFetchAllParticipating();
    const groupList = Object.values(chats);

    if (groupList.length === 0) {
        return m.reply(raraWrap("Savekontak", "❌ Bot tidak berada di grup mana pun."));
    }

    const sections = [
        {
            title: "Daftar Grup",
            rows: groupList.map(g => ({
                header: "",
                title: g.subject,
                description: `Anggota: ${g.participants?.length || 0}`,
                id: `${m.prefix}savekontak get ${g.id} ${baseName}`
            }))
        }
    ];

    await sock.sendMessage(m.chat, {
        text: `📇 *SISTEM SAVE KONTAK (VCF)*\n\n` +
            `Sistem ekstraksi kontak otomatis dari grup yang diikuti bot.\n` +
            `Nama Base: *${baseName}*\n\n` +
            `*cara pakai:*\n` +
            `*${m.prefix || "."}savekontak <nama>* — Menyimpan dengan nama kustom\n` +
            `*${m.prefix || "."}savekontak* — Menyimpan dengan nama default "User"\n\n` +
            `*alur pakai:*\n` +
            `1. Pilih grup spesifik dari tombol *pilih grup* di bawah, atau klik *semua grup* untuk mengekstrak kontak secara global.\n` +
            `2. Bot akan mengumpulkan nomor peserta dan mengabaikan nomor bot sendiri.\n` +
            `3. Hasil akan dikirim berupa file dokumen (*.vcf*) beserta list kontak WhatsApp agar bisa langsung disave.`,
        footer: "Powered by ReviewBot",
        interactiveButtons: [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "Pilih Grup",
                    sections
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "Semua Grup",
                    id: `${m.prefix}savekontak get all ${baseName}`
                })
            }
        ,
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "Kembali",
              id: m.prefix + "menu"
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "Tanya AI",
              id: m.prefix + "aihelp"
            })
          }
        ]
    }, { quoted: m });
}

export { pluginConfig as config, handler };
