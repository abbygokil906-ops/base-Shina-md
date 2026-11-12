const { Usage, linkAndRest, tool } = require("./_lib.js")

module.exports = tool({
    name: "convert",
    command: ["convert"],
    endpoint: "convert",
    desc: "Ubah format file media",
    usage: "<format>  (kirim/reply media) atau <link> <format>",
    example: "jpg",
    output: "auto",
    timeout: 180000,
    params: async (ctx) => {
        const { link, rest } = await linkAndRest(ctx, /image|video|audio|application/)
        const format = rest.split(/\s+/)[0].replace(/^\./, "").toLowerCase()
        if (!format) throw new Usage()
        return { url: link, format }
    }
})
