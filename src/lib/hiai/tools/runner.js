// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// FIX 2 Okt 2026 (gap porting .hiai): prompt.txt engine nyuruh AI pakai tool
// run_plugin / list_plugins / read_plugin_guide / check_plugin_risk / run_eval
// — di HIROBOT tool-nya lahir dari registry utils/plugins.js yang gak pernah
// ke-port ke Rara, jadi 5 tool ini GAK PERNAH ada (prompt nunjuk tool hantu).
// File ini definisikan kelima-limanya di atas registry resmi Rara
// (src/lib/rara-plugins.js) + executor pipeline messageHandler (pola .agent).
import { ctx, execPluginCommand, execEval, resolvePlugin, classifyPluginRisk, pluginAccessLevel, accessLabel, pluginRequirements } from '../mcp.js';

export default [
{
    name: 'run_plugin',
    description: 'Jalankan command/fitur bot yang ada (tanpa titik) — mis. run_plugin("sticker"), run_plugin("brat", "teks"), run_plugin("menu"), run_plugin("owner"), run_plugin("gitpush", "pesan commit"). Command dijalankan lewat pipeline penuh bot ATAS NAMA user yang sedang chat (gate/cooldown/energi tetap aktif, hasil dikirim plugin langsung ke chat). JANGAN pakai untuk download media (pakai download_media), meneruskan media ke chat lain (pakai forward_media), atau menjalankan fitur AI agent lain.',
    parameters: {
        command: { type: 'string', description: 'Nama command tanpa titik, mis. "sticker", "menu", "owner", "brat", "gitpush"', required: true },
        args: { type: 'string', description: 'Argumen command (opsional), mis. teks untuk brat, nomor untuk add, nama file', required: false },
        confirmed: { type: 'boolean', description: 'Set true kalau user/owner sudah eksplisit menyetujui menjalankan command yang sebelumnya minta konfirmasi', required: false }
    },
    execute: async ({ command, args, confirmed } = {}) => {
        if (!ctx().conn || !ctx().currentJid) return 'WA connection not ready'
        try {
            const res = await execPluginCommand(String(command || ''), String(args || ''), { confirmed: !!confirmed })
            return `Command .${command} dijalankan${args ? ` dengan argumen "${args}"` : ''} — hasilnya dikirim plugin langsung ke chat.${res?.pluginName ? ` (plugin: ${res.pluginName})` : ''}`
        } catch (e) {
            return `Gagal menjalankan .${command}: ${e.message}`
        }
    }
},
{
    name: 'list_plugins',
    description: 'Daftar command/fitur bot yang tersedia (nama command, kategori, deskripsi singkat) — pakai kalau user nanya "bot bisa apa", mau kasih rekomendasi fitur, atau ragu nama command sebelum run_plugin.',
    parameters: {
        category: { type: 'string', description: 'Filter per kategori (opsional): download, tools, group, owner, ai, game, search, nsfw, dll. Kosongkan untuk semua.', required: false }
    },
    execute: async ({ category } = {}) => {
        const { getAllPlugins } = await import('../../rara-plugins.js')
        const all = getAllPlugins() || []
        const seen = new Set()
        const rows = []
        for (const p of all) {
            const cfg = p?.config
            if (!cfg?.name) continue
            const key = String(cfg.name).toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            if (category && String(cfg.category || '').toLowerCase() !== String(category).toLowerCase()) continue
            rows.push(`.${cfg.name} — ${cfg.category || '-'}: ${String(cfg.description || '').slice(0, 60)}`)
        }
        if (!rows.length) return 'Tidak ada plugin' + (category ? ` di kategori "${category}"` : '') + '.'
        return `Total ${rows.length} command${category ? ` (kategori ${category})` : ''}:\n` + rows.slice(0, 250).join('\n') + (rows.length > 250 ? `\n(...${rows.length - 250} lagi, pakai filter category)` : '')
    }
},
{
    name: 'read_plugin_guide',
    description: 'Lihat panduan pemakaian satu command: alias, kategori, deskripsi, usage, dan contoh — pakai kalau perlu tahu cara manggil command tertentu sebelum run_plugin.',
    parameters: {
        command: { type: 'string', description: 'Nama command tanpa titik', required: true }
    },
    execute: async ({ command } = {}) => {
        const { getPluginInfo } = await import('../../rara-plugins.js')
        const info = getPluginInfo(String(command || '').toLowerCase().trim())
        if (!info) return `Command "${command}" tidak ditemukan. Panggil list_plugins untuk lihat daftar command.`
        const alias = (info.alias || []).filter(a => a && a !== info.name)
        return [
            `Command: .${info.name}`,
            alias.length ? `Alias: ${alias.map(a => '.' + a).join(', ')}` : '',
            `Kategori: ${info.category} · Akses: ${info.isOwner ? 'owner-only' : info.isPremium ? 'premium-only' : 'semua user'}`,
            `Deskripsi: ${info.description}`,
            `Pemakaian: ${info.usage || '-'}`,
            `Contoh: ${info.example || '-'}`
        ].filter(Boolean).join('\n')
    }
},
{
    name: 'check_plugin_risk',
    description: 'Cek level risiko + syarat akses sebuah command SEBELUM run_plugin: blocked (gak boleh lewat AI), high (butuh persetujuan owner), medium (butuh persetujuan user), low (bebas), plus syarat grup/DM/premium/admin.',
    parameters: {
        command: { type: 'string', description: 'Nama command tanpa titik', required: true }
    },
    execute: async ({ command } = {}) => {
        const { pluginName, plugin } = await resolvePlugin(String(command || ''))
        if (!plugin) return `Command "${command}" tidak ditemukan.`
        const risk = classifyPluginRisk(pluginName, plugin)
        const reqs = pluginRequirements(plugin)
        const syarat = [
            reqs.group && 'khusus grup', reqs.private && 'khusus DM',
            reqs.premium && 'premium-only', reqs.admin && 'admin grup',
            reqs.botAdmin && 'bot harus admin grup'
        ].filter(Boolean)
        return `Command .${command}: risiko ${risk.level.toUpperCase()} (${risk.reason}) · akses ${accessLabel(pluginAccessLevel(plugin))}${syarat.length ? ' · syarat: ' + syarat.join(', ') : ''}`
    }
},
{
    name: 'run_eval',
    description: 'Jalankan kode JavaScript eval di runtime bot (khusus REAL OWNER bot — fitur .eval). Gunakan CUMA kalau real owner eksplisit minta evaluasi kode; output dibalikin ke kamu untuk disampaikan ke owner.',
    parameters: {
        code: { type: 'string', description: 'Kode JavaScript yang mau dievaluasi', required: true }
    },
    execute: async ({ code } = {}) => {
        try {
            const res = await execEval(String(code || ''))
            return `Eval selesai.${res?.output ? ' Output:\n' + res.output : ''}`
        } catch (e) {
            return `Eval gagal: ${e.message}`
        }
    }
}
];
