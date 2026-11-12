/*
  Terminal — tampilan konsol Fuyuha Shina MD: banner pink-putih beranimasi, spinner, prompt nomor,
  efek kode pairing, dan layar "tersambung".

  - Tanpa dependency baru (ANSI truecolor langsung)
  - Otomatis jadi teks biasa kalau konsol bukan TTY / NO_COLOR diset
  - Matikan animasi saja: FUYUHA_ANIM=0
*/
const readline = require("readline")

const ESC = "\x1b["
const COLOR = !process.env.NO_COLOR && !!(process.stdout.isTTY || process.env.FORCE_COLOR)
const ANIM = COLOR && process.env.FUYUHA_ANIM !== "0"
const out = (s) => process.stdout.write(s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const RST = COLOR ? `${ESC}0m` : ""
const BOLD = COLOR ? `${ESC}1m` : ""
const HIDE = ANIM ? `${ESC}?25l` : ""
const SHOW = ANIM ? `${ESC}?25h` : ""
const rgb = (r, g, b) => (COLOR ? `${ESC}38;2;${Math.round(r)};${Math.round(g)};${Math.round(b)}m` : "")
const DIM = rgb(205, 150, 180)      // pink pudar (teks sekunder)
const WHITE = rgb(255, 255, 255)
const PINKC = rgb(255, 105, 180)    // hot pink
const GREEN = rgb(150, 255, 200)    // mint lembut
const RED = rgb(255, 110, 135)
const YELLOW = rgb(255, 230, 160)

process.on("exit", () => { if (ANIM) process.stdout.write(`${ESC}?25h`) })

// ----- warna -----
// gradasi pink -> putih yang bergeser mengikuti frame f
const PINK = [255, 95, 170], SOFT = [255, 255, 255]
const lerp = (a, b, t) => a + (b - a) * t
function grad(x, f, k = 1) {
    const t = 0.5 + 0.5 * Math.sin(x * 0.22 - f * 0.3)
    return rgb(lerp(PINK[0], SOFT[0], t) * k, lerp(PINK[1], SOFT[1], t) * k, lerp(PINK[2], SOFT[2], t) * k)
}
const gtext = (str, f = 0, bold = false) => [...str].map((ch, i) => (ch === " " ? ch : grad(i, f) + (bold ? BOLD : "") + ch)).join("") + RST

// lebar total ±34 kolom -> muat di layar HP (mode portrait)
let VERSION = "1.7"
try { VERSION = String(require("../package.json").version).replace(/\.0$/, "") } catch {}
const BW = 33
const centerTo = (str, w) => { const p = Math.max(0, w - [...str].length), l = Math.floor(p / 2); return " ".repeat(l) + str }
const SPARK = ["✦", "✧", "⋆", "˖", "✧", "✦"]

function bannerLines() {
    return [
        "ARSHI",
        "SUKA",
        "HOSHINO"
    ]
}
// baris hiasan yang berkedip (bintang bergantian tiap frame)
function sparkLine(f) {
    let t = ""
    for (let i = 0; i < BW; i++) {
        t += i % 4 === 2 ? grad(i, f) + SPARK[(Math.floor(i / 4) + f) % SPARK.length] : " "
    }
    return " " + t + RST
}
function subLine(f) {
    const txt = centerTo(`♡ ─── M D · v${VERSION} ─── ♡`, BW)
    return " " + [...txt].map((ch, i) => (ch === " " ? ch : grad(i, f) + BOLD + ch)).join("") + RST
}

function frameOf(lines, f, reveal) {
    const body = lines.map((l) => {
        let s = " "
        for (let x = 0; x < l.length; x++) {
            const ch = l[x]
            if (ch === " " || x > reveal) { s += " "; continue }
            if (reveal - x < 2 && reveal < l.length) { s += WHITE + BOLD + ch; continue } // ujung sapuan menyala putih
            s += grad(x, f) + BOLD + ch
        }
        return s + RST
    })
    const done = reveal >= BW
    return [sparkLine(f), ...body, done ? subLine(f) : "", sparkLine(f + 3)]
}

// kotak yang digambar ulang di tempat yang sama (tiap frame menimpa frame sebelumnya)
function redrawer() {
    let h = 0
    return (lines) => {
        if (h) out(`${ESC}${h}A`)
        out(lines.map((l) => `\r${ESC}2K${l}`).join("\n") + "\n")
        h = lines.length
    }
}

async function banner({ quick = false } = {}) {
    const lines = bannerLines()
    const W = BW
    if (!ANIM) { out("\n" + [" ".repeat(0) + "  ✦   ✧   ✦   ✧   ✦", ...lines.map((l) => " " + l), " " + centerTo(`♡ ─── M D · v${VERSION} ─── ♡`, BW)].join("\n") + "\n"); return }
    const draw = redrawer()
    out("\n" + HIDE)
    let f = 0
    for (let r = 0; r <= W + 4; r += 2) { draw(frameOf(lines, f++, r)); await sleep(30) }
    for (let i = 0; i < (quick ? 8 : 24); i++) { draw(frameOf(lines, f++, W + 6)); await sleep(50) }
    out(SHOW)
}

async function typeLine(str, { delay = 9, indent = "  ", prefix = "" } = {}) {
    if (!ANIM) { out(indent + prefix + str + "\n"); return }
    out(indent + prefix)
    for (let i = 0; i < str.length; i++) {
        out(str[i] === " " ? " " : grad(i, 0) + str[i] + RST)
        await sleep(delay)
    }
    out("\n")
}

let introDone = false
async function intro() {
    if (introDone) return
    introDone = true
    await banner()
    await typeLine("Warung ♡ Nokos ♡ Panel ♡ Script", { delay: 9, indent: " " })
    out(` ${gtext("✦ ─────────── ♡ ─────────── ✦", 0)}\n`)
}

// ----- spinner -----
let active = null
function spinner(text) {
    stopSpinner()
    if (!ANIM) {
        out(` … ${text}\n`)
        return { stop: (m) => m && out(`  ✔ ${m}\n`), fail: (m) => m && out(`  ✖ ${m}\n`) }
    }
    const fr = ["♡", "♡", "♥", "♥"]
    let i = 0
    out(HIDE)
    const t = setInterval(() => {
        out(`\r${ESC}2K ${grad(i * 5, i)}${BOLD}${fr[i % fr.length]}${RST} ${gtext(text, i)}${DIM}${".".repeat(i % 4)}${RST}`)
        i++
    }, 80)
    const end = (sym, color, msg) => {
        clearInterval(t)
        out(`\r${ESC}2K`)
        if (msg) out(` ${color}${BOLD}${sym}${RST} ${msg}\n`)
        out(SHOW)
        if (active === obj) active = null
    }
    const obj = { stop: (m) => end("✔", GREEN, m), fail: (m) => end("✖", RED, m) }
    active = obj
    return obj
}
const stopSpinner = () => { if (active) active.stop() }

// ----- prompt nomor -----
async function askNumber() {
    out("\n")
    await typeLine("SILAKAN MASUKKAN NOMOR", { delay: 14, indent: " ", prefix: `${PINKC}♡${RST} ` })
    out(` ${PINKC}♡${RST} ${DIM}Contoh: ${RST}${WHITE}628123456789${RST}\n\n`)
    for (;;) {
        const ans = await new Promise((res) => {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
            rl.question(` ${PINKC}${BOLD}♡${RST} `, (a) => { rl.close(); res(a) })
        })
        let n = String(ans).replace(/\D/g, "")
        if (n.startsWith("0")) n = "62" + n.slice(1)
        if (n.length >= 9 && n.length <= 15) return n
        out(`  ${RED}✖ Nomor tidak valid, coba lagi.${RST}\n`)
    }
}

// ----- kode pairing -----
async function showCode(raw) {
    const code = String(raw).replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    const fmt = code.length === 8 ? code.slice(0, 4) + "-" + code.slice(4) : code
    const inner = 26
    const center = (s) => { const p = Math.max(0, inner - s.length), l = Math.floor(p / 2); return " ".repeat(l) + s + " ".repeat(p - l) }
    const spaced = (c) => [...c].join(" ")
    const box = (c, f) => [
        ` ${gtext("╭" + "─".repeat(inner) + "╮", f)}`,
        ` ${gtext("│", f)}${gtext(center("♡ KODE PAIRING ANDA ♡"), f, true)}${gtext("│", f)}`,
        ` ${gtext("│", f)}${" ".repeat(inner)}${gtext("│", f)}`,
        ` ${gtext("│", f)}${gtext(center(spaced(c)), f + 4, true)}${gtext("│", f)}`,
        ` ${gtext("│", f)}${" ".repeat(inner)}${gtext("│", f)}`,
        ` ${gtext("╰" + "─".repeat(inner) + "╯", f)}`
    ]
    out("\n")
    if (!ANIM) {
        out(box(fmt, 0).join("\n") + "\n")
    } else {
        const draw = redrawer()
        const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        let f = 0
        out(HIDE)
        // efek mesin slot: huruf berputar lalu terkunci satu per satu
        for (let i = 0; i <= fmt.length; i++) {
            const reps = i === fmt.length ? 1 : 3
            for (let r = 0; r < reps; r++) {
                const cur = [...fmt].map((c, j) => (j < i || c === "-" ? c : pool[Math.floor(Math.random() * pool.length)])).join("")
                draw(box(cur, f++))
                await sleep(45)
            }
        }
        for (let i = 0; i < 16; i++) { draw(box(fmt, f++)); await sleep(60) }
        out(SHOW)
    }
    out("\n")
    const steps = ["Buka WhatsApp di HP", "Perangkat tertaut → Tautkan", "Pilih “nomor telepon”, isi kode"]
    for (let i = 0; i < steps.length; i++) {
        out(` ${grad(i * 8, 0)}${BOLD}${i + 1}${RST} ${DIM}${steps[i]}${RST}\n`)
        if (ANIM) await sleep(120)
    }
    out("\n")
}

// ----- tersambung -----
async function connected(info = {}) {
    stopSpinner()
    if (ANIM) out(`${ESC}2J${ESC}3J${ESC}H`)
    await banner({ quick: true })
    if (ANIM) {
        const width = 20
        for (let p = 0; p <= 100; p += 4) {
            const n = Math.round((p / 100) * width)
            let bar = ""
            for (let i = 0; i < width; i++) bar += i < n ? grad(i * 2.4, p / 3) + "█" : DIM + "░"
            out(`\r${ESC}2K ${bar}${RST} ${WHITE}${BOLD}${String(p).padStart(3)}%${RST}`)
            await sleep(22)
        }
        out("\n")
    }
    out("\n")
    const on = (v) => (v ? `${GREEN}ON${RST}` : `${DIM}OFF${RST}`)
    const rows = [
        [`${GREEN}${BOLD}♥${RST}`, "Status", `${GREEN}${BOLD}ONLINE${RST}`],
        [`${grad(10, 0)}♡${RST}`, "Bot   ", `${gtext(info.name || "Fuyuha Shina MD", 2, true)}`],
        [`${grad(25, 0)}♡${RST}`, "Nomor ", `${WHITE}${info.number || "-"}${RST}`],
        [`${grad(40, 0)}♡${RST}`, "Mode  ", `${info.public === false ? "Self" : "Public"}`],
        [`${grad(55, 0)}♡${RST}`, "Warung", on(info.warung)],
        [`${grad(70, 0)}♡${RST}`, "Nokos ", on(info.nokos)],
        [`${grad(85, 0)}♡${RST}`, "Owner ", `${info.owner || "-"}`]
    ]
    for (const [a, b, c] of rows) {
        out(` ${a} ${DIM}${b}${RST} ${c}\n`)
        if (ANIM) await sleep(80)
    }
    out(`\n ${DIM}Siap menerima pesan ♡${RST}\n\n`)
}

// ----- log berwarna -----
const tag = (c, t, msg) => out(` ${c}${BOLD}${t}${RST} ${msg}\n`)
const info = (msg) => { stopSpinner(); tag(rgb(255, 150, 205), "♡", msg) }
const warn = (msg) => { stopSpinner(); tag(YELLOW, "✦", msg) }
const fail = (msg) => { stopSpinner(); tag(RED, "✖", msg) }
const ok = (msg) => { stopSpinner(); tag(GREEN, "✔", msg) }

module.exports = { intro, banner, spinner, stopSpinner, askNumber, showCode, connected, info, warn, fail, ok, ANIM }
