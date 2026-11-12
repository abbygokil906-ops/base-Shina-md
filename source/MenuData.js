/* Data menu bot. Tambah/ubah fitur di sini saja. */
module.exports = [
    {
        key: "nokos",
        name: "Nokos",
        icon: "📲",
        cmds: [".start", ".ordernokos", ".saldonokos", ".depositnokos", ".cekorder", ".riwayatnokos", ".statusserver"]
    },
    {
        key: "nokosowner",
        name: "Nokos Owner",
        icon: "🛡️",
        ownerOnly: true,
        cmds: [".nokosmode", ".setnotifch", ".tesnotifch", ".setnamatoko", ".setnamaowner", ".tesmaintenance", ".saldoapi", ".addsaldonokos"]
    },
    {
        key: "warung",
        name: "Warung",
        icon: "🏪",
        cmds: [".start", ".warung", ".cekpesanan"]
    },
    {
        key: "warungowner",
        name: "Warung Owner",
        icon: "🧰",
        ownerOnly: true,
        cmds: [".modewarung", ".settingwarung", ".addpanel", ".addscript", ".setharga", ".delproduk", ".listproduk", ".setchwarung", ".setnamawarung", ".setgateway", ".cekgateway", ".tesnotifwarung", ".orderwarung", ".kirimulang"]
    },
    {
        key: "game",
        name: "Game",
        icon: "🎮",
        cmds: [".tetris", ".blockblast", ".tictactoe", ".slot", ".catur", ".ludo", ".blackjack", ".gaple", ".dino", ".mahjong", ".sonik", ".stickman", ".balap", ".tebakbendera", ".asahotak", ".benaratausalah", ".susunkata"]
    },
    {
        key: "rpg",
        name: "RPG",
        icon: "⚔️",
        cmds: [
            ".daftar", ".profil", ".belilimit", ".rpg",
            ".daily", ".hourly", ".weekly", ".quest", ".challenge", ".stamina", ".heal", ".meditation", ".inventory", ".use", ".bank", ".buykoin",
            ".work", ".freelance", ".ngojek", ".kurir", ".parkir", ".nyapu", ".nambalban", ".nulis", ".streamer", ".ngamen", ".mulung", ".jualan", ".ngemis", ".beg",
            ".mining", ".woodcut", ".fishing", ".berburu", ".hunt", ".berladang", ".garden", ".cook", ".cooking", ".craft", ".alchemy", ".blacksmith", ".enchant",
            ".adventure", ".expedition", ".treasure", ".boss", ".training", ".arena", ".duel",
            ".pet", ".petshop", ".breeding", ".guild", ".marry", ".divorce",
            ".shop", ".merchant", ".sellall", ".transfer", ".gift",
            ".crime", ".maling", ".steal", ".rob",
            ".casino", ".coinflip", ".dice", ".lottery", ".rpgslot", ".leveluprpg"
        ]
    },
    {
        key: "download",
        name: "Download",
        icon: "📥",
        cmds: [".play", ".play2", ".tiktok",
            ".aio", ".aio2", ".instagram", ".igmp3", ".facebook", ".ttdl", ".tiktok2", ".twitter", ".pindl", ".youtubedl", ".ytmp3", ".ytmp4", ".ytplay", ".playspotify", ".spotifydl",
            ".bilibili", ".capcut", ".snackvideo", ".shopee", ".mediafire", ".gdrive", ".terabox", ".ucdl", ".amdl", ".wattpad"]
    },
    {
        key: "stiker",
        name: "Stiker",
        icon: "🖼️",
        cmds: [".s", ".attp", ".brat", ".bratvermeil", ".bratanime", ".bratgojo", ".brathd", ".bratspongebob", ".bratvid", ".bratvid2", ".emojimix", ".jarvis", ".smeme", ".smemevid", ".stikerreaksi", ".qc"]
    },
    {
        key: "qc",
        name: "QC (Quote Chat)",
        icon: "💬",
        // daftar warna otomatis dari stiker/qc.js
        cmds: [".qc", ...Object.keys(require("../plugins/stiker/qc.js").COLORS).map((c) => ".qc" + c)]
    },
    {
        key: "tools",
        name: "Tools",
        icon: "🛠️",
        cmds: [
            ".limit", ".button", ".tourl", ".tourl2", ".cekidch",
            ".ouobypass", ".shortlink", ".shortlink2", ".sub2unlock",
            ".cekbanwa", ".ceknomor", ".cekmail", ".cekphising", ".ceknsfw", ".tiktokcheck", ".rateweb", ".speedweb", ".scanaislop", ".ssweb", ".recordweb", ".webtozip", ".web2apk",
            ".cjstoesm", ".esmtocjs", ".qrcode", ".readqr", ".ocr", ".removebg", ".removebg2", ".bandingkanhp",
            ".createvid", ".txt2video", ".img2vid", ".img2vid2", ".hdvid", ".vid2prompt", ".transkripsi", ".whatmusic", ".convert", ".songai", ".tts",
            ".amsend", ".amverify",".reminivid", ".reminivideo"]
    },
    {
        key: "upload",
        name: "Upload",
        icon: "☁️",
        cmds: [".aisense", ".bashupload", ".fileditch"]
    },
    {
        key: "aiimage",
        name: "AI Image",
        icon: "🖼️",
        cmds: [".crateimg", ".editimg", ".flux", ".hd", ".hd2", ".ihancer", ".imagetoprompt", ".mirrormacbook", ".notegptnano", ".removewm", ".text2img", ".tobotak", ".tochibi", ".tofigurav2", ".tofigurav3", ".tofigure", ".tofunk", ".toghibli", ".tohijab", ".tojas", ".tojepang", ".tokacamata", ".tokece", ".tolego", ".toliquor", ".tomaid", ".tomanga", ".tomirorv2", ".tomirror", ".tomodel", ".tonikah", ".tooutfit", ".topacar", ".topantai", ".topeci", ".topiramida", ".toreal", ".toroblox", ".totangga", ".totato", ".totua", ".unblur", ".tosma", ".nanobanana", ".nbanana"]
    },
    {
        key: "ai",
        name: "AI",
        icon: "🤖",
        cmds: [".aicostum", ".algolia", ".asyntai", ".blackbox", ".chatgpt", ".clara", ".claudehaiku", ".darkgpt", ".deepai", ".dravyn", ".elyvyn", ".ethan", ".feelbetter", ".gemini", ".geminiv2", ".gpt", ".guru", ".honcho", ".klyra", ".lyvren", ".maya", ".myvra", ".naxa", ".notegpt", ".notrack", ".nova", ".noxora", ".orrvyn", ".overchat", ".quelyx", ".qwen", ".unlimitedai", ".velrix", ".zavynt", ".chathpt", ".lorkaai", ".lorka", ".deepseek", ".ds"]
    },
    {
        key: "anime",
        name: "Anime",
        icon: "🎌",
        cmds: [".animecomments", ".animedetail", ".animeepisodes", ".animegenres", ".animehome", ".animeschedule", ".animesearch", ".animestream"]
    },
    {
        key: "canva",
        name: "Canva",
        icon: "🎨",
        cmds: [".afinitasml", ".callandro", ".callios", ".codesnap", ".ffgirl", ".igqc", ".igstory", ".iqc", ".iqcpink", ".iqcpinkv2", ".meledak", ".memepolisi", ".musiccard", ".nokia", ".quotesanime", ".quotesestetik", ".topixel", ".ttdm", ".ttqc", ".windows", ".balogo", ".bluearchivelogo", ".pakustadz", ".ustadz"]
    },
    {
        key: "setortemplate",
        name: "Template",
        icon: "🧾",
        cmds: [".testimoni1", ".testimoni2", ".testimoni3", ".templqrs1", ".templqrs2", ".templqrs3", ".templqrs4", ".templqrs5", ".tempel1", ".tempel2", ".tempel3", ".tempel4", ".tempel5", ".tempel6"]
    },
    {
        key: "fotoestetik",
        name: "Foto Estetik",
        icon: "📸",
        cmds: [".tmplposter", ".tmplhijau", ".tmplkuning", ".tmplig", ".tmplprofil", ".tmplsearch", ".tmplduo", ".tmplcurl", ".tmplshare", ".tmplsobek", ".tmplmaps"]
    },
    {
        key: "fun",
        name: "Fun",
        icon: "🎉",
        cmds: [".8ball", ".acak", ".angka", ".anjing", ".anjingacak", ".apakah", ".bagaimanakah", ".balasmenfess", ".berapakah", ".bisakah", ".bj", ".blokmenfess", ".bolasihir", ".c4", ".carijodoh", ".cat", ".cek", ".cekalay", ".cekbahagia", ".cekbaik", ".cekbaper", ".cekbau", ".cekbego", ".cekbersyukur", ".cekbijak", ".cekbodoh", ".cekbucin", ".cekcantik", ".cekcerdas", ".cekcerewet", ".cekcupu", ".cekcurang", ".cekdermawan", ".cekgabut", ".cekgalak", ".cekganteng", ".cekgay", ".cekgenit", ".cekgila", ".cekhoki", ".cekhumoris", ".cekimut", ".cekiq", ".cekjago", ".cekjahat", ".cekjelek", ".cekjenius", ".cekjodoh", ".cekjomblo", ".cekjujur", ".cekjulid", ".cekkacung", ".cekkarismatik", ".cekkaya", ".cekkejam", ".cekkepo", ".cekkeren", ".cekkhodam", ".cekkocak", ".cekkontol", ".cekkuat", ".ceklebay", ".ceklemot", ".ceklesbi", ".ceklicik", ".ceklucu", ".cekmalas", ".cekmemek", ".cekmenfess", ".cekmiskin", ".cekmunafik", ".ceknakal", ".cekngeselin", ".ceknoob", ".ceknyebelin", ".cekpasangan", ".cekpelit", ".cekpelupa", ".cekpemalas", ".cekpemarah", ".cekpemberani", ".cekpenakut", ".cekpendendam", ".cekpintar", ".cekpinter", ".cekplayboy", ".cekrajin", ".cekrakus", ".cekramah", ".cekromantis", ".ceksabar", ".ceksadboy", ".ceksadgirl", ".ceksadis", ".ceksange", ".cekserakah", ".ceksetia", ".ceksholeh", ".ceksholehah", ".ceksifat", ".ceksigma", ".ceksirik", ".ceksombong", ".ceksopan", ".ceksultan", ".cektampan", ".cektegas", ".cektolol", ".cektoxic", ".cektulus", ".cepatketik", ".confess", ".dare", ".dog", ".gambarlucu", ".gombalan", ".higherlower", ".hilo", ".hiloambil", ".hilostop", ".hit", ".hitungbenda", ".icebreaker", ".jodoh", ".jodohku", ".jokes", ".kapal", ".kapankah", ".katabijak", ".kerangajaib", ".koin", ".kucing", ".kucingacak", ".mastermind", ".meme", ".memeacak", ".menfess", ".nim", ".nyarijodoh", ".pantun", ".petunjuk", ".pilih", ".pilihan", ".poke", ".pokedex", ".pokemon", ".puji", ".ramalan", ".randommeme", ".rate", ".roast", ".roulette", ".rr", ".seru", ".ship", ".siapakah", ".skortebak", ".stand", ".sudoku", ".suit", ".tanya", ".tanyabot", ".tanyagrup", ".tarot", ".tebak", ".tebakangka", ".tebakhitung", ".tebakibukota", ".tebaknyerah", ".tebakperibahasa", ".teka", ".tekamenyerah", ".tembak", ".tolakmenfess", ".topik", ".truth", ".umurku", ".werewolf", ".werewolfhelp", ".ww", ".wwcek", ".wwcreate", ".wwheal", ".wwhelp", ".wwjaga", ".wwjoin", ".wwkill", ".wwlanjut", ".wwleave", ".wwplayers", ".wwracun", ".wwrole", ".wwroles", ".wwshoot", ".wwskip", ".wwstart", ".wwstop", ".wwvote", ".wyr"]
    },
    {
        key: "stalker",
        name: "Stalker",
        icon: "🔍",
        cmds: [".npmstalk", ".stalkff", ".stalkgh", ".stalkig", ".stalkml", ".stalkroblox", ".stalktelegram", ".stalkthreads", ".stalktiktok", ".stalkx", ".stalkyt"]
    },
    {
        key: "komiku",
        name: "Komiku",
        icon: "📚",
        cmds: [".komiku", ".komikterbaru", ".komikpopuler", ".komikrandom", ".komikcari", ".komikgenre", ".komiktype", ".komikdetail", ".komikchapter", ".komiknext", ".komikprev", ".komikfav", ".komikriwayat", ".komiklanjut", ".komik2home", ".komik2update", ".komik2browse", ".komik2cari"]
    },
    {
        key: "info",
        name: "Info",
        icon: "📰",
        cmds: [".antara", ".beritajakarta", ".cnbc", ".cnn", ".kompas", ".sindonews", ".infopublik", ".kemenag", ".kemkes", ".gempa"]
    },
    {
        key: "search",
        name: "Search",
        icon: "🔎",
        cmds: [".pinterest", ".lirik", ".spotifysearch", ".resep", ".githubsearch", ".ccsearch", ".capcutcomment", ".ytcomment", ".amfinder", ".telegramsticker", ".stickerly", ".tiktoksearch"]
    },
    {
        key: "group",
        name: "Group",
        icon: "👥",
        cmds: [".antilink", ".antilink2", ".antilinkch", ".antitagch", ".antitagsw", ".antisw", ".antitoxic", ".antibokep", ".antidel", ".welcome", ".setwelcome", ".resetwelcome", ".statusgrup", ".hidetag", ".tagall", ".kick", ".open", ".close", ".swgc", ".getpp", ".getppgc", ".setppgc", ".sulap", ".gruponly", ".gruponly2", ".adminonly"]
    },
    {
        key: "store",
        name: "Store & Push",
        icon: "🛒",
        cmds: [".pushkontak", ".pushkontak2", ".savekontak", ".stoppush", ".setjeda", ".savenomor", ".autojpm", ".jpm", ".jpmht", ".jpmch", ".jpmslide", ".bljpm", ".listbljpm", ".statusjpm", ".statuspush", ".blpush", ".blpush2", ".stopjpm", ".payment", ".proses", ".done"]
    },
    {
        key: "panel",
        name: "Panel",
        icon: "🖥️",
        cmds: [".addseller", ".delseller", ".listseller", ".1gb - unlimited", ".delpanel", ".delpanel-all", ".delpanel-off", ".listpanel", ".cadmin", ".deladmin", ".listadmin"]
    },
    {
        key: "owner",
        name: "Owner",
        icon: "👑",
        cmds: [".addowner", ".listowner", ".delowner", ".addprem", ".delprem", ".listprem", ".public", ".selft", ".resetdb", ".backup", ".autoread", ".autotyping", ".autoreadsw", ".swgca", ".setppbot", ".setppch"]
    },
]

// "All Menu" tidak ada di daftar ini: otomatis dibuat di Menu.js dari semua kategori di atas.
