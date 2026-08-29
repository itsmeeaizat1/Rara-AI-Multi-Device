// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "paraphrase",
  alias: ["paraphrase"],
  category: "education",
  description: "Parafrase teks untuk menghindari plagiarisme (synonym replacement)",
  usage: ".paraphrase <teks>",
  example: ".paraphrase teks panjang di sini",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 3,
  isEnabled: true,
};

// Indonesian synonyms
const SYNONIMS_ID = {
  "penting": ["krusial", "vital", "esensial", "signifikan"],
  "membantu": ["menolong", "menunjang", "memudahkan", "mendukung"],
  "menggunakan": ["memakai", "memanfaatkan", "menerapkan"],
  "membuat": ["menciptakan", "menghasilkan", "menyusun", "membentuk"],
  "menjelaskan": ["menerangkan", "memaparkan", "mendeskripsikan", "menguraikan"],
  "menunjukkan": ["memperlihatkan", "menampilkan", "mengindikasikan", "menyajikan"],
  "mempelajari": ["mengkaji", "menelaah", "menyelidiki", "menganalisis"],
  "hasil": ["luaran", "output", "produk", "dampak"],
  "tujuan": ["sasaran", "maksud", "objektif", "target"],
  "metode": ["cara", "teknik", "pendekatan", "strategi"],
  "masalah": ["isu", "kendala", "hambatan", "problem"],
  "solusi": ["jalan keluar", "penyelesaian", "alternatif", "remedi"],
  "data": ["informasi", "fakta", "angka", "keterangan"],
  "penelitian": ["riset", "kajian", "investigasi", "studi"],
  "teori": ["konsep", "prinsip", "asas", "landasan"],
  "analisis": ["telaah", "kajian", "pembahasan", "penelusuran"],
  "kesimpulan": ["rangkuman", "intisari", "point", "penutup"],
  "menyebabkan": ["memicu", "mengakibatkan", "menimbulkan", "mengantar"],
  "berdasarkan": ["berlandaskan", "bersumber pada", "merujuk pada", "berpegang pada"],
  "selain": ["di samping", "selain itu", "lebih lanjut", " Tambahan"],
  "namun": ["tetapi", "akan tetapi", "walaupun begitu", "meskipun demikian"],
  "oleh": ["akibat", "karena", "berkat", "lantaran"],
  "sangat": ["amat", "begitu", "luar biasa", "teramat"],
  "banyak": ["beragam", "berbagai", "melimpah", "beragam"],
  "baik": ["bagus", "unggul", "memadai", "positif"],
  "buruk": ["jelek", "kurang baik", "negatif", "tidak ideal"],
  "besar": ["luas", "signifikan", "masif", "raksasa"],
  "kecil": ["minim", "sedikit", "terbatas", "ringkas"],
  "cepat": ["ekspres", "kilat", "segera", "lekas"],
  "lambat": ["pelan", "perlahan", "lamban", "tak gesa"],
  "mulai": ["memulai", "mengawali", "membuka", "merintis"],
  "selesai": ["rampung", "tuntas", "purna", "kelar"],
  "meningkatkan": ["menaikkan", "memperkuat", "memperbaiki", "mengoptimalkan"],
  "mengurangi": ["menurunkan", "meminimalkan", "menekan", "mengurangi"],
  "berhubungan": ["terkait", "berkaitan", "berasosiasi", "berelasi"],
  "contoh": ["misal", "ilustrasi", "sampel", "kasus"],
  "sebelum": ["sebelumnya", "terdahulu", "lebih dulu", "awalnya"],
  "setelah": ["sesudah", "kemudian", "berikutnya", "post"],
  "dalam": ["di dalam", "pada", "dalam lingkup", "di antara"],
  "untuk": ["guna", "bagi", "demi", "bertujuan"],
  "berupa": ["berbentuk", "berwujud", "bermodel", "berformat"],
  "memiliki": ["mempunyai", "menyimpan", "mengantongi", "memegang"],
  "memberikan": ["menyumbangkan", "menyajikan", "menyediakan", "menyelenggarakan"],
  "membutuhkan": ["memerlukan", "menuntut", "menghendaki", "mengharuskan"],
  "berbeda": ["berlainan", "tak sama", "berbeda", "berbeda-beda"],
  "sama": ["identik", "serupa", "sejenis", "sepadan"],
  "jelas": ["terang", "gamblang", "eksplisit", "nyata"],
  "karena": ["sebab", "lantaran", "disebabkan", "akibat"],
  "sehingga": ["maka", "maka itu", "akibatnya", "alhasil"],
  "serta": ["dan", "juga", "beserta", "sekalian"],
  "umumnya": ["biasanya", "lazimnya", "pada umumnya", "rata-rata"],
  "sering": ["kerap", "acap kali", "sering kali", "marak"],
  "beberapa": ["sejumlah", "sebagian", "pihak", "sekian"],
  "sebagian": ["sekelumit", "sepotong", "separuh", "secupak"],
  "sepenuhnya": ["total", "utuh", "paripurna", "menyeluruh"],
  "menarik": ["memikat", "menawan", "menggiurkan", "menggugah"],
  "membahas": ["mengupas", "mendiskusikan", "menelaah", "menyoroti"],
  "fokus": ["tertuju", "terkonsentrasi", "terfokus", "sentral"],
  "utama": ["pokok", "primer", "inti", "fundamental"],
  "tambahan": ["ekstra", "tambahan", "suplementer", "komplementer"],
  "mendukung": ["menopang", "menyokong", "membantu", "memback up"],
  "mengembangkan": ["memperluas", "menyebarkan", "memperbesar", "memajukan"],
  "menemukan": ["menjumpai", "mendapati", "menyidik", "menyingkap"],
  "membuktikan": ["menunjang", "memverifikasi", "memvalidasi", "mengonfirmasi"],
  "menganggap": ["memandang", "memposisikan", "menilai", "mengapresiasi"],
  "mengajukan": ["menyodorkan", "mengusulkan", "mempresentasikan", "menyampaikan"],
  "mencakup": ["melingkupi", "meliputi", "mencangkup", "membawahi"],
  "menghasilkan": ["memproduksi", "menciptakan", "membuahkan", "menelurkan"],
  "menggambarkan": ["melukiskan", "men visualkan", "mendeskripsikan", "mengilustrasikan"],
  "menyatakan": ["mengungkapkan", "menyampaikan", "mengemukakan", "mengabarkan"],
  "mengamati": ["mengobservasi", "memantau", "menyimak", "mencermati"],
  "melakukan": ["mengerjakan", "menjalankan", "mengeksekusi", "melaksanakan"],
  "memperoleh": ["mendapatkan", "meraih", "mendapati", "menerima"],
  "mengidentifikasi": ["mengenali", "mendeteksi", "menemukan", "mengidentifikasi"],
};

