/* ============================================================
   CONFIG
   ============================================================ */

// Tambahkan dokumen di sini setelah file PDF di-upload ke assets/documents/
// Setiap entri: { name: "Nama tampil", file: "nama-file.pdf" }
const DOCUMENTS = [
  { name: "FAQ Transaksi REPO", file: "faq-transaksi-repo.pdf" },
  { name: "Peraturan OJK", file: "peraturan-ojk.pdf" },
];

// Kode saham untuk pita ticker. Dicoba ambil data live dari Yahoo Finance;
// kalau gagal (endpoint tidak resmi, lihat catatan di js/market-data.js),
// otomatis fallback ke arah dummy per-kode supaya ticker tidak pernah kosong.
const TICKER_CODES = [
  "BBCA", "BBRI", "BMRI", "TLKM", "ASII", "UNVR", "ANTM", "ICBP",
  "GOTO", "ADRO", "PGAS", "SMGR", "INDF", "KLBF", "CPIN", "BRPT",
];
const TICKER_DUMMY_DIR = { // fallback kalau live fetch gagal
  BBCA: "up", BBRI: "down", BMRI: "down", TLKM: "up", ASII: "up", UNVR: "up",
  ANTM: "down", ICBP: "up", GOTO: "up", ADRO: "down", PGAS: "up", SMGR: "down",
  INDF: "up", KLBF: "up", CPIN: "down", BRPT: "up",
};

/* ============================================================
   I18N — kamus terjemahan ID/EN + helper t()/tf()
   Tambahkan tombol "ID/EN" di header (#langToggle) untuk mengganti
   bahasa. Pilihan bahasa disimpan di localStorage supaya tetap
   dipakai saat pengunjung kembali.
   ============================================================ */
