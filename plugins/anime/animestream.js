const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animestream",
    command: ["animestream", "animenonton"],
    endpoint: "stream",
    title: "▶️ Link Nonton",
    desc: "Link nonton (direct & embed) satu episode",
    usage: "<id episode/link>",
    example: "one-piece-episode-1",
    needs: "text",
    main: { type: "id", names: ["id", "slug", "url"] }
})