// English synonyms
const SYNONIMS_EN = {
  "important": ["crucial", "vital", "essential", "significant"],
  "help": ["assist", "aid", "support", "facilitate"],
  "use": ["utilize", "employ", "apply", "leverage"],
  "make": ["create", "produce", "construct", "generate"],
  "explain": ["describe", "elaborate", "clarify", "illustrate"],
  "show": ["demonstrate", "display", "indicate", "present"],
  "study": ["examine", "investigate", "analyze", "explore"],
  "result": ["outcome", "output", "consequence", "impact"],
  "goal": ["objective", "target", "aim", "purpose"],
  "method": ["approach", "technique", "strategy", "procedure"],
  "problem": ["issue", "challenge", "obstacle", "difficulty"],
  "solution": ["resolution", "remedy", "fix", "alternative"],
  "data": ["information", "facts", "figures", "evidence"],
  "research": ["study", "investigation", "inquiry", "analysis"],
  "theory": ["concept", "principle", "framework", "model"],
  "analysis": ["examination", "evaluation", "assessment", "review"],
  "conclusion": ["summary", "finding", "deduction", "inference"],
  "cause": ["trigger", "produce", "generate", "lead to"],
  "however": ["nevertheless", "nonetheless", "yet", "still"],
  "because": ["due to", "since", "as", "owing to"],
  "therefore": ["thus", "hence", "consequently", "accordingly"],
  "also": ["additionally", "moreover", "furthermore", "in addition"],
  "many": ["numerous", "various", "multiple", "several"],
  "good": ["beneficial", "favorable", "positive", "advantageous"],
  "bad": ["negative", "unfavorable", "poor", "detrimental"],
  "big": ["large", "significant", "substantial", "considerable"],
  "small": ["minor", "minimal", "limited", "modest"],
  "fast": ["quick", "rapid", "swift", "speedy"],
  "slow": ["gradual", "gradual", "unhurried", "leisurely"],
  "start": ["begin", "commence", "initiate", "launch"],
  "end": ["conclude", "finish", "complete", "terminate"],
  "improve": ["enhance", "boost", "strengthen", "optimize"],
  "reduce": ["decrease", "minimize", "diminish", "lower"],
  "different": ["distinct", "diverse", "varying", "contrasting"],
  "same": ["identical", "similar", "equivalent", "comparable"],
  "clear": ["evident", "obvious", "apparent", "explicit"],
  "often": ["frequently", "regularly", "commonly", "repeatedly"],
  "main": ["primary", "principal", "chief", "key"],
  "develop": ["expand", "advance", "progress", "evolve"],
  "find": ["discover", "locate", "identify", "uncover"],
  "prove": ["demonstrate", "verify", "validate", "confirm"],
  "include": ["comprise", "encompass", "incorporate", "involve"],
  "produce": ["generate", "yield", "create", "manufacture"],
  "describe": ["depict", "portray", "characterize", "outline"],
  "state": ["declare", "express", "articulate", "convey"],
  "observe": ["monitor", "watch", "track", "examine"],
  "perform": ["execute", "conduct", "carry out", "implement"],
  "obtain": ["acquire", "gain", "secure", "attain"],
  "identify": ["recognize", "detect", "distinguish", "determine"],
};