const I18N = {
  id: {
    pageTitle: "Pendanaan Transaksi REPO — PT Pendanaan Efek Indonesia",
    brandSub: "Portal Pendanaan Transaksi REPO",
    navInfo: "Informasi",
    navSimulator: "Simulator",
    navApply: "Ajukan Pendanaan",

    heroEyebrow: "Produk PT Pendanaan Efek Indonesia",
    heroTitle: "Dapatkan Pendanaan<br/>dari portofolio Efek Anda.",
    heroDesc: `Transaksi Repurchase Agreement (<strong>Transaksi Repo</strong>) adalah kontrak jual
        atau beli Efek dengan janji beli atau jual kembali pada waktu dan harga yang telah
        ditetapkan. Jadikan saham dan/atau obligasi yang Anda miliki sebagai jaminan untuk
        memperoleh pendanaan — cepat, transparan, dan sesuai ketentuan.`,
    heroCtaSim: "Mulai Simulasi",
    heroCtaApply: "Ajukan Sekarang",

    tagInfo: "Informasi",
    docsTitle: "Materi Edukasi Transaksi REPO",
    docsDesc: "Pelajari lebih lengkap seputar Transaksi Repurchase Agreement (REPO) melalui materi berikut sebelum mengajukan pendanaan.",
    docsEmpty: `Dokumen pendukung (PDF) belum tersedia — akan tampil otomatis di sini setelah
      file ditambahkan ke folder <code>assets/documents/</code> dan didaftarkan di
      <code>script.js</code> (variabel <code>DOCUMENTS</code>).`,
    flowTitle: "Alur Mekanisme Pendanaan Transaksi REPO",
    flow1: "Lakukan Simulasi Perhitungan",
    flow2: "Ajukan Pendanaan",
    flow3: "Konfirmasi Persetujuan Pendanaan",
    flow4: "Tanda Tangan Perjanjian",
    flow5: "Terima Pencairan Pendanaan",
    docsFooterNote: `Informasi lebih lanjut terkait Transaksi Pendanaan REPO, silakan akses website resmi PEI.
      Ada kendala saat melakukan simulasi, atau saham/obligasi Anda belum tercantum sebagai
      pilihan jaminan? Silakan hubungi kami langsung.`,
    siteCardTitle: "PT Pendanaan Efek Indonesia — Website Resmi",
    siteCardDesc: "Profil perusahaan, produk pendanaan, berita, dan kegiatan terkini PEI.",
    visitLink: "Kunjungi ↗",
    contactCardTitle: "Hubungi Kami",
    contactCardSub: "Kendala simulasi & jaminan",
    contactCardDesc: "Ada kendala saat simulasi, atau efek Anda belum tercantum sebagai jaminan? Hubungi tim PEI.",
    contactLink: "Hubungi ↗",

    tagMainMenu: "Menu Utama",
    simIntroTitle: "Simulator Perhitungan REPO",
    simIntroDesc: `Simulasikan estimasi nilai pendanaan dari saham/obligasi yang akan Anda jaminkan.
      <em>Nilai simulasi merupakan estimasi awal, nilai final tetap melalui proses evaluasi &amp; persetujuan.</em>`,
    simIntroBtnFwd: "Hitung Estimasi Pendanaan dari Efek yang Dimiliki",
    simIntroBtnRev: "Hitung Estimasi Jaminan untuk Pendanaan yang Diajukan",

    tagSim1: "Simulator 1",
    simFwdTitle: "Estimasi Pendanaan dari Efek yang Dimiliki",
    simFwdDesc: "Masukkan jumlah lot saham dan/atau nilai nominal obligasi yang Anda miliki untuk mengetahui estimasi nilai pendanaan yang dapat diperoleh.",
    tagSim2: "Simulator 2",
    simRevTitle: "Estimasi Jaminan untuk Pendanaan yang Diajukan",
    simRevDesc: "Masukkan target dana yang dibutuhkan untuk mengetahui jumlah lot saham dan/atau nilai nominal obligasi yang perlu Anda jaminkan.",

    lblTenor: "Rencana Tenor (untuk hitung bunga)",
    tenor1: "1 Bulan", tenor2: "2 Bulan", tenor3: "3 Bulan",
    tenor4: "4 Bulan", tenor5: "5 Bulan", tenor6: "6 Bulan",
    multiEfekNote: 'Bisa jaminkan lebih dari satu efek sekaligus — klik "+ Tambah Efek" untuk menambah baris.',
    btnTambahEfek: "+ Tambah Efek",
    btnHitungFwd: "Hitung Estimasi Pendanaan",
    btnHitungRev: "Hitung Kebutuhan Jaminan",
    resultLabelFwdDefault: "Estimasi Nilai Pendanaan",
    resultLabelRevDefault: "Kebutuhan Jaminan",
    btnSimpanSim: "💾 Simpan Simulasi Ini untuk Form Pengajuan",
    btnTersimpan: "✓ Tersimpan",
    totalTargetLabel: "Total Kebutuhan Dana (dijumlah dari semua efek di atas)",
    simSavedMsgText: "✓ Simulasi disimpan — scroll ke Form Pengajuan di bawah untuk memakainya.",

    optSaham: "Saham/ETF",
    optObligasi: "Obligasi",
    lblJenisEfek: "Jenis Efek",
    lblKodeEfek: "Kode Efek",
    lblJumlahLot: "Jumlah Lot",
    lblNominalObligasi: "Nilai Nominal Obligasi (Rp)",
    lblKebutuhanDana: "Kebutuhan Dana dari Efek Ini (Rp)",
    phCariSaham: "Ketik kode atau nama saham, lalu pilih...",
    phCariObligasi: "Ketik kode atau nama obligasi, lalu pilih...",
    phLoadingSaham: "Memuat daftar saham...",
    phLoadingObligasi: "Memuat daftar obligasi...",
    phContohNominal: "Contoh: 5.000.000.000",
    titleHapusRow: "Hapus efek ini",
    unitLot: "Lot",

    tagNextStep: "Langkah Selanjutnya",
    formTitle: "Form Pengajuan Calon Nasabah",
    formDesc: "Sudah mendapatkan estimasi dari simulator? Lengkapi form berikut untuk melanjutkan proses pengajuan pendanaan.",
    lblNama: "Nama Nasabah *",
    lblEmail: "Email Aktif *",
    lblWhatsapp: "No. WhatsApp *",
    phWhatsapp: "Contoh: 081234567890",
    btnLanjutkan: "Lanjutkan",
    simTersimpanLabel: "📌 Ada Data Simulasi Tersimpan",
    btnGunakanData: "Gunakan Data Ini di Form",
    btnDataDimuat: "✓ Data Dimuat ke Form",
    lblBroker: "Broker yang Dipakai *",
    optPilihBroker: "Pilih broker...",
    optBrokerLainnya: "Lainnya (broker tidak ada di daftar)",
    lblBrokerLainnya: "Nama Broker Lainnya *",
    phBrokerLainnya: "Tulis nama broker yang Anda pakai",
    lblTenorForm: "Rencana Tenor *",
    optPilihTenor: "Pilih tenor...",
    tenorRolloverNote: "Catatan: tenor dapat diperpanjang (rollover) hingga maksimal total 1 (satu) tahun.",
    lblRencana: "Rencana Pengajuan *",
    phRencana: "Jelaskan singkat kebutuhan pendanaan Anda",
    lblSaham: "Saham/Obligasi yang Diajukan *",
    phSaham: "Contoh: BBCA 10.000 lembar, Obligasi ABC Seri A Rp500.000.000",
    btnKembali: "Kembali",
    btnKirim: "Kirim Pengajuan",
    btnMengerti: "Mengerti",

    totalEstimasiLabel: "Total Estimasi Pendanaan",
    autoRencanaText: "Mengajukan pendanaan REPO sekitar {rp} ({n} efek) berdasarkan hasil simulasi.",

    rowHargaPenutupan: "Harga Penutupan Terakhir",
    rowNilaiJaminan: "Nilai Jaminan",
    rowRasio: "Rasio",
    rowGroup: "Group",
    rowCatatanCapSaham: "Nilai jaminan dipangkas karena melebihi batas maksimum per saham.",
    rowJumlahLembar: "Jumlah Lembar",
    rowCatatanCapKebutuhan: "Kebutuhan dana melebihi batas maksimum saham ini (maks. sekitar {maks}).",
    rowJenis: "Jenis",
    rowJatuhTempo: "Jatuh Tempo",
    rowBungaError: "Bunga",
    rowBungaPA: "Bunga (p.a.)",
    rowBungaPerBulan: "Bunga per Bulan",
    rowTotalBunga: "Total Bunga ({tenor} bulan)",
    catatanLabel: "⚠ Catatan",

    warnCapModal: "Estimasi pendanaan untuk saham {daftar} melebihi batas maksimum Rp20.000.000.000 (Rp20 miliar) per saham, sehingga dipangkas ke batas tersebut sesuai kebijakan PEI. Rincian lengkap tetap ditampilkan di bawah.",

    headlineFwdSingle: "Estimasi Nilai Pendanaan",
    headlineFwdMulti: "Total Estimasi Pendanaan Gabungan ({n} Efek)",
    headlineRevSingle: "Kebutuhan Pendanaan",
    headlineRevMulti: "Total Kebutuhan Pendanaan ({n} Efek)",
    jumlahLotDibutuhkan: "{n} Lot dibutuhkan",
    nominalDibutuhkan: "Nominal {rp} dibutuhkan",
    nominalLabel: "Nominal {rp}",

    ringkasanBungaTitle: "Ringkasan Kewajiban Pembayaran (Tenor {tenor} Bulan)",
    totalBungaLabel: "Total Bunga",
    jadwalTitle: "Rincian Pembayaran per Bulan",
    jadwalColBulan: "Bulan",
    jadwalColKeterangan: "Keterangan",
    jadwalColJumlah: "Jumlah Dibayar",
    jadwalBulanN: "Bulan {n}",
    jadwalKetBunga: "Bunga",
    jadwalKetBungaPokok: "Bunga + Pelunasan Pokok (jatuh tempo)",
    highlightTotalTitle: "Total yang Harus Dibayar di Akhir Tenor ({tenor} Bulan)",

    warnDataMasihDimuat: "Data referensi masih dimuat, mohon tunggu sebentar lalu coba lagi.",
    warnTambahEfek: "Tambahkan minimal satu efek terlebih dahulu.",
    warnPilihSahamLot: "Efek #{n}: mohon pilih kode saham dan isi jumlah lot terlebih dahulu.",
    warnPilihSahamTarget: "Efek #{n}: mohon pilih kode saham dan isi kebutuhan dana terlebih dahulu.",
    warnDataSahamTidakLengkap: "Efek #{n}: data pendukung untuk {kode} tidak lengkap. Pastikan kode dipilih dari daftar yang muncul.",
    warnMarketError: "Efek #{n} ({kode}): {pesan}",
    warnGenericItem: "Efek #{n}: {pesan}",
    warnObligasiTidakDitemukan: "Efek #{n}: data obligasi {kode} tidak ditemukan. Pastikan kode dipilih dari daftar yang muncul.",
    warnPilihObligasiNominal: "Efek #{n}: mohon pilih kode obligasi dan isi nilai nominal terlebih dahulu.",
    warnPilihObligasiTarget: "Efek #{n}: mohon pilih kode obligasi dan isi kebutuhan dana terlebih dahulu.",
    warnHitungError: "Terjadi kendala saat menghitung: {pesan}",
    fetchingHarga: "Mengambil data harga {kode}...",
    belumDipilih: "(belum dipilih)",

    statusAccessKeyMissing: "Form belum terhubung ke layanan email — access_key belum diisi. Hubungi admin portal.",
    statusCaptchaMissing: "Mohon selesaikan verifikasi captcha terlebih dahulu.",
    sendingText: "Mengirim...",
    statusSuccess: "Pengajuan berhasil dikirim! Tim kami akan segera menghubungi Anda.",
    statusPartialFail: "Pengajuan tercatat, namun notifikasi email gagal terkirim. Coba lagi nanti.",
    statusConnError: "Terjadi kendala koneksi. Mohon periksa internet Anda dan coba lagi.",
  },

  en: {
    pageTitle: "REPO Transaction Funding — PT Pendanaan Efek Indonesia",
    brandSub: "REPO Transaction Funding Portal",
    navInfo: "Information",
    navSimulator: "Simulator",
    navApply: "Apply for Funding",

    heroEyebrow: "A Product of PT Pendanaan Efek Indonesia",
    heroTitle: "Get Funding<br/>from Your Securities Portfolio.",
    heroDesc: `A Repurchase Agreement Transaction (<strong>REPO Transaction</strong>) is a contract
        to sell or buy Securities with a promise to buy or sell them back at a set time and
        price. Use the shares and/or bonds you own as collateral to obtain funding — fast,
        transparent, and compliant.`,
    heroCtaSim: "Start Simulation",
    heroCtaApply: "Apply Now",

    tagInfo: "Information",
    docsTitle: "REPO Transaction Educational Materials",
    docsDesc: "Learn more about Repurchase Agreement (REPO) Transactions through the materials below before applying for funding.",
    docsEmpty: `Supporting documents (PDF) are not yet available — they will appear here automatically
      once files are added to the <code>assets/documents/</code> folder and registered in
      <code>script.js</code> (the <code>DOCUMENTS</code> variable).`,
    flowTitle: "REPO Transaction Funding Mechanism Flow",
    flow1: "Run the Calculation Simulation",
    flow2: "Apply for Funding",
    flow3: "Confirm Funding Approval",
    flow4: "Sign the Agreement",
    flow5: "Receive Funding Disbursement",
    docsFooterNote: `For further information about REPO Funding Transactions, please visit PEI's official
      website. Having trouble running the simulation, or is your stock/bond not yet listed as
      an eligible collateral option? Please contact us directly.`,
    siteCardTitle: "PT Pendanaan Efek Indonesia — Official Website",
    siteCardDesc: "Company profile, funding products, news, and PEI's latest activities.",
    visitLink: "Visit ↗",
    contactCardTitle: "Contact Us",
    contactCardSub: "Simulation & collateral issues",
    contactCardDesc: "Having trouble with the simulation, or is your security not yet listed as eligible collateral? Contact the PEI team.",
    contactLink: "Contact ↗",

    tagMainMenu: "Main Menu",
    simIntroTitle: "REPO Calculation Simulator",
    simIntroDesc: `Simulate the estimated funding value from the shares/bonds you plan to pledge as collateral.
      <em>The simulated value is an initial estimate; the final value is still subject to an evaluation &amp; approval process.</em>`,
    simIntroBtnFwd: "Calculate Funding Estimate from Securities Owned",
    simIntroBtnRev: "Calculate Collateral Estimate for Requested Funding",

    tagSim1: "Simulator 1",
    simFwdTitle: "Funding Estimate from Securities Owned",
    simFwdDesc: "Enter the number of stock lots and/or the bond nominal value you own to find out the estimated funding value you can obtain.",
    tagSim2: "Simulator 2",
    simRevTitle: "Collateral Estimate for Requested Funding",
    simRevDesc: "Enter the target amount of funding you need to find out the number of stock lots and/or bond nominal value you'll need to pledge as collateral.",

    lblTenor: "Planned Tenor (for interest calculation)",
    tenor1: "1 Month", tenor2: "2 Months", tenor3: "3 Months",
    tenor4: "4 Months", tenor5: "5 Months", tenor6: "6 Months",
    multiEfekNote: 'You can pledge more than one security at once — click "+ Add Security" to add a row.',
    btnTambahEfek: "+ Add Security",
    btnHitungFwd: "Calculate Funding Estimate",
    btnHitungRev: "Calculate Collateral Requirement",
    resultLabelFwdDefault: "Estimated Funding Value",
    resultLabelRevDefault: "Collateral Requirement",
    btnSimpanSim: "💾 Save This Simulation for the Application Form",
    btnTersimpan: "✓ Saved",
    totalTargetLabel: "Total Funding Requirement (summed from all securities above)",
    simSavedMsgText: "✓ Simulation saved — scroll down to the Application Form to use it.",

    optSaham: "Stocks/ETF",
    optObligasi: "Bonds",
    lblJenisEfek: "Security Type",
    lblKodeEfek: "Security Code",
    lblJumlahLot: "Number of Lots",
    lblNominalObligasi: "Bond Nominal Value (Rp)",
    lblKebutuhanDana: "Funding Needed from This Security (Rp)",
    phCariSaham: "Type a stock code or name, then select...",
    phCariObligasi: "Type a bond code or name, then select...",
    phLoadingSaham: "Loading stock list...",
    phLoadingObligasi: "Loading bond list...",
    phContohNominal: "e.g.: 5,000,000,000",
    titleHapusRow: "Remove this security",
    unitLot: "Lot",

    tagNextStep: "Next Step",
    formTitle: "Prospective Client Application Form",
    formDesc: "Already got an estimate from the simulator? Complete the form below to continue the funding application process.",
    lblNama: "Client Name *",
    lblEmail: "Active Email *",
    lblWhatsapp: "WhatsApp Number *",
    phWhatsapp: "e.g.: 081234567890",
    btnLanjutkan: "Continue",
    simTersimpanLabel: "📌 Saved Simulation Data Available",
    btnGunakanData: "Use This Data in the Form",
    btnDataDimuat: "✓ Data Loaded into Form",
    lblBroker: "Broker Used *",
    optPilihBroker: "Select broker...",
    optBrokerLainnya: "Other (broker not listed)",
    lblBrokerLainnya: "Other Broker Name *",
    phBrokerLainnya: "Write the name of the broker you use",
    lblTenorForm: "Planned Tenor *",
    optPilihTenor: "Select tenor...",
    tenorRolloverNote: "Note: the tenor may be extended (rolled over) up to a total maximum of 1 (one) year.",
    lblRencana: "Application Plan *",
    phRencana: "Briefly describe your funding needs",
    lblSaham: "Securities/Bonds Proposed *",
    phSaham: "e.g.: BBCA 10,000 shares, ABC Series A Bond Rp500,000,000",
    btnKembali: "Back",
    btnKirim: "Submit Application",
    btnMengerti: "Understood",

    totalEstimasiLabel: "Total Estimated Funding",
    autoRencanaText: "Applying for REPO funding of approximately {rp} ({n} securities) based on the simulation result.",

    rowHargaPenutupan: "Latest Closing Price",
    rowNilaiJaminan: "Collateral Value",
    rowRasio: "Ratio",
    rowGroup: "Group",
    rowCatatanCapSaham: "The collateral value was capped because it exceeded the maximum limit per stock.",
    rowJumlahLembar: "Number of Shares",
    rowCatatanCapKebutuhan: "The funding requirement exceeds this stock's maximum limit (max. approx. {maks}).",
    rowJenis: "Type",
    rowJatuhTempo: "Maturity Date",
    rowBungaError: "Interest",
    rowBungaPA: "Interest Rate (p.a.)",
    rowBungaPerBulan: "Monthly Interest",
    rowTotalBunga: "Total Interest ({tenor} months)",
    catatanLabel: "⚠ Note",

    warnCapModal: "The funding estimate for {daftar} exceeds the maximum limit of Rp20,000,000,000 (Rp20 billion) per stock, so it has been capped to that limit per PEI policy. The full breakdown is still shown below.",

    headlineFwdSingle: "Estimated Funding Value",
    headlineFwdMulti: "Total Combined Funding Estimate ({n} Securities)",
    headlineRevSingle: "Collateral Requirement",
    headlineRevMulti: "Total Collateral Requirement ({n} Securities)",
    jumlahLotDibutuhkan: "{n} Lots required",
    nominalDibutuhkan: "Nominal {rp} required",
    nominalLabel: "Nominal {rp}",

    ringkasanBungaTitle: "Payment Obligation Summary (Tenor {tenor} Months)",
    totalBungaLabel: "Total Interest",
    jadwalTitle: "Monthly Payment Breakdown",
    jadwalColBulan: "Month",
    jadwalColKeterangan: "Description",
    jadwalColJumlah: "Amount Due",
    jadwalBulanN: "Month {n}",
    jadwalKetBunga: "Interest",
    jadwalKetBungaPokok: "Interest + Principal Repayment (maturity)",
    highlightTotalTitle: "Total Due at End of Tenor ({tenor} Months)",

    warnDataMasihDimuat: "Reference data is still loading, please wait a moment and try again.",
    warnTambahEfek: "Please add at least one security first.",
    warnPilihSahamLot: "Security #{n}: please select a stock code and enter the number of lots first.",
    warnPilihSahamTarget: "Security #{n}: please select a stock code and enter the funding requirement first.",
    warnDataSahamTidakLengkap: "Security #{n}: supporting data for {kode} is incomplete. Make sure the code was selected from the list that appears.",
    warnMarketError: "Security #{n} ({kode}): {pesan}",
    warnGenericItem: "Security #{n}: {pesan}",
    warnObligasiTidakDitemukan: "Security #{n}: bond data for {kode} was not found. Make sure the code was selected from the list that appears.",
    warnPilihObligasiNominal: "Security #{n}: please select a bond code and enter the nominal value first.",
    warnPilihObligasiTarget: "Security #{n}: please select a bond code and enter the funding requirement first.",
    warnHitungError: "There was a problem while calculating: {pesan}",
    fetchingHarga: "Fetching price data for {kode}...",
    belumDipilih: "(not yet selected)",

    statusAccessKeyMissing: "The form is not yet connected to the email service — access_key is not set. Please contact the portal admin.",
    statusCaptchaMissing: "Please complete the captcha verification first.",
    sendingText: "Sending...",
    statusSuccess: "Application sent successfully! Our team will contact you shortly.",
    statusPartialFail: "Application recorded, but the email notification failed to send. Please try again later.",
    statusConnError: "There was a connection problem. Please check your internet and try again.",
  },
};

let currentLang = (function () {
  try {
    const saved = localStorage.getItem('repoLang');
    if (saved === 'id' || saved === 'en') return saved;
  } catch (err) { /* ignore */ }
  return 'id';
})();

function t(key, vars) {
  const dict = I18N[currentLang] || I18N.id;
  let str = (key in dict) ? dict[key] : (I18N.id[key] !== undefined ? I18N.id[key] : key);
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.split(`{${k}}`).join(vars[k]);
    });
  }
  return str;
}
const tf = t; // alias: t() already supports {var} substitution

const i18nRerenderers = []; // fungsi yang perlu dipanggil ulang saat bahasa berganti (konten dinamis)

function applyStaticI18N() {
  document.documentElement.lang = currentLang;
  document.title = t('pageTitle');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });

  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = currentLang === 'id' ? 'EN' : 'ID';
}

function setLang(lang) {
  if (lang !== 'id' && lang !== 'en') return;
  currentLang = lang;
  try { localStorage.setItem('repoLang', lang); } catch (err) { /* ignore */ }
  applyStaticI18N();
  i18nRerenderers.forEach((fn) => {
    try { fn(); } catch (err) { console.error('i18n rerender error:', err); }
  });
}

(function langToggleSetup() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.addEventListener('click', () => setLang(currentLang === 'id' ? 'en' : 'id'));
  applyStaticI18N(); // terapkan bahasa tersimpan begitu halaman dimuat
})();

/* ============================================================
   HELPER — format tampilan "jumlah" efek (Lot untuk saham,
   Nilai Nominal Rp untuk obligasi) secara konsisten di semua tempat.
   ============================================================ */
function formatJumlahEfek(it) {
  if (it.jumlahIsRupiah) {
    return `Rp ${Math.round(it.jumlah).toLocaleString('id-ID')} (Nominal)`;
  }
  return `${it.jumlah.toLocaleString('id-ID')} ${it.satuan}`;
}

// Format tanggal maturity obligasi dari "DD-MMM-YYYY" (mis. "06-FEB-2027",
// format asli statis_efek.json) jadi lebih enak dibaca: "06 Feb 2027".
function formatTanggalObligasi(str) {
  if (!str) return '-';
  const parts = String(str).split('-');
  if (parts.length !== 3) return str;
  const bulan = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
  return `${parts[0]} ${bulan} ${parts[2]}`;
}

/* ============================================================
   MODAL PERINGATAN — dipakai bersama oleh kedua simulator (forward
   & reverse). Menggantikan teks kecil warn-msg yang lama supaya
   peringatan lebih kelihatan (pop-up di tengah layar, bukan
   keterangan kecil di bawah tombol).
   ============================================================ */
function showWarnModal(msg) {
  const overlay = document.getElementById('warnModalOverlay');
  const msgEl = document.getElementById('warnModalMessage');
  if (!overlay || !msgEl) return;
  msgEl.textContent = msg;
  overlay.hidden = false;
}
function hideWarnModal() {
  const overlay = document.getElementById('warnModalOverlay');
  if (overlay) overlay.hidden = true;
}
(function warnModalSetup() {
  const overlay = document.getElementById('warnModalOverlay');
  const closeBtn = document.getElementById('warnModalClose');
  if (!overlay || !closeBtn) return;
  closeBtn.addEventListener('click', hideWarnModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideWarnModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) hideWarnModal();
  });
})();

/* ============================================================
   HEADER SCROLL STATE
   ============================================================ */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

/* ============================================================
   NAV MOBILE — toggle hamburger buka/tutup panel navigasi,
   otomatis tertutup begitu salah satu link di dalamnya diklik.
   ============================================================ */
(function navToggle() {
  const btn = document.getElementById('navToggle');
  const panel = document.getElementById('mobileNavPanel');
  if (!btn || !panel) return;

  function closePanel() {
    panel.hidden = true;
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function openPanel() {
    panel.hidden = false;
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    isOpen ? closePanel() : openPanel();
  });

  panel.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closePanel);
  });
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

/* ============================================================
   TICKER BAND — coba data live Yahoo Finance, fallback ke dummy per-kode
   ============================================================ */
(function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const renderItems = (list) => list.map(t => `
    <span class="ticker-item">
      <span class="ticker-code">${t.code}</span>
      <span class="${t.dir === 'up' ? 'ticker-up' : 'ticker-down'}">${t.dir === 'up' ? '▲' : '▼'}</span>
      ${t.pct != null ? `<span class="${t.dir === 'up' ? 'ticker-up' : 'ticker-down'}" style="font-size:0.75rem;">${t.pct}%</span>` : ''}
    </span>
  `).join('');

  // Render dummy dulu supaya ticker langsung tampil (tidak nunggu network)
  const dummyList = TICKER_CODES.map((code) => ({ code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null }));
  track.innerHTML = renderItems(dummyList) + renderItems(dummyList);

  // Lalu coba upgrade ke data live di background (kalau berhasil, ticker di-refresh)
  Promise.all(
    TICKER_CODES.map((code) =>
      MarketData.fetchStockMetrics(code)
        .then((m) => {
          if (m.error || m.prev_close == null) return { code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null };
          const dir = m.latest_close >= m.prev_close ? 'up' : 'down';
          const pct = (((m.latest_close - m.prev_close) / m.prev_close) * 100).toFixed(2);
          return { code, dir, pct: Math.abs(pct) };
        })
        .catch(() => ({ code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null }))
    )
  ).then((liveList) => {
    track.innerHTML = renderItems(liveList) + renderItems(liveList);
  });
})();

/* ============================================================
   DOCUMENTS GRID
   ============================================================ */
function renderDocuments() {
  const grid = document.getElementById('docGrid');
  if (!grid) return;

  if (DOCUMENTS.length === 0) {
    grid.innerHTML = `<div class="doc-empty">${t('docsEmpty')}</div>`;
    return;
  }

  grid.innerHTML = DOCUMENTS.map(doc => `
    <a class="doc-card" href="assets/documents/${doc.file}" download>
      <span class="doc-icon">PDF</span>
      <span class="doc-name">${doc.name}</span>
    </a>
  `).join('');
}
renderDocuments();
i18nRerenderers.push(renderDocuments);

/* ============================================================
   SIMULATOR — tersambung ke calc-engine.js asli (saham & obligasi)
   Ada 2 INSTANCE terpisah di halaman:
     - forward  ("Estimasi Pendanaan"): jumlah lot/nilai nominal -> estimasi pendanaan
     - reverse  ("Kebutuhan Jaminan"): target pendanaan -> jumlah lot/nilai nominal dibutuhkan
   Masing-masing punya elemen DOM sendiri (id berbeda), tapi logic & rumus
   perhitungannya sama persis — dibungkus dalam factory createSimulatorInstance()
   supaya tidak duplikasi kode.
   Mendukung BANYAK EFEK sekaligus (jaminan gabungan) — user bisa
   tambah baris efek sebanyak yang dibutuhkan lewat "+ Tambah Efek".
   Field Kode Efek: ketik lalu pilih (datalist), bukan dropdown langsung.
   ============================================================ */
