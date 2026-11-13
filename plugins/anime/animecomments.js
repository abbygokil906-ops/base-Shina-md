const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animecomments",
    command: ["animecomments", "animekomen"],
    endpoint: "comments",
    title: "Komentar Episode",
    desc: "Komentar dari satu episode",
    usage: "<id episode/link> [halaman]",
    example: "one-piece-episode-1",
    needs: "text",
    main: { type: "id", names: ["id", "slug", "episode", "url"], paged: true }
})