function paraphraseText(text, intensity = 1) {
  let words = text.split(/(\s+)/);
  let changes = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z']/g, "");
    if (word.length < 3) continue;

    const synList = SYNONIMS_ID[word] || SYNONIMS_EN[word];
    if (!synList) continue;

    // Random pick with intensity control
    if (Math.random() > intensity) continue;

    const replacement = synList[Math.floor(Math.random() * synList.length)];
    // Preserve capitalization
    if (words[i][0] === words[i][0].toUpperCase()) {
      words[i] = replacement.charAt(0).toUpperCase() + replacement.slice(1) + words[i].slice(word.length);
    } else {
      words[i] = replacement + words[i].slice(word.length);
    }
    changes++;
  }

  return { text: words.join(""), changes };
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

async function handler(m, { sock, args }) {
  const text = args.join(" ");

  if (!text || text.length < 20) {
    let txt = `Parafrase Teks\n\n`;
    txt += `Ubah teks dengan synonym replacement untuk menghindari plagiarisme.\n\n`;
    txt += `Cara pakai:\n`;
    txt += `1. \`${m.prefix}paraphrase <teks>\` - Parafrase normal\n`;
    txt += `2. \`${m.prefix}paraphrase agresif <teks>\` - Parafrase agresif (lebih banyak perubahan)\n\n`;
    txt += `Dukung: Bahasa Indonesia & English\n`;
    txt += `Maks 3000 karakter\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}paraphrase Penelitian ini menggunakan metode kualitatif...\``;
    return await m.reply( txt, { commandName: "paraphrase" });
  }
  try {
    let intensity = 0.5;
    let inputText = text;

    if (text.toLowerCase().startsWith("agresif ") || text.toLowerCase().startsWith("aggressive ")) {
      intensity = 0.85;
      inputText = text.split(" ").slice(1).join(" ");
    }

    if (inputText.length < 20) {
      return m.reply(claraWrap("Paraphrase", "Teks terlalu pendek! Minimal 20 karakter."));
    }

    if (inputText.length > 3000) {
      return m.reply(claraWrap("Paraphrase", "Teks terlalu panjang! Maksimal 3000 karakter."));
    }

    const result = paraphraseText(inputText, intensity);
    const originalWords = countWords(inputText);
    const similarity = Math.max(0, Math.round((1 - result.changes / (originalWords / 2)) * 100));

    let txt = `Hasil Parafrase\n\n`;
    txt += `${originalWords} kata | ${result.changes} kata diubah\n`;
    txt += `Intensitas: ${intensity < 0.6 ? "Normal" : "Agresif"}\n`;
    txt += `Estimasi similarity: ~${Math.max(0, 100 - result.changes * 5)}%\n\n`;
    txt += `${result.text}\n\n`;
    txt += `_Tip: baca ulang hasil parafrase, sesuaikan konteks kalimat jika perlu_`;

    await m.reply(txt);
  } catch (e) {
    console.error("[PARAPHRASE] Error:", e.message);
    await m.reply(novaError("Paraphrase", `Gagal parafrase nih: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
