const { pipe, tool } = require("./_lib.js")

module.exports = tool({
    name: "bandingkanhp",
    command: ["bandingkanhp", "bandingkan"],
    endpoint: "bandingkan-hp",
    desc: "Bandingkan spesifikasi 2 HP",
    usage: "<hp1> vs <hp2>",
    example: "iPhone 15 vs Samsung S24",
    needs: "text",
    timeout: 120000,
    params: pipe(["hp1", "hp2"], { sep: /\s*(?:\||\bvs\b)\s*/i })
})
