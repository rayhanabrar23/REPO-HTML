/* ============================================================
   MARKET DATA — port dari market_data.py (Python/yfinance)

   Fetch data harga saham historis dari Yahoo Finance (client-side),
   lalu hitung metrik turunan yang dibutuhkan calc-engine.js:
   - avg_close_3m         : rata-rata closing price 3 bulan terakhir
   - latest_close         : closing price terbaru
   - avg_daily_trade_value: rata-rata nilai transaksi harian (Rp)
   - var_20d_pct          : Historical Simulation VaR 20 hari (%)
   - days_to_sell_10bio   : estimasi hari untuk menjual Rp10 Miliar saham ybs

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
  const RANGE = "3mo";
  const INTERVAL = "1d";

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

  function calcHsVar20d(dailyReturns) {
    if (dailyReturns.length < 5) return null;
    const var1d = percentile(dailyReturns, 5); // biasanya negatif
    const var20d = Math.abs(var1d) * Math.sqrt(20);
    return var20d * 100; // dalam %
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
    const avgClose3m = closes.reduce((a, b) => a + b, 0) / closes.length;
    const latestClose = closes[closes.length - 1];
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;

    const tradingValues = pairs
      .filter((p) => p.volume != null)
      .map((p) => p.close * p.volume);
    const avgDailyTradeValue =
      tradingValues.length > 0 ? tradingValues.reduce((a, b) => a + b, 0) / tradingValues.length : 0;

    // Daily returns
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const var20dPct = calcHsVar20d(returns);

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
