/* ============================================================
   DATA LOADER — port dari data_loader.py
   Fetch file JSON statis (hasil convert dari Excel/txt asli) dan
   sediakan lookup cepat untuk calc-engine.js & UI simulator.

   CATATAN (obligasi): daftar obligasi eligible sekarang bersumber
   LANGSUNG dari data/statis_efek.json, yang sudah di-generate dari
   data master KSEI (StatisEfek) dengan filter:
     - Type: CORPORATE BOND atau GOVERNMENT BOND saja (Sukuk/SBSN/
       SPN dan tipe syariah lainnya otomatis TIDAK masuk)
     - Interest Type: "Fixed" (case-insensitive — "FIXED"/"Fixed"
       dianggap sama)
     - Currency: IDR saja (obligasi USD dikecualikan karena skema
       harga/nominalnya beda, tidak cocok dengan rumus yang dipakai)
     - Status: ACTIVE
   Ditambah filter di getObligasiOptions() (bukan di file JSON-nya):
     - Maturity < 5 tahun dari hari ini — obligasi yang jatuh temponya
       masih lebih dari 5 tahun lagi tidak ditampilkan sebagai pilihan
       (dihitung ulang setiap load karena "5 tahun dari hari ini" bergeser
       tiap hari, beda dengan filter lain di atas yang statis).
       Field maturity_date di statis_efek.json formatnya "DD-MMM-YYYY"
       (mis. "06-FEB-2027") — DIPARSE MANUAL (bukan new Date(string)
       langsung), karena format non-ISO seperti ini "implementation-defined"
       di spec JS dan bisa diparse beda-beda antar browser.
   Jadi data-loader.js TIDAK perlu lagi cross-reference ke
   daftar_jaminan.json untuk menentukan eligibility obligasi —
   semua entri di statis_efek.json sudah pasti eligible dari sisi
   tipe/interest/currency/status, tinggal difilter maturity-nya.
   ============================================================ */
const DataLoader = (() => {
  let cache = null;

  // Parser tanggal "DD-MMM-YYYY" (mis. "06-FEB-2027") yang konsisten di semua
  // browser — lihat catatan di atas kenapa new Date(string) langsung tidak dipakai.
  const NAMA_BULAN = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function parseTanggalDDMMMYYYY(str) {
    if (!str) return null;
    const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(str).trim());
    if (!m) return null;
    const bulan = NAMA_BULAN[m[2].toUpperCase()];
    if (bulan == null) return null;
    return new Date(parseInt(m[3], 10), bulan, parseInt(m[1], 10));
  }

  async function fetchJsonFile(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Gagal memuat ${path} (HTTP ${res.status})`);
    return res.json();
  }

  async function loadAll() {
    if (cache) return cache;
    const [instrument, haircutKpei, daftarJaminan, listedFreefloat, statisEfek] = await Promise.all([
      fetchJsonFile("data/instrument.json"),
      fetchJsonFile("data/haircut_kpei.json"),
      fetchJsonFile("data/daftar_jaminan.json"),
      fetchJsonFile("data/listed_freefloat.json"),
      fetchJsonFile("data/statis_efek.json"),
    ]);
    // Index instrument by kode_efek untuk lookup cepat
    const instrumentByKode = {};
    instrument.forEach((row) => { instrumentByKode[row.kode_efek] = row; });
    cache = { instrument, instrumentByKode, haircutKpei, daftarJaminan, listedFreefloat, statisEfek };
    return cache;
  }

  // ---- Daftar saham yang eligible dijadikan jaminan (ada di daftar marjin + Active) ----
  function getSahamOptions(data) {
    const marjinCodes = new Set(data.daftarJaminan.saham_marjin.map((r) => r.kode_efek));
    return data.instrument
      .filter((row) => marjinCodes.has(row.kode_efek))
      .map((row) => ({
        kode_efek: row.kode_efek,
        display: `${row.kode_efek} — ${row.nama_instrumen || ""}`,
      }))
      .sort((a, b) => a.kode_efek.localeCompare(b.kode_efek));
  }

  // ---- Daftar obligasi eligible — dari statis_efek.json (sudah pre-filtered),
  //      ditambah filter maturity < 5 tahun dari hari ini. ----
  function getObligasiOptions(data) {
    const now = new Date();
    const batasMaturity = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());

    return Object.values(data.statisEfek)
      .filter((row) => row.status === "ACTIVE")
      .filter((row) => {
        const maturity = parseTanggalDDMMMYYYY(row.maturity_date);
        if (!maturity) return false; // tanpa data maturity valid, tidak bisa dipastikan eligible
        return maturity < batasMaturity;
      })
      .map((row) => ({
        kode_efek: row.kode_efek,
        display: `${row.kode_efek} — ${row.nama_efek || ""}`,
        is_korporasi: row.tipe_instrumen === "CORPORATE BOND",
      }))
      .sort((a, b) => a.kode_efek.localeCompare(b.kode_efek));
  }

  return { loadAll, getSahamOptions, getObligasiOptions };
})();
