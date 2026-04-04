import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

// ─── Coin data ────────────────────────────────────────────────────────────
const PAIRS = {
  ETHUSDT: { coin:"ETH", price:"2,124.55", change:"4.04%", mark:"2,124.55", index:"2,125.36", high:"2,157.27", low:"2,036.31", volETH:"2.39M", volUSD:"5.05B", funding:"0.0059%", countdown:"01:02:59" },
  BTCUSDT: { coin:"BTC", price:"68,512.4", change:"2.99%", mark:"68,512.4", index:"68,520.0", high:"69,287.9", low:"67,100.0", volETH:"3.12K", volUSD:"3.90B", funding:"0.0100%", countdown:"01:02:59" },
  XAUUSDT: { coin:"XAU", price:"4,760.53", change:"3.36%", mark:"4,760.53", index:"4,761.10", high:"4,764.40", low:"4,680.0", volETH:"43.5K", volUSD:"207.17M", funding:"0.0200%", countdown:"01:02:59" },
  SOLUSDT: { coin:"SOL", price:"83.33",    change:"3.39%", mark:"83.33",    index:"83.41",    high:"84.69",    low:"80.12",    volETH:"2.38M", volUSD:"198.65M", funding:"0.0100%", countdown:"01:02:59" },
  XAGUSDT: { coin:"XAG", price:"75.43",    change:"2.84%", mark:"75.43",    index:"75.48",    high:"75.65",    low:"73.20",    volETH:"2.12M", volUSD:"159.85M", funding:"0.0150%", countdown:"01:02:59" },
};

// ─── Seeded deterministic random (no hydration mismatch) ──────────────────
const srng = (seed) => { const s = Math.sin(seed) * 43758.5453; return s - Math.floor(s); };

// ─── Orderbook data ────────────────────────────────────────────────────────
const genBook = (mid, side) =>
  Array.from({ length: 12 }, (_, i) => {
    const offset = (i + 1) * 0.01;
    const price = side === "ask" ? (parseFloat(mid) + offset).toFixed(2) : (parseFloat(mid) - offset).toFixed(2);
    const qty   = (srng(i * 17.3 + (side === "ask" ? 1 : 2)) * 40 + 5).toFixed(3);
    const sum   = (srng(i * 31.7 + (side === "ask" ? 3 : 4)) * 200 + 20).toFixed(3);
    return { price, qty, sum };
  });

