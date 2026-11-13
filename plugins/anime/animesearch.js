const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animesearch",
    command: ["animesearch", "animecari"],
    endpoint: "search",
    title: "Cari Anime",
    desc: "Cari / jelajahi katalog anime (60 judul per halaman)",
    usage: "<judul> [page=2] [genre=ID] [key=value]",
    example: "naruto",
    needs: "text",
    main: { type: "text", names: ["q", "query", "keyword", "search"] },
    hint: "Detail anime: .animedetail <id>  •  Halaman lain: tambah page=2"
})
