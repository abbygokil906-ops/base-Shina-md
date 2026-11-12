const { HTTP, Usage, tool } = require("./_lib.js")

module.exports = tool({
    name: "shortlink2",
    command: ["shortlink2"],
    endpoint: "shortlink2",
    desc: "Perpendek link versi 2 (opsi sekali buka)",
    usage: "<link> [sekali]",
    example: "https://example.com/halaman-panjang sekali",
    needs: "text",
    params: ({ text }) => {
        const args = text.split(/\s+/)
        const url = args.find((a) => HTTP.test(a))
        if (!url) throw new Usage()
        return { url, one_view: args.some((a) => /^(sekali|1x|once|true)$/i.test(a)) }
    }
})
