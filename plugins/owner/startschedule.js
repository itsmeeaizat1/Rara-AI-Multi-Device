// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { startSchedulerByName, getFullSchedulerStatus } from '../../src/lib/nova-scheduler.js'
import { initSholatScheduler } from '../../src/lib/nova-sholat-scheduler.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'startschedule',
    alias: ['startscheduler', 'schedstart', 'resumeschedule'],
    category: 'owner',
    description: 'Memulai ulang scheduler tertentu atau semua',
    usage: '.startschedule <nama|all>',
    example: '.startschedule sholat',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock, args }) {
    try {
        const target = args[0]?.toLowerCase();
        
        if (!target) {
            const helpText = `▶️ *sTart sCheduler*

*Usage:*
\`.startschedule <nama>\`

*Available schedulers:*
  \`limitreset\` - Daily Limit Reset
  \`groupschedule\` - Group Schedule
  \`sewa\` - Sewa Checker
  \`messages\` - Scheduled Messages
  \`sholat\` - Sholat Scheduler
  \`all\` - Semua scheduler

*Example:*
\`.startschedule sholat\`
\`.startschedule all\``;
            
            await m.reply( helpText, "startschedule");
            return;
        }
        
        if (target === 'sholat') {
            const db = getDatabase();
            const wasEnabled = db.setting('autoSholat');
            
            if (wasEnabled) {
                await m.reply(claraWrap("Startschedule", `ℹ️ Sholat Scheduler sudah dalam keadaan aktif`));
                return;
            }
            
            initSholatScheduler(sock);
            db.setting('autoSholat', true);
            
            await m.reply(claraWrap("Startschedule", `▶️ *sCheduler Dimulai*

  ┊  ➶ Scheduler: *Sholat Scheduler*
  ┊  ➶ Status: ✅ Aktif

_Notifikasi waktu sholat akan dikirim ke grup yang mengaktifkan fitur ini_`));
            return;
        }
        
        if (target === 'all') {
            initSholatScheduler(sock);
            const db = getDatabase();
            db.setting('autoSholat', true);
        }
        
        const result = startSchedulerByName(target, sock);
        
        if (result.started) {
            await m.reply(claraWrap("Startschedule", `▶️ *sCheduler Dimulai*

  ┊  ➶ Scheduler: *${result.name}*
  ┊  ➶ Status: ✅ Aktif

_Scheduler telah dimulai kembali_`));
        } else {
            { const __navText = `❌ Scheduler tidak ditemukan atau sudah aktif

Gunakan \`.startschedule\` untuk melihat daftar scheduler`; await m.reply(__navText); };
        }
    } catch (error) {
        console.error('[StartSchedule Error]', error);
        await m.reply(claraWrap("startschedule", te(m.prefix, m.command, m.pushName), "error"));
    }
}

export { pluginConfig as config, handler }