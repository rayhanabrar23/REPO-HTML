/* ============================================================
   MARKET DATA — port dari market_data.py (Python/yfinance)

   Fetch data harga saham historis dari Yahoo Finance (client-side),
   lalu hitung metrik turunan yang dibutuhkan calc-engine.js:
   - avg_close_3m         : rata-rata closing price ~60 hari bursa terakhir (≈3 bulan)
   - latest_close         : closing price terbaru
   - avg_daily_trade_value: rata-rata nilai transaksi harian (Rp), ~60 hari bursa terakhir
   - var_20d_pct          : Historical Simulation VaR 20 hari (%), lihat catatan metode di bawah
   - days_to_sell_10bio   : estimasi hari untuk menjual Rp10 Miliar saham ybs

   ============================================================
   METODE VaR — disamakan dengan file acuan Excel (Evaluasi Awal REPO):
     1. Ambil histori harga ~2 tahun (bukan 3 bulan) — sample yang lebih pendek
        bikin estimasi persentil ekor terlalu noisy.
     2. Hitung return 20-HARI LANGSUNG secara rolling: Close[i] / Close[i-19] - 1
        (BUKAN return 1-hari yang di-scale pakai akar-20 hari). Scaling akar-waktu
        cuma valid kalau return antar-hari independen (IID) — asumsi yang sering
        meleset di saham riil karena volatility clustering.
     3. Ambil PERSENTIL KE-1 (confidence level 99%) dari distribusi return 20-hari
        tersebut — bukan persentil ke-5 — supaya lebih konservatif, sesuai kebijakan
        risiko yang dipakai di file acuan (rumus Excel: PERCENTILE(returns, 1%)).
   Hasil metode ini sudah dicocokkan manual terhadap file Excel acuan (kasus BSDE,
   4 Feb 2025) dan angkanya match persis.
   ============================================================
   ⚠️ CATATAN PENTING — BACA SEBELUM MENGANDALKAN INI DI PRODUKSI:
   Endpoint Yahoo Finance yang dipakai di sini (query1.finance.yahoo.com)
   TIDAK RESMI/TIDAK DIDOKUMENTASIKAN untuk akses langsung dari browser.
   Yahoo bisa mengubah, membatasi, atau memblokir endpoint ini kapan saja
   tanpa pemberitahuan — tidak ada SLA. Situs statis (GitHub Pages) tidak
   punya server sendiri untuk menyiasati ini kalau diblokir.
   Sudah disiapkan fallback CORS proxy + pesan error yang jelas kalau gagal,
   supaya simulator tidak "diam-diam salah", tapi tetap perlu dipantau.
   ============================================================ */

const MarketData = (() => {
  const YF_SUFFIX = ".JK";
  const RANGE = "2y";     // histori panjang, dibutuhkan utk return 20-harian yang stabil (samakan dgn file acuan)
  const INTERVAL = "1d";

  const AVG_WINDOW_DAYS = 60;  // ~3 bulan hari bursa, dipakai utk avg closing & avg daily trade value
  const VAR_HOLDING_DAYS = 20; // horizon VaR (hari bursa)
  const VAR_PERCENTILE = 1;    // persentil ke-1 (confidence level 99%), samakan dgn file acuan

  // Percobaan 1: langsung ke Yahoo (kadang berhasil dari browser)
  const DIRECT_URL = (ticker) =>
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${RANGE}&interval=${INTERVAL}`;

  // Percobaan 2 (fallback): lewat CORS proxy publik gratis, kalau percobaan 1 diblokir CORS
  const PROXY_URL = (ticker) =>
    `https://corsproxy.io/?url=${encodeURIComponent(DIRECT_URL(ticker))}`;

  const cache = new Map(); // kodeSaham -> { data, ts }
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit, mirip ttl=900 di Streamlit

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  // Historical Simulation VaR, horizon 20 hari bursa, dihitung LANGSUNG dari
  // return 20-harian rolling (bukan return 1-harian yang di-scale akar-waktu).
  // Butuh minimal ~1-2 tahun data harian supaya persentil ke-1 tidak terlalu noisy.
  function calcHsVar20d(closes) {
    if (closes.length < VAR_HOLDING_DAYS + 1) return null;

    const returns20d = [];
    for (let i = VAR_HOLDING_DAYS - 1; i < closes.length; i++) {
      returns20d.push(closes[i] / closes[i - (VAR_HOLDING_DAYS - 1)] - 1);
    }

    // Perlu cukup banyak observasi 20-harian supaya persentil ke-1 stabil.
    if (returns20d.length < 20) return null;

    const p1 = percentile(returns20d, VAR_PERCENTILE);
    return Math.abs(p1) * 100; // dalam %, magnitude positif (dipakai sbg threshold di calc-engine.js)
  }

  function computeMetrics(kodeSaham, chartResult) {
    const result = chartResult?.chart?.result?.[0];
    if (!result) return { error: `Data harga untuk ${kodeSaham} tidak ditemukan di Yahoo Finance` };

    const closesRaw = result.indicators?.quote?.[0]?.close || [];
    const volumesRaw = result.indicators?.quote?.[0]?.volume || [];

    // Buang entri null (hari libur/data kosong)
    const pairs = closesRaw
      .map((c, i) => ({ close: c, volume: volumesRaw[i] }))
      .filter((p) => p.close != null);

    if (pairs.length < 5) {
      return { error: `Data harga ${kodeSaham} terlalu sedikit (${pairs.length} hari) untuk dihitung` };
    }

    const closes = pairs.map((p) => p.close);
    const latestClose = closes[closes.length - 1];
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;

    // Avg closing price & avg daily trade value: window ~60 hari bursa terakhir
    // (≈3 bulan), samakan dengan rentang averaging di file acuan Excel.
    const recentPairs = pairs.slice(-AVG_WINDOW_DAYS);
    const recentCloses = recentPairs.map((p) => p.close);
    const avgClose3m = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;

    const tradingValuesRecent = recentPairs
      .filter((p) => p.volume != null)
      .map((p) => p.close * p.volume);
    const avgDailyTradeValue =
      tradingValuesRecent.length > 0
        ? tradingValuesRecent.reduce((a, b) => a + b, 0) / tradingValuesRecent.length
        : 0;

    // VaR 20-hari: pakai SELURUH histori yang berhasil di-fetch (idealnya ~2 tahun),
    // bukan cuma window rata-rata 60 hari di atas — supaya persentil ke-1 punya
    // cukup data ekor untuk stabil (sesuai file acuan).
    const var20dPct = calcHsVar20d(closes);

    const daysToSell10bio = avgDailyTradeValue > 0 ? 10_000_000_000 / avgDailyTradeValue : null;

    return {
      kode_saham: kodeSaham.toUpperCase(),
      avg_close_3m: avgClose3m,
      latest_close: latestClose,
      prev_close: prevClose,
      avg_daily_trade_value: avgDailyTradeValue,
      var_20d_pct: var20dPct,
      days_to_sell_10bio: daysToSell10bio,
      n_days_data: closes.length,
    };
  }

  async function fetchStockMetrics(kodeSaham) {
    const key = kodeSaham.toUpperCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }

    const ticker = `${key}${YF_SUFFIX}`;
    let raw = null;
    let lastErr = null;

    // Percobaan 1: direct
    try {
      raw = await fetchJson(DIRECT_URL(ticker));
    } catch (e) {
      lastErr = e;
    }

    // Percobaan 2: via proxy, kalau percobaan 1 gagal (biasanya CORS)
    if (!raw) {
      try {
        raw = await fetchJson(PROXY_URL(ticker));
      } catch (e) {
        lastErr = e;
      }
    }

    if (!raw) {
      return {
        error:
          `Gagal mengambil data harga ${ticker} dari Yahoo Finance ` +
          `(kemungkinan endpoint diblokir/CORS). Detail: ${lastErr?.message || "unknown"}`,
      };
    }

    const metrics = computeMetrics(key, raw);
    if (!metrics.error) {
      cache.set(key, { data: metrics, ts: Date.now() });
    }
    return metrics;
  }

  return { fetchStockMetrics };
})();
