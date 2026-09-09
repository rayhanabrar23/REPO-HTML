/* ============================================================
   CALC ENGINE — port dari calc_engine.py (Python)
   Core logic simulasi estimasi pendanaan REPO.

   Alur (mode forward — dari lot/unit ke estimasi pendanaan):
   1. Tentukan Group instrumen (LQ45 / IDX80 non LQ45 / Marjin Lainnya / Non Marjin)
   2. Tentukan kategori Haircut KPEI (Low / MedLow / MedHigh / High)
   3. Cari Recommended Ratio dari matrix rasio (pakai VaR & Days-to-Sell utk pilih tier)
   4. Hitung Nilai Jaminan mentah = jumlah lembar x harga (ambil yang terendah
      antara avg closing 3 bulan vs closing terbaru, sebagai buffer konservatif)
   5. Cap Nilai Jaminan ke batas per-saham: MIN(5% x Listed Shares Value, 20% x Free Float Value)
   6. Estimasi Pendanaan = Nilai Jaminan (setelah cap) / Recommended Ratio

   Mode reverse (dari kebutuhan pendanaan ke lot/unit) — kebalikan dari alur di atas:
   1-3 sama seperti forward (Group, Haircut, Recommended Ratio tidak tergantung
      besarnya dana yang diminta).
   4. Nilai Jaminan Dibutuhkan = Target Pendanaan x Recommended Ratio
   5. Kalau Nilai Jaminan Dibutuhkan > batas cap per-saham → kena cap, pendanaan
      yang bisa dipenuhi instrumen ini terbatas pada cap tsb (dana tidak akan
      terpenuhi penuh hanya dari 1 saham ini).
   6. Jumlah Lembar/Unit Dibutuhkan = Nilai Jaminan (setelah cap) / harga (saham)
      atau / (nominal x closing price) (obligasi) — dibulatkan KE ATAS ke satuan
      lot (saham, kelipatan 100 lembar) atau unit (obligasi).

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
  const RASIO_OBLIGASI_KORPORASI = 1.05; // flat 105% untuk semua obligasi korporasi (tidak ada pilihan kategori risiko)
  const RASIO_OBLIGASI_PEMERINTAH = 1.0;

  // ---- Batasan tambahan (poin baru) ----
  const MIN_HARGA_SAHAM = 300; // Rp — saham dengan harga di bawah ini otomatis ditolak sebagai jaminan REPO
  const MAX_PENDANAAN_SAHAM = 20_000_000_000; // Rp 20 miliar — estimasi pendanaan dari satu saham tidak boleh melebihi ini
  const MAX_MATURITY_TAHUN = 5; // obligasi dengan sisa jatuh tempo >= 5 tahun dari hari ini tidak eligible

  // Parser tanggal "DD-MMM-YYYY" (mis. "06-FEB-2027") — format asli di
  // data/statis_efek.json. SENGAJA tidak pakai new Date(string) langsung:
  // format non-ISO seperti ini "implementation-defined" di spec JS, jadi
  // parsingnya bisa beda-beda antar browser (aman di Chrome, belum tentu di
  // browser lain). Parser manual ini konsisten di semua browser.
  const NAMA_BULAN = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function parseTanggalDDMMMYYYY(str) {
    if (!str) return null;
    const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(str).trim());
    if (!m) return null;
    const bulan = NAMA_BULAN[m[2].toUpperCase()];
    if (bulan == null) return null;
    return new Date(parseInt(m[3], 10), bulan, parseInt(m[1], 10));
  }

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

  // Hitung Group, kategori haircut, tier & recommended ratio saham.
  // Dipakai bersama oleh mode forward maupun reverse (tidak tergantung
  // besar dana/jumlah lot yang diminta).
  function hitungRasioSaham({ kodeSaham, marketMetrics, instrumentRow, haircutRow }) {
    const group = tentukanGroup(instrumentRow.index_membership, instrumentRow.is_margin);

    // Saham non-marjin TIDAK eligible dijadikan jaminan Transaksi REPO —
    // tolak di sini, sebelum masuk ke perhitungan nilai jaminan/rasio sama sekali.
    // (Catatan: matrix RASIO_SAHAM_MATRIX.NON_MARJIN tetap ada di atas untuk referensi
    // historis, tapi sengaja tidak pernah dipakai karena kebijakan ini.)
    if (group === "NON_MARJIN") {
      return { error: `${kodeSaham} tidak eligible untuk dijadikan jaminan Transaksi REPO (non-marjin). Silakan pilih saham lain.` };
    }

    // Batas harga minimum saham — pakai harga terendah (buffer konservatif) yang
    // sama dengan yang dipakai untuk hitung Nilai Jaminan, biar konsisten.
    const hargaTerendahCek = Math.min(marketMetrics.avg_close_3m, marketMetrics.latest_close);
    if (hargaTerendahCek < MIN_HARGA_SAHAM) {
      return { error: `${kodeSaham} harganya Rp${hargaTerendahCek.toLocaleString('id-ID')} — di bawah batas minimum Rp${MIN_HARGA_SAHAM.toLocaleString('id-ID')} untuk dijadikan jaminan Transaksi REPO. Silakan pilih saham lain.` };
    }

    const haircutPct = haircutRow.haircut_kpei_pct;
    if (haircutPct == null) {
      return { error: `Haircut KPEI untuk ${kodeSaham} tidak ditemukan` };
    }
    const kategoriHaircut = tentukanKategoriHaircut(haircutPct);
    const tier = pilihTier(group, marketMetrics.var_20d_pct, marketMetrics.days_to_sell_10bio, RASIO_SAHAM_THRESHOLDS);
    const recommendedRatio = cariRecommendedRatio(group, tier, kategoriHaircut, RASIO_SAHAM_MATRIX);
    return { group, haircutPct, kategoriHaircut, tier, recommendedRatio };
  }

  // Cap nilai jaminan per saham (5% Listed Shares Value / 20% Free Float Value /
  // batas maks pendanaan Rp20 miliar), dalam Rupiah. Independen dari jumlah lot/dana
  // yang diminta. Cap ketiga (maks pendanaan) dikonversi dulu ke "ruang nilai jaminan"
  // (dikali recommendedRatio) supaya bisa dibandingkan apples-to-apples dengan 2 cap lainnya.
  function hitungCapSaham({ hargaTerendah, listedFfRow, recommendedRatio }) {
    const listedShares = listedFfRow.listed_shares;
    const freeFloatShares = listedFfRow.free_float_shares;
    const listedSharesValue = listedShares ? listedShares * hargaTerendah : null;
    const freeFloatValue = freeFloatShares ? freeFloatShares * hargaTerendah : null;
    const capListed = listedSharesValue != null ? listedSharesValue * CAP_PCT_LISTED_SHARES : null;
    const capFreefloat = freeFloatValue != null ? freeFloatValue * CAP_PCT_FREE_FLOAT : null;
    const capMaxPendanaan = MAX_PENDANAAN_SAHAM * recommendedRatio;
    const caps = [capListed, capFreefloat, capMaxPendanaan].filter((c) => c != null);
    return caps.length ? Math.min(...caps) : null;
  }

  // ------------------------------------------------------------
  // SAHAM — mode forward: jumlah lot -> estimasi pendanaan
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

    const rasioInfo = hitungRasioSaham({ kodeSaham, marketMetrics, instrumentRow, haircutRow });
    if (rasioInfo.error) return { error: rasioInfo.error };
    const { group, haircutPct, kategoriHaircut, recommendedRatio } = rasioInfo;

    // Nilai Jaminan mentah (harga terendah = buffer konservatif)
    const hargaTerendah = Math.min(marketMetrics.avg_close_3m, marketMetrics.latest_close);
    const nilaiJaminanMentah = jumlahLembar * hargaTerendah;

    // Cap per saham (5% Listed Shares / 20% Free Float / maks Rp20 miliar)
    const maxCollValue = hitungCapSaham({ hargaTerendah, listedFfRow, recommendedRatio });

    const nilaiJaminanFinal = maxCollValue != null ? Math.min(nilaiJaminanMentah, maxCollValue) : nilaiJaminanMentah;
    const kenaCap = maxCollValue != null && nilaiJaminanMentah > maxCollValue;

    // Estimasi pendanaan
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
  // SAHAM — mode reverse: kebutuhan pendanaan -> jumlah lot dibutuhkan
  // ------------------------------------------------------------
  function computeRequiredStockLots({
    kodeSaham,
    targetPendanaan, // Rp, kebutuhan dana yang diinput user
    marketMetrics,
    instrumentRow,
    haircutRow,
    listedFfRow,
  }) {
    if (!targetPendanaan || targetPendanaan <= 0) {
      return { error: "Kebutuhan pendanaan harus lebih dari 0" };
    }

    const rasioInfo = hitungRasioSaham({ kodeSaham, marketMetrics, instrumentRow, haircutRow });
    if (rasioInfo.error) return { error: rasioInfo.error };
    const { group, haircutPct, kategoriHaircut, recommendedRatio } = rasioInfo;

    const hargaTerendah = Math.min(marketMetrics.avg_close_3m, marketMetrics.latest_close);
    const maxCollValue = hitungCapSaham({ hargaTerendah, listedFfRow, recommendedRatio });
    const maxPendanaanDariCap = maxCollValue != null ? maxCollValue / recommendedRatio : null;

    // Nilai jaminan dibutuhkan supaya dana yang diminta terpenuhi
    const nilaiJaminanDibutuhkan = targetPendanaan * recommendedRatio;
    const kenaCap = maxCollValue != null && nilaiJaminanDibutuhkan > maxCollValue;
    const nilaiJaminanDipakai = kenaCap ? maxCollValue : nilaiJaminanDibutuhkan;

    // Jumlah lembar -> dibulatkan ke atas ke kelipatan 1 lot (100 lembar)
    const jumlahLembarMentah = nilaiJaminanDipakai / hargaTerendah;
    const jumlahLot = Math.ceil(jumlahLembarMentah / 100);
    const jumlahLembar = jumlahLot * 100;

    // Estimasi pendanaan aktual setelah pembulatan ke lot bulat
    // (bisa sedikit lebih besar dari target karena pembulatan ke atas,
    // atau lebih kecil dari target kalau kena cap)
    const nilaiJaminanAktual = Math.min(jumlahLembar * hargaTerendah, maxCollValue ?? Infinity);
    const estimasiPendanaanAktual = nilaiJaminanAktual / recommendedRatio;

    return {
      kode_saham: kodeSaham,
      target_pendanaan: targetPendanaan,
      group,
      kategori_haircut: kategoriHaircut,
      haircut_kpei_pct: haircutPct,
      harga_dipakai: hargaTerendah,
      recommended_ratio: recommendedRatio,
      nilai_jaminan_dibutuhkan: nilaiJaminanDibutuhkan,
      max_coll_value_cap: maxCollValue,
      max_pendanaan_dari_cap: maxPendanaanDariCap,
      kena_cap: kenaCap,
      jumlah_lembar_dibutuhkan: jumlahLembar,
      jumlah_lot_dibutuhkan: jumlahLot,
      estimasi_pendanaan_aktual: estimasiPendanaanAktual,
    };
  }

  // ------------------------------------------------------------
  // OBLIGASI — mode forward: nilai nominal (Rp) -> estimasi pendanaan
  //
  // CATATAN PENTING: "Satuan Perdagangan" (nilai per unit) obligasi TIDAK
  // seragam Rp1 juta — ditentukan per penerbitan di prospektus masing-masing
  // (ada yang Rp1jt, ada yang Rp5jt, dst). Data KSEI yang kita pakai
  // (statis_efek.json) tidak punya kolom nilai-per-unit yang bisa diandalkan
  // (790/849 obligasi kosong, sisanya berisi total nilai emisi bukan nilai
  // per unit). Supaya tidak salah tebak satuan, user input NILAI NOMINAL
  // OBLIGASI LANGSUNG DALAM RUPIAH (bukan jumlah unit) — ini juga lebih
  // familiar buat calon nasabah awam (bahasa "Rp X juta", bukan "sekian unit").
  // ------------------------------------------------------------
  function tentukanRasioObligasi(bondRow) {
    const tipe = (bondRow.tipe_instrumen || "").toUpperCase();
    const isPemerintah = ["GOVERNMENT BOND", "SBSN", "SUKUK", "SPN"].includes(tipe);

    if (isPemerintah) {
      return { jenisObligasi: "Pemerintah", rasio: RASIO_OBLIGASI_PEMERINTAH, tipe };
    }
    return { jenisObligasi: "Korporasi", rasio: RASIO_OBLIGASI_KORPORASI, tipe };
  }

  // Lapisan pengaman kedua (defense-in-depth) — data-loader.js sudah memfilter
  // dropdown obligasi supaya hanya yang maturity < 5 tahun yang muncul, tapi
  // dicek ulang di sini juga untuk jaga-jaga kalau kodeObligasi somehow lolos
  // dari filter itu (mis. diketik manual, bukan dipilih dari daftar).
  function cekMaturityObligasi(kodeObligasi, bondRow) {
    const maturity = parseTanggalDDMMMYYYY(bondRow.maturity_date);
    if (!maturity) {
      return { error: `Data jatuh tempo untuk ${kodeObligasi} tidak ditemukan/tidak valid` };
    }
    const now = new Date();
    const batasMaturity = new Date(now.getFullYear() + MAX_MATURITY_TAHUN, now.getMonth(), now.getDate());
    if (maturity >= batasMaturity) {
      return { error: `${kodeObligasi} jatuh tempo ${bondRow.maturity_date} — sisa tenor masih ${MAX_MATURITY_TAHUN} tahun atau lebih, tidak eligible dijadikan jaminan Transaksi REPO. Silakan pilih obligasi lain.` };
    }
    return {};
  }

  function simulateBondFunding({
    kodeObligasi,
    nilaiNominal, // Rp — nilai nominal obligasi yang dijaminkan, diinput langsung oleh user
    bondRow, // { tipe_instrumen, closing_price_pct, nama_efek, maturity_date, kupon_pct }
  }) {
    if (!nilaiNominal || nilaiNominal <= 0) {
      return { error: "Nilai nominal obligasi harus lebih dari 0" };
    }

    const maturityCheck = cekMaturityObligasi(kodeObligasi, bondRow);
    if (maturityCheck.error) return maturityCheck;

    const closingPct = bondRow.closing_price_pct;
    if (closingPct == null) {
      return { error: `Closing price untuk ${kodeObligasi} tidak ditemukan` };
    }

    const { jenisObligasi, rasio, tipe } = tentukanRasioObligasi(bondRow);

    // Nilai Jaminan = nilai nominal (Rp) x closing price (fraksi par)
    const nilaiJaminan = nilaiNominal * closingPct;
    const estimasiPendanaan = nilaiJaminan / rasio;

    return {
      kode_obligasi: kodeObligasi,
      nama_obligasi: bondRow.nama_efek,
      tipe_instrumen: tipe,
      jenis_obligasi: jenisObligasi,
      nilai_nominal: nilaiNominal,
      closing_price_pct: closingPct,
      rasio,
      nilai_jaminan: nilaiJaminan,
      estimasi_pendanaan: estimasiPendanaan,
      maturity_date: bondRow.maturity_date,
      kupon_pct: bondRow.kupon_pct,
    };
  }

  // ------------------------------------------------------------
  // OBLIGASI — mode reverse: kebutuhan pendanaan -> nilai nominal dibutuhkan (Rp)
  // ------------------------------------------------------------
  function computeRequiredBondNominal({
    kodeObligasi,
    targetPendanaan,
    bondRow,
  }) {
    if (!targetPendanaan || targetPendanaan <= 0) {
      return { error: "Kebutuhan pendanaan harus lebih dari 0" };
    }

    const maturityCheck = cekMaturityObligasi(kodeObligasi, bondRow);
    if (maturityCheck.error) return maturityCheck;

    const closingPct = bondRow.closing_price_pct;
    if (closingPct == null) {
      return { error: `Closing price untuk ${kodeObligasi} tidak ditemukan` };
    }

    const { jenisObligasi, rasio, tipe } = tentukanRasioObligasi(bondRow);

    const nilaiJaminanDibutuhkan = targetPendanaan * rasio;
    // Nilai nominal dibutuhkan dibulatkan ke atas ke kelipatan Rp1 juta
    // (kelipatan minimum pembelian obligasi ritel paling umum di pasar)
    const KELIPATAN_NOMINAL = 1_000_000;
    const nilaiNominalMentah = nilaiJaminanDibutuhkan / closingPct;
    const nilaiNominal = Math.ceil(nilaiNominalMentah / KELIPATAN_NOMINAL) * KELIPATAN_NOMINAL;
    const nilaiJaminanAktual = nilaiNominal * closingPct;
    const estimasiPendanaanAktual = nilaiJaminanAktual / rasio;

    return {
      kode_obligasi: kodeObligasi,
      nama_obligasi: bondRow.nama_efek,
      tipe_instrumen: tipe,
      jenis_obligasi: jenisObligasi,
      target_pendanaan: targetPendanaan,
      closing_price_pct: closingPct,
      rasio,
      nilai_jaminan_dibutuhkan: nilaiJaminanDibutuhkan,
      nilai_nominal_dibutuhkan: nilaiNominal,
      estimasi_pendanaan_aktual: estimasiPendanaanAktual,
      maturity_date: bondRow.maturity_date,
      kupon_pct: bondRow.kupon_pct,
    };
  }

  // ------------------------------------------------------------
  // BUNGA / KEWAJIBAN PEMBAYARAN (poin 9)
  // Bunga REPO — simple interest per-annum, dihitung pro-rata sesuai
  // tenor (bulan). Bunga dibayar per bulan (interest-only), pokok
  // dikembalikan penuh di akhir tenor (bullet payment).
  // ------------------------------------------------------------
  const INTEREST_RATE_SAHAM = {
    LQ45: 0.12,           // 12% p.a.
    IDX80_NON_LQ45: 0.15, // 15% p.a.
    MARJIN_LAINNYA: 0.18, // 18% p.a.
    // NON_MARJIN: belum ditentukan — dalam praktiknya tidak akan muncul karena
    // daftar saham yang bisa dipilih sudah difilter hanya yang eligible marjin.
  };
  const INTEREST_RATE_OBLIGASI = {
    Korporasi: 0.11,  // 11% p.a.
    Pemerintah: 0.09, // 9% p.a.
  };

  function getInterestRateSaham(group) {
    return INTEREST_RATE_SAHAM[group] ?? null;
  }

  function getInterestRateObligasi(jenisObligasi) {
    return INTEREST_RATE_OBLIGASI[jenisObligasi] ?? null;
  }

  function hitungKewajibanPembayaran({ pokokPinjaman, tenorBulan, rateAnnual }) {
    if (rateAnnual == null) {
      return { error: "Rate bunga untuk kategori efek ini belum ditentukan, mohon hubungi PEI langsung." };
    }
    if (!pokokPinjaman || pokokPinjaman <= 0 || !tenorBulan || tenorBulan <= 0) {
      return { error: "Pokok pinjaman dan tenor harus lebih dari 0." };
    }
    const bungaPerBulan = (pokokPinjaman * rateAnnual) / 12;
    const totalBunga = bungaPerBulan * tenorBulan;
    const totalPengembalian = pokokPinjaman + totalBunga;
    return {
      pokok_pinjaman: pokokPinjaman,
      rate_annual: rateAnnual,
      tenor_bulan: tenorBulan,
      bunga_per_bulan: bungaPerBulan,
      total_bunga: totalBunga,
      total_pengembalian: totalPengembalian,
    };
  }

  return {
    simulateStockFunding,
    simulateBondFunding,
    computeRequiredStockLots,
    computeRequiredBondNominal,
    tentukanGroup,
    tentukanKategoriHaircut,
    getInterestRateSaham,
    getInterestRateObligasi,
    hitungKewajibanPembayaran,
  };
})();
