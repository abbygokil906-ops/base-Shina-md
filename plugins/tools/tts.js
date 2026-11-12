const { Usage, tool } = require("./_lib.js")

module.exports = tool({
    name: "tts",
    command: ["tts", "ttsmiku", "ttsmickey"],
    endpoint: "tts",
    desc: "Teks jadi suara (miku / mickey)",
    usage: "[miku|mickey] <teks>",
    example: "miku halo semuanya",
    needs: "text",
    output: "audio",
    timeout: 120000,
    params: ({ text, command }) => {
        const MODELS = { miku: "miku", mickey: "mickey_mouse", mickey_mouse: "mickey_mouse" }
        const [first, ...rest] = text.split(/\s+/)
        let model = { ttsmiku: "miku", ttsmickey: "mickey_mouse" }[command]
        let body = text
        if (!model && MODELS[first.toLowerCase()]) { model = MODELS[first.toLowerCase()]; body = rest.join(" ") }
        if (!body.trim()) throw new Usage()
        return { text: body.trim(), model: model || "miku" }
    }
})
