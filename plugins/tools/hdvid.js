const { linkAndRest, tool } = require("./_lib.js")

module.exports = tool({
    name: "hdvid",
    command: ["hdvid", "hdcinematic", "hd2x", "hd4x"],
    endpoint: "hdvid",
    desc: "Perjelas video (cinematic / hd2x / hd4x)",
    usage: "[cinematic|hd2x|hd4x]  (kirim/reply video) atau <link video>",
    example: "hd4x",
    output: "video",
    timeout: 300000,
    params: async (ctx) => {
        const MODES = ["cinematic", "hd2x", "hd4x"]
        const ALIAS = { hdcinematic: "cinematic", hd2x: "hd2x", hd4x: "hd4x" }
        const mode = ALIAS[ctx.command] || ctx.args.find((a) => MODES.includes(a.toLowerCase()))?.toLowerCase() || "hd2x"
        const args = ctx.args.filter((a) => a.toLowerCase() !== mode)
        const { link } = await linkAndRest({ ...ctx, args, text: args.join(" ") }, /video/)
        return { url: link, mode }
    }
})
