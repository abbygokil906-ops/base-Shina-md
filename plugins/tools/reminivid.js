const { linkAndRest, tool } = require("./_lib.js")

module.exports = tool({
    name: "reminivid",
    command: ["reminivid", "reminivideo"],
    endpoint: "reminivid",
    desc: "Perjelas & pertajam video ala Remini",
    usage: "(kirim/reply video) atau <link video>",
    example: "https://example.com/video.mp4",
    output: "video",
    timeout: 300000,
    params: async (ctx) => {
        const { link } = await linkAndRest(ctx, /video/)
        return { url: link }
    }
})