// ─── Indicator helpers ─────────────────────────────────────────────────────
const calcEMA = (data, period) => {
  const k = 2 / (period + 1);
  const out = [];
  let ema = data[0]?.close || 0;
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[i].close : data[i].close * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
};
const calcBOLL = (data, period = 20) => data.map((_, i) => {
  if (i < period - 1) return null;
  const sl = data.slice(i - period + 1, i + 1);
  const mean = sl.reduce((a, c) => a + c.close, 0) / period;
  const std  = Math.sqrt(sl.reduce((a, c) => a + (c.close - mean) ** 2, 0) / period);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
});
const calcMACD = (data) => {
  const e12 = calcEMA(data, 12);
  const e26 = calcEMA(data, 26);
  const macdLine = e12.map((v, i) => v - e26[i]);
  const fakeData = macdLine.map(v => ({ close: v }));
  const signal   = calcEMA(fakeData, 9);
  return macdLine.map((v, i) => ({ macd: v, signal: signal[i], hist: v - signal[i] }));
};
const calcKDJ = (data, period = 9) => data.map((_, i) => {
  if (i < period - 1) return null;
  const sl = data.slice(i - period + 1, i + 1);
  const hh = Math.max(...sl.map(c => c.high));
  const ll  = Math.min(...sl.map(c => c.low));
  const rsv = hh === ll ? 50 : ((data[i].close - ll) / (hh - ll)) * 100;
  const prev = i === period - 1 ? { k: 50, d: 50 } : { k: 50, d: 50 };
  const k  = (2 / 3) * (i > 0 ? 50 : 50) + (1 / 3) * rsv;
  const d  = (2 / 3) * 50 + (1 / 3) * k;
  const j  = 3 * k - 2 * d;
  return { k, d, j };
});
const calcRSI = (data, period = 14) => data.map((_, i) => {
  if (i < period) return null;
  const sl = data.slice(i - period + 1, i + 1);
  let gains = 0, losses = 0;
  for (let x = 1; x < sl.length; x++) {
    const diff = sl[x].close - sl[x-1].close;
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - 100 / (1 + rs);
});

// ─── Canvas Candlestick Chart ──────────────────────────────────────────────
function CandleChart({ pair, tf, indicators = ["MA"] }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const state = useRef({
    offset: 0, candleW: 10, mouseX: -1, mouseY: -1,
    dragging: false, dragStartX: 0, dragStartOffset: 0,
    pinching: false, pinchDist: 0, pinchCandleW: 10,
  });
  const renderRef = useRef(null);

  // 400 smooth momentum-driven candles
  const candles = useMemo(() => {
    const seed = pair ? pair.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 100;
    const result = [];
    let price = 2124, momentum = 0;
    const now = 1711900000000;
    for (let i = 0; i < 400; i++) {
      const r1 = srng(seed + i * 3.71);
      const r2 = srng(seed + i * 7.13);
      const r3 = srng(seed + i * 2.47);
      momentum = momentum * 0.9 + (r1 - 0.5) * 2.4;
      const open  = price;
      const close = open + momentum + (r1 - 0.5) * 1.2;
      const wick  = Math.abs(close - open) * 0.5 + srng(seed + i * 1.11) * 2.5;
      const high  = Math.max(open, close) + r2 * wick;
      const low   = Math.min(open, close) - r3 * wick;
      const vol = (srng(seed + i * 5.55) * 800 + 100) * (1 + Math.abs(close - open) / 10);
      result.push({ open, close, high, low, ts: now + i * 60000, vol });
      price = close;
    }
    return result;
  }, [pair]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr   = window.devicePixelRatio || 1;
    const W     = canvas.width;
    const H     = canvas.height;
    const { offset, candleW, mouseX, mouseY } = state.current;
    const PRICE_W = 68;
    const TIME_H  = 24;
    const chartW  = W - PRICE_W;
    const chartH  = H - TIME_H;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Right axis bg
    ctx.fillStyle = "#0d0d12";
    ctx.fillRect(chartW, 0, PRICE_W, H);

    // Visible range
    const visCount = Math.ceil(chartW / candleW) + 2;
    const endIdx   = Math.min(candles.length, candles.length - Math.floor(offset));
    const startIdx = Math.max(0, endIdx - visCount);
    const visible  = candles.slice(startIdx, endIdx);
    if (!visible.length) return;

    // Price bounds
    let minP = Infinity, maxP = -Infinity;
    visible.forEach(c => { if (c.low < minP) minP = c.low; if (c.high > maxP) maxP = c.high; });
    const pad  = (maxP - minP) * 0.14;
    const pMin = minP - pad, pMax = maxP + pad;

    // Sub-panel layout
    const hasMACD = indicators.includes("MACD");
    const hasKDJ  = indicators.includes("KDJ");
    const hasRSI  = indicators.includes("RSI");
    const subCount = [hasMACD, hasKDJ, hasRSI].filter(Boolean).length;
    const SUB_H = subCount > 0 ? Math.floor((chartH * 0.30) / subCount) : 0;
    const subTotalH = subCount > 0 ? (SUB_H + 4) * subCount : 0;
    const mainH = chartH - subTotalH;
    const py = (p) => mainH - ((p - pMin) / (pMax - pMin)) * mainH;

    // Horizontal grid (within main area)
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = pMin + (i / gridSteps) * (pMax - pMin);
      const y = py(p);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      ctx.fillStyle = "#4a4a5a";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(2), chartW + 6, y + 3.5);
    }

    // Vertical grid + time labels
    const labelEvery = Math.max(1, Math.floor(72 / candleW));
    visible.forEach((c, idx) => {
      if (idx % labelEvery !== 0) return;
      const x = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mainH); ctx.stroke();
      const d = new Date(c.ts);
      const label = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
      ctx.fillStyle = "#3a3a4a";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x, chartH + 15);
    });

    // Candles
    const BULL = "#0ecb81", BEAR = "#f6465d";
    visible.forEach((c, idx) => {
      const cx  = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
      const isG = c.close >= c.open;
      const col = isG ? BULL : BEAR;
      const bw  = Math.max(candleW * 0.68 - 0.5, 1);
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.8, candleW > 12 ? 1.2 : 1);
      ctx.beginPath(); ctx.moveTo(cx, py(c.high)); ctx.lineTo(cx, py(c.low)); ctx.stroke();
      const bTop = py(Math.max(c.open, c.close));
      const bBot = py(Math.min(c.open, c.close));
      const bH   = Math.max(bBot - bTop, 1.5);
      if (candleW >= 5) {
        const grad = ctx.createLinearGradient(cx, bTop, cx, bBot);
        grad.addColorStop(0, isG ? "rgba(14,203,129,0.95)" : "rgba(246,70,93,0.95)");
        grad.addColorStop(1, isG ? "rgba(14,203,129,0.70)" : "rgba(246,70,93,0.70)");
        ctx.fillStyle = grad;
        if (candleW >= 10 && bH > 3) {
          const r = Math.min(2, bw / 3, bH / 3);
          ctx.beginPath();
          ctx.moveTo(cx - bw/2 + r, bTop); ctx.lineTo(cx + bw/2 - r, bTop);
          ctx.quadraticCurveTo(cx + bw/2, bTop, cx + bw/2, bTop + r);
          ctx.lineTo(cx + bw/2, bBot - r);
          ctx.quadraticCurveTo(cx + bw/2, bBot, cx + bw/2 - r, bBot);
          ctx.lineTo(cx - bw/2 + r, bBot);
          ctx.quadraticCurveTo(cx - bw/2, bBot, cx - bw/2, bBot - r);
          ctx.lineTo(cx - bw/2, bTop + r);
          ctx.quadraticCurveTo(cx - bw/2, bTop, cx - bw/2 + r, bTop);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(cx - bw/2, bTop, bw, bH);
        }
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, bTop); ctx.lineTo(cx, bBot); ctx.stroke();
      }
    });

    // Volume bars (translucent, at bottom of main area)
    if (indicators.includes("VOL")) {
      const volMax = Math.max(...visible.map(c => c.vol));
      const volAreaH = mainH * 0.18;
      visible.forEach((c, idx) => {
        const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
        const bw = Math.max(candleW * 0.68 - 0.5, 1);
        const vh = (c.vol / volMax) * volAreaH;
        ctx.fillStyle = c.close >= c.open ? "rgba(14,203,129,0.28)" : "rgba(246,70,93,0.28)";
        ctx.fillRect(cx - bw/2, mainH - vh, bw, vh);
      });
    }

    // MA lines (MA5/10/30/60)
    if (indicators.includes("MA")) {
      const maConf = [
        { p:5,  col:"#f0b90b", label:"MA5"  },
        { p:10, col:"#f43f5e", label:"MA10" },
        { p:30, col:"#a855f7", label:"MA30" },
        { p:60, col:"#3b82f6", label:"MA60" },
      ];
      maConf.forEach(({ p: period, col, label }, li) => {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.lineJoin = "round";
        ctx.beginPath(); let started = false;
        visible.forEach((_, idx) => {
          const gi = startIdx + idx;
          if (gi < period - 1) return;
          const avg = candles.slice(gi - period + 1, gi + 1).reduce((a, c) => a + c.close, 0) / period;
          const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
          if (!started) { ctx.moveTo(cx, py(avg)); started = true; } else ctx.lineTo(cx, py(avg));
        });
        ctx.stroke(); ctx.restore();
        const gi = startIdx + (visible.length - 1);
        if (gi >= period - 1) {
          const avg = candles.slice(gi - period + 1, gi + 1).reduce((a, c) => a + c.close, 0) / period;
          ctx.fillStyle = col; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
          ctx.fillText(`${label}:${avg.toFixed(1)}`, 4 + li * 74, 14);
        }
      });
    }

    // EMA lines (EMA12/26)
    if (indicators.includes("EMA")) {
      const ema12 = calcEMA(candles, 12);
      const ema26 = calcEMA(candles, 26);
      [{ arr: ema12, col:"#22d3ee", label:"EMA12" }, { arr: ema26, col:"#f97316", label:"EMA26" }].forEach(({ arr, col, label }, li) => {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.lineJoin = "round";
        ctx.beginPath(); let started = false;
        visible.forEach((_, idx) => {
          const gi = startIdx + idx;
          const v = arr[gi];
          if (v == null) return;
          const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
          if (!started) { ctx.moveTo(cx, py(v)); started = true; } else ctx.lineTo(cx, py(v));
        });
        ctx.stroke(); ctx.restore();
        const lastV = arr[startIdx + visible.length - 1];
        if (lastV != null) {
          ctx.fillStyle = col; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
          ctx.fillText(`${label}:${lastV.toFixed(1)}`, 4 + li * 100, 26);
        }
      });
    }

    // BOLL bands
    if (indicators.includes("BOLL")) {
      const boll = calcBOLL(candles);
      ctx.save();
      // Fill between bands
      ctx.beginPath(); let first = true;
      visible.forEach((_, idx) => {
        const gi = startIdx + idx; const b = boll[gi]; if (!b) return;
        const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
        if (first) { ctx.moveTo(cx, py(b.upper)); first = false; } else ctx.lineTo(cx, py(b.upper));
      });
      [...visible].reverse().forEach((_, ri) => {
        const idx = visible.length - 1 - ri;
        const gi = startIdx + idx; const b = boll[gi]; if (!b) return;
        const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
        ctx.lineTo(cx, py(b.lower));
      });
      ctx.closePath(); ctx.fillStyle = "rgba(59,130,246,0.07)"; ctx.fill();
      [
        { key:"upper", col:"#3b82f6", w:1 },
        { key:"lower", col:"#3b82f6", w:1 },
        { key:"middle", col:"#f97316", w:1 },
      ].forEach(({ key, col, w }) => {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = "round";
        ctx.beginPath(); let sk = false;
        visible.forEach((_, idx) => {
          const gi = startIdx + idx; const b = boll[gi]; if (!b) return;
          const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
          if (!sk) { ctx.moveTo(cx, py(b[key])); sk = true; } else ctx.lineTo(cx, py(b[key]));
        });
        ctx.stroke();
      });
      ctx.restore();
    }

    // SAR dots
    if (indicators.includes("SAR")) {
      ctx.save();
      let sarV = candles[0]?.low || 0, sarEp = candles[0]?.high || 0, sarAf = 0.02, sarBull = true;
      const sarVals = candles.map((c, i) => {
        if (i === 0) return sarV;
        if (sarBull) {
          sarV = sarV + sarAf * (sarEp - sarV);
          if (c.low < sarV) { sarBull = false; sarV = sarEp; sarEp = c.low; sarAf = 0.02; }
          else if (c.high > sarEp) { sarEp = c.high; sarAf = Math.min(sarAf + 0.02, 0.2); }
        } else {
          sarV = sarV + sarAf * (sarEp - sarV);
          if (c.high > sarV) { sarBull = true; sarV = sarEp; sarEp = c.high; sarAf = 0.02; }
          else if (c.low < sarEp) { sarEp = c.low; sarAf = Math.min(sarAf + 0.02, 0.2); }
        }
        return sarV;
      });
      visible.forEach((c, idx) => {
        const gi = startIdx + idx; const sv = sarVals[gi]; if (sv == null) return;
        const cx = chartW - (visible.length - 1 - idx) * candleW - candleW / 2;
        ctx.fillStyle = sv < c.close ? "#0ecb81" : "#f6465d";
        ctx.beginPath(); ctx.arc(cx, py(sv), Math.max(1.5, candleW * 0.18), 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // Last price dashed line
    const lastClose = candles[candles.length - 1]?.close || 0;
    const lastY = py(lastClose);
    const isLastUp = lastClose >= (candles[candles.length - 2]?.close || 0);
    const priceCol = isLastUp ? BULL : BEAR;
    ctx.save(); ctx.strokeStyle = priceCol; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(chartW, lastY); ctx.stroke(); ctx.restore();
    ctx.fillStyle = priceCol;
    const labelH = 18;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(chartW + 1, lastY - labelH/2, PRICE_W - 2, labelH, 3)
                  : ctx.rect(chartW + 1, lastY - labelH/2, PRICE_W - 2, labelH);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(lastClose.toFixed(2), chartW + PRICE_W / 2, lastY + 3.5);

    // Axis dividers
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, mainH); ctx.lineTo(chartW, mainH); ctx.stroke();

    // ── MACD sub-panel ────────────────────────────────────────────────────
    if (hasMACD) {
      const panelY = mainH + 4;
      const macdData = calcMACD(candles);
      const visMacd = macdData.slice(startIdx, endIdx);
      const mVals = visMacd.flatMap(m => m ? [Math.abs(m.macd), Math.abs(m.signal)] : []);
      const mMax = Math.max(...mVals, 0.001);
      const pmY = (v) => panelY + SUB_H/2 - (v / mMax) * (SUB_H/2 - 2);
      ctx.fillStyle = "#0a0a0f"; ctx.fillRect(0, panelY, chartW, SUB_H);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, panelY + SUB_H/2); ctx.lineTo(chartW, panelY + SUB_H/2); ctx.stroke();
      ctx.fillStyle = "#555"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("MACD", 4, panelY + 10);
      visMacd.forEach((m, idx) => {
        if (!m) return;
        const cx = chartW - (visMacd.length - 1 - idx) * candleW - candleW / 2;
        const bw = Math.max(candleW * 0.68 - 0.5, 1);
        const zeroY = panelY + SUB_H/2;
        const barH = Math.abs(m.hist / mMax) * (SUB_H/2 - 2);
        ctx.fillStyle = m.hist >= 0 ? "rgba(14,203,129,0.7)" : "rgba(246,70,93,0.7)";
        ctx.fillRect(cx - bw/2, m.hist >= 0 ? zeroY - barH : zeroY, bw, barH);
      });
      ctx.save(); ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
      ctx.beginPath(); let sm = false;
      visMacd.forEach((m, idx) => {
        if (!m) return;
        const cx = chartW - (visMacd.length - 1 - idx) * candleW - candleW / 2;
        if (!sm) { ctx.moveTo(cx, pmY(m.macd)); sm = true; } else ctx.lineTo(cx, pmY(m.macd));
      });
      ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = "#f97316"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
      ctx.beginPath(); sm = false;
      visMacd.forEach((m, idx) => {
        if (!m) return;
        const cx = chartW - (visMacd.length - 1 - idx) * candleW - candleW / 2;
        if (!sm) { ctx.moveTo(cx, pmY(m.signal)); sm = true; } else ctx.lineTo(cx, pmY(m.signal));
      });
      ctx.stroke(); ctx.restore();
    }

    // ── KDJ sub-panel ─────────────────────────────────────────────────────
    if (hasKDJ) {
      const kdjOff = hasMACD ? 1 : 0;
      const panelY = mainH + 4 + kdjOff * (SUB_H + 4);
      const kdjData = calcKDJ(candles);
      const visKdj = kdjData.slice(startIdx, endIdx);
      const pkY = (v) => panelY + SUB_H - ((v == null ? 50 : v) / 100) * (SUB_H - 4) - 2;
      ctx.fillStyle = "#0a0a0f"; ctx.fillRect(0, panelY, chartW, SUB_H);
      [30, 70].forEach(v => {
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, pkY(v)); ctx.lineTo(chartW, pkY(v)); ctx.stroke();
      });
      ctx.fillStyle = "#555"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("KDJ", 4, panelY + 10);
      [{ key:"k", col:"#f0b90b" }, { key:"d", col:"#3b82f6" }, { key:"j", col:"#a855f7" }].forEach(({ key, col }) => {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
        ctx.beginPath(); let sk = false;
        visKdj.forEach((m, idx) => {
          if (!m) return;
          const cx = chartW - (visKdj.length - 1 - idx) * candleW - candleW / 2;
          if (!sk) { ctx.moveTo(cx, pkY(m[key])); sk = true; } else ctx.lineTo(cx, pkY(m[key]));
        });
        ctx.stroke(); ctx.restore();
      });
    }

    // ── RSI sub-panel ─────────────────────────────────────────────────────
    if (hasRSI) {
      const rsiOff = (hasMACD ? 1 : 0) + (hasKDJ ? 1 : 0);
      const panelY = mainH + 4 + rsiOff * (SUB_H + 4);
      const rsiData = calcRSI(candles);
      const visRsi = rsiData.slice(startIdx, endIdx);
      const prY = (v) => panelY + SUB_H - ((v == null ? 50 : v) / 100) * (SUB_H - 4) - 2;
      ctx.fillStyle = "#0a0a0f"; ctx.fillRect(0, panelY, chartW, SUB_H);
      [30, 70].forEach(v => {
        ctx.strokeStyle = v === 70 ? "rgba(246,70,93,0.3)" : "rgba(14,203,129,0.3)";
        ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, prY(v)); ctx.lineTo(chartW, prY(v)); ctx.stroke();
      });
      ctx.fillStyle = "#555"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("RSI(14)", 4, panelY + 10);
      ctx.save(); ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
      ctx.beginPath(); let sr = false;
      visRsi.forEach((v, idx) => {
        if (v == null) return;
        const cx = chartW - (visRsi.length - 1 - idx) * candleW - candleW / 2;
        if (!sr) { ctx.moveTo(cx, prY(v)); sr = true; } else ctx.lineTo(cx, prY(v));
      });
      ctx.stroke(); ctx.restore();
    }

    // Time axis bottom line
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, chartH); ctx.lineTo(W, chartH); ctx.stroke();

    // Crosshair
    if (mouseX >= 0 && mouseX < chartW && mouseY >= 0 && mouseY < chartH) {
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(mouseX, 0); ctx.lineTo(mouseX, chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mouseY); ctx.lineTo(chartW, mouseY); ctx.stroke();
      ctx.restore();
      if (mouseY < mainH) {
        const crossP = pMin + (1 - mouseY / mainH) * (pMax - pMin);
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(chartW + 1, mouseY - 9, PRICE_W - 2, 18);
        ctx.fillStyle = "#ddd"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(crossP.toFixed(2), chartW + PRICE_W / 2, mouseY + 3.5);
      }
      const frac = mouseX / chartW;
      const tIdx = Math.round(startIdx + frac * (endIdx - startIdx));
      const tc = candles[Math.min(tIdx, candles.length - 1)];
      if (tc) {
        const d = new Date(tc.ts);
        const tl = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(mouseX - 24, chartH + 1, 48, TIME_H - 2);
        ctx.fillStyle = "#ddd"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(tl, mouseX, chartH + 14);
      }
    }
  }, [candles, indicators]);

  renderRef.current = render;

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width) || container.offsetWidth;
      const h = Math.floor(rect.height) || container.offsetHeight;
      if (w > 0 && h > 0) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = w + "px";
        canvas.style.height = h + "px";
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        render();
      }
    };
    resize();
    const t = setTimeout(resize, 80);
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [render]);

  // Mouse wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const s = state.current;
    s.candleW = Math.min(40, Math.max(2, s.candleW * (e.deltaY < 0 ? 1.15 : 0.87)));
    render();
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Touch events (pinch zoom + drag)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchStart = (e) => {
      const s = state.current;
      if (e.touches.length === 1) {
        s.dragging = true; s.pinching = false;
        s.dragStartX = e.touches[0].clientX;
        s.dragStartOffset = s.offset;
      } else if (e.touches.length === 2) {
        s.pinching = true; s.dragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        s.pinchDist = Math.sqrt(dx*dx + dy*dy);
        s.pinchCandleW = s.candleW;
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      const s = state.current;
      if (e.touches.length === 2 && s.pinching) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        s.candleW = Math.min(40, Math.max(2, s.pinchCandleW * (dist / s.pinchDist)));
        renderRef.current?.();
      } else if (e.touches.length === 1 && s.dragging) {
        const dx = e.touches[0].clientX - s.dragStartX;
        s.offset = Math.max(0, Math.min(candles.length - 10, s.dragStartOffset - dx / s.candleW));
        renderRef.current?.();
      }
    };
    const onTouchEnd = (e) => {
      const s = state.current;
      if (e.touches.length === 0) { s.dragging = false; s.pinching = false; }
      else if (e.touches.length === 1 && s.pinching) {
        s.pinching = false; s.dragging = true;
        s.dragStartX = e.touches[0].clientX;
        s.dragStartOffset = s.offset;
      }
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [candles, render]);

  // Mouse drag / crosshair
  const onMouseDown  = (e) => { const s = state.current; s.dragging = true; s.dragStartX = e.clientX; s.dragStartOffset = s.offset; };
  const onMouseMove  = (e) => {
    const s = state.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) { s.mouseX = e.clientX - rect.left; s.mouseY = e.clientY - rect.top; }
    if (s.dragging) { const dx = e.clientX - s.dragStartX; s.offset = Math.max(0, Math.min(candles.length - 10, s.dragStartOffset - dx / s.candleW)); }
    render();
  };
  const onMouseUp    = () => { state.current.dragging = false; };
  const onMouseLeave = () => { state.current.mouseX = -1; state.current.mouseY = -1; render(); };

  const zoomIn  = () => { state.current.candleW = Math.min(40, state.current.candleW * 1.3); render(); };
  const zoomOut = () => { state.current.candleW = Math.max(2,  state.current.candleW * 0.77); render(); };

  return (
    <div ref={containerRef} style={{ position:"absolute", inset:0, userSelect:"none", touchAction:"none" }}>
      <canvas ref={canvasRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
        style={{ display:"block", width:"100%", height:"100%", cursor:"crosshair" }}
      />
      {/* Zoom buttons */}
      <div style={{ position:"absolute", right:74, bottom:30, display:"flex", flexDirection:"column", gap:3, zIndex:10 }}>
        {[{ fn: zoomIn, label:"+" }, { fn: zoomOut, label:"−" }].map(({ fn, label }) => (
          <button key={label} onClick={fn}
            style={{ width:22, height:22, background:"rgba(20,20,30,0.85)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:4, color:"#aaa", cursor:"pointer", fontSize:15, lineHeight:"20px", textAlign:"center",
              padding:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────
function IconChevronDown() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IconSearch() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function IconGift() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
}
function IconGlobe() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function IconDownload() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}

// ─── Shared Navbar ─────────────────────────────────────────────────────────
function Navbar({ pair }) {
  const navLinks = ["Buy Crypto","Markets","Spot","Earn","Promotions","Partner"];
  return (
    <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", height:52, background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", flexShrink:0, zIndex:50 }}>
      <div style={{ display:"flex", alignItems:"center", gap:24 }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
          <svg viewBox="0 0 40 40" width="28" height="28">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#a8ff3e" strokeWidth="2.5"/>
            <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#a8ff3e" fontFamily="Arial">B</text>
          </svg>
          <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>Bitcovex</span>
        </Link>
        <div className="trade-nav-links" style={{ display:"flex", alignItems:"center", gap:16 }}>
          {navLinks.map((l) => (
            <Link key={l} href="/" style={{ color:"#888", fontSize:13, fontWeight:500, textDecoration:"none" }}>{l}</Link>
          ))}
          <button style={{ color:"#888", fontSize:13, display:"flex", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer" }}>
            Futures <span style={{ color:"#a8ff3e" }}>🔥</span> <IconChevronDown />
          </button>
          <button style={{ color:"#888", fontSize:13, display:"flex", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer" }}>
            More <IconChevronDown />
          </button>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {/* Search bar */}
        <div className="trade-nav-right-extra" style={{ display:"flex", alignItems:"center", gap:6, background:"#141414", border:"1px solid #222", borderRadius:6, padding:"5px 10px" }}>
          <IconSearch />
          <span style={{ color:"#888", fontSize:12 }}>🔥 {pair || "ALGOUSDT"}</span>
          <span style={{ color:"#444", fontSize:12 }}>/</span>
        </div>
        <Link href="/login" style={{ color:"#fff", fontSize:13, textDecoration:"none" }}>Log in</Link>
        <Link href="/register" style={{ background:"#a8ff3e", color:"#000", fontWeight:700, fontSize:13, padding:"6px 16px", borderRadius:20, textDecoration:"none" }}>Sign up</Link>
        <div className="trade-nav-right-extra" style={{ display:"flex", gap:10, color:"#555" }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}><IconGift /></button>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}><IconGlobe /></button>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}><IconDownload /></button>
        </div>
      </div>
    </nav>
  );
}

// ─── Mobile Trade View (Bitget-style) ─────────────────────────────────────
function MobileTradeView({ pair, info }) {
  const [view,       setView]       = useState("trade");
  const [buySell,    setBuySell]    = useState("buy");
  const [orderType,  setOrderType]  = useState("Limit");
  const [sliderVal,  setSliderVal]  = useState(0);
  const [tpsl,       setTpsl]       = useState(false);
  const [bottomTab,  setBottomTab]  = useState("Orders(0)");
  const [tf,         setTf]         = useState("4h");
  const [obTab,      setObTab]      = useState("orderbook");
  const [activeInds, setActiveInds] = useState(["MA"]);

  // Live data state
  const [live,     setLive]     = useState(null);   // { price, change, high, low, vol }
  const [liveBook, setLiveBook] = useState(null);   // { asks, bids }

  // Binance WebSocket for live ticker + orderbook
  useEffect(() => {
    const sym = (pair || "ETHUSDT").toLowerCase();
    let ws;
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${sym}@miniTicker/${sym}@depth10@100ms`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (!msg.stream) return;
          if (msg.stream.endsWith("@miniTicker")) {
            const t = msg.data;
            const c = parseFloat(t.c), o = parseFloat(t.o);
            setLive({
              price:  c.toFixed(2),
              change: (((c - o) / o) * 100).toFixed(2),
              high:   parseFloat(t.h).toFixed(2),
              low:    parseFloat(t.l).toFixed(2),
              vol:    parseFloat(t.v).toFixed(0),
            });
          } else if (msg.stream.includes("@depth")) {
            const d = msg.data;
            setLiveBook({
              asks: d.asks.slice(0,8).map(([p,q]) => ({ price: parseFloat(p).toFixed(2), qty: parseFloat(q).toFixed(3) })).reverse(),
              bids: d.bids.slice(0,8).map(([p,q]) => ({ price: parseFloat(p).toFixed(2), qty: parseFloat(q).toFixed(3) })),
            });
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, [pair]);

  // Use live data if available, fall back to static
  const staticAsks = genBook(info.mark, "ask").reverse();
  const staticBids = genBook(info.mark, "bid");
  const asks = liveBook ? liveBook.asks : staticAsks;
  const bids = liveBook ? liveBook.bids : staticBids;
  const displayPrice  = live ? live.price  : info.price;
  const displayChange = live ? live.change : info.change.replace("%","");
  const displayHigh   = live ? live.high   : info.high;
  const displayLow    = live ? live.low    : info.low;
  const displayVol    = live ? live.vol    : info.volETH;

  const tfs = ["1m","15m","1h","4h","1D"];
  const spotTabs = ["Spot","Margin","Onchain","Earn","Tools"];
  const navItems = [
    { label:"Home",    icon:"⌂",  href:"/" },
    { label:"Markets", icon:"≋",  href:"/" },
    { label:"Trade",   icon:"⚡", href:`/trade/${pair||"ETHUSDT"}`, active:true },
    { label:"Futures", icon:"◈",  href:"/" },
    { label:"Assets",  icon:"◻",  href:"/" },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0a0a0a",overflow:"hidden"}}>

      {/* ── HEADER ── */}
      <div style={{display:"flex",alignItems:"center",padding:"12px 16px",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>
        <Link href="/" style={{color:"#888",textDecoration:"none",marginRight:14,fontSize:20,lineHeight:1}}>←</Link>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:16}}>{pair||"BTCUSDT"}</span>
            <span style={{color:"#888",fontSize:12}}>▼</span>
          </div>
          <span style={{color:"#555",fontSize:12}}>{displayPrice} <span style={{color:parseFloat(displayChange)>=0?"#a8ff3e":"#ef5350"}}>{parseFloat(displayChange)>=0?"+":""}{displayChange}%</span></span>
        </div>
        <div style={{display:"flex",gap:14}}>
          <button style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:16}}>⊞</button>
          <button style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:18}}>···</button>
        </div>
      </div>

      {/* ── VIEW TOGGLE ── */}
      <div style={{display:"flex",borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
        {[["chart","Chart"],["trade","Trade"]].map(([v,label]) => (
          <button key={v} onClick={() => setView(v)}
            style={{flex:1,padding:"10px 0",background:"none",border:"none",cursor:"pointer",
              color:view===v?"#fff":"#555",fontSize:13,fontWeight:600,
              borderBottom:view===v?"2px solid #a8ff3e":"2px solid transparent"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CHART VIEW ── */}
      {view==="chart" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",overflowX:"hidden"}}>
          {/* Price stats */}
          <div style={{padding:"12px 16px",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
              <span style={{color:parseFloat(displayChange)>=0?"#a8ff3e":"#ef5350",fontSize:28,fontWeight:900}}>{displayPrice}</span>
              <span style={{color:"#888",fontSize:12}}>≈${displayPrice}</span>
              <span style={{color:parseFloat(displayChange)>=0?"#a8ff3e":"#ef5350",fontSize:13}}>{parseFloat(displayChange)>=0?"+":""}{displayChange}%</span>
            </div>
            <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
              {[["24h high",displayHigh],["24h low",displayLow],["24h Vol("+info.coin+")",displayVol],["24h Turnover(USDT)",info.volUSD]].map(([l,v]) => (
                <div key={l}>
                  <p style={{color:"#555",fontSize:10,margin:0}}>{l}</p>
                  <p style={{color:"#888",fontSize:11,margin:"2px 0 0 0"}}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeframe bar */}
          <div style={{display:"flex",alignItems:"center",padding:"0 8px",borderBottom:"1px solid #1a1a1a",borderTop:"1px solid #1a1a1a",flexShrink:0,overflowX:"auto"}}>
            {tfs.map(t => (
              <button key={t} onClick={() => setTf(t)}
                style={{padding:"8px 10px",background:tf===t?"#1a1a1a":"none",border:"none",cursor:"pointer",
                  color:tf===t?"#fff":"#555",fontSize:12,borderRadius:4,flexShrink:0}}>
                {t}
              </button>
            ))}
            <button style={{padding:"8px 10px",background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:12,flexShrink:0}}>More ▾</button>
            <div style={{marginLeft:"auto",display:"flex",gap:4,flexShrink:0}}>
              {["📊","✏️","⊞"].map((ic,i)=>(
                <button key={i} style={{background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:14,padding:"4px"}}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Chart canvas */}
          <div style={{height:300,flexShrink:0,position:"relative",background:"#0a0a0a"}}>
            <CandleChart pair={pair} tf={tf} indicators={activeInds} />
          </div>

          {/* Indicator tabs */}
          <div style={{display:"flex",gap:0,padding:"6px 12px",borderBottom:"1px solid #111",flexShrink:0,overflowX:"auto",alignItems:"center"}}>
            {["MA","EMA","BOLL","SAR","VOL","MACD","KDJ","RSI"].map((ind)=>{
              const on = activeInds.includes(ind);
              return (
                <button key={ind} onClick={()=>setActiveInds(prev => on ? prev.filter(x=>x!==ind) : [...prev,ind])}
                  style={{background:"none",border:"none",cursor:"pointer",
                    color:on?"#a8ff3e":"#555",fontSize:12,whiteSpace:"nowrap",
                    padding:"2px 8px 2px 0",flexShrink:0,fontWeight:on?700:400}}>
                  {ind}
                </button>
              );
            })}
          </div>

          {/* Performance stats */}
          <div style={{display:"flex",padding:"12px 16px",borderBottom:"1px solid #111",flexShrink:0}}>
            {[["Today","+0.52%",true],["7 days","+1.42%",true],["30 days","-5.04%",false],["90 days","-26.46%",false],["180 days","-46.01%",false]].map(([label,val,up])=>(
              <div key={label} style={{flex:1,textAlign:"center"}}>
                <p style={{color:"#555",fontSize:10,margin:0}}>{label}</p>
                <p style={{color:up?"#a8ff3e":"#ef5350",fontSize:11,margin:"2px 0 0",fontWeight:600}}>{val}</p>
              </div>
            ))}
          </div>

          {/* Orderbook/Depth/Trades tabs */}
          <div style={{display:"flex",borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
            {[["orderbook","Order book"],["depth","Depth"],["trades","Trades"]].map(([k,label])=>(
              <button key={k} onClick={()=>setObTab(k)}
                style={{padding:"10px 16px",background:"none",border:"none",cursor:"pointer",
                  color:obTab===k?"#fff":"#555",fontSize:13,fontWeight:600,
                  borderBottom:obTab===k?"2px solid #a8ff3e":"2px solid transparent"}}>
                {label}
              </button>
            ))}
          </div>

          {/* B/S ratio */}
          <div style={{padding:"8px 16px",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"#ef5350",fontSize:11}}>B 24%</span>
              <span style={{color:"#26a69a",fontSize:11}}>76% S</span>
            </div>
            <div style={{display:"flex",borderRadius:2,overflow:"hidden",height:4}}>
              <div style={{flex:24,background:"#ef5350"}}/><div style={{flex:76,background:"#26a69a"}}/>
            </div>
          </div>

          {/* Orderbook col headers */}
          <div style={{display:"flex",padding:"2px 16px 6px",flexShrink:0}}>
            <span style={{flex:1,color:"#555",fontSize:11}}>Bid</span>
            <span style={{flex:1,color:"#555",fontSize:11,textAlign:"center"}}>Ask</span>
            <span style={{flex:1,color:"#555",fontSize:11,textAlign:"right"}}>Quantity</span>
          </div>

          {/* Orderbook rows */}
          {asks.slice(0,8).map((row,i)=>(
            <div key={i} style={{display:"flex",padding:"3px 16px"}}>
              <span style={{flex:1,color:"#555",fontSize:12}}></span>
              <span style={{flex:1,color:"#26a69a",fontSize:12,textAlign:"center"}}>{row.price}</span>
              <span style={{flex:1,color:"#888",fontSize:12,textAlign:"right"}}>{row.qty}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",padding:"6px 16px",borderTop:"1px solid #111",borderBottom:"1px solid #111"}}>
            <span style={{color:parseFloat(displayChange)>=0?"#26a69a":"#ef5350",fontWeight:700,fontSize:15}}>{displayPrice}</span>
            <span style={{color:"#888",fontSize:12,marginLeft:8}}>≈${displayPrice}</span>
            <span style={{color:"#888",fontSize:14,marginLeft:"auto"}}>›</span>
          </div>
          {bids.slice(0,8).map((row,i)=>(
            <div key={i} style={{display:"flex",padding:"3px 16px"}}>
              <span style={{flex:1,color:"#ef5350",fontSize:12}}>{row.price}</span>
              <span style={{flex:1,color:"#555",fontSize:12,textAlign:"center"}}></span>
              <span style={{flex:1,color:"#888",fontSize:12,textAlign:"right"}}>{row.qty}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── TRADE VIEW ── */}
      {view==="trade" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Spot/Margin/etc tabs */}
          <div style={{display:"flex",padding:"0 4px",borderBottom:"1px solid #1a1a1a",flexShrink:0,overflowX:"auto"}}>
            {spotTabs.map(t=>(
              <button key={t} style={{padding:"10px 12px",background:"none",border:"none",cursor:"pointer",
                color:t==="Spot"?"#fff":"#555",fontSize:13,fontWeight:t==="Spot"?700:400,
                borderBottom:t==="Spot"?"2px solid #a8ff3e":"2px solid transparent",whiteSpace:"nowrap",flexShrink:0}}>
                {t}
              </button>
            ))}
          </div>

          {/* Sub-header: pair name + icons */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderBottom:"1px solid #111",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{pair||"BTCUSDT"}</span>
              <span style={{color:"#888",fontSize:12}}>▼</span>
              <span style={{color:parseFloat(displayChange)>=0?"#a8ff3e":"#ef5350",fontSize:12}}>{parseFloat(displayChange)>=0?"+":""}{displayChange}%</span>
            </div>
            <div style={{display:"flex",gap:12}}>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:15}}>⊞</button>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:16}}>···</button>
            </div>
          </div>

          {/* Body: form + mini orderbook */}
          <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

            {/* LEFT: Buy/Sell form */}
            <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",padding:"10px 12px",gap:8,minWidth:0}}>
              {/* Buy / Sell toggle */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,background:"#141414",borderRadius:8,padding:3}}>
                {["Buy","Sell"].map(s=>(
                  <button key={s} onClick={()=>setBuySell(s.toLowerCase())}
                    style={{padding:"9px 0",borderRadius:6,
                      background:buySell===s.toLowerCase()?(s==="Buy"?"#ef5350":"#26a69a"):"transparent",
                      border:"none",color:buySell===s.toLowerCase()?"#fff":"#555",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Order type */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#141414",border:"1px solid #222",borderRadius:8,padding:"9px 12px",cursor:"pointer"}}>
                <span style={{color:"#888",fontSize:12}}>ⓘ</span>
                <span style={{color:"#fff",fontSize:13,fontWeight:600}}>{orderType}</span>
                <IconChevronDown />
              </div>

              {/* Price input */}
              <div style={{background:"#141414",border:"1px solid #222",borderRadius:8,padding:"8px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#555",fontSize:11}}>Price(USDT)</span>
                  <span style={{color:"#a8ff3e",fontSize:11,cursor:"pointer"}}>BBO</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>−</button>
                  <span style={{flex:1,color:"#fff",fontSize:14,textAlign:"center"}}>{displayPrice}</span>
                  <button style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>+</button>
                </div>
              </div>

              {/* Qty input */}
              <div style={{background:"#141414",border:"1px solid #222",borderRadius:8,padding:"8px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#555",fontSize:11}}>Quantity</span>
                  <span style={{color:"#555",fontSize:11}}>{info.coin}</span>
                </div>
                <input type="number" placeholder="0" style={{background:"none",border:"none",color:"#fff",fontSize:14,width:"100%",outline:"none"}}/>
              </div>

              {/* Slider */}
              <div>
                <input type="range" min={0} max={100} value={sliderVal} onChange={e=>setSliderVal(+e.target.value)}
                  style={{width:"100%",accentColor:"#a8ff3e",margin:"4px 0"}}/>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {[0,25,50,75,100].map(v=>(
                    <span key={v} style={{color:sliderVal>=v?"#a8ff3e":"#555",fontSize:10}}>{v}%</span>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div style={{background:"#141414",border:"1px solid #222",borderRadius:8,padding:"8px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#555",fontSize:11}}>Total</span>
                  <span style={{color:"#555",fontSize:11}}>USDT</span>
                </div>
                <div style={{color:"#444",fontSize:13,marginTop:4}}>—</div>
              </div>

              {/* TP/SL */}
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <input type="checkbox" checked={tpsl} onChange={e=>setTpsl(e.target.checked)} style={{accentColor:"#a8ff3e",width:14,height:14}}/>
                <span style={{color:"#888",fontSize:12}}>TP/SL</span>
              </label>

              {/* Available */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#555",fontSize:12}}>Available</span>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{color:"#fff",fontSize:12}}>0.00 USDT</span>
                  <span style={{color:"#a8ff3e",fontSize:18,fontWeight:700,lineHeight:1}}>+</span>
                </div>
              </div>

              {/* Buy/Sell button */}
              <button style={{padding:"13px 0",borderRadius:8,border:"none",cursor:"pointer",
                background:buySell==="buy"?"#ef5350":"#26a69a",color:"#fff",fontWeight:700,fontSize:15}}>
                {buySell==="buy"?`Buy ${info.coin}`:`Sell ${info.coin}`}
              </button>
            </div>

            {/* RIGHT: Mini orderbook */}
            <div style={{width:155,flexShrink:0,display:"flex",flexDirection:"column",borderLeft:"1px solid #1a1a1a",overflow:"hidden"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 8px 4px",alignItems:"center",flexShrink:0}}>
                <div style={{display:"flex",gap:3}}>
                  <div style={{width:10,height:10,background:"#ef5350",borderRadius:1}}/>
                  <div style={{width:10,height:10,background:"#26a69a",borderRadius:1}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:2}}>
                  <span style={{color:"#fff",fontSize:11}}>0.01</span>
                  <IconChevronDown />
                </div>
              </div>

              {/* Col headers */}
              <div style={{display:"flex",justifyContent:"space-between",padding:"0 8px 4px",flexShrink:0}}>
                <span style={{color:"#555",fontSize:10}}>Price(USDT)</span>
                <span style={{color:"#555",fontSize:10}}>Qty</span>
              </div>

              {/* Asks */}
              {asks.slice(0,6).map((row,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 8px",position:"relative"}}>
                  <div style={{position:"absolute",right:0,top:0,bottom:0,background:"rgba(38,166,154,0.1)",width:`${15+i*6}%`}}/>
                  <span style={{color:"#26a69a",fontSize:11,position:"relative"}}>{row.price}</span>
                  <span style={{color:"#888",fontSize:11,position:"relative"}}>{parseFloat(row.qty).toFixed(2)}</span>
                </div>
              ))}

              {/* Mid price */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",borderTop:"1px solid #111",borderBottom:"1px solid #111",flexShrink:0}}>
                <span style={{color:parseFloat(displayChange)>=0?"#26a69a":"#ef5350",fontWeight:700,fontSize:13}}>{displayPrice}</span>
                <span style={{color:"#888",fontSize:12}}>›</span>
              </div>

              {/* Bids */}
              {bids.slice(0,6).map((row,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 8px",position:"relative"}}>
                  <div style={{position:"absolute",right:0,top:0,bottom:0,background:"rgba(239,83,80,0.1)",width:`${15+i*6}%`}}/>
                  <span style={{color:"#ef5350",fontSize:11,position:"relative"}}>{row.price}</span>
                  <span style={{color:"#888",fontSize:11,position:"relative"}}>{parseFloat(row.qty).toFixed(2)}</span>
                </div>
              ))}

              {/* B/S ratio */}
              <div style={{padding:"8px",marginTop:"auto",flexShrink:0}}>
                <div style={{display:"flex",borderRadius:2,overflow:"hidden",height:3}}>
                  <div style={{flex:25,background:"#ef5350"}}/><div style={{flex:75,background:"#26a69a"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{color:"#ef5350",fontSize:10}}>B 25%</span>
                  <span style={{color:"#26a69a",fontSize:10}}>75% S</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ORDERS / ASSETS section ── */}
          <div style={{borderTop:"1px solid #1a1a1a",flexShrink:0,background:"#0d0d0d",maxHeight:200,display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",padding:"0 16px",flexShrink:0}}>
              {["Orders(0)","Assets","Bots(0)"].map(t=>(
                <button key={t} onClick={()=>setBottomTab(t)}
                  style={{padding:"10px 0",marginRight:16,background:"none",border:"none",cursor:"pointer",
                    color:bottomTab===t?"#fff":"#555",fontSize:13,fontWeight:600,
                    borderBottom:bottomTab===t?"2px solid #a8ff3e":"2px solid transparent",whiteSpace:"nowrap"}}>
                  {t}
                </button>
              ))}
              <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:4,color:"#555",fontSize:11,cursor:"pointer"}}>
                  <input type="checkbox" style={{accentColor:"#a8ff3e"}}/> Show current
                </label>
                <button style={{color:"#888",fontSize:11,background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:4,padding:"2px 8px",cursor:"pointer"}}>Cancel all</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"12px 16px",textAlign:"center"}}>
              <div style={{fontSize:28}}>📋</div>
              <p style={{color:"#555",fontSize:12,margin:"6px 0"}}>Transfer funds to start spot trading.</p>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <button style={{padding:"7px 14px",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:20,color:"#fff",fontSize:12,cursor:"pointer"}}>Deposit/Transfer</button>
                <button style={{padding:"7px 14px",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:20,color:"#fff",fontSize:12,cursor:"pointer"}}>Spot tutorial</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{display:"flex",borderTop:"1px solid #1a1a1a",background:"#0a0a0a",flexShrink:0}}>
        {navItems.map(item=>(
          <Link key={item.label} href={item.href}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",textDecoration:"none",
              color:item.active?"#a8ff3e":"#555",fontSize:10,gap:2}}>
            <span style={{fontSize:18,lineHeight:1}}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Trade Page ───────────────────────────────────────────────────────
export default function TradePage() {
  const router   = useRouter();
  const { pair } = router.query;
  const info     = PAIRS[pair] || PAIRS.ETHUSDT;

  const [isMobile,  setIsMobile]  = useState(false);
  const [orderTab,  setOrderTab]  = useState("limit");
  const [side,      setSide]      = useState("open");
  const [chartTab,  setChartTab]  = useState("chart");
  const [bookSide,  setBookSide]  = useState("both");
  const [tradeTab,  setTradeTab]  = useState("futures");
  const [posTab,    setPosTab]    = useState("positions");
  const [qty,       setQty]       = useState("0");
  const [dPrice,    setDPrice]    = useState(info.mark);
  const [leverage,  setLeverage]  = useState("20X");
  const [dSlider,   setDSlider]   = useState(0);
  const [dTpsl,     setDTpsl]     = useState(false);
  const [tf,        setTf]        = useState("1m");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const asks = genBook(info.mark, "ask").reverse();
  const bids = genBook(info.mark, "bid");
  const midPrice = info.price;

  const timeframes = ["1m","5m","15m","1h","4h","1D","1W"];
  const footerTabs = ["Positions(0)","Open Orders(0)","Order History","Position History","Trade History","Funding History","Assets","Futures Bonus","Bots(0)"];

  if (isMobile) return <MobileTradeView pair={pair} info={info} />;

  return (
    <div className="trade-root" style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#0a0a0a", overflow:"hidden" }}>
      <Navbar pair={pair} />

      {/* Token bar */}
      <div style={{ display:"flex", alignItems:"center", gap:0, padding:"0 12px", height:52, background:"#0d0d0d", borderBottom:"1px solid #1a1a1a", flexShrink:0, overflowX:"auto" }}>
        {/* Collapse btn */}
        <button style={{ background:"none", border:"none", color:"#888", cursor:"pointer", padding:"0 8px 0 0" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {/* Pair selector */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:24, cursor:"pointer" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"#627EEA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:900 }}>Ξ</div>
          <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{pair || "ETHUSDT"}</span>
          <IconChevronDown />
        </div>
        {/* Bookmark & share */}
        <button style={{ background:"none", border:"none", color:"#555", cursor:"pointer", marginRight:16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        {/* Big price */}
        <span style={{ color:"#a8ff3e", fontSize:22, fontWeight:900, marginRight:24 }}>{info.price}</span>
        {/* Stats */}
        {[
          { label:"24H Change", value:info.change, green:true },
          { label:"Mark Price",  value:info.mark },
          { label:"Index Price", value:info.index },
          { label:"24H High",   value:info.high },
          { label:"24H Low",    value:info.low },
          { label:`24H Volume(${info.coin})`, value:info.volETH },
          { label:"24H Volume(USDT)", value:info.volUSD },
          { label:"Funding Rate/Countdown", value:`${info.funding} / ${info.countdown}`, green:true },
        ].map((s) => (
          <div key={s.label} style={{ marginRight:28, flexShrink:0 }}>
            <p style={{ color:"#555", fontSize:11 }}>{s.label}</p>
            <p style={{ color: s.green ? "#a8ff3e" : "#fff", fontSize:13, fontWeight:600 }}>{s.value}</p>
          </div>
        ))}
        {/* Right icons */}
        <div style={{ marginLeft:"auto", display:"flex", gap:12, color:"#555" }}>
          {[
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
          ].map((icon, i) => (
            <button key={i} style={{ background:"none", border:"none", cursor:"pointer", color:"#555" }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Main body */}
      <div className="trade-main-body" style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── LEFT: Chart area ── */}
        <div className="trade-left-panel" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:"1px solid #1a1a1a" }}>
          {/* Chart toolbar */}
          <div style={{ display:"flex", alignItems:"center", gap:0, padding:"0 8px", height:40, borderBottom:"1px solid #1a1a1a", flexShrink:0, background:"#0d0d0d" }}>
            {/* Chart/Info/Data tabs */}
            {[["chart","Chart"],["info","Info"],["data","Data"]].map(([k, l]) => (
              <button key={k} onClick={() => setChartTab(k)}
                style={{ padding:"0 12px", height:"100%", background:"none", border:"none", cursor:"pointer", color: chartTab===k ? "#fff" : "#555", fontSize:13, fontWeight: chartTab===k ? 600 : 400, borderBottom: chartTab===k ? "2px solid #a8ff3e" : "none" }}>
                {l}{k==="data" && <span style={{ fontSize:10, color:"#a8ff3e", marginLeft:4 }}>NEW</span>}
              </button>
            ))}
            <div style={{ width:1, height:20, background:"#222", margin:"0 8px" }}/>
            {/* Timeframes */}
            {timeframes.map((t) => (
              <button key={t} onClick={() => setTf(t)}
                style={{ padding:"0 8px", height:"100%", background: tf===t ? "#1a1a1a" : "none", border:"none", cursor:"pointer", color: tf===t ? "#fff" : "#555", fontSize:12, borderRadius:4 }}>
                {t}
              </button>
            ))}
            {/* More controls */}
            <div style={{ marginLeft:"auto", display:"flex", gap:4, color:"#555" }}>
              {["≡","⊞","↗","⚙"].map((ic, i) => (
                <button key={i} style={{ background:"none", border:"none", cursor:"pointer", color:"#555", fontSize:16, padding:"0 4px" }}>{ic}</button>
              ))}
              <span style={{ color:"#555", fontSize:12, margin:"0 6px" }}>Last price ▾</span>
              {["📊","💬","🔒","▣","🔗","⛶","⊞"].map((ic, i) => (
                <button key={i} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"0 2px" }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Buy/Sell quick panel */}
          <div style={{ display:"flex", alignItems:"center", gap:0, padding:"4px 8px", background:"#0a0a0a", borderBottom:"1px solid #111", flexShrink:0 }}>
            <div style={{ display:"flex", gap:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(38,166,154,0.15)", border:"1px solid rgba(38,166,154,0.3)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
                <span style={{ color:"#26a69a", fontWeight:700, fontSize:13 }}>Buy</span>
                <span style={{ color:"#26a69a", fontSize:12 }}>{info.mark}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(239,83,80,0.15)", border:"1px solid rgba(239,83,80,0.3)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
                <span style={{ color:"#ef5350", fontWeight:700, fontSize:13 }}>Sell</span>
                <span style={{ color:"#ef5350", fontSize:12 }}>{info.mark}</span>
              </div>
            </div>
            <span style={{ color:"#444", fontSize:12, marginLeft:8 }}>By Qty ({info.coin}) ▾  Enter Quantity</span>
          </div>

          {/* OHLC info bar */}
          <div style={{ padding:"4px 12px", background:"#0a0a0a", borderBottom:"1px solid #111", flexShrink:0, display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ color:"#555", fontSize:11 }}>{pair || "ETHUSDT"} · {tf} · Last price Bitcovex</span>
            {[
              ["O", info.index, "#fff"],
              ["H", info.high,  "#26a69a"],
              ["L", info.low,   "#ef5350"],
              ["C", info.mark,  "#fff"],
            ].map(([label, val, col]) => (
              <span key={label} style={{ fontSize:11 }}>
                <span style={{ color:"#555" }}>{label}</span>
                <span style={{ color:col, marginLeft:2 }}>{val}</span>
              </span>
            ))}
            <span style={{ color:"#26a69a", fontSize:11 }}>4.18 (+0.20%)</span>
          </div>

          {/* Chart + left toolbar */}
          <div style={{ flex:1, display:"flex", overflow:"hidden", background:"#0a0a0a", position:"relative" }}>
            {/* Left drawing toolbar */}
            <div style={{ width:32, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, gap:2, borderRight:"1px solid #111", background:"#0a0a0a" }}>
              {[
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 7 7 7 7 17 22 17"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
              ].map((ic, i) => (
                <button key={i} style={{ background:"none", border:"none", cursor:"pointer", color:"#555", padding:"5px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4, width:26, height:26 }}
                  onMouseEnter={e => { e.currentTarget.style.background="#1a1a1a"; e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="#555"; }}>
                  {ic}
                </button>
              ))}
            </div>

            {/* Chart canvas fills remaining space */}
            <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0, height:"100%" }}>
              <CandleChart pair={pair} tf={tf} />
              {/* TV watermark */}
              <div style={{ position:"absolute", bottom:32, left:12, opacity:0.25 }}>
                <svg width="30" height="30" viewBox="0 0 100 100"><rect width="100" height="100" rx="8" fill="#2962ff"/><text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="900" fill="#fff">TV</text></svg>
              </div>
              {/* Bottom labels */}
              <div style={{ position:"absolute", bottom:6, left:8, display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#26a69a" }}/>
                <span style={{ color:"#555", fontSize:11 }}>Stable network</span>
                <span style={{ color:"#555", fontSize:11 }}>⚙</span>
              </div>
              <div style={{ position:"absolute", bottom:6, right:8, display:"flex", gap:10 }}>
                {["%","log","auto"].map(l => <span key={l} style={{ color:"#555", fontSize:11 }}>{l}</span>)}
              </div>
            </div>
          </div>

          {/* Positions footer */}
          <div style={{ borderTop:"1px solid #1a1a1a", flexShrink:0, background:"#0d0d0d" }}>
            <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto" }}>
              {footerTabs.map((t) => (
                <button key={t} onClick={() => setPosTab(t)}
                  style={{ padding:"8px 14px", background:"none", border:"none", borderBottom: posTab===t ? "2px solid #a8ff3e" : "2px solid transparent", cursor:"pointer", color: posTab===t ? "#fff" : "#555", fontSize:12, whiteSpace:"nowrap" }}>
                  {t}
                </button>
              ))}
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, padding:"0 12px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:4, color:"#555", fontSize:12, cursor:"pointer" }}>
                  <input type="checkbox" style={{ accentColor:"#a8ff3e" }}/> Current only
                </label>
                <button style={{ color:"#a8ff3e", fontSize:12, background:"none", border:"none", cursor:"pointer" }}>Close all</button>
                <button style={{ color:"#555", fontSize:12, background:"none", border:"none", cursor:"pointer" }}>⋮</button>
              </div>
            </div>
            <div style={{ padding:"24px", textAlign:"center", color:"#444", fontSize:13 }}>No open positions</div>
          </div>
        </div>

        {/* ── MIDDLE: Order Book ── */}
        <div className="trade-middle-panel" style={{ width:260, display:"flex", flexDirection:"column", borderRight:"1px solid #1a1a1a", overflow:"hidden", background:"#0a0a0a", flexShrink:0 }}>
          {/* Orderbook / Trades tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid #1a1a1a" }}>
            {["Orderbook","Trades"].map((t) => (
              <button key={t} onClick={() => {}}
                style={{ flex:1, padding:"10px 0", background:"none", border:"none", cursor:"pointer", color: t==="Orderbook" ? "#fff" : "#555", fontSize:13, fontWeight:600, borderBottom: t==="Orderbook" ? "2px solid #a8ff3e" : "none" }}>
                {t}
              </button>
            ))}
          </div>

          {/* Book type icons */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 8px", borderBottom:"1px solid #111" }}>
            <div style={{ display:"flex", gap:4 }}>
              {["⊟","⊟","⊟"].map((ic, i) => (
                <button key={i} style={{ background: i===0 ? "#1a1a1a" : "none", border:"none", cursor:"pointer", color: i===0 ? "#fff" : "#555", padding:"2px 4px", borderRadius:3 }}>{ic}</button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ color:"#fff", fontSize:12 }}>0.01</span>
              <IconChevronDown />
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"4px 8px", gap:4 }}>
            <span style={{ color:"#555", fontSize:11 }}>Price (USDT)</span>
            <span style={{ color:"#555", fontSize:11, textAlign:"right" }}>Qty. ({info.coin})</span>
            <span style={{ color:"#555", fontSize:11, textAlign:"right" }}>Sum ({info.coin})</span>
          </div>

          {/* Asks (red — sell side) */}
          <div style={{ flex:1, overflow:"hidden" }}>
            {asks.map((row, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"2px 8px", gap:4, position:"relative", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background="#111"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div style={{ position:"absolute", right:0, top:0, bottom:0, background:"rgba(239,83,80,0.08)", width:`${20 + i*4}%` }}/>
                <span style={{ color:"#ef5350", fontSize:12, fontWeight:500, position:"relative" }}>{row.price}</span>
                <span style={{ color:"#ccc", fontSize:12, textAlign:"right", position:"relative" }}>{row.qty}</span>
                <span style={{ color:"#ccc", fontSize:12, textAlign:"right", position:"relative" }}>{row.sum}</span>
              </div>
            ))}
          </div>

          {/* Mid price */}
          <div style={{ padding:"8px", borderTop:"1px solid #111", borderBottom:"1px solid #111", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#a8ff3e", fontSize:18, fontWeight:900 }}>{midPrice} ↑</span>
            <span style={{ color:"#555", fontSize:12 }}>⊡ {midPrice}</span>
          </div>

          {/* Bids (green — buy side) */}
          <div style={{ flex:1, overflow:"hidden" }}>
            {bids.map((row, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"2px 8px", gap:4, position:"relative", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background="#111"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div style={{ position:"absolute", right:0, top:0, bottom:0, background:"rgba(38,166,154,0.08)", width:`${20 + i*4}%` }}/>
                <span style={{ color:"#26a69a", fontSize:12, fontWeight:500, position:"relative" }}>{row.price}</span>
                <span style={{ color:"#ccc", fontSize:12, textAlign:"right", position:"relative" }}>{row.qty}</span>
                <span style={{ color:"#ccc", fontSize:12, textAlign:"right", position:"relative" }}>{row.sum}</span>
              </div>
            ))}
          </div>

          {/* B/S ratio bar */}
          <div style={{ padding:"6px 8px", borderTop:"1px solid #111" }}>
            <div style={{ display:"flex", borderRadius:3, overflow:"hidden", height:6 }}>
              <div style={{ flex:"48.71", background:"#26a69a" }}/>
              <div style={{ flex:"51.29", background:"#ef5350" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
              <span style={{ color:"#26a69a", fontSize:11 }}>B 48.71%</span>
              <span style={{ color:"#ef5350", fontSize:11 }}>51.29% S</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Trading Panel ── */}
        <div className="trade-right-panel" style={{ width:260, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0a0a0a", flexShrink:0 }}>
          {/* Futures / Grid tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid #1a1a1a" }}>
            {["Futures","Grid"].map((t) => (
              <button key={t} onClick={() => setTradeTab(t.toLowerCase())}
                style={{ flex:1, padding:"10px 0", background:"none", border:"none", cursor:"pointer", color: tradeTab===t.toLowerCase() ? "#fff" : "#555", fontSize:13, fontWeight:600, borderBottom: tradeTab===t.toLowerCase() ? "2px solid #a8ff3e" : "none" }}>
                {t}
              </button>
            ))}
            <button style={{ background:"none", border:"none", cursor:"pointer", color:"#555", padding:"0 8px" }}>⋮</button>
          </div>

          <div style={{ flex:1, overflow:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:10 }}>
            {/* Cross / Leverage */}
            <div style={{ display:"flex", gap:6 }}>
              <button style={{ flex:1, padding:"5px 0", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                Cross <IconChevronDown />
              </button>
              <button style={{ flex:1, padding:"5px 0", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                <span style={{ color:"#a8ff3e", fontWeight:700, fontSize:12 }}>{leverage}</span>
                <span style={{ color:"#888", fontSize:11 }}>20X</span>
              </button>
            </div>

            {/* Open / Close */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, background:"#141414", borderRadius:8, padding:3 }}>
              {["Open","Close"].map((s) => (
                <button key={s} onClick={() => setSide(s.toLowerCase())}
                  style={{ padding:"7px 0", borderRadius:6, background: side===s.toLowerCase() ? "#a8ff3e" : "transparent", border:"none", color: side===s.toLowerCase() ? "#000" : "#555", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Limit / Market / Trigger */}
            <div style={{ display:"flex", gap:12, borderBottom:"1px solid #1a1a1a", paddingBottom:8 }}>
              {["Limit","Market","Trigger"].map((t) => (
                <button key={t} onClick={() => setOrderTab(t.toLowerCase())}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color: orderTab===t.toLowerCase() ? "#fff" : "#555", paddingBottom:4, borderBottom: orderTab===t.toLowerCase() ? "2px solid #a8ff3e" : "2px solid transparent" }}>
                  {t}
                </button>
              ))}
              <button style={{ background:"none", border:"none", cursor:"pointer", color:"#555", marginLeft:"auto" }}>ⓘ</button>
            </div>

            {/* Available */}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#555", fontSize:12 }}>Available</span>
              <span style={{ color:"#fff", fontSize:12 }}>0.0000 USDT</span>
            </div>

            {/* Order Price */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#888", fontSize:12 }}>Order Price</span>
                <span style={{ color:"#555", fontSize:11 }}>Last  USDT</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", background:"#141414", border:"1px solid #2a2a2a", borderRadius:8, padding:"10px 12px" }}>
                <button style={{ color:"#555", background:"none", border:"none", cursor:"pointer", fontSize:18, lineHeight:1 }}>−</button>
                <input value={dPrice} onChange={e => setDPrice(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:16, fontWeight:700, textAlign:"center" }}/>
                <button style={{ color:"#555", background:"none", border:"none", cursor:"pointer", fontSize:18, lineHeight:1 }}>+</button>
              </div>
            </div>

            {/* By Qty */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#888", fontSize:12 }}>By Qty</span>
                <span style={{ color:"#a8ff3e", fontSize:11 }}>{info.coin} ▾</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", background:"#141414", border:"1px solid #2a2a2a", borderRadius:8, padding:"10px 12px" }}>
                <button style={{ color:"#555", background:"none", border:"none", cursor:"pointer", fontSize:18, lineHeight:1 }}>−</button>
                <input value={qty} onChange={e => setQty(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:16, fontWeight:700, textAlign:"center" }}/>
                <button style={{ color:"#555", background:"none", border:"none", cursor:"pointer", fontSize:18, lineHeight:1 }}>+</button>
              </div>
            </div>

            {/* Slider */}
            <div>
              <input type="range" min={0} max={100} value={dSlider} onChange={e => setDSlider(e.target.value)}
                style={{ width:"100%", accentColor:"#a8ff3e" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                {["0%","25%","50%","75%","100%"].map((v) => (
                  <span key={v} style={{ color:"#444", fontSize:10 }}>{v}</span>
                ))}
              </div>
            </div>

            {/* TP / SL */}
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
              <input type="checkbox" checked={dTpsl} onChange={e => setDTpsl(e.target.checked)} style={{ accentColor:"#a8ff3e" }}/>
              <span style={{ color:"#888", fontSize:13 }}>TP / SL</span>
            </label>

            {/* Open Long / Short */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button style={{ padding:"12px 0", background:"#26a69a", border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Open long
              </button>
              <button style={{ padding:"12px 0", background:"#ef5350", border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Open short
              </button>
            </div>

            {/* Cost info */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
              <div>
                <p style={{ color:"#555", fontSize:11 }}>Cost (USDT) 0.0</p>
                <p style={{ color:"#555", fontSize:11 }}>Max ({info.coin}) 0.0</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"#555", fontSize:11 }}>Cost (USDT) 0.0</p>
                <p style={{ color:"#555", fontSize:11 }}>Max ({info.coin}) 0.0</p>
              </div>
            </div>

            {/* Effective time */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:"#555", fontSize:12 }}>Effective Time</span>
              <button style={{ display:"flex", alignItems:"center", gap:4, background:"#141414", border:"1px solid #222", borderRadius:4, padding:"3px 8px", color:"#fff", fontSize:12, cursor:"pointer" }}>
                GTC <IconChevronDown />
              </button>
            </div>

            {/* VIP info */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px", background:"#111", borderRadius:8 }}>
              <div style={{ width:32, height:32, borderRadius:6, background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏆</div>
              <div>
                <p style={{ color:"#fff", fontSize:12, fontWeight:600 }}>VIP 0</p>
                <p style={{ color:"#555", fontSize:11 }}>Maker 0.0200%  Taker 0.0600%</p>
              </div>
            </div>

            {/* Margin info */}
            <div>
              <p style={{ color:"#fff", fontSize:13, fontWeight:600, marginBottom:6 }}>Margin</p>
              <p style={{ color:"#555", fontSize:12 }}>USDT · Cross</p>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span style={{ color:"#555", fontSize:12 }}>Margin Rate</span>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid #a8ff3e", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#a8ff3e", clipPath:"inset(0 50% 0 0)" }}/>
                  </div>
                  <span style={{ color:"#555", fontSize:12 }}>0.0%</span>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ color:"#555", fontSize:12 }}>Maintenance Margin</span>
              </div>
              <div style={{ marginTop:6 }}>
                <span style={{ color:"#555", fontSize:11 }}>Single-A...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
