const { Usage, linkAndRest, tool } = require("./_lib.js")

module.exports = tool({
    name: "img2vid2",
    command: ["img2vid2"],
    endpoint: "img2vid-v2",
    desc: "Foto jadi video (AI) versi 2",
    usage: "<prompt>  (kirim/reply foto)",
    example: "rambut tertiup angin",
    output: "video",
    timeout: 300000,
    params: async (ctx) => {
        const { link, rest } = await linkAndRest(ctx, /image/)
        if (!rest) throw new Usage()
        return { image: link, prompt: rest }
    }
})
