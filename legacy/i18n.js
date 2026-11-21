/* Panapakkam Bus Stand - UI strings (English + Tamil) */
const I18N = {
  en: {
    livePill: "Daily Scheduled Timetable",
    heroHead: "Plan your journey from Panapakkam bus stand",
    intro: "Search by destination, filter by route, or tap a bus to preview it on the 3D display.",
    next: "Find Next Bus", download: "Download PKM Data Board (PDF)", hint: "Drag to turn the bus", load: "Loading 3D bus stand…",
    stageTag: "3D Bus Terminal",
    no3d: "3D view isn't available on this device. The timetable works normally.",
    time: "Time", bus: "Bus / Operator", colFrom: "From", colTo: "To", share: "Share",
    fromLabel: "From", toLabel: "To", extraLabel: "Bus No / Operator",
    upcoming: "🕒 Upcoming buses only", reset: "Reset all",
    routeTabsTitle: "Routes", entries: "Buses", routes: "Routes", firstLast: "First – Last",
    empty: "No buses match your search. Every bus departs from Panapakkam, so try a destination in “To”, or reset the filters.",
    emptyUpcoming: "No more buses today for this search. Untick “Upcoming buses only” to see all.",
    noReturn: "This timetable only lists buses departing from Panapakkam. Return-journey timings aren't available.",
    foot: "Panapakkam bus stand timetable. Timings are subject to operational conditions; check the board before travel.",
    credit: "Developed by",
    devEyebrow: "CREATOR & DEVELOPER",
    devText: "Developer of Panapakkam Bus, built to put the local bus stand timetable on every phone.",
    close: "Close",
    chk: "Check board", departed: "Departed", shareLabel: "Share on WhatsApp", themeTo: "Switch to light theme",
    count: n => ` · ${n} ${n === 1 ? "bus" : "buses"}`,
    nextMsg: r => `Next bus: ${r.bus} to ${r.dest} at ${r.time}.`,
    tomMsg: r => `No more buses today. First bus tomorrow: ${r.bus} to ${r.dest} at ${r.time}.`
  },
  ta: {
    livePill: "தினசரி கால அட்டவணை",
    heroHead: "பனப்பாக்கம் பேருந்து நிலையத்திலிருந்து உங்கள் பயணம்",
    intro: "சேரும் இடம் மூலம் தேடலாம். ஒரு பேருந்தை தொட்டால் 3D பலகையில் காணலாம்.",
    next: "அடுத்த பேருந்து", download: "PKM தகவல் பலகை பதிவிறக்கம் (PDF)", hint: "பேருந்தை சுழற்ற இழுக்கவும்", load: "3D பேருந்து நிலையம் தயாராகிறது…",
    stageTag: "3D பேருந்து நிலையம்",
    no3d: "இந்த சாதனத்தில் 3D காட்சி இல்லை. அட்டவணை வழக்கம்போல் செயல்படும்.",
    time: "நேரம்", bus: "பேருந்து / நிறுவனம்", colFrom: "புறப்படும் இடம்", colTo: "சேரும் இடம்", share: "பகிர்",
    fromLabel: "புறப்படும் இடம்", toLabel: "சேரும் இடம்", extraLabel: "பேருந்து எண் / பெயர்",
    upcoming: "🕒 இனி வரும் பேருந்துகள் மட்டும்", reset: "அனைத்தையும் அழி",
    routeTabsTitle: "வழித்தடங்கள்", entries: "பேருந்துகள்", routes: "வழித்தடங்கள்", firstLast: "முதல் – கடைசி",
    empty: "பொருந்தும் பேருந்துகள் இல்லை. அனைத்தும் பனப்பாக்கத்திலிருந்து புறப்படுவதால் “சேரும் இடம்” பகுதியில் ஊரைத் தேடுங்கள் அல்லது வடிகட்டிகளை அழிக்கவும்.",
    emptyUpcoming: "இன்று இனி பேருந்துகள் இல்லை. அனைத்தையும் காண “இனி வரும் பேருந்துகள்” தேர்வை நீக்கவும்.",
    noReturn: "இந்த அட்டவணையில் பனப்பாக்கத்திலிருந்து புறப்படும் பேருந்துகள் மட்டுமே உள்ளன. திரும்பும் பயண நேரங்கள் இல்லை.",
    foot: "பனப்பாக்கம் பேருந்து நிலைய கால அட்டவணை. நேரங்கள் மாறலாம்; பயணத்திற்கு முன் பலகையை சரிபார்க்கவும்.",
    credit: "உருவாக்கியவர்",
    devEyebrow: "உருவாக்கியவர் & டெவலப்பர்",
    devText: "பனப்பாக்கம் பேருந்து நிலைய கால அட்டவணையை ஒவ்வொரு தொலைபேசியிலும் கொண்டு சேர்க்க உருவாக்கப்பட்ட Panapakkam Bus-இன் டெவலப்பர்.",
    close: "மூடு",
    chk: "பலகையை பார்க்கவும்", departed: "புறப்பட்டது", shareLabel: "WhatsApp-ல் பகிர்", themeTo: "வெளிர் தீமுக்கு மாற்று",
    count: n => ` · ${n} பேருந்துகள்`,
    nextMsg: r => `அடுத்த பேருந்து: ${r.time}-க்கு ${r.bus} (${r.dest}).`,
    tomMsg: r => `இன்று இனி பேருந்துகள் இல்லை. நாளை முதல்: ${r.time}-க்கு ${r.bus} (${r.dest}).`
  }
};

/* English -> Tamil word list (used when a bus has no "busTa"). Longer phrases first. */
const TA_WORDS = [
  ["Bharathi Roadways", "பாரதி ரோட்வேஸ்"], ["Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
  ["M.S. Roadways", "M.S. ரோட்வேஸ்"], ["City bus", "சிட்டி பஸ்"], ["Small bus", "சிற்றுந்து"],
  ["Vijayalakshmi", "விஜயலட்சுமி"], ["Kalaimagal", "கலைமகள்"], ["Dhanapathi", "தனபதி"],
  ["Balaji", "பாலாஜி"], ["Thulasi", "துளசி"], ["(Super)", "(சூப்பர்)"],
  ["Thirumalpur", "திருமால்பூர்"], ["Thakkolam", "தக்கோலம்"], ["Koor", "கூர்"],
  ["Jagirthandalam", "ஜாகீர்தண்டலம்"], ["Kaveripakkam", "காவேரிப்பாக்கம்"],
  ["Guruvarajapettai", "குருவராஜபேட்டை"], ["Arakkonam", "அரக்கோணம்"], ["Thiruthani", "திருத்தணி"],
  ["Kanchipuram", "காஞ்சிபுரம்"], ["Chengalpattu", "செங்கல்பட்டு"], ["Tambaram", "தாம்பரம்"],
  ["Sholinghur", "சோளிங்கர்"], ["Kalathur", "களத்தூர்"], ["Chennai", "சென்னை"],
  ["Panapakkam", "பனப்பாக்கம்"], ["Vellore", "வேலூர்"], ["Arcot", "ஆற்காடு"]
];