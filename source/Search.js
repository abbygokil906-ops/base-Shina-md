/*
  Search — kategori "Search" (cari lagu, lirik, resep, stiker, gambar, komentar, dll lewat API).
  SEMUA fitur kategori ini ada di SATU file ini (daftar FITUR di bawah), jadi kalau mau update cukup timpa file ini.
  Endpoint API otomatis /search/<endpoint> (domain diatur di source/ApiKit.js).
  Format plugin & cara kerja loader: source/PluginLoader.js, mesin API: source/ApiTool.js.

  Tambah fitur baru: tambahkan satu entri di FITUR (pakai tool({...})), lalu daftarkan command-nya di source/MenuData.js (kategori Search).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const { createLoader, Usage } = require("./PluginLoader.js")
const { createKit } = require("./ApiTool.js")

const { tool, call, one, urlArg, HTTP } = createKit("search")

// ambil semua link gambar dari hasil API (untuk .pinterest)
function collectImages(v, out = new Set(), d = 0) {
    if (out.size >= 60 || d > 5 || v == null) return out
    if (typeof v === "string") {
        const u = v.trim()
        if (HTTP.test(u) && (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) || /pinimg\.com/i.test(u))) out.add(u)
        return out
    }
    if (typeof v === "object") for (const x of Array.isArray(v) ? v : Object.values(v)) collectImages(x, out, d + 1)
    return out
}

const FITUR = [
    tool({
        name: "pinterest",
        command: ["pinterest", "pin"],
        endpoint: "pinterest",
        desc: "Cari gambar Pinterest",
        usage: "<kata kunci>|<jumlah 1-10>",
        example: "kucing lucu|5",
        needs: "text",
        params: ({ text }) => {
            const [q, n] = text.split("|").map((s) => s.trim())
            if (!q) throw new Usage()
            return { q, limit: 30 }
        }
    }),
    tool({
        name: "lirik",
        command: ["lirik", "lyrics", "lyric"],
        endpoint: "lyrics",
        desc: "Cari lirik lagu",
        usage: "<judul lagu>",
        example: "lathi weird genius",
        needs: "text",
        params: one("q")
    }),
    tool({
        name: "spotifysearch",
        command: ["spotifysearch", "spotify", "spsearch"],
        endpoint: "spotify",
        desc: "Cari lagu di Spotify",
        usage: "<judul / artis>",
        example: "yovie widianto",
        needs: "text",
        params: one("query")
    }),
    tool({
        name: "resep",
        command: ["resep", "cariresep"],
        endpoint: "resep",
        desc: "Cari resep masakan",
        usage: "<nama masakan>",
        example: "nasi goreng",
        needs: "text",
        params: one("q")
    }),
    tool({
        name: "githubsearch",
        command: ["githubsearch", "ghsearch", "githubsrch"],
        endpoint: "github-srch",
        desc: "Cari repository GitHub",
        usage: "<kata kunci>",
        example: "bot whatsapp",
        needs: "text",
        params: one("q")
    }),
    tool({
        name: "ccsearch",
        command: ["ccsearch", "capcutsearch"],
        endpoint: "cc-search",
        desc: "Cari template CapCut",
        usage: "<kata kunci>",
        example: "jedag jedug",
        needs: "text",
        params: one("q")
    }),
    tool({
        name: "capcutcomment",
        command: ["capcutcomment", "cccomment"],
        endpoint: "capcut-comment",
        desc: "Ambil komentar template CapCut",
        usage: "<link template capcut>",
        example: "https://www.capcut.com/...",
        needs: "text",
        params: urlArg("url")
    }),
    tool({
        name: "ytcomment",
        command: ["ytcomment", "ytkomen"],
        endpoint: "yt-comment",
        desc: "Ambil komentar video YouTube",
        usage: "<link youtube>",
        example: "https://youtu.be/xxxx",
        needs: "text",
        params: urlArg("url")
    }),
    tool({
        name: "amfinder",
        command: ["amfinder"],
        endpoint: "amfinder",
        desc: "AM Finder (cari dari link)",
        usage: "<link>",
        example: "https://...",
        needs: "text",
        params: urlArg("url")
    }),
    tool({
        name: "telegramsticker",
        command: ["telegramsticker", "stickertele", "stikertele"],
        endpoint: "sticker-telegram",
        desc: "Cari paket stiker Telegram",
        usage: "<kata kunci>",
        example: "kucing",
        needs: "text",
        params: one("keyword")
    }),
    tool({
        name: "stickerly",
        command: ["stickerly", "stikerly"],
        endpoint: "stickerly",
        desc: "Cari paket stiker Sticker.ly",
        usage: "<kata kunci>",
        example: "anime",
        needs: "text",
        params: one("q")
    }),
    // .ttsearch sudah dipakai fitur TikTok lama di fuyuha.js, jadi versi API ini pakai nama lain
    tool({
        name: "tiktoksearch",
        command: ["tiktoksearch", "ttsearch2"],
        endpoint: "ttsearch",
        desc: "Cari video TikTok (via API)",
        usage: "<kata kunci>",
        example: "edit viral",
        needs: "text",
        params: one("q")
    })
]

// .pinterest: kirim beberapa gambar langsung (bukan daftar link)
const pin = FITUR[0]
pin.run = async ({ sock, m, text }) => {
    const [q, n] = text.split("|").map((s) => s.trim())
    if (!q) throw new Usage()
    const jumlah = Math.min(10, Math.max(1, parseInt(n) || 5))
    const res = await call("pinterest", { q, limit: 30 }, 60000, "search")
    if (res.buffer) throw new Error("Hasil tidak dikenali")
    const imgs = [...collectImages(res.json)].slice(0, jumlah)
    if (!imgs.length) throw new Error("Gambar tidak ditemukan, coba kata kunci lain")
    for (let i = 0; i < imgs.length; i++) {
        await sock.sendMessage(m.chat, { image: { url: imgs[i] }, caption: i === 0 ? `📌 *Pinterest:* ${q}\n🖼️ ${imgs.length} gambar` : "" }, { quoted: m }).catch(() => {})
    }
}

module.exports = createLoader({ label: "Search", items: FITUR, failText: "Pencarian gagal" })
