const { Usage, linkAndRest, tool } = require("./_lib.js")

module.exports = tool({
    name: "img2vid",
    command: ["img2vid"],
    endpoint: "img2vid",
    desc: "Foto jadi video (AI)",
    usage: "<prompt>  (kirim/reply foto)",
    example: "kamera zoom pelan",
    output: "video",
    timeout: 300000,
    params: async (ctx) => {
        const { link, rest } = await linkAndRest(ctx, /image/)
        if (!rest) throw new Usage()
        return { image: link, prompt: rest }
    }
})
