const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animeepisodes",
    command: ["animeepisodes", "animeeps"],
    endpoint: "episodes",
    title: "🎞️ Daftar Episode",
    desc: "Daftar episode anime (30 per halaman)",
    usage: "<id/slug/link> [halaman]",
    example: "one-piece 2",
    needs: "text",
    main: { type: "id", names: ["id", "slug", "url"], paged: true },
    hint: "Link nonton: .animestream <id episode>"
})
