/*
  Helper bersama untuk semua fitur stiker (file ini tidak dimuat sebagai fitur karena diawali "_").
  - API       : alamat dasar API maker (ganti di sini kalau domain API pindah)
  - apiUrl    : bikin URL endpoint + parameter
  - fetchMedia: ambil hasil API (gambar / video / webp; kalau API membalas JSON berisi link, link-nya diikuti)
  - uploadMedia/getMedia: ambil & upload gambar/video dari pesan
  - sendSticker: ubah hasil jadi stiker WhatsApp (+ exif pack) lalu kirim
  - textMaker : pabrik plugin untuk fitur yang cuma butuh teks
*/
const axios = require("axios")
const Webp = require("../../source/Webp.js")

const { ROOT, uploadMedia, getMedia } = require("../../source/ApiKit.js")

const API = `${ROOT}/maker`
const PACK = "Fuyuha Shina MD"
const author = () => global.namaOwner || ""

const apiUrl = (endpoint, params = {}) => `${API}/${endpoint}?${new URLSearchParams(params).toString()}`

function sniff(buf, type) {
    const head = buf.subarray(0, 16)
    if (head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP") return "webp"
    if (head.subarray(4, 8).toString() === "ftyp" || head.subarray(0, 4).toString("hex") === "1a45dfa3") return "video"
    if (head.subarray(0, 3).toString() === "GIF") return "video"
    if (/webp/.test(type)) return "webp"
    if (/video|gif/.test(type)) return "video"
    return "image"
}

async function fetchMedia(url, depth = 0) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
    })
    const type = String(res.headers["content-type"] || "").split(";")[0].toLowerCase()
    const buffer = Buffer.from(res.data)

    if (/json|text/.test(type)) {
        let j = null
        try { j = JSON.parse(buffer.toString()) } catch (_) {}
        const link = j && (typeof j.result === "string" ? j.result : j.result?.url || j.url || j.data?.url)
        if (link && /^https?:\/\//.test(link) && depth < 1) return fetchMedia(link, depth + 1)
        throw new Error(j?.message || j?.error || `API membalas ${res.status}, coba lagi nanti`)
    }
    if (res.status >= 400 || !buffer.length) throw new Error(`API error (${res.status}), coba lagi nanti`)
    return { buffer, kind: sniff(buffer, type) }
}

async function toSticker(buffer, kind) {
    const meta = { packname: PACK, author: author() }
    if (kind === "webp") return Webp.addExif(buffer, meta.packname, meta.author)
    if (kind === "video") return Webp.writeExifVid(buffer, meta)
    return Webp.writeExifImg(buffer, meta)
}

async function sendSticker(sock, m, url) {
    const { buffer, kind } = await fetchMedia(url)
    const webp = await toSticker(buffer, kind)
    return sock.sendMessage(m.chat, { sticker: webp }, { quoted: m })
}

// pabrik plugin: fitur yang cuma butuh teks -> endpoint API -> stiker
function textMaker({ name, command, endpoint, desc, example = "halo", params = {} }) {
    return {
        name, command, desc, usage: "<teks>", example, needs: "text",
        async run({ sock, m, text }) {
            await sendSticker(sock, m, apiUrl(endpoint, { text, ...params }))
        }
    }
}

module.exports = { API, PACK, apiUrl, fetchMedia, sendSticker, uploadMedia, getMedia, textMaker }
