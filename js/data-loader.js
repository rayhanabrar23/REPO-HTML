/* ============================================================
   DATA LOADER — port dari data_loader.py
   Fetch file JSON statis (hasil convert dari Excel/txt asli) dan
   sediakan lookup cepat untuk calc-engine.js & UI simulator.
   ============================================================ */

const DataLoader = (() => {
  let cache = null;

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

  // ---- Daftar obligasi eligible (SBN + korporasi, dan status ACTIVE di statis_efek) ----
  function getObligasiOptions(data) {
    const eligibleCodes = new Set([
      ...data.daftarJaminan.sbn.map((r) => r.kode_efek),
      ...data.daftarJaminan.obligasi_korporasi.map((r) => r.kode_efek),
    ]);
    return Object.values(data.statisEfek)
      .filter((row) => eligibleCodes.has(row.kode_efek) && row.status === "ACTIVE")
      .map((row) => ({
        kode_efek: row.kode_efek,
        display: `${row.kode_efek} — ${row.nama_efek || ""}`,
        is_korporasi: row.tipe_instrumen === "CORPORATE BOND",
      }))
      .sort((a, b) => a.kode_efek.localeCompare(b.kode_efek));
  }

  return { loadAll, getSahamOptions, getObligasiOptions };
})();
