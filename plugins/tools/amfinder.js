/**

* Kaguya Multi Device — WhatsApp & Tele Bot
*
* Library      : whiskeysockets baileys
* Type         : Plugins | ESM Modules
* Name         : Preset AlightMotion Finder (.amfinder)
*
* Sumber (dicari BERSAMAAN, hasilnya digabung & link kembar dibuang):
*   1. Rin API        - apiii-xrina.my.id/search/amfinder
*   2. Preset Finder  - preset-finder.izzcs.my.id/?cari=<link>
* Tambah/kurangi sumber lewat array ENGINES di bawah.
*
* Penyesuaian  : SeaPRST
* Taruh di     : plugins/tools/amfinder.js
  */

import axios from 'axios'
import sharp from 'sharp'

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'

const RIN_API = 'https://apiii-xrina.my.id/search/amfinder'
const FINDER_API = 'https://preset-finder.izzcs.my.id/'
const MAX_SHOW = 10 // maksimal preset yang ditampilkan di chat

// ===== HELPER =====
function formatNumber(number) {
    const num = Number(number)
    return Number.isFinite(num) ? num.toLocaleString('id-ID') : '0'
}

async function react(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        })
    } catch {}
}

function isValidVideoUrl(url) {
    try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) return false

        return /(^|\.)tiktok\.com$|(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)instagram\.com$/i.test(parsed.hostname)
    } catch {
        return false
    }
}

// ===== MESIN 1: RIN API =====
function normalizeRin(response) {
    if (response?.status !== true || !response?.data) {
        throw new Error(
            response?.message ||
            response?.error ||
            'Rin API tidak menemukan preset.'
        )
    }

    const d = response.data
    const v = d.video || {}
    const stats = v.stats || {}
    const links = Array.isArray(d.presetLinks) ? d.presetLinks : []

    if (!links.length) {
        throw new Error('Rin API tidak menemukan link preset.')
    }

    return {
        source: 'Rin API',
        platform: d.platform || 'video',
        author: d.author || '-',
        username: '',
        title: v.title || '-',
        url: v.url || '',
        cover: v.cover || d.avatar || null,
        views: stats.views ?? 0,
        likes: stats.likes ?? 0,
        comments: stats.comments ?? 0,
        duration: v.duration ?? null,
        links: links.map(item => ({
            label: item.title || item.type || 'Preset',
            url: item.url,
            type: item.type || '',
            size: item.size || '',
            thumb: item.thumb || null
        })).filter(item => item.url)
    }
}

async function rinSearch(url) {
    const { data } = await axios.get(RIN_API, {
        params: { url },
        timeout: 30000,
        headers: { Accept: 'application/json', 'User-Agent': UA }
    })
    return normalizeRin(data)
}

// ===== MESIN 2: PRESET FINDER (izzcs) =====
// Format balasannya belum terdokumentasi, jadi dibaca secara umum: semua link di balasan
// (JSON atau HTML) dikumpulkan, lalu hanya link Alight Motion / file host yang dipakai.
const AM_HOSTS = /(^|\.)(alightcreative\.com|alight\.link|alightmotion\.com)$/i
const FILE_HOSTS = /(^|\.)(drive\.google\.com|docs\.google\.com|mediafire\.com|mega\.nz|dropbox\.com|pastebin\.com|gofile\.io|terabox\.com|sfile\.mobi)$/i

