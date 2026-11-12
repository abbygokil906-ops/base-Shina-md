const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animegenres",
    command: ["animegenres", "animegenre"],
    endpoint: "genres",
    title: "🏷️ Genre Anime",
    desc: "Daftar genre beserta ID-nya (untuk filter .animesearch genre=ID)",
    hint: "Pakai ID genre: .animesearch <judul> genre=ID"
})
