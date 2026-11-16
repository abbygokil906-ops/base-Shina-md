import axios from 'axios'
import * as cheerio from 'cheerio'
import { adapt } from '../../lib/engine/plugins.js'

const BASE_URL = 'https://www.tiktok.com'
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    Accept: 'application/json, text/plain, text/html, */*',
    Referer: 'https://www.tiktok.com/'
}

const formatAngka = (v) => Number(v || 0).toLocaleString('id-ID')
const formatWaktu = (ts) => {
    if (!ts) return '-'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(ts * 1000)) + ' WIB'
}

const extractPresetLinks = (text) => {
    const links = text.match(/https?:\/\/(?:www\.)?(?:alightcreative\.com\/am\/share\/|alight\.link\/)[^\s'"><]+/gi) || []
    const otherLinks = (text.match(/https?:\/\/[^\s'"><]+/gi) || []).filter((l) => !links.includes(l))
    return { links, otherLinks }
}

async function amFind(input) {
    const sumber = input.match(/https?:\/\/[^\s]+/i)?.[0]
    if (!sumber) throw new Error('Link TikTok tidak ditemukan.')
    let tautanAsli = sumber.replace(/[),.!?]+$/, '').trim()

    if (/vt\.tiktok\.com|vm\.tiktok\.com|\/t\//i.test(tautanAsli)) {
        const res = await axios.get(tautanAsli, { headers, maxRedirects: 5, timeout: 30000, validateStatus: () => true })
        tautanAsli = res.request?.res?.responseUrl || res.request?.responseURL || tautanAsli
    }

    const idVT = (tautanAsli.match(/(?:video|photo|v)\/(\d+)/i) || tautanAsli.match(/(\d{15,22})/))?.[1]
    if (!idVT) throw new Error('ID video tidak ditemukan. Pastikan link TikTok valid.')

    let meta = { id: idVT }
    try {
        const res = await axios.get(`${BASE_URL}/@_/video/${idVT}`, { headers, timeout: 20000 })
        const $ = cheerio.load(res.data)
        const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html()
        if (script) {
            const scope = JSON.parse(script)?.__DEFAULT_SCOPE__ || {}
            const v = scope['webapp.video-detail']?.itemInfo?.itemStruct || scope['webapp.reflow.video.detail']?.itemInfo?.itemStruct
            if (v) {
                meta = {
                    id: v.id,
                    desc: v.desc || '',
                    author: { username: v.author?.uniqueId || '', nickname: v.author?.nickname || '', verified: Boolean(v.author?.verified) },
                    stats: { likes: v.stats?.diggCount || 0, comments: v.stats?.commentCount || 0, shares: v.stats?.shareCount || 0, views: v.stats?.playCount || 0 }
                }
            }
        }
    } catch {}

    const ditemukan = new Set()
    const presets = []
    let cursorUtama = 0, scanUtama = 0, scanBalasan = 0, hasMoreUtama = true

    while (hasMoreUtama && scanUtama < 100) {
        const res = await axios.get(`${BASE_URL}/api/comment/list/`, {
            headers, timeout: 20000,
            params: { aid: 1988, app_language: 'id', app_name: 'tiktok_web', aweme_id: idVT, count: 50, cursor: cursorUtama }
        })
        const data = res.data
        const komentar = data?.comments || []
        if (!komentar.length) break

        for (const k of komentar) {
            if (scanUtama >= 100) break
            scanUtama++
            const { links, otherLinks } = extractPresetLinks(k.text || '')
            for (const url of links) {
                if (ditemukan.has(url)) continue
                ditemukan.add(url)
                presets.push({ url, author: `@${k.user?.unique_id || 'unknown'} (${k.user?.nickname || '-'})`, source: 'Komentar Utama', likes: formatAngka(k.digg_count), date: formatWaktu(k.create_time), other_links: otherLinks })
            }

            if (Number(k.reply_comment_total || 0) > 0 && scanBalasan < 300) {
                let cursorBalas = 0, hasMoreBalas = true
                while (hasMoreBalas && scanBalasan < 300) {
                    const rr = await axios.get(`${BASE_URL}/api/comment/list/reply/`, {
                        headers, timeout: 20000,
                        params: { aid: 1988, app_language: 'id', app_name: 'tiktok_web', item_id: idVT, comment_id: k.cid, count: 20, cursor: cursorBalas }
                    })
                    const rd = rr.data
                    const balasan = rd?.comments || []
                    if (!balasan.length) break
                    for (const b of balasan) {
                        if (scanBalasan >= 300) break
                        scanBalasan++
                        const { links: rl, otherLinks: ro } = extractPresetLinks(b.text || '')
                        for (const url of rl) {
                            if (ditemukan.has(url)) continue
                            ditemukan.add(url)
                            presets.push({ url, author: `@${b.user?.unique_id || 'unknown'} (${b.user?.nickname || '-'})`, source: `Balasan ke @${k.user?.unique_id || 'unknown'}`, likes: formatAngka(b.digg_count), date: formatWaktu(b.create_time), other_links: ro })
                        }
                    }
                    hasMoreBalas = Boolean(rd?.has_more)
                    const next = rd?.cursor
                    if (next == null || String(next) === String(cursorBalas)) break
                    cursorBalas = next
                }
            }
        }

        hasMoreUtama = Boolean(data?.has_more)
        const next = data?.cursor
        if (next == null || String(next) === String(cursorUtama)) break
        cursorUtama = next
    }

    return { meta, stats: { main: scanUtama, reply: scanBalasan, total: presets.length }, presets }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let input = String(text || '').trim()
    if (!input && m.quoted?.text) input = String(m.quoted.text).trim()
    if (!input) return m.reply(`*AM FIND*\n\nCari preset Alight Motion di komentar TikTok.\n\nContoh:\n${usedPrefix}${command} https://vt.tiktok.com/ZSbHnpaX6/`)

    await m.reply('⏳ Lagi nyari preset Alight Motion di komentar...')

    let r
    try {
        r = await amFind(input)
    } catch (e) {
        throw `Gagal: ${e?.response?.data?.status_msg || e?.message || 'Terjadi kesalahan saat mengambil data TikTok.'}`
    }

    const { meta, stats, presets } = r
    let out = `*─── [ AM FIND ] ───*\n\n`
    out += `*VIDEO INFO*\n`
    out += `• ID: ${meta.id || '-'}\n`
    out += `• Author: ${meta.author?.nickname || '-'} (@${meta.author?.username || '-'})\n`
    out += `• Views: ${formatAngka(meta.stats?.views)}\n`
    out += `• Likes: ${formatAngka(meta.stats?.likes)}\n`
    out += `• Komentar: ${formatAngka(meta.stats?.comments)}\n`
    out += `• Shares: ${formatAngka(meta.stats?.shares)}\n\n`
    out += `*SCAN STATS*\n`
    out += `• Komentar utama: ${stats.main}\n`
    out += `• Balasan discan: ${stats.reply}\n`
    out += `• Total preset: ${stats.total}\n\n`

    if (!presets.length) {
        out += 'Preset Alight Motion tidak ditemukan pada komentar yang berhasil discan.'
    } else {
        out += `*DAFTAR PRESET*\n\n`
        presets.forEach((p, i) => {
            out += `${i + 1}. ${p.url}\n   • Author: ${p.author}\n   • Sumber: ${p.source}\n   • Likes: ${p.likes}\n   • Tanggal: ${p.date}\n`
            if (p.other_links?.length) out += `   • Link lain: ${p.other_links.join(', ')}\n`
            out += '\n'
        })
    }
    out += `_Scraper by JH a.k.a Dhika_`
    return m.reply(out.trim())
}

handler.help = ['amfind <link tiktok>']
handler.tags = ['premium']
handler.command = ['amfind2', 'caripreset']
handler.premium = true
handler.limit = true
handler.exp = 0

export default adapt(handler, { category: 'premium' })