function collectUrls(value, out, depth = 0) {
    if (depth > 8 || value == null) return
    if (typeof value === 'string') {
        for (const found of value.match(/https?:\/\/[^\s"'<>\\)]+/g) || []) out.add(found)
    } else if (Array.isArray(value)) {
        for (const v of value) collectUrls(v, out, depth + 1)
    } else if (typeof value === 'object') {
        for (const v of Object.values(value)) collectUrls(v, out, depth + 1)
    }
}

function pickField(obj, keys) {
    for (const scope of [obj, obj?.data, obj?.result]) {
        if (!scope || typeof scope !== 'object') continue
        for (const key of keys) {
            const val = scope[key]
            if (typeof val === 'string' && val.trim()) return val.trim()
        }
    }
    return ''
}

async function finderSearch(url) {
    const res = await axios.get(FINDER_API, {
        params: { cari: url },
        timeout: 45000,
        responseType: 'text',
        transformResponse: r => r, // jangan di-parse otomatis, bisa JSON atau HTML
        headers: { Accept: 'application/json, text/html;q=0.9, */*;q=0.8', 'User-Agent': UA }
    })

    const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)

    let json = null
    try { json = JSON.parse(raw) } catch {}

    const found = new Set()
    collectUrls(json ?? raw.replace(/&amp;/g, '&'), found)

    const links = []
    const seen = new Set()

    for (let link of found) {
        link = link.replace(/[.,;]+$/, '')
        if (seen.has(link)) continue

        let host
        try { host = new URL(link).hostname } catch { continue }

        const type = AM_HOSTS.test(host) ? '5mb' : FILE_HOSTS.test(host) ? 'xml' : null
        if (!type) continue

        seen.add(link)
        links.push({
            label: type === '5mb' ? '5MB preset' : 'XML file',
            url: link,
            type,
            size: '',
            thumb: null
        })
    }

    if (!links.length) {
        console.log('[AMFIND] Preset Finder: tidak ada link preset. Cuplikan balasan:', raw.slice(0, 300).replace(/\s+/g, ' '))
        throw new Error('Preset Finder tidak menemukan link preset.')
    }

    return {
        source: 'Preset Finder',
        platform: /tiktok\.com/i.test(url) ? 'tiktok' : 'video',
        author: pickField(json, ['author', 'creator', 'username', 'nickname', 'kreator']) || '-',
        username: '',
        title: pickField(json, ['title', 'judul', 'caption', 'desc']) || '-',
        url,
        cover: null,
        views: null, // tidak tersedia
        likes: null,
        comments: null,
        duration: null,
        links
    }
}

// ===== VALIDASI LINK (tolak data palsu / jebakan) =====
// Sumber kadang membalas data tiruan, mis. author "security" dengan link YouTube (rickroll)
// berjudul "AM PRESET VIP". Link Alight Motion asli ada di alightcreative.com / alight.link.
const DECOY_HOSTS = /(^|\.)(youtube\.com|youtu\.be)$/i

function isRealPresetLink(link) {
    try {
        const u = new URL(link.url)
        if (!/^https?:$/.test(u.protocol)) return false
        if (DECOY_HOSTS.test(u.hostname) || /dQw4w9WgXcQ/i.test(link.url)) return false
        // preset 5MB harus link share Alight Motion; XML boleh di Drive/Mediafire/dll
        if (String(link.type || '').toLowerCase() === '5mb' && !AM_HOSTS.test(u.hostname)) return false
        return true
    } catch {
        return false
    }
}

function sanitizeResult(result, engineName) {
    const links = (result.links || []).filter(isRealPresetLink)
    const suspiciousAuthor = /^security$/i.test(String(result.author || '').trim())

    if (suspiciousAuthor || !links.length) {
        throw Object.assign(
            new Error(`${engineName} membalas data yang tampak palsu (bukan link Alight Motion).`),
            { decoy: true }
        )
    }

    if (links.length < (result.links || []).length) {
        console.log(`[AMFIND] ${engineName}: ${result.links.length - links.length} link mencurigakan dibuang`)
    }

    return { ...result, links }
}

// ===== DAFTAR MESIN (dicari BERSAMAAN, hasilnya digabung) =====
const ENGINES = [
    { name: 'Rin API', run: rinSearch },
    { name: 'Preset Finder', run: finderSearch }
]

// kunci pembanding link supaya link yang sama dari dua web tidak tampil dobel
const linkKey = url => String(url).trim().replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase()

const firstFilled = (list, key, empty = ['', '-']) =>
    list.map(r => r[key]).find(v => v !== null && v !== undefined && !empty.includes(v))

async function searchPreset(url) {
    console.log(`[AMFIND] Mencari di ${ENGINES.map(e => e.name).join(' + ')} secara bersamaan...`)

    const settled = await Promise.allSettled(
        ENGINES.map(async engine => sanitizeResult(await engine.run(url), engine.name))
    )

    const results = []
    let decoy = null

    settled.forEach((item, i) => {
        const name = ENGINES[i].name

        if (item.status === 'fulfilled') {
            console.log(`[AMFIND] ${name}: ${item.value.links.length} link`)
            results.push(item.value)
        } else {
            const err = item.reason
            console.error(
                `[AMFIND] ${name} gagal:`,
                err?.response?.status ? `HTTP ${err.response.status}` : err?.message
            )
            if (err?.decoy) decoy = err
        }
    })

    if (!results.length) {
        throw decoy || new Error('Semua sumber gagal mendapatkan preset.')
    }

    // gabungkan link dari semua web, buang yang sama
    const seen = new Set()
    const links = []
    for (const r of results) {
        for (const link of r.links) {
            const key = linkKey(link.url)
            if (seen.has(key)) continue
            seen.add(key)
            links.push(link)
        }
    }

    return {
        source: results.map(r => r.source).join(' + '),
        platform: firstFilled(results, 'platform', ['', 'video']) || results[0].platform,
        author: firstFilled(results, 'author') || '-',
        username: '',
        title: firstFilled(results, 'title') || '-',
        url: firstFilled(results, 'url') || url,
        cover: firstFilled(results, 'cover', ['']) || null,
        views: firstFilled(results, 'views', [null]) ?? null,
        likes: firstFilled(results, 'likes', [null]) ?? null,
        comments: firstFilled(results, 'comments', [null]) ?? null,
        duration: firstFilled(results, 'duration', [null]) ?? null,
        links
    }
}

// ===== THUMBNAIL =====
async function getThumbnail(result, pageUrl) {
    const candidates = []
    const add = url => {
        if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
            candidates.push(url)
        }
    }

    add(result.cover)

    for (const item of result.links || []) {
        add(item.thumb)
    }

    // Ambil thumbnail TikTok jika cover API tidak tersedia
    if (!candidates.length && /tiktok\.com/i.test(pageUrl)) {
        try {
            const { data } = await axios.get(
                'https://www.tiktok.com/oembed',
                {
                    params: { url: pageUrl },
                    timeout: 12000,
                    headers: { 'User-Agent': UA }
                }
            )

            add(data?.thumbnail_url)
        } catch (err) {
            console.error('[AMFIND] oEmbed:', err.message)
        }
    }

    for (const url of [...new Set(candidates)]) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': UA,
                    Accept: 'image/*'
                }
            })

            return await sharp(Buffer.from(response.data))
                .jpeg({ quality: 85 })
                .toBuffer()
        } catch (err) {
            console.error(
                '[AMFIND] Thumbnail gagal:',
                err.response?.status || err.message
            )
        }
    }

    return null
}

// ===== FORMAT HASIL =====
function createResultText(result) {
    const platform = String(result.platform || 'video').toUpperCase()
    const links = result.links || []
    const shown = links.slice(0, MAX_SHOW)
    const hasStats = result.views !== null && result.views !== undefined

    let text =
`*PRESET BERHASIL DITEMUKAN!* 🎬✨

╭┈┈⬡「 *ALIGHT MOTION PRESET* 」
┃ *Platform:* ${platform}
┃ *Creator:* ${result.author || '-'}`

    if (result.title && result.title !== '-') {
        text += `\n┃ *Judul:* ${result.title}`
    }

    if (hasStats) {
        text +=
`\n┃ *Views:* ${formatNumber(result.views)}
┃ *Likes:* ${formatNumber(result.likes)}
┃ *Comments:* ${formatNumber(result.comments)}`
    }

    text += `\n┃ *Sumber:* ${result.source}`

    if (result.duration !== null && result.duration !== undefined) {
        text += `\n┃ *Durasi:* ${result.duration}s`
    }

    text += `\n╰┈┈┈┈┈┈┈┈⬡`

    text += `\n\n╭┈┈⬡「 *DOWNLOAD PRESET* (${links.length}) 」`

    for (const item of shown) {
        text += `\n┃ *${item.label}*`

        if (item.size) {
            text += `\n┃ Ukuran: ${item.size}`
        }

        if (item.type) {
            text += `\n┃ Tipe: ${String(item.type).toUpperCase()}`
        }

        text += `\n┃ ${item.url}`
    }

    if (links.length > shown.length) {
        text += `\n┃ _+${links.length - shown.length} preset lainnya tidak ditampilkan._`
    }

    text += `\n╰┈┈┈┈┈┈┈┈⬡`

    if (result.url) {
        text += `\n\n*Video sumber:*\n${result.url}`
    }

    text += '\n\nSelamat mengedit, semangat berkarya ya~'

    return text
}

// ===== HANDLER =====
const handler = async (m, { sock, text, prefix, reply }) => {
    // link bisa dari teks command, atau dari pesan yang di-reply
    const source = String(text || m.quoted?.text || m.quoted?.body || '').trim()
    const url = (source.match(/https?:\/\/\S+/i) || [])[0]?.replace(/[.,!?]+$/, '') || ''

    if (!url) {
        return reply(
            `*ALIGHT MOTION PRESET FINDER* \n\n` +
            `> Cari preset (5MB & XML) dari video TikTok, YouTube, atau Instagram.\n\n` +
            `> Penggunaan: ${prefix}amfinder <link video>\n` +
            `> Contoh: ${prefix}amfinder https://vt.tiktok.com/ZS6e6k5jF/\n\n` +
            `_Bisa juga reply pesan yang berisi link._`
        )
    }

    if (!isValidVideoUrl(url)) {
        return reply(
            `*Link tidak valid!*\n\n` +
            `Gunakan link video TikTok, YouTube, atau Instagram ya~`
        )
    }

    await react(sock, m, '⏳')

    try {
        const result = await searchPreset(url)
        const resultText = createResultText(result)
        const thumb = await getThumbnail(result, result.url || url)

        if (thumb) {
            try {
                await sock.sendMessage(
                    m.chat,
                    { image: thumb, caption: resultText },
                    { quoted: m }
                )
            } catch (err) {
                console.error('[AMFIND] Gagal mengirim gambar:', err.message)
                await reply(resultText)
            }
        } else {
            await reply(resultText)
        }

        await react(sock, m, '✅')
    } catch (err) {
        console.error('[AMFIND ERROR]', err.message)
        await react(sock, m, '❌')

        if (err.decoy) {
            return reply(
                `⚠️ *Hasil ditolak*\n\n` +
                `${err.message}\n\n` +
                `Coba lagi nanti atau gunakan link video lain ya~`
            )
        }

        return reply(
            `*Preset gagal ditemukan*\n\n` +
            `Rin API dan Preset Finder sama-sama tidak menemukan preset untuk link tersebut.\n\n` +
            `Coba lagi nanti atau gunakan link video lain ya~`
        )
    }
}

handler.help = ['amfinder <link video>']
handler.tags = ['premium']
handler.command = ['amfinder']
handler.premium = true
handler.limit = true
handler.cooldown = 10

export default handler
