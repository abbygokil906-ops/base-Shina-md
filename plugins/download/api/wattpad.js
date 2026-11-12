const { tool, PARAM, Usage, HTTP } = require("./_lib.js")

module.exports = tool({
    name: "wattpad",
    command: ["wattpad", "wpdl"],
    endpoint: "wattpad",
    desc: "Download cerita Wattpad jadi EPUB / PDF",
    usage: "<link cerita> [epub|pdf]",
    example: "https://www.wattpad.com/story/123-judul pdf",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: ({ text }) => {
        const u = text.split(/\s+/).find((a) => HTTP.test(a))
        if (!u) throw new Usage()
        const f = /\bpdf\b/i.test(text.replace(u, "")) ? "pdf" : "epub"
        return { [PARAM.url]: u, [PARAM.format]: f, type: f }
    }
})