function createSimulatorInstance(mode, ids) {
  const btn = document.getElementById(ids.btnHitung);
  if (!btn) return;

  const isReverse = mode === 'reverse';
  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const parseRupiahInput = (str) => parseFloat((str || '').replace(/\D/g, '')) || 0;

  const resultBox = document.getElementById(ids.resultBox);
  const btnSimpanSimulasi = document.getElementById(ids.btnSimpan);
  const simSavedMsg = document.getElementById(ids.simSavedMsg);
  const tenorSel = document.getElementById(ids.tenorSel);
  const efekList = document.getElementById(ids.efekList);
  const btnTambahEfek = document.getElementById(ids.btnTambahEfek);
  const totalTargetBox = isReverse ? document.getElementById(ids.totalTargetBox) : null;
  const totalTargetValue = isReverse ? document.getElementById(ids.totalTargetValue) : null;

  let simData = null; // hasil DataLoader.loadAll()
  let sahamOptions = []; // [{ kode_efek, display }]
  let obligasiOptions = []; // [{ kode_efek, display, is_korporasi }]
  let sahamMap = {};      // display -> kode_efek
  let obligasiMap = {};   // display -> { kode_efek, is_korporasi }
  let currentSimPayload = null; // data hasil hitung terakhir, siap disimpan ke sessionStorage
  let rowIdCounter = 0;
  const rows = new Map(); // rowId -> { el, jenisEl, kodeEl, datalistEl, ... }
  let lastComputed = null; // { items, tenorBulan } — dipakai untuk render ulang saat bahasa berganti

  function resetResultUI() {
    resultBox.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
    currentSimPayload = null;
    lastComputed = null;
  }

  function showWarn(msg) {
    showWarnModal(msg);
    resultBox.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
    currentSimPayload = null;
    lastComputed = null;
  }

  function showResult({ label, value, metaHTML, payload }) {
    document.getElementById(ids.resultLabel).textContent = label;
    document.getElementById(ids.resultValue).textContent = value;
    document.getElementById(ids.resultMeta).innerHTML = metaHTML;
    resultBox.hidden = false;
    btnSimpanSimulasi.hidden = false;
    btnSimpanSimulasi.textContent = t('btnSimpanSim');
    simSavedMsg.hidden = true;
    currentSimPayload = payload;
  }

  btnSimpanSimulasi.addEventListener('click', () => {
    if (!currentSimPayload) return;
    try {
      sessionStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(currentSimPayload));
      simSavedMsg.textContent = t('simSavedMsgText');
      simSavedMsg.hidden = false;
      btnSimpanSimulasi.textContent = t('btnTersimpan');
      window.dispatchEvent(new CustomEvent('repoSimulasiTersimpan', { detail: currentSimPayload }));
    } catch (err) {
      console.error('Gagal menyimpan simulasi ke sessionStorage:', err);
    }
  });

  // Cari kode efek dari nilai yang diketik user di field datalist.
  function resolveKode(inputValue, map) {
    const val = (inputValue || '').trim();
    if (map[val]) return map[val];
    const guess = val.split(/[-–—]/)[0].trim().toUpperCase();
    return guess;
  }

  // ---- Hitung total kebutuhan dana (mode reverse) dari semua baris, live ----
  function updateTotalTarget() {
    if (!isReverse) return;
    let total = 0;
    let adaIsi = false;
    rows.forEach((row) => {
      const v = parseRupiahInput(row.targetInput.value);
      if (v > 0) adaIsi = true;
      total += v;
    });
    if (!adaIsi) {
      totalTargetBox.hidden = true;
      return;
    }
    totalTargetValue.textContent = rupiah(total);
    totalTargetBox.hidden = false;
  }

  // ---- Isi datalist baris sesuai jenis efek (saham/obligasi) yang dipilih ----
  function fillRowDatalist(row) {
    const jenis = row.jenisEl.value;
    if (jenis === 'saham') {
      row.datalistEl.innerHTML = sahamOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? t('phCariSaham') : t('phLoadingSaham');
      if (!isReverse) {
        row.jumlahLotField.hidden = false;
        row.jumlahNominalField.hidden = true;
      }
    } else {
      row.datalistEl.innerHTML = obligasiOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? t('phCariObligasi') : t('phLoadingObligasi');
      if (!isReverse) {
        row.jumlahLotField.hidden = true;
        row.jumlahNominalField.hidden = false;
      }
    }
    row.kodeEl.value = '';
  }

  function createRow() {
    rowIdCounter += 1;
    const id = `${mode}-${rowIdCounter}`;

    const wrap = document.createElement('div');
    wrap.className = 'sim-grid efek-row';
    wrap.dataset.rowId = String(id);
    wrap.style.cssText = 'border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:1rem 1rem 0.6rem; margin-bottom:1rem; position:relative;';

    const jumlahFieldsHTML = isReverse
      ? `<div class="field row-target-field">
           <label data-i18n="lblKebutuhanDana">${t('lblKebutuhanDana')}</label>
           <input type="text" inputmode="numeric" class="row-target" placeholder="${t('phContohNominal')}" data-i18n-placeholder="phContohNominal" />
         </div>`
      : `<div class="field row-jumlah-lot-field">
           <label data-i18n="lblJumlahLot">${t('lblJumlahLot')}</label>
           <input type="number" class="row-jumlah-lot" min="1" step="100" value="100" />
         </div>
         <div class="field row-jumlah-nominal-field" hidden>
           <label data-i18n="lblNominalObligasi">${t('lblNominalObligasi')}</label>
           <input type="text" inputmode="numeric" class="row-jumlah-nominal" placeholder="${t('phContohNominal')}" data-i18n-placeholder="phContohNominal" />
         </div>`;

    wrap.innerHTML = `
      <button type="button" class="btn-hapus-row" title="${t('titleHapusRow')}" data-i18n-title="titleHapusRow"
              style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; cursor:pointer; font-size:1.1rem; line-height:1; color:#888;">✕</button>
      <div class="field">
        <label data-i18n="lblJenisEfek">${t('lblJenisEfek')}</label>
        <select class="row-jenis">
          <option value="saham" data-i18n="optSaham">${t('optSaham')}</option>
          <option value="obligasi" data-i18n="optObligasi">${t('optObligasi')}</option>
        </select>
      </div>
      <div class="field" style="grid-column: span 2;">
        <label data-i18n="lblKodeEfek">${t('lblKodeEfek')}</label>
        <input type="text" class="row-kode" list="dl-row-${id}" placeholder="${t('phLoadingSaham')}" autocomplete="off" />
        <datalist id="dl-row-${id}"></datalist>
      </div>
      ${jumlahFieldsHTML}
    `;
    efekList.appendChild(wrap);

    const row = {
      id,
      el: wrap,
      jenisEl: wrap.querySelector('.row-jenis'),
      kodeEl: wrap.querySelector('.row-kode'),
      datalistEl: wrap.querySelector(`#dl-row-${id}`),
    };

    if (isReverse) {
      row.targetField = wrap.querySelector('.row-target-field');
      row.targetInput = wrap.querySelector('.row-target');
      row.targetInput.addEventListener('input', () => {
        const raw = row.targetInput.value.replace(/\D/g, '');
        row.targetInput.value = raw ? Number(raw).toLocaleString('id-ID') : '';
        updateTotalTarget();
        resetResultUI();
      });
    } else {
      row.jumlahLotField = wrap.querySelector('.row-jumlah-lot-field');
      row.jumlahLotInput = wrap.querySelector('.row-jumlah-lot');
      row.jumlahNominalField = wrap.querySelector('.row-jumlah-nominal-field');
      row.jumlahNominalInput = wrap.querySelector('.row-jumlah-nominal');
      row.jumlahLotInput.addEventListener('input', resetResultUI);
      row.jumlahNominalInput.addEventListener('input', () => {
        const raw = row.jumlahNominalInput.value.replace(/\D/g, '');
        row.jumlahNominalInput.value = raw ? Number(raw).toLocaleString('id-ID') : '';
        resetResultUI();
      });
    }

    rows.set(id, row);
    fillRowDatalist(row);

    row.jenisEl.addEventListener('change', () => {
      fillRowDatalist(row);
      resetResultUI();
    });

    row.kodeEl.addEventListener('input', resetResultUI);

    wrap.querySelector('.btn-hapus-row').addEventListener('click', () => {
      rows.delete(id);
      wrap.remove();
      updateTotalTarget();
      resetResultUI();
    });

    return row;
  }

  btnTambahEfek.addEventListener('click', () => createRow());

  // ---- Load data referensi & isi datalist semua baris yang sudah ada ----
  DataLoader.loadAll()
    .then((data) => {
      simData = data;
      sahamOptions = DataLoader.getSahamOptions(data);
      sahamMap = {};
      sahamOptions.forEach((o) => { sahamMap[o.display] = o.kode_efek; });

      obligasiOptions = DataLoader.getObligasiOptions(data);
      obligasiMap = {};
      obligasiOptions.forEach((o) => {
        obligasiMap[o.display] = { kode_efek: o.kode_efek, is_korporasi: o.is_korporasi === true || o.is_korporasi === 'true' };
      });

      rows.forEach((row) => fillRowDatalist(row));
    })
    .catch((err) => {
      rows.forEach((row) => {
        row.kodeEl.placeholder = 'Gagal memuat data';
        row.kodeEl.disabled = true;
      });
      console.error('Gagal memuat data referensi simulator:', err);
    });

  // Mulai dengan 1 baris efek
  createRow();

  const tableRow = (label, val, bold) => (
    `<tr><td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666); white-space:nowrap;">${label}</td>` +
    `<td style="text-align:right; padding:0.3rem 0; ${bold ? 'font-weight:700;' : ''}">${val}</td></tr>`
  );

  // ---- Bangun & tampilkan hasil dari daftar items (dipanggil saat hitung, dan
  //      dipanggil ulang saat bahasa berganti supaya hasil yang sedang tampil
  //      ikut diterjemahkan tanpa perlu klik hitung ulang) ----
  function buildAndShowResult(items, tenorBulan) {
    let totalBungaSemua = 0;
    let totalPengembalianSemua = 0;
    let totalBungaPerBulanSemua = 0;
    let totalPokokSemua = 0;
    let adaRateTidakDitemukan = false;

    items.forEach((it) => {
      const rateAnnual = it.jenis === 'saham'
        ? CalcEngine.getInterestRateSaham(it.rateKey)
        : CalcEngine.getInterestRateObligasi(it.rateKey);
      const bunga = CalcEngine.hitungKewajibanPembayaran({ pokokPinjaman: it.estimasiPendanaan, tenorBulan, rateAnnual });
      it.bunga = bunga;
      if (bunga.error) {
        adaRateTidakDitemukan = true;
      } else {
        totalBungaSemua += bunga.total_bunga;
        totalPengembalianSemua += bunga.total_pengembalian;
        totalBungaPerBulanSemua += bunga.bunga_per_bulan;
        totalPokokSemua += it.estimasiPendanaan;
      }
    });

    const totalEstimasiPendanaan = items.reduce((sum, it) => sum + it.estimasiPendanaan, 0);

    const itemsHTML = items.map((it, i) => {
      const jenisLabel = it.jenis === 'saham' ? t('optSaham') : t('optObligasi');
      const bungaRows = it.bunga.error
        ? tableRow(`⚠ ${t('rowBungaError')}`, `<span style="color:var(--maroon-700)">${it.bunga.error}</span>`)
        : tableRow(t('rowBungaPA'), `${(it.bunga.rate_annual * 100).toFixed(0)}%`) +
          tableRow(t('rowBungaPerBulan'), rupiah(it.bunga.bunga_per_bulan)) +
          tableRow(t('rowTotalBunga', { tenor: tenorBulan }), rupiah(it.bunga.total_bunga));

      return (
        `<div style="margin-top:${i === 0 ? '0' : '1.1rem'}; padding-top:${i === 0 ? '0' : '1.1rem'}; ${i === 0 ? '' : 'border-top:1px dashed rgba(0,0,0,0.12);'} text-align:left;">` +
        `<div style="font-weight:700; margin-bottom:0.4rem;">#${i + 1} — ${jenisLabel}: ${it.namaTampil} (${it.jumlahDisplay})</div>` +
        `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
        tableRow(currentLang === 'id' ? 'Estimasi Pendanaan' : 'Estimated Funding', rupiah(it.estimasiPendanaan)) +
        it.detailRows +
        bungaRows +
        `</table>` +
        `</div>`
      );
    }).join('');

    const jadwalRows = [];
    for (let bulan = 1; bulan <= tenorBulan; bulan++) {
      const isLast = bulan === tenorBulan;
      const bayarBulanIni = totalBungaPerBulanSemua + (isLast ? totalPokokSemua : 0);
      const keterangan = isLast ? t('jadwalKetBungaPokok') : t('jadwalKetBunga');
      jadwalRows.push(
        `<tr>` +
        `<td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666);">${t('jadwalBulanN', { n: bulan })}</td>` +
        `<td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666); font-size:0.8rem;">${keterangan}</td>` +
        `<td style="text-align:right; padding:0.3rem 0; ${isLast ? 'font-weight:700;' : ''}">${rupiah(bayarBulanIni)}</td>` +
        `</tr>`
      );
    }
    const jadwalHTML =
      `<div style="margin-top:0.9rem;">` +
      `<div style="font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">${t('jadwalTitle')}</div>` +
      `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
      `<thead><tr>` +
      `<th style="text-align:left; padding:0.2rem 0.8rem 0.4rem 0; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">${t('jadwalColBulan')}</th>` +
      `<th style="text-align:left; padding:0.2rem 0.8rem 0.4rem 0; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">${t('jadwalColKeterangan')}</th>` +
      `<th style="text-align:right; padding:0.2rem 0 0.4rem; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">${t('jadwalColJumlah')}</th>` +
      `</tr></thead><tbody>` +
      jadwalRows.join('') +
      `</tbody></table>` +
      `</div>`;

    const highlightHTML = adaRateTidakDitemukan ? '' :
      `<div style="margin-top:1rem; padding:1rem 1.2rem; border-radius:12px; background:var(--maroon-700,#b03236); color:#fff; text-align:center;">` +
      `<div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.85;">${t('highlightTotalTitle', { tenor: tenorBulan })}</div>` +
      `<div style="font-size:1.5rem; font-weight:700; margin-top:0.2rem;">${rupiah(totalPengembalianSemua)}</div>` +
      `</div>`;

    const ringkasanBungaHTML = adaRateTidakDitemukan
      ? ''
      : `<div style="margin-top:1.3rem; background:#fff; border:1.5px solid rgba(122,30,40,0.25); border-radius:14px; padding:1.1rem 1.2rem 1.2rem; text-align:left; box-shadow:0 4px 14px rgba(74,16,24,0.06);">` +
        `<div style="font-weight:700; margin-bottom:0.6rem; font-size:0.95rem; color:var(--maroon-900,#4A1018);">${t('ringkasanBungaTitle', { tenor: tenorBulan })}</div>` +
        `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
        tableRow(t('totalBungaLabel'), rupiah(totalBungaSemua)) +
        `</table>` +
        jadwalHTML +
        highlightHTML +
        `</div>`;

    const label = isReverse
      ? (items.length > 1 ? t('headlineRevMulti', { n: items.length }) : t('headlineRevSingle'))
      : (items.length > 1 ? t('headlineFwdMulti', { n: items.length }) : t('headlineFwdSingle'));
    const value = rupiah(totalEstimasiPendanaan);
    const metaHTML = itemsHTML + ringkasanBungaHTML;

    lastComputed = { items, tenorBulan };

    showResult({
      label,
      value,
      metaHTML,
      payload: {
        mode,
        tenorBulan,
        items,
        totalEstimasiPendanaan,
        totalBungaSemua,
        totalPengembalianSemua,
        timestamp: Date.now(),
      },
    });
  }

  i18nRerenderers.push(() => {
    if (lastComputed) buildAndShowResult(lastComputed.items, lastComputed.tenorBulan);
  });

  // ---- Hitung SEMUA baris efek sekaligus ----
  btn.addEventListener('click', async () => {
    if (!simData) {
      showWarn(t('warnDataMasihDimuat'));
      return;
    }
    if (rows.size === 0) {
      showWarn(t('warnTambahEfek'));
      return;
    }
    hideWarnModal();
    const tenorBulan = parseInt(tenorSel.value, 10) || 1;
    const origLabel = btn.textContent;
    btn.disabled = true;

    try {
      const items = [];
      const efekKenaCapMaxPendanaan = []; // kumpulan nama efek saham yang estimasi pendanaannya dipangkas krn Rp20M
      let rowIndex = 0;

      for (const row of rows.values()) {
        rowIndex += 1;
        const jenis = row.jenisEl.value;
        const namaTampil = row.kodeEl.value.trim();

        if (jenis === 'saham') {
          const kodeSaham = resolveKode(namaTampil, sahamMap);

          if (!isReverse) {
            const jumlahLot = parseInt(row.jumlahLotInput.value, 10) || 0;
            if (!kodeSaham || jumlahLot <= 0) {
              showWarn(t('warnPilihSahamLot', { n: rowIndex }));
              return;
            }
            btn.textContent = t('fetchingHarga', { kode: kodeSaham });
            const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
            if (marketMetrics.error) { showWarn(t('warnMarketError', { n: rowIndex, kode: kodeSaham, pesan: marketMetrics.error })); return; }

            const instrumentRow = simData.instrumentByKode[kodeSaham];
            const haircutRow = simData.haircutKpei[kodeSaham];
            const listedFfRow = simData.listedFreefloat[kodeSaham];
            if (!instrumentRow || !haircutRow || !listedFfRow) {
              showWarn(t('warnDataSahamTidakLengkap', { n: rowIndex, kode: kodeSaham }));
              return;
            }

            const result = CalcEngine.simulateStockFunding({ kodeSaham, jumlahLot, marketMetrics, instrumentRow, haircutRow, listedFfRow });
            if (result.error) { showWarn(t('warnGenericItem', { n: rowIndex, pesan: result.error })); return; }

            if (result.kena_cap_max_pendanaan) {
              efekKenaCapMaxPendanaan.push(namaTampil || kodeSaham);
            }
            items.push({
              jenis: 'saham', kode: kodeSaham, namaTampil: namaTampil || kodeSaham,
              jumlah: jumlahLot, satuan: t('unitLot'), jumlahIsRupiah: false,
              jumlahDisplay: `${jumlahLot.toLocaleString('id-ID')} ${t('unitLot')}`,
              estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.group,
              detailRows:
                tableRow(t('rowHargaPenutupan'), rupiah(marketMetrics.latest_close)) +
                tableRow(t('rowNilaiJaminan'), rupiah(result.nilai_jaminan_final)) +
                tableRow(t('rowRasio'), `${(result.recommended_ratio * 100).toFixed(0)}%`) +
                tableRow(t('rowGroup'), result.group) +
                (result.kena_cap ? tableRow(t('catatanLabel'), `<span style="color:var(--maroon-700)">${t('rowCatatanCapSaham')}</span>`) : ''),
            });

          } else {
            const targetPendanaan = parseRupiahInput(row.targetInput.value);
            if (!kodeSaham || targetPendanaan <= 0) {
              showWarn(t('warnPilihSahamTarget', { n: rowIndex }));
              return;
            }
            btn.textContent = t('fetchingHarga', { kode: kodeSaham });
            const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
            if (marketMetrics.error) { showWarn(t('warnMarketError', { n: rowIndex, kode: kodeSaham, pesan: marketMetrics.error })); return; }

            const instrumentRow = simData.instrumentByKode[kodeSaham];
            const haircutRow = simData.haircutKpei[kodeSaham];
            const listedFfRow = simData.listedFreefloat[kodeSaham];
            if (!instrumentRow || !haircutRow || !listedFfRow) {
              showWarn(t('warnDataSahamTidakLengkap', { n: rowIndex, kode: kodeSaham }));
              return;
            }

            const result = CalcEngine.computeRequiredStockLots({ kodeSaham, targetPendanaan, marketMetrics, instrumentRow, haircutRow, listedFfRow });
            if (result.error) { showWarn(t('warnGenericItem', { n: rowIndex, pesan: result.error })); return; }

            if (result.kena_cap_max_pendanaan) {
              efekKenaCapMaxPendanaan.push(namaTampil || kodeSaham);
            }
            items.push({
              jenis: 'saham', kode: kodeSaham, namaTampil: namaTampil || kodeSaham,
              jumlah: result.jumlah_lot_dibutuhkan, satuan: t('unitLot'), jumlahIsRupiah: false,
              jumlahDisplay: t('jumlahLotDibutuhkan', { n: result.jumlah_lot_dibutuhkan.toLocaleString('id-ID') }),
              estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.group,
              detailRows:
                tableRow(t('rowHargaPenutupan'), rupiah(marketMetrics.latest_close)) +
                tableRow(t('rowJumlahLembar'), result.jumlah_lembar_dibutuhkan.toLocaleString('id-ID')) +
                tableRow(t('rowRasio'), `${(result.recommended_ratio * 100).toFixed(0)}%`) +
                tableRow(t('rowGroup'), result.group) +
                (result.kena_cap
                  ? tableRow(t('catatanLabel'), `<span style="color:var(--maroon-700)">${t('rowCatatanCapKebutuhan', { maks: rupiah(result.max_pendanaan_dari_cap) })}</span>`)
                  : ''),
            });
          }

        } else {
          const kodeObligasi = resolveKode(namaTampil, Object.fromEntries(
            Object.entries(obligasiMap).map(([k, v]) => [k, v.kode_efek])
          ));
          const bondRow = simData.statisEfek[kodeObligasi];

          if (!bondRow) {
            showWarn(t('warnObligasiTidakDitemukan', { n: rowIndex, kode: kodeObligasi || t('belumDipilih') }));
            return;
          }

          if (!isReverse) {
            const nilaiNominal = parseRupiahInput(row.jumlahNominalInput.value);
            if (!kodeObligasi || nilaiNominal <= 0) {
              showWarn(t('warnPilihObligasiNominal', { n: rowIndex }));
              return;
            }
            const result = CalcEngine.simulateBondFunding({ kodeObligasi, nilaiNominal, bondRow });
            if (result.error) { showWarn(t('warnGenericItem', { n: rowIndex, pesan: result.error })); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlah: nilaiNominal, satuan: currentLang === 'id' ? 'Nominal (Rp)' : 'Nominal (Rp)', jumlahIsRupiah: true,
              jumlahDisplay: t('nominalLabel', { rp: rupiah(nilaiNominal) }),
              estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.jenis_obligasi,
              detailRows:
                tableRow(t('rowNilaiJaminan'), rupiah(result.nilai_jaminan)) +
                tableRow(t('rowRasio'), `${(result.rasio * 100).toFixed(0)}%`) +
                tableRow(t('rowJenis'), result.jenis_obligasi) +
                tableRow(t('rowJatuhTempo'), formatTanggalObligasi(result.maturity_date)),
            });

          } else {
            const targetPendanaan = parseRupiahInput(row.targetInput.value);
            if (!kodeObligasi || targetPendanaan <= 0) {
              showWarn(t('warnPilihObligasiTarget', { n: rowIndex }));
              return;
            }
            const result = CalcEngine.computeRequiredBondNominal({ kodeObligasi, targetPendanaan, bondRow });
            if (result.error) { showWarn(t('warnGenericItem', { n: rowIndex, pesan: result.error })); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlah: result.nilai_nominal_dibutuhkan, satuan: 'Nominal (Rp)', jumlahIsRupiah: true,
              jumlahDisplay: t('nominalDibutuhkan', { rp: rupiah(result.nilai_nominal_dibutuhkan) }),
              estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.jenis_obligasi,
              detailRows:
                tableRow(t('rowRasio'), `${(result.rasio * 100).toFixed(0)}%`) +
                tableRow(t('rowJenis'), result.jenis_obligasi) +
                tableRow(t('rowJatuhTempo'), formatTanggalObligasi(result.maturity_date)),
            });
          }
        }
      }

      // Notifikasi pop-up (bukan error, kalkulasi tetap lanjut) kalau ada efek saham
      // yang estimasi pendanaannya kepotong karena kena batas maksimum Rp20 miliar.
      if (efekKenaCapMaxPendanaan.length > 0) {
        const daftarEfek = efekKenaCapMaxPendanaan.join(', ');
        showWarnModal(t('warnCapModal', { daftar: daftarEfek }));
      }

      buildAndShowResult(items, tenorBulan);

    } catch (err) {
      showWarn(t('warnHitungError', { pesan: err.message }));
    } finally {
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  });
}

createSimulatorInstance('forward', {
  btnHitung: 'btnHitungFwd',
  resultBox: 'resultBoxFwd',
  resultLabel: 'resultLabelFwd',
  resultValue: 'resultValueFwd',
  resultMeta: 'resultMetaFwd',
  btnSimpan: 'btnSimpanSimulasiFwd',
  simSavedMsg: 'simSavedMsgFwd',
  tenorSel: 'tenorSimulasiFwd',
  efekList: 'efekListFwd',
  btnTambahEfek: 'btnTambahEfekFwd',
});

createSimulatorInstance('reverse', {
  btnHitung: 'btnHitungRev',
  resultBox: 'resultBoxRev',
  resultLabel: 'resultLabelRev',
  resultValue: 'resultValueRev',
  resultMeta: 'resultMetaRev',
  btnSimpan: 'btnSimpanSimulasiRev',
  simSavedMsg: 'simSavedMsgRev',
  tenorSel: 'tenorSimulasiRev',
  efekList: 'efekListRev',
  btnTambahEfek: 'btnTambahEfekRev',
  totalTargetBox: 'totalTargetBoxRev',
  totalTargetValue: 'totalTargetValueRev',
});

/* ============================================================
   MUAT SIMULASI TERSIMPAN — ke Form Pengajuan
   Membaca sessionStorage (diisi oleh tombol "Simpan Simulasi Ini untuk
   Form Pengajuan" di simulator), menampilkan ringkasannya, dan mengisi
   otomatis field "Saham/Obligasi yang Diajukan" + "Rencana Pengajuan"
   kalau tombol "Gunakan Data Ini di Form" diklik.

   Kotak ini di-refresh baik saat halaman pertama dimuat MAUPUN langsung
   saat tombol simpan di simulator diklik (lewat custom event
   'repoSimulasiTersimpan') — supaya muncul tanpa perlu reload halaman,
   dan juga saat bahasa berganti supaya ringkasannya ikut diterjemahkan.
   ============================================================ */
(function muatSimulasiTersimpan() {
  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';
  const box = document.getElementById('simulasiTersimpanBox');
  const metaEl = document.getElementById('simulasiTersimpanMeta');
  const btnMuat = document.getElementById('btnMuatSimulasi');
  const fSaham = document.getElementById('fSaham');
  const fRencana = document.getElementById('fRencana');
  if (!box || !metaEl || !btnMuat || !fSaham) return;

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  let saved = null;
  let dataDimuat = false;

  function refreshBox() {
    try {
      const raw = sessionStorage.getItem(SIM_STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Gagal membaca simulasi tersimpan:', err);
      saved = null;
    }

    // Format lama (satu efek, tanpa "items") sudah tidak didukung — abaikan saja.
    if (!saved || !Array.isArray(saved.items) || saved.items.length === 0) {
      box.hidden = true;
      saved = null;
      return;
    }

    const ringkasanPerEfek = saved.items
      .map((it) => `${it.jenis === 'saham' ? t('optSaham') : t('optObligasi')} ${it.namaTampil} (${it.jumlahDisplay})`)
      .join(' + ');

    metaEl.innerHTML =
      `${saved.items.length} — <strong>${ringkasanPerEfek}</strong><br/>` +
      `${t('totalEstimasiLabel')}: ${rupiah(saved.totalEstimasiPendanaan)}`;
    box.hidden = false;
    btnMuat.textContent = dataDimuat ? t('btnDataDimuat') : t('btnGunakanData');
  }

  btnMuat.addEventListener('click', () => {
    if (!saved) return;

    const daftarEfek = saved.items
      .map((it) => `${it.jenis === 'saham' ? t('optSaham') : t('optObligasi')}: ${it.namaTampil} — ${it.jumlahDisplay}`)
      .join('\n');
    fSaham.value = `${daftarEfek}\n${t('totalEstimasiLabel')}: ${rupiah(saved.totalEstimasiPendanaan)}`;

    if (fRencana && !fRencana.value.trim()) {
      fRencana.value = t('autoRencanaText', { rp: rupiah(saved.totalEstimasiPendanaan), n: saved.items.length });
    }

    dataDimuat = true;
    btnMuat.textContent = t('btnDataDimuat');
    fSaham.focus();
  });

  refreshBox(); // saat halaman pertama dimuat
  window.addEventListener('repoSimulasiTersimpan', refreshBox); // saat tombol simpan di simulator diklik (live, tanpa refresh)
  i18nRerenderers.push(refreshBox); // saat bahasa berganti
})();

/* ============================================================
   BROKER "LAINNYA" — tampilkan field nama broker manual kalau
   opsi "Lainnya (broker tidak ada di daftar)" dipilih.
   ============================================================ */
(function brokerLainnya() {
  const select = document.getElementById('fBroker');
  const fieldLainnya = document.getElementById('fieldBrokerLainnya');
  const inputLainnya = document.getElementById('fBrokerLainnya');
  if (!select || !fieldLainnya || !inputLainnya) return;

  select.addEventListener('change', () => {
    const isLainnya = select.value === 'Lainnya';
    fieldLainnya.hidden = !isLainnya;
    inputLainnya.required = isLainnya;
    if (!isLainnya) inputLainnya.value = '';
  });
})();

/* ============================================================
   FORM PENGAJUAN — 2 LANGKAH
   Step 1 (identitas dasar: nama/email/WA) -> tombol "Lanjutkan"
   Step 2 (broker, tenor, rencana, data simulasi, captcha, submit).
   Validasi step 1 dicek manual (checkValidity) sebelum pindah step,
   karena field di step 2 yang hidden otomatis dikecualikan dari
   validasi form oleh browser (elemen [hidden] tidak ikut divalidasi).
   ============================================================ */
(function formSteps() {
  const step1 = document.getElementById('formStep1');
  const step2 = document.getElementById('formStep2');
  const btnNext = document.getElementById('btnNextStep');
  const btnBack = document.getElementById('btnBackStep');
  if (!step1 || !step2 || !btnNext || !btnBack) return;

  const fNama = document.getElementById('fNama');
  const fEmail = document.getElementById('fEmail');
  const fWhatsapp = document.getElementById('fWhatsapp');

  btnNext.addEventListener('click', () => {
    if (!fNama.checkValidity()) { fNama.reportValidity(); return; }
    if (!fEmail.checkValidity()) { fEmail.reportValidity(); return; }
    if (!fWhatsapp.checkValidity()) { fWhatsapp.reportValidity(); return; }

    step1.hidden = true;
    step2.hidden = false;
    step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  btnBack.addEventListener('click', () => {
    step2.hidden = true;
    step1.hidden = false;
    step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* ============================================================
   FORM SUBMISSION — via Web3Forms (gratis, tanpa backend)
   Daftar & ambil access key gratis di https://web3forms.com
   lalu ganti value pada <input name="access_key"> di index.html
   ============================================================ */
(function formHandler() {
  const form = document.getElementById('pengajuanForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const btnSubmit = document.getElementById('btnSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const accessKey = form.querySelector('input[name="access_key"]').value;
    if (!accessKey || accessKey.includes('GANTI_DENGAN')) {
      statusEl.hidden = false;
      statusEl.className = 'form-status err';
      statusEl.textContent = t('statusAccessKeyMissing');
      return;
    }

    const hCaptchaResp = form.querySelector('textarea[name="h-captcha-response"]');
    if (!hCaptchaResp || !hCaptchaResp.value) {
      statusEl.hidden = false;
      statusEl.className = 'form-status err';
      statusEl.textContent = t('statusCaptchaMissing');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = t('sendingText');

    try {
      const formData = new FormData(form);
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      const result = await res.json();

      statusEl.hidden = false;
      if (result.success) {
        statusEl.className = 'form-status ok';
        statusEl.textContent = t('statusSuccess');
        form.reset();
      } else {
        statusEl.className = 'form-status err';
        statusEl.textContent = t('statusPartialFail');
      }
    } catch (err) {
      statusEl.hidden = false;
      statusEl.className = 'form-status err';
      statusEl.textContent = t('statusConnError');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = t('btnKirim');
    }
  });
})();
