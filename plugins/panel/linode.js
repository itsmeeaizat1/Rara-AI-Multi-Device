// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { registerVps } from '../../src/lib/rara-vps-registry.js'
function randomKarakter(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

function randomNomor(length) {
    const nums = '23456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += nums.charAt(Math.floor(Math.random() * nums.length))
    }
    return result
}

const LINODE_TYPES = {
    'linode2gb': { type: 'g6-standard-1', ram: '2GB', label: '2GB' },
    'linode4gb': { type: 'g6-standard-2', ram: '4GB', label: '4GB' },
    'linode8gb': { type: 'g6-standard-4', ram: '8GB', label: '8GB' },
    'linode16gb': { type: 'g6-standard-8', ram: '16GB', label: '16GB' }
}

const pluginConfig = {
    name: ['linode2gb', 'linode4gb', 'linode8gb', 'linode16gb', 'listlinode', 'onlinode', 'offlinode', 'rebootlinode', 'rebuildlinode', 'delinode', 'saldolinode', 'sisalinode', 'cekvpslinode'],
    alias: ["linode2gb", "linode4gb", "linode8gb", "linode16gb", "listlinode", "onlinode", "offlinode", "rebootlinode", "rebuildlinode", "delinode", "saldolinode", "sisalinode", "cekvpslinode"],
    category: "panel",
    description: 'Linode VPS Management',
    usage: '.linode2gb <label> | .listlinode | .onlinode <id> | dst',
    example: '.linode2gb myserver',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, command, args }) {
    const linodeToken = config.APIkey?.linode
    
    if (!linodeToken) {
        return m.reply( `❌ Linode API Token tidak dikonfigurasi!\n\nTambahkan di config.js:\n\`\`\`\nAPIkey: {\n  linode: 'YOUR_LINODE_TOKEN'\n}\n\`\`\``, "linode2gb")
    }
    
    const cmd = command.toLowerCase()
    
    try {
        await m.react("🕒")
        if (LINODE_TYPES[cmd]) {
            const label = args[0]
            if (!label) {
                return m.reply( raraWrap("linode2gb", `❌ Masukkan label untuk VPS!\n\n💡 *Contoh:* ${m.prefix}${cmd} myserver`), "linode2gb")
            }
            
            const spec = LINODE_TYPES[cmd]
            const rootPass = randomKarakter(5) + randomNomor(3)
            
            const linodeData = {
                label: label,
                region: 'ap-south',
                type: spec.type,
                image: 'linode/ubuntu20.04',
                root_pass: rootPass,
                stackscript_id: null,
                authorized_keys: null,
                backups_enabled: false
            }
            
            
            const createRes = await fetch('https://api.linode.com/v4/linode/instances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                },
                body: JSON.stringify(linodeData)
            })
            
            const createData = await createRes.json()
            
            if (!createRes.ok) {
                throw new Error(createData.errors?.[0]?.reason || 'Gagal membuat Linode')
            }
            
            const linodeId = createData.id
            await new Promise(resolve => setTimeout(resolve, 60000))
            
            const infoRes = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            const linodeInfo = await infoRes.json()
            const ipAddress = linodeInfo.ipv4?.[0] || 'Pending'
            
            const msg = `✅ *Linode ${spec.label} Berhasil Dibuat*\n\n` +
                `🆔 ID: \`${linodeId}\`\n` +
                `🏷️ Label: \`${label}\`\n` +
                `🌐 IP: \`${ipAddress}\`\n` +
                `🔑 Password: \`${rootPass}\`\n` +
                `💾 RAM: ${spec.ram}\n` +
                `📍 Region: ap-south`
            
            await m.react("🐣")
            m.reply(raraWrap("linode", msg), "linode")
            // daftarkan ke registry biar self-service .gantipwvps/.myvps jalan
            try {
                registerVps({ ip: ipAddress, password: rootPass, owner: m.sender, provider: "linode", label })
            } catch (e) { console.error("[linode-registry]", e) }
            return
        }
        
        if (cmd === 'listlinode') {
            
            const res = await fetch('https://api.linode.com/v4/linode/instances', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            const data = await res.json()
            
            if (!res.ok) throw new Error('Gagal mendapatkan daftar Linode')
            
            if (!data.data || data.data.length === 0) {
                return m.reply(raraWrap("linode", `📋 *DaғTar Linode*\n\nTidak ada VPS aktif.`))
            }
            
            let msg = `📋 *DaғTar Linode Vps*\n\n`
            data.data.forEach((l, i) => {
                msg += `*${i + 1}. ${l.label}*\n`
                msg += `ID: \`${l.id}\`\n`
                msg += `IP: \`${l.ipv4?.[0] || '-'}\`\n`
                msg += `Status: ${l.status}\n\n`
            })
            
            await m.react("🐣")
            (msg.trim())
            return
        }
        
        if (cmd === 'onlinode') {
            const linodeId = args[0]
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}onlinode 12345`), "linode2gb")
            
            
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}/boot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            if (res.ok) {
                await m.react("🐣")
                (`✅ Linode ID \`${linodeId}\` berhasil dihidupkan!`)
            } else {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.reason || 'Gagal menghidupkan')
            }
            return
        }
        
        if (cmd === 'offlinode') {
            const linodeId = args[0]
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}offlinode 12345`), "linode2gb")
            
            
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}/shutdown`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            if (res.ok) {
                await m.react("🐣")
                (`✅ Linode ID \`${linodeId}\` berhasil dimatikan!`)
            } else {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.reason || 'Gagal mematikan')
            }
            return
        }
        
        if (cmd === 'rebootlinode') {
            const linodeId = args[0]
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}rebootlinode 12345`), "linode2gb")
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}/reboot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            if (res.ok) {
                await m.react("🐣")
                (`✅ Linode ID \`${linodeId}\` berhasil di-reboot!`)
            } else {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.reason || 'Gagal reboot')
            }
            return
        }
        
        if (cmd === 'rebuildlinode') {
            const linodeId = args[0]
            const image = args[1] || 'linode/ubuntu20.04'
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}rebuildlinode 12345 linode/ubuntu20.04`), "linode2gb")
            
            const rootPass = randomKarakter(4) + randomNomor(3)
            
            
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}/rebuild`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                },
                body: JSON.stringify({
                    image: image,
                    root_pass: rootPass
                })
            })
            
            if (res.ok) {
                await m.react("🐣")
                (`✅ Linode ID \`${linodeId}\` berhasil di-rebuild!\n\n🔑 Password baru: \`${rootPass}\`\n🖼️ Image: ${image}`)
            } else {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.reason || 'Gagal rebuild')
            }
            return
        }
        
        if (cmd === 'delinode') {
            const linodeId = args[0]
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}delinode 12345`), "linode2gb")
            
            
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            if (res.ok) {
                await m.react("🐣")
                (`✅ Linode ID \`${linodeId}\` berhasil dihapus!`)
            } else {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.reason || 'Gagal menghapus')
            }
            return
        }
        
        if (cmd === 'saldolinode') {
            
            const res = await fetch('https://api.linode.com/v4/account', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            const data = await res.json()
            
            if (!res.ok) throw new Error('Gagal mendapatkan saldo')
            
            const balance = (data.koin || 0) / 100
            const credit = (data.credit_remaining || 0) / 100
            
            const msg = `Saldo Akun Linode\n\n` +
                `Balance: $${balance.toFixed(2)}\n` +
                `Credit: $${credit.toFixed(2)}`
            
            await m.reply(raraWrap("linode", msg))
            return
        }
        
        if (cmd === 'sisalinode') {
            const res = await fetch('https://api.linode.com/v4/linode/instances', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            const data = await res.json()
            
            if (!res.ok) throw new Error('Gagal mendapatkan data')
            
            const total = data.data?.length || 0
            await m.react("🐣")
            (raraWrap("linode", `📊 *Total Linode Aktiғ*\n\n${total} VPS`))
            return
        }
        
        if (cmd === 'cekvpslinode') {
            const linodeId = args[0]
            if (!linodeId) return m.reply( raraWrap("linode2gb", `❌ Masukkan ID Linode!\n\n💡 *Contoh:* ${m.prefix}cekvpslinode 12345`), "linode2gb")
            const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${linodeToken}`
                }
            })
            
            const l = await res.json()
            
            if (!res.ok) throw new Error('Gagal mendapatkan detail')
            
            const msg = `Detail Linode\n\n` +
                `ID: \`${l.id}\`\n` +
                `Label: \`${l.label}\`\n` +
                `Status: ${l.status}\n` +
                `Region: ${l.region}\n` +
                `Type: ${l.type}\n` +
                `IP: \`${l.ipv4?.join(', ') || '-'}\``
            
            await m.reply(raraWrap("linode", msg))
            return
        }
        await m.reply(raraWrap("linode", `Linode Commands\n\n` +
            `.linode2gb <label> - Buat VPS 2GB\n` +
            `.linode4gb <label> - Buat VPS 4GB\n` +
            `.linode8gb <label> - Buat VPS 8GB\n` +
            `.linode16gb <label> - Buat VPS 16GB\n` +
            `.listlinode - Daftar VPS\n` +
            `.onlinode <id> - Hidupkan VPS\n` +
            `.offlinode <id> - Matikan VPS\n` +
            `.rebootlinode <id> - Restart VPS\n` +
            `.rebuildlinode <id> <image> - Rebuild\n` +
            `.delinode <id> - Hapus VPS\n` +
            `.saldolinode - Cek saldo\n` +
            `.sisalinode - Total VPS\n` +
            `.cekvpslinode <id> - Detail VPS`))
        
    } catch (err) {
        await m.react("❌")
        m.reply(raraWrap("linode", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }