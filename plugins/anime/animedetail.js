const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animedetail",
    command: ["animedetail", "animeinfo"],
    endpoint: "detail",
    title: "📺 Detail Anime",
    desc: "Detail anime + season, episode terbaru, trailer",
    usage: "<id/slug/link>",
    example: "one-piece",
    needs: "text",
    main: { type: "id", names: ["id", "slug", "url"] },
    hint: "Daftar episode: .animeepisodes <id>",
    poster: true
})
