/* ============================================================
   CALC ENGINE — port dari calc_engine.py (Python)
   Core logic simulasi estimasi pendanaan REPO.

   Alur:
   1. Tentukan Group instrumen (LQ45 / IDX80 non LQ45 / Marjin Lainnya / Non Marjin)
   2. Tentukan kategori Haircut KPEI (Low / MedLow / MedHigh / High)
   3. Cari Recommended Ratio dari matrix rasio (pakai VaR & Days-to-Sell utk pilih tier)
   4. Hitung Nilai Jaminan mentah = jumlah lembar x harga (ambil yang terendah
      antara avg closing 3 bulan vs closing terbaru, sebagai buffer konservatif)
   5. Cap Nilai Jaminan ke batas per-saham: MIN(5% x Listed Shares Value, 20% x Free Float Value)
   6. Estimasi Pendanaan = Nilai Jaminan (setelah cap) / Recommended Ratio

   Catatan: batas maksimum per counterpart (15% x Equity PEI) & cek outstanding
   REPO existing SENGAJA di-skip di versi ini (keputusan user, sama seperti versi Python).
   ============================================================ */

const CalcEngine = (() => {

  // ---- Config (dari config.py) ----
  const CAP_PCT_LISTED_SHARES = 0.05; // 5% dari Listed Shares Value
  const CAP_PCT_FREE_FLOAT = 0.20;    // 20% dari Free Float Value

  // ---- Matrix rasio saham (dari data_loader.load_rasio_saham_matrix) ----
  const RASIO_SAHAM_MATRIX = {
    LQ45: [
      { Low: 1.5, MedLow: 1.55, MedHigh: 1.65, High: 1.75 },
      { Low: 1.55, MedLow: 1.6, MedHigh: 1.7, High: 1.75 },
      { Low: 1.6, MedLow: 1.65, MedHigh: 1.75, High: 1.75 },
    ],
    IDX80_NON_LQ45: [
      { Low: 1.75, MedLow: 1.8, MedHigh: 1.9, High: 2.0 },
      { Low: 1.8, MedLow: 1.85, MedHigh: 1.95, High: 2.0 },
      { Low: 1.85, MedLow: 1.9, MedHigh: 2.0, High: 2.0 },
    ],
    MARJIN_LAINNYA: [
      { Low: 2.0, MedLow: 2.05, MedHigh: 2.15, High: 2.25 },
      { Low: 2.05, MedLow: 2.1, MedHigh: 2.2, High: 2.25 },
      { Low: 2.1, MedLow: 2.15, MedHigh: 2.25, High: 2.25 },
    ],
    NON_MARJIN: [
      { Low: 2.25, MedLow: 2.3, MedHigh: 2.4, High: 2.5 },
      { Low: 2.3, MedLow: 2.35, MedHigh: 2.45, High: 2.5 },
      { Low: 2.35, MedLow: 2.4, MedHigh: 2.5, High: 2.5 },
    ],
  };

  // ---- Threshold VaR(%) & Days-to-Sell per group, untuk pilih tier ----
  const RASIO_SAHAM_THRESHOLDS = {
    LQ45: { var_pct: 25, days: 0.5 },
    IDX80_NON_LQ45: { var_pct: 35, days: 1 },
    MARJIN_LAINNYA: { var_pct: 50, days: 5 },
    NON_MARJIN: { var_pct: 50, days: 10 },
  };

  // ---- Obligasi ----
  const NOMINAL_PER_UNIT_OBLIGASI = 1_000_000; // Rp 1 juta / unit
  const RASIO_OBLIGASI_KORPORASI = { Sedang: 1.05, Tinggi: 1.20 };
  const RASIO_OBLIGASI_PEMERINTAH = 1.0;

  // ------------------------------------------------------------
  // Helper functions
  // ------------------------------------------------------------
  function tentukanGroup(indexMembership, isMargin) {
    const idx = (indexMembership || "").toUpperCase();
    if (idx.includes("LQ45")) return "LQ45";
    if (idx.includes("IDX80")) return "IDX80_NON_LQ45";
    if (isMargin) return "MARJIN_LAINNYA";
    return "NON_MARJIN";
  }

  function tentukanKategoriHaircut(haircutPct) {
    // Low <20% | MedLow 20-35% | MedHigh 35-50% | High >50%
    if (haircutPct < 20) return "Low";
    if (haircutPct < 35) return "MedLow";
    if (haircutPct <= 50) return "MedHigh";
    return "High";
  }

  function pilihTier(group, varPct, daysToSell, thresholds) {
    const th = thresholds[group];
    if (varPct == null || daysToSell == null) return 2; // fallback konservatif
    if (varPct < th.var_pct) {
      return daysToSell < th.days ? 0 : 1;
    }
    return 2;
  }

  function cariRecommendedRatio(group, tier, kategoriHaircut, rasioMatrix) {
    return rasioMatrix[group][tier][kategoriHaircut];
  }

  // ------------------------------------------------------------
  // SAHAM
  // ------------------------------------------------------------
  function simulateStockFunding({
    kodeSaham,
    jumlahLot,
    marketMetrics,   // { avg_close_3m, latest_close, var_20d_pct, days_to_sell_10bio }
    instrumentRow,   // { index_membership, is_margin }
    haircutRow,      // { haircut_kpei_pct }
    listedFfRow,     // { listed_shares, free_float_shares }
  }) {
    const jumlahLembar = jumlahLot * 100;

    // 1. Group & kategori haircut
    const group = tentukanGroup(instrumentRow.index_membership, instrumentRow.is_margin);
    const haircutPct = haircutRow.haircut_kpei_pct;
    if (haircutPct == null) {
      return { error: `Haircut KPEI untuk ${kodeSaham} tidak ditemukan` };
    }
    const kategoriHaircut = tentukanKategoriHaircut(haircutPct);

    // 2. Recommended ratio
    const tier = pilihTier(group, marketMetrics.var_20d_pct, marketMetrics.days_to_sell_10bio, RASIO_SAHAM_THRESHOLDS);
    const recommendedRatio = cariRecommendedRatio(group, tier, kategoriHaircut, RASIO_SAHAM_MATRIX);

    // 3. Nilai Jaminan mentah (harga terendah = buffer konservatif)
    const hargaTerendah = Math.min(marketMetrics.avg_close_3m, marketMetrics.latest_close);
    const nilaiJaminanMentah = jumlahLembar * hargaTerendah;

    // 4. Cap per saham (5% Listed Shares / 20% Free Float)
    const listedShares = listedFfRow.listed_shares;
    const freeFloatShares = listedFfRow.free_float_shares;
    const listedSharesValue = listedShares ? listedShares * hargaTerendah : null;
    const freeFloatValue = freeFloatShares ? freeFloatShares * hargaTerendah : null;

    const capListed = listedSharesValue != null ? listedSharesValue * CAP_PCT_LISTED_SHARES : null;
    const capFreefloat = freeFloatValue != null ? freeFloatValue * CAP_PCT_FREE_FLOAT : null;
    const caps = [capListed, capFreefloat].filter((c) => c != null);
    const maxCollValue = caps.length ? Math.min(...caps) : null;

    const nilaiJaminanFinal = maxCollValue != null ? Math.min(nilaiJaminanMentah, maxCollValue) : nilaiJaminanMentah;
    const kenaCap = maxCollValue != null && nilaiJaminanMentah > maxCollValue;

    // 5. Estimasi pendanaan
    const estimasiPendanaan = nilaiJaminanFinal / recommendedRatio;

    return {
      kode_saham: kodeSaham,
      jumlah_lot: jumlahLot,
      jumlah_lembar: jumlahLembar,
      group,
      kategori_haircut: kategoriHaircut,
      haircut_kpei_pct: haircutPct,
      harga_dipakai: hargaTerendah,
      avg_close_3m: marketMetrics.avg_close_3m,
      latest_close: marketMetrics.latest_close,
      var_20d_pct: marketMetrics.var_20d_pct,
      days_to_sell_10bio: marketMetrics.days_to_sell_10bio,
      recommended_ratio: recommendedRatio,
      nilai_jaminan_mentah: nilaiJaminanMentah,
      max_coll_value_cap: maxCollValue,
      kena_cap: kenaCap,
      nilai_jaminan_final: nilaiJaminanFinal,
      estimasi_pendanaan: estimasiPendanaan,
    };
  }

  // ------------------------------------------------------------
  // OBLIGASI
  // ------------------------------------------------------------
  function simulateBondFunding({
    kodeObligasi,
    jumlahUnit,
    bondRow, // { tipe_instrumen, closing_price_pct, nama_efek, maturity_date, kupon_pct }
    kategoriRisikoKorporasi = "Sedang",
  }) {
    const tipe = (bondRow.tipe_instrumen || "").toUpperCase();
    const closingPct = bondRow.closing_price_pct;
    if (closingPct == null) {
      return { error: `Closing price untuk ${kodeObligasi} tidak ditemukan` };
    }

    const isPemerintah = ["GOVERNMENT BOND", "SBSN", "SUKUK", "SPN"].includes(tipe);

    let jenisObligasi, rasio, kategoriRisiko;
    if (isPemerintah) {
      jenisObligasi = "Pemerintah";
      rasio = RASIO_OBLIGASI_PEMERINTAH;
      kategoriRisiko = "Rendah";
    } else {
      jenisObligasi = "Korporasi";
      if (!(kategoriRisikoKorporasi in RASIO_OBLIGASI_KORPORASI)) {
        kategoriRisikoKorporasi = "Sedang";
      }
      rasio = RASIO_OBLIGASI_KORPORASI[kategoriRisikoKorporasi];
      kategoriRisiko = kategoriRisikoKorporasi;
    }

    // Nilai Jaminan = jumlah unit x nominal per unit x closing price (fraksi par)
    const nilaiJaminan = jumlahUnit * NOMINAL_PER_UNIT_OBLIGASI * closingPct;
    const estimasiPendanaan = nilaiJaminan / rasio;

    return {
      kode_obligasi: kodeObligasi,
      nama_obligasi: bondRow.nama_efek,
      tipe_instrumen: tipe,
      jenis_obligasi: jenisObligasi,
      kategori_risiko: kategoriRisiko,
      jumlah_unit: jumlahUnit,
      nominal_per_unit: NOMINAL_PER_UNIT_OBLIGASI,
      closing_price_pct: closingPct,
      rasio,
      nilai_jaminan: nilaiJaminan,
      estimasi_pendanaan: estimasiPendanaan,
      maturity_date: bondRow.maturity_date,
      kupon_pct: bondRow.kupon_pct,
    };
  }

  return { simulateStockFunding, simulateBondFunding, tentukanGroup, tentukanKategoriHaircut };
})();
