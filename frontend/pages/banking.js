import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

// ─── Formatters ─────────────────────────────────────────────────────────────
function fmt(value, decimals = 4) {
  const n = Number(value || 0);
  if (n === 0) return "0.00";
  if (n >= 1000) return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return n.toFixed(decimals);
}

function fmtUsd(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function collectionItems(payload, key) {
  const src = payload?.data?.[key];
  if (Array.isArray(src?.data)) return src.data;
  if (Array.isArray(src)) return src;
  return [];
}

// ─── Fiat filter ────────────────────────────────────────────────────────────
const FIAT_SYMBOLS = new Set(["USD","EUR","GBP","JPY","KRW","INR","MXN","BRL","CNY","CAD","AUD","CHF","HKD","SGD","THB","RUB","TRY","IDR","PHP","VND","NGN","ZAR","AED","SAR","ILS","HUF","CZK","PLN","SEK","NOK","DKK","NZD","MYR","TWD","PKR","BDT","EGP","UAH","ARS","CLP","COP","PEN","VEF","QAR","KWD","BHD","OMR","JOD","LBP","MAD","TND","GHS","KES","UGX","TZS","ETB","XOF","XAF","DZD","LYD","SDG","MZN","AOA","ZMW","MWK","RWF","BIF","SOS","DJF","KMF","MRO","GMD","SLL","LRD","GNF","CVE","STD","SZL","LSL","BWP","NAD","MUR","SCR","MGA","KES","SHP","FOK","FJD","PGK","SBD","VUV","WST","TOP","NIO","GTQ","HNL","CRC","DOP","JMD","TTD","BBD","XCD","BSD","BZD","GYD","SRD","AWG","ANG","HTG","CUP","BMD","KYD","IMP","JEP","GGP","TVD","CKD","TON"]);
function isCrypto(wallet) {
  const sym = String(wallet?.currency?.symbol || "").toUpperCase();
  if (!sym) return false;
  if (FIAT_SYMBOLS.has(sym)) return false;
  if (sym === "$" || sym.length === 1) return false;
  const type = String(wallet?.currency?.type || "").toLowerCase();
  if (type === "fiat") return false;
  return true;
}

// ─── Network definitions per coin ───────────────────────────────────────────
const COIN_NETWORKS = {
  USDT: [
    { id: "trc20",  label: "Tron (TRC20)",            fee: "2 USDT",   feeUsd: "$2",     arrival: "1 min",  color: "#E50914" },
    { id: "bep20",  label: "BNB Smart Chain (BEP20)", fee: "0.5 USDT", feeUsd: "$0.5",   arrival: "1 min",  color: "#F0B90B" },
    { id: "erc20",  label: "Ethereum (ERC20)",        fee: "1 USDT",   feeUsd: "$1",     arrival: "1 min",  color: "#627EEA" },
    { id: "sol",    label: "Solana",                  fee: "0.25 USDT",feeUsd: "$0.25",  arrival: "1 min",  color: "#9945FF" },
    { id: "ton",    label: "The Open Network (TON)",  fee: "0.3 USDT", feeUsd: "$0.3",   arrival: "3 min",  color: "#0098EA" },
    { id: "op",     label: "Optimism",                fee: "0.05 USDT",feeUsd: "$0.05",  arrival: "1 min",  color: "#FF0420" },
  ],
  BTC: [
    { id: "btc",    label: "Bitcoin (BTC)",           fee: "0.0003 BTC", feeUsd: "$13",  arrival: "10 min", color: "#F7931A" },
    { id: "bep20",  label: "BNB Smart Chain (BEP20)", fee: "0.00001 BTC",feeUsd: "$0.4", arrival: "1 min",  color: "#F0B90B" },
    { id: "lightning", label: "Lightning Network",   fee: "0 BTC",   feeUsd: "$0",     arrival: "instant",color: "#FFC107" },
  ],
  ETH: [
    { id: "erc20",  label: "Ethereum (ERC20)",        fee: "0.002 ETH", feeUsd: "$5",    arrival: "1 min",  color: "#627EEA" },
    { id: "bep20",  label: "BNB Smart Chain (BEP20)", fee: "0.0001 ETH",feeUsd: "$0.3",  arrival: "1 min",  color: "#F0B90B" },
    { id: "arb",    label: "Arbitrum One",            fee: "0.0001 ETH",feeUsd: "$0.3",  arrival: "1 min",  color: "#12AAFF" },
    { id: "op",     label: "Optimism",                fee: "0.0001 ETH",feeUsd: "$0.2",  arrival: "1 min",  color: "#FF0420" },
  ],
  BNB: [
    { id: "bep20",  label: "BNB Smart Chain (BEP20)", fee: "0.0005 BNB",feeUsd: "$0.3",  arrival: "1 min",  color: "#F0B90B" },
  ],
  SOL: [
    { id: "sol",    label: "Solana",                  fee: "0.01 SOL",  feeUsd: "$1.5",  arrival: "1 min",  color: "#9945FF" },
  ],
  TRX: [
    { id: "trc20",  label: "Tron (TRC20)",            fee: "1 TRX",     feeUsd: "$0.1",  arrival: "1 min",  color: "#E50914" },
  ],
  XRP: [
    { id: "xrp",    label: "XRP Ledger",              fee: "0.25 XRP",  feeUsd: "$0.15", arrival: "1 min",  color: "#00AAE4" },
  ],
};

function getNetworks(symbol) {
  return COIN_NETWORKS[symbol?.toUpperCase()] || [
    { id: "main", label: symbol + " Network", fee: "Variable", feeUsd: "--", arrival: "1–10 min", color: "#a8ff3e" },
  ];
}

const COIN_NAMES = { USDT:"Tether USDT", BTC:"Bitcoin", ETH:"Ethereum", BNB:"BNB", SOL:"Solana", TRX:"TRON", XRP:"XRP", ADA:"Cardano", DOGE:"Dogecoin", LTC:"Litecoin", MATIC:"Polygon" };
const ALL_DEPOSIT_COINS = Object.keys(COIN_NETWORKS).map(sym => ({
  id: sym, balance: 0, balance_on_hold: 0,
  currency: { symbol: sym, name: COIN_NAMES[sym] || sym, type: "crypto" },
}));

// ─── Real SVG Coin Icons ─────────────────────────────────────────────────────
const COIN_SVGS = {
  USDT: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.124 0 1.051 3.309 1.923 7.709 2.125v7.588h3.913v-7.591c4.393-.202 7.694-1.073 7.694-2.122 0-1.05-3.301-1.922-7.694-2.123" fill="#fff"/></svg>
  ),
  BTC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.657 14.185c.31-2.073-1.27-3.187-3.429-3.932l.7-2.808-1.708-.426-.682 2.735c-.449-.112-.91-.217-1.368-.322l.687-2.753-1.707-.426-.7 2.807c-.372-.085-.737-.169-1.092-.257l.002-.009-2.355-.588-.454 1.823s1.27.292 1.244.31c.694.173.819.632.798 .996l-.8 3.206c.048.012.11.03.178.057l-.181-.045-1.121 4.494c-.085.211-.3.528-.784.407.017.025-1.244-.311-1.244-.311l-.85 1.955 2.222.554c.413.104.818.212 1.217.315l-.707 2.836 1.706.425.7-2.81c.466.127.919.244 1.362.354l-.698 2.796 1.708.426.707-2.83c2.916.552 5.11.329 6.031-2.309.744-2.121-.037-3.345-1.569-4.143 1.116-.257 1.957-0.99 2.181-2.504zm-3.904 5.476c-.528 2.121-4.1.975-5.261.687l.939-3.762c1.161.29 4.886.864 4.322 3.075zm.529-5.506c-.483 1.934-3.463.951-4.43.71l.851-3.41c.967.241 4.081.691 3.579 2.7z" fill="#fff"/></svg>
  ),
  ETH: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fillOpacity=".602"/><path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/><path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fillOpacity=".602"/><path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/><path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#fff" fillOpacity=".2"/><path d="M9 16.22l7.498 4.353v-7.701z" fill="#fff" fillOpacity=".602"/></svg>
  ),
  BNB: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F0B90B"/><path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.002-.001 2.262-2.259zM21.48 16l2.26-2.26L26 16l-2.26 2.26zm-3.188-.002h.002L16 13.706l-1.813 1.812-.004.003.004.003L16 17.334l2.294-2.294.002-.042-.004.042-.002-.042z" fill="#fff"/></svg>
  ),
  SOL: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#9945FF"/><path d="M9.925 19.687a.59.59 0 01.415-.172h13.4c.262 0 .393.317.208.502l-2.65 2.65a.59.59 0 01-.415.172H7.483a.295.295 0 01-.208-.502zm0-10.354a.59.59 0 01.415-.172h13.4c.262 0 .393.317.208.502L21.3 12.31a.59.59 0 01-.415.172H7.483a.295.295 0 01-.208-.502zm11.15 5.153a.59.59 0 00-.415-.172H7.26a.295.295 0 00-.208.502l2.65 2.65c.11.11.26.172.415.172h13.4c.262 0 .393-.317.208-.502z" fill="#fff"/></svg>
  ),
  TRX: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#E50914"/><path d="M22.9 11.382l-3.25-.96-8.15-2.41-.01.03 8.34 4.82-2.54 5.81L16 20.06l-1.29-1.39-2.54-5.81 8.34-4.82-.01-.03-8.15 2.41-3.25.96-.01.03 3.02 1.77 2.73 6.27.01.03 1.15 1.24 1.15-1.24.01-.03 2.73-6.27 3.02-1.77-.01-.03z" fill="#fff"/></svg>
  ),
  XRP: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00AAE4"/><path d="M21.84 9h2.35l-5.12 5.12a4.38 4.38 0 01-6.14 0L7.81 9h2.35l3.94 3.94a2.64 2.64 0 003.8 0zm-14.03 14h2.35l3.96-3.96a2.64 2.64 0 013.8 0L21.88 23h2.35l-5.14-5.14a4.38 4.38 0 00-6.14 0z" fill="#fff"/></svg>
  ),
  ADA: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0033AD"/><path d="M16 7.5a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm0 14.8a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm6.6-11.3a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm-13.2 0a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm13.2 7.5a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm-13.2 0a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm9.9-10.5a.85.85 0 100 1.7.85.85 0 000-1.7zm-6.6 0a.85.85 0 100 1.7.85.85 0 000-1.7zm9.9 3.8a.85.85 0 100 1.7.85.85 0 000-1.7zm-13.2 0a.85.85 0 100 1.7.85.85 0 000-1.7zm13.2 5.5a.85.85 0 100 1.7.85.85 0 000-1.7zm-13.2 0a.85.85 0 100 1.7.85.85 0 000-1.7zm9.9 3.9a.85.85 0 100 1.7.85.85 0 000-1.7zm-6.6 0a.85.85 0 100 1.7.85.85 0 000-1.7zM16 13a3 3 0 100 6 3 3 0 000-6z" fill="#3CC8C8"/></svg>
  ),
  DOGE: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C2A633"/><path d="M16.1 7.5h-5.3v17h5.3c4.9 0 8.4-3.4 8.4-8.5s-3.5-8.5-8.4-8.5zm0 13.6h-2.3v-9.2h2.3c3.1 0 5.2 1.9 5.2 4.6s-2.1 4.6-5.2 4.6zm-1.5-6.6h2.5v1.4h-2.5v-1.4z" fill="#fff"/></svg>
  ),
  LTC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#BFBBBB"/><path d="M16 5C9.925 5 5 9.925 5 16s4.925 11 11 11 11-4.925 11-11S22.075 5 16 5zm-1.79 16.125l.705-2.844-1.69.51.42-1.65 1.695-.51 1.44-5.745H19l-1.44 5.745 1.68-.51-.405 1.635-1.695.51-.705 2.859h-2.225z" fill="#fff"/></svg>
  ),
  MATIC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#8247E5"/><path d="M20.387 13.4c-.308-.177-.7-.177-1.05 0l-2.45 1.418-1.663.932-2.45 1.418c-.308.177-.7.177-1.05 0l-1.927-1.108a1.05 1.05 0 01-.525-.887V13.4c0-.354.192-.665.525-.887l1.927-1.063c.308-.177.7-.177 1.05 0l1.927 1.063c.308.177.525.488.525.887v1.418l1.663-.976V12.47a1.05 1.05 0 00-.525-.887L16.1 9.458c-.308-.177-.7-.177-1.05 0l-4.245 2.48a1.05 1.05 0 00-.525.887v4.96c0 .354.192.665.525.887l4.245 2.48c.308.177.7.177 1.05 0l2.45-1.418 1.663-.976 2.45-1.418c.308-.177.7-.177 1.05 0l1.927 1.108c.308.177.525.488.525.887v1.774c0 .354-.192.665-.525.887l-1.927 1.063c-.308.177-.7.177-1.05 0l-1.927-1.063a1.05 1.05 0 01-.525-.887v-1.418l-1.663.976v1.418c0 .354.192.665.525.887l4.245 2.48c.308.177.7.177 1.05 0l4.245-2.48c.308-.177.525-.488.525-.887v-4.96c0-.354-.192-.665-.525-.887z" fill="#fff"/></svg>
  ),
};

function CoinIcon({ symbol, size = 36 }) {
  const sym = symbol?.toUpperCase();
  if (COIN_SVGS[sym]) {
    return <div style={{width:size,height:size,flexShrink:0}}>{COIN_SVGS[sym](size)}</div>;
  }
  const colors = {
    BNB: ["#F0B90B","#000"], SOL: ["#9945FF","#fff"], TRX: ["#E50914","#fff"],
  };
  const [bg, fg] = colors[sym] || ["#1e1e2e","#a8ff3e"];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      color: fg, display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.36, flexShrink: 0,
    }}>
      {(symbol || "?").slice(0, 3).toUpperCase()}
    </div>
  );
}

// ─── SVG icons ───────────────────────────────────────────────────────────────
const IcClose = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IcBack  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>;
const IcEye   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcEyeOff= () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>;
const IcCopy  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcSwap  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>;
const IcSearch= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const IcChev  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;
const IcDeposit   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14M5 13l7 7 7-7"/><path d="M3 21h18"/></svg>;
const IcWithdraw  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V7M5 11l7-7 7 7"/><path d="M3 3h18"/></svg>;
const IcTransfer  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>;
const IcHistory   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;

// ─── Modal wrapper ───────────────────────────────────────────────────────────
function BottomSheet({ show, onClose, title, onBack, children }) {
  if (!show) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:"fixed", top:0, left:0, right:0, bottom:0,
        background:"rgba(0,0,0,.75)", zIndex:1000,
        display:"flex", alignItems:"flex-end",
      }}
    >
      <div style={{
        width:"100%", maxHeight:"92vh", background:"#16161e",
        borderRadius:"20px 20px 0 0", overflow:"hidden",
        display:"flex", flexDirection:"column",
      }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 16px 12px", borderBottom:"1px solid rgba(255,255,255,.07)",
          flexShrink:0,
        }}>
          {onBack ? (
            <button onClick={onBack} style={{width:34,height:34,background:"rgba(255,255,255,.07)",border:"none",borderRadius:"50%",color:"#aaa",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcBack /></button>
          ) : <div style={{width:34}}/>}
          <span style={{fontSize:17,fontWeight:700,color:"#fff"}}>{title}</span>
          <button onClick={onClose} style={{width:34,height:34,background:"rgba(255,255,255,.07)",border:"none",borderRadius:"50%",color:"#aaa",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcClose /></button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16}}>{children}</div>
      </div>
    </div>
  );
}

// ─── Step 1: Coin selector ───────────────────────────────────────────────────
function CoinSelectStep({ wallets, search, setSearch, onSelect, mode }) {
  const filtered = useMemo(() => {
    const cryptoOnly = wallets.filter(isCrypto);
    const q = search.trim().toLowerCase();
    if (!q) return cryptoOnly;
    return cryptoOnly.filter(w =>
      String(w.currency?.symbol || "").toLowerCase().includes(q) ||
      String(w.currency?.name || "").toLowerCase().includes(q)
    );
  }, [wallets, search]);

  return (
    <div>
      <div className="search-wrap">
        <IcSearch />
        <input
          className="search-inp"
          placeholder="Search coin..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="coin-list">
        {filtered.length === 0 && (
          <div style={{textAlign:"center",color:"#555",padding:"40px 0"}}>No coins found</div>
        )}
        {filtered.map(w => {
          const sym = w.currency?.symbol || "?";
          const bal = Number(w.balance || 0);
          const avail = Number(w.balance_on_hold !== undefined ? bal - Number(w.balance_on_hold || 0) : bal);
          return (
            <button key={w.id || sym} className="coin-row" onClick={() => onSelect(w)}>
              <CoinIcon symbol={sym} size={40} />
              <div className="coin-info">
                <span className="coin-sym">{sym}</span>
                <span className="coin-name">{w.currency?.name || sym}</span>
              </div>
              {mode === "deposit" ? (
                <span className="coin-bal-label">Deposit</span>
              ) : (
                <div className="coin-bal-wrap">
                  <span className="coin-bal">{fmt(avail)}</span>
                  <span className="coin-bal-sym">{sym}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .search-wrap {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,.06); border-radius: 12px;
          padding: 10px 14px; margin-bottom: 14px; color: #666;
        }
        .search-inp {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-size: 15px;
        }
        .search-inp::placeholder { color: #555; }
        .coin-list { display: flex; flex-direction: column; gap: 2px; }
        .coin-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 10px; border-radius: 12px; border: none;
          background: none; cursor: pointer; width: 100%; text-align: left;
        }
        .coin-row:hover { background: rgba(255,255,255,.05); }
        .coin-info { flex: 1; display: flex; flex-direction: column; }
        .coin-sym { font-size: 15px; font-weight: 700; color: #fff; }
        .coin-name { font-size: 12px; color: #666; margin-top: 2px; }
        .coin-bal-wrap { display: flex; flex-direction: column; align-items: flex-end; }
        .coin-bal { font-size: 14px; font-weight: 700; color: #fff; }
        .coin-bal-sym { font-size: 11px; color: #666; }
        .coin-bal-label { font-size: 12px; color: #a8ff3e; font-weight: 600; }
      `}</style>
    </div>
  );
}

// ─── Network icon SVGs ────────────────────────────────────────────────────────
const NET_ICONS = {
  trc20:  <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#E50914"/><path d="M22.9 11.382l-3.25-.96-8.15-2.41-.01.03 8.34 4.82-2.54 5.81L16 20.06l-1.29-1.39-2.54-5.81 8.34-4.82-.01-.03-8.15 2.41-3.25.96-.01.03 3.02 1.77 2.73 6.27.01.03 1.15 1.24 1.15-1.24.01-.03 2.73-6.27 3.02-1.77-.01-.03z" fill="#fff"/></svg>,
  bep20:  <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F0B90B"/><path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.002-.001 2.262-2.259zM21.48 16l2.26-2.26L26 16l-2.26 2.26zm-3.188-.002h.002L16 13.706l-1.813 1.812-.004.003.004.003L16 17.334l2.294-2.294.002-.042-.004.042-.002-.042z" fill="#fff"/></svg>,
  erc20:  <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fillOpacity=".6"/><path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/><path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fillOpacity=".6"/><path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/><path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#fff" fillOpacity=".2"/><path d="M9 16.22l7.498 4.353v-7.701z" fill="#fff" fillOpacity=".6"/></svg>,
  sol:    <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#9945FF"/><path d="M9.925 19.687a.59.59 0 01.415-.172h13.4c.262 0 .393.317.208.502l-2.65 2.65a.59.59 0 01-.415.172H7.483a.295.295 0 01-.208-.502zm0-10.354a.59.59 0 01.415-.172h13.4c.262 0 .393.317.208.502L21.3 12.31a.59.59 0 01-.415.172H7.483a.295.295 0 01-.208-.502zm11.15 5.153a.59.59 0 00-.415-.172H7.26a.295.295 0 00-.208.502l2.65 2.65c.11.11.26.172.415.172h13.4c.262 0 .393-.317.208-.502z" fill="#fff"/></svg>,
  ton:    <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0098EA"/><path d="M16 6l9 5.196v9.608L16 26l-9-5.196V11.196L16 6zm0 2.31L9 12.35v7.3L16 23.69l7-4.04v-7.3L16 8.31zm0 2.69l5 2.887v5.774L16 22.35l-5-2.887V13.887L16 11z" fill="#fff"/></svg>,
  op:     <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#FF0420"/><text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">OP</text></svg>,
  btc:    <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.657 14.185c.31-2.073-1.27-3.187-3.429-3.932l.7-2.808-1.708-.426-.682 2.735c-.449-.112-.91-.217-1.368-.322l.687-2.753-1.707-.426-.7 2.807c-.372-.085-.737-.169-1.092-.257l.002-.009-2.355-.588-.454 1.823s1.27.292 1.244.31c.694.173.819.632.798.996l-.8 3.206c.048.012.11.03.178.057l-.181-.045-1.121 4.494c-.085.211-.3.528-.784.407.017.025-1.244-.311-1.244-.311l-.85 1.955 2.222.554c.413.104.818.212 1.217.315l-.707 2.836 1.706.425.7-2.81c.466.127.919.244 1.362.354l-.698 2.796 1.708.426.707-2.83c2.916.552 5.11.329 6.031-2.309.744-2.121-.037-3.345-1.569-4.143 1.116-.257 1.957-.99 2.181-2.504z" fill="#fff"/></svg>,
  lightning: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#FFC107"/><path d="M18 6l-6 11h5l-3 9 9-13h-5z" fill="#fff"/></svg>,
  arb:    <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#12AAFF"/><text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">ARB</text></svg>,
  xrp:    <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00AAE4"/><path d="M21.84 9h2.35l-5.12 5.12a4.38 4.38 0 01-6.14 0L7.81 9h2.35l3.94 3.94a2.64 2.64 0 003.8 0zm-14.03 14h2.35l3.96-3.96a2.64 2.64 0 013.8 0L21.88 23h2.35l-5.14-5.14a4.38 4.38 0 00-6.14 0z" fill="#fff"/></svg>,
  main:   <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#333"/><circle cx="16" cy="16" r="8" fill="none" stroke="#a8ff3e" strokeWidth="2"/></svg>,
};

// ─── Step 2: Network selector ────────────────────────────────────────────────
function NetworkSelectStep({ coin, onSelect }) {
  const networks = getNetworks(coin?.currency?.symbol);
  return (
    <div>
      <div className="net-warn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span>Please make sure you choose the same crypto coin and network on the receiving platform. Otherwise, your transaction will not be received.</span>
      </div>
      <div className="net-list">
        {networks.map(net => (
          <button key={net.id} className="net-row" onClick={() => onSelect(net)}>
            <div className="net-icon-wrap">
              {NET_ICONS[net.id] || NET_ICONS.main}
            </div>
            <div className="net-info">
              <span className="net-name">{net.label}</span>
              <span className="net-meta">Fee≈{net.fee} (≈{net.feeUsd}) · Expected Arrival: {net.arrival}</span>
            </div>
            <IcChev />
          </button>
        ))}
      </div>
      <style jsx>{`
        .net-warn {
          display: flex; gap: 10px; background: rgba(255,255,255,.05);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;
          align-items: flex-start;
        }
        .net-warn svg { flex-shrink: 0; margin-top: 1px; }
        .net-warn span { font-size: 13px; color: #aaa; line-height: 1.5; }
        .net-list { display: flex; flex-direction: column; gap: 4px; }
        .net-row {
          display: flex; align-items: center; gap: 14px; padding: 14px 10px;
          border-radius: 12px; border: none; background: none; cursor: pointer;
          width: 100%; text-align: left; color: #aaa;
        }
        .net-row:hover { background: rgba(255,255,255,.05); }
        .net-icon-wrap { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .net-info { flex: 1; display: flex; flex-direction: column; }
        .net-name { font-size: 15px; font-weight: 700; color: #fff; }
        .net-meta { font-size: 12px; color: #666; margin-top: 3px; }
      `}</style>
    </div>
  );
}

// ─── Deposit address step ────────────────────────────────────────────────────
function DepositAddressStep({ coin, network, detail, loading, copyDone, onCopy }) {
  const sym = coin?.currency?.symbol || "?";
  const address = detail?.address || detail?.wallet_address || detail?.deposit_address || detail?.wallet?.address || null;
  const memo   = detail?.memo || detail?.tag || null;

  return (
    <div>
      <div className="da-coin-row">
        <CoinIcon symbol={sym} size={44} />
        <div>
          <div style={{fontWeight:800,fontSize:17,color:"#fff"}}>{sym}</div>
          <div style={{fontSize:12,color:"#666",marginTop:2}}>{network?.label}</div>
        </div>
      </div>

      {loading ? (
        <div className="da-loading">
          <div className="da-spinner"/>
          <span>Fetching deposit address...</span>
        </div>
      ) : address ? (
        <>
          <div className="da-label">Deposit Address</div>
          <div className="da-addr-box">
            <span className="da-addr">{address}</span>
            <button className="da-copy-btn" onClick={() => onCopy(address)}>
              {copyDone ? "✓ Copied" : <><IcCopy /> Copy</>}
            </button>
          </div>
          {memo && (
            <>
              <div className="da-label" style={{marginTop:14}}>Memo / Tag</div>
              <div className="da-addr-box">
                <span className="da-addr">{memo}</span>
                <button className="da-copy-btn" onClick={() => onCopy(memo)}>
                  {copyDone ? "✓ Copied" : <><IcCopy /> Copy</>}
                </button>
              </div>
            </>
          )}
          <div className="da-warn-box">
            <p>• Minimum deposit: varies by coin</p>
            <p>• Send only <strong>{sym}</strong> to this address on the <strong>{network?.label}</strong> network</p>
            <p>• Sending other assets may result in permanent loss</p>
          </div>
        </>
      ) : (
        <div className="da-no-addr">
          <div style={{fontSize:40,marginBottom:12}}>🔐</div>
          <div style={{color:"#aaa"}}>Deposit address not available for this coin.</div>
          <div style={{color:"#555",fontSize:12,marginTop:6}}>Please contact support.</div>
        </div>
      )}

      <style jsx>{`
        .da-coin-row {
          display: flex; align-items: center; gap: 14px;
          padding: 16px; background: rgba(255,255,255,.04);
          border-radius: 14px; margin-bottom: 20px;
        }
        .da-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 40px 0; color: #666;
        }
        .da-spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid rgba(168,255,62,.2); border-top-color: #a8ff3e;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .da-label { font-size: 12px; color: #666; margin-bottom: 6px; letter-spacing: .5px; text-transform: uppercase; }
        .da-addr-box {
          background: rgba(255,255,255,.05); border-radius: 12px;
          padding: 14px; display: flex; align-items: center; gap: 10px;
        }
        .da-addr { flex: 1; font-size: 13px; color: #ccc; word-break: break-all; font-family: monospace; line-height: 1.6; }
        .da-copy-btn {
          display: flex; align-items: center; gap: 5px; padding: 8px 12px;
          background: rgba(168,255,62,.12); border: 1px solid rgba(168,255,62,.3);
          border-radius: 8px; color: #a8ff3e; font-size: 13px; font-weight: 700;
          cursor: pointer; flex-shrink: 0; white-space: nowrap;
        }
        .da-warn-box {
          margin-top: 16px; background: rgba(255,170,0,.07);
          border: 1px solid rgba(255,170,0,.2); border-radius: 12px;
          padding: 14px; display: flex; flex-direction: column; gap: 6px;
        }
        .da-warn-box p { margin: 0; font-size: 12px; color: #aaa; line-height: 1.5; }
        .da-warn-box strong { color: #ffc107; }
        .da-no-addr { text-align: center; padding: 40px 0; }
      `}</style>
    </div>
  );
}

// ─── Withdraw form step ──────────────────────────────────────────────────────
function WithdrawFormStep({ coin, network, form, setForm, loading, msg, onSubmit }) {
  const sym = coin?.currency?.symbol || "?";
  const balance = Number(coin?.balance || 0);
  const onHold  = Number(coin?.balance_on_hold || 0);
  const avail   = balance - onHold;

  return (
    <form onSubmit={onSubmit}>
      <div className="wf-coin-row">
        <CoinIcon symbol={sym} size={44} />
        <div>
          <div style={{fontWeight:800,fontSize:17,color:"#fff"}}>{sym}</div>
          <div style={{fontSize:12,color:"#666",marginTop:2}}>{network?.label}</div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:12,color:"#666"}}>Available</div>
          <div style={{fontWeight:800,color:"#fff",fontSize:15}}>{fmt(avail)} {sym}</div>
        </div>
      </div>

      <div className="wf-field">
        <label className="wf-label">Withdrawal Address</label>
        <input
          className="wf-input"
          placeholder={`Enter ${sym} ${network?.label} address`}
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          required
        />
      </div>

      <div className="wf-field">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <label className="wf-label" style={{margin:0}}>Amount</label>
          <button type="button" className="wf-max-btn" onClick={() => setForm(f => ({ ...f, amount: String(avail) }))}>
            MAX
          </button>
        </div>
        <div className="wf-amount-wrap">
          <input
            className="wf-input"
            style={{paddingRight:60}}
            placeholder="0.00"
            type="number"
            min="0"
            step="any"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
          <span className="wf-sym-badge">{sym}</span>
        </div>
      </div>

      {form.amount && Number(form.amount) > 0 && (
        <div className="wf-summary">
          <div className="wf-summary-row">
            <span>Network Fee</span>
            <span>{network?.fee || "Variable"}</span>
          </div>
          <div className="wf-summary-row">
            <span>Expected Arrival</span>
            <span>{network?.arrival || "1–10 min"}</span>
          </div>
        </div>
      )}

      {msg && (
        <div className={`wf-msg ${msg.type}`}>
          {msg.type === "success" ? "✓" : "⚠"} {msg.text}
        </div>
      )}

      <button type="submit" className="wf-submit" disabled={loading || !form.address || !form.amount}>
        {loading ? "Submitting..." : `Withdraw ${sym}`}
      </button>

      <style jsx>{`
        .wf-coin-row {
          display: flex; align-items: center; gap: 14px;
          padding: 16px; background: rgba(255,255,255,.04);
          border-radius: 14px; margin-bottom: 20px;
        }
        .wf-field { margin-bottom: 16px; }
        .wf-label { display: block; font-size: 12px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
        .wf-input {
          width: 100%; padding: 13px 14px; background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
          color: #fff; font-size: 15px; outline: none; box-sizing: border-box;
        }
        .wf-input:focus { border-color: rgba(168,255,62,.4); }
        .wf-amount-wrap { position: relative; }
        .wf-sym-badge {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          color: #a8ff3e; font-weight: 800; font-size: 13px; pointer-events: none;
        }
        .wf-max-btn {
          background: rgba(168,255,62,.12); border: 1px solid rgba(168,255,62,.3);
          color: #a8ff3e; font-size: 12px; font-weight: 800;
          padding: 4px 10px; border-radius: 6px; cursor: pointer;
        }
        .wf-summary {
          background: rgba(255,255,255,.04); border-radius: 12px;
          padding: 12px 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px;
        }
        .wf-summary-row { display: flex; justify-content: space-between; font-size: 13px; }
        .wf-summary-row :first-child { color: #666; }
        .wf-summary-row :last-child { color: #ccc; font-weight: 600; }
        .wf-msg {
          padding: 12px 14px; border-radius: 10px; margin-bottom: 14px;
          font-size: 13px; font-weight: 600;
        }
        .wf-msg.success { background: rgba(168,255,62,.1); color: #a8ff3e; }
        .wf-msg.error { background: rgba(255,80,80,.1); color: #ff6b6b; }
        .wf-submit {
          width: 100%; padding: 15px; border-radius: 14px; border: none;
          background: #a8ff3e; color: #111; font-size: 16px; font-weight: 800;
          cursor: pointer; margin-top: 4px;
        }
        .wf-submit:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </form>
  );
}

// ─── Transfer modal content ──────────────────────────────────────────────────
function TransferContent({ wallets, transferForm, setTransferForm, loading, msg, onSubmit, onSwap }) {
  const { from, to, coin: selCoin, amount } = transferForm;
  const coinOptions = wallets;
  const selectedWallet = coinOptions.find(w => w.currency?.symbol === selCoin) || coinOptions[0];
  const sym = selectedWallet?.currency?.symbol || "?";
  const balance = Number(selectedWallet?.balance || 0);

  return (
    <form onSubmit={onSubmit} style={{paddingBottom:8}}>
      {/* From → To */}
      <div className="tr-dir-row">
        <div className="tr-dir-box">
          <span className="tr-dir-lbl">From</span>
          <strong className="tr-dir-val">{from === "spot" ? "Spot" : "Funding"}</strong>
        </div>
        <button type="button" className="tr-swap-btn" onClick={onSwap}><IcSwap /></button>
        <div className="tr-dir-box">
          <span className="tr-dir-lbl">To</span>
          <strong className="tr-dir-val">{to === "spot" ? "Spot" : "Funding"}</strong>
        </div>
      </div>

      {/* Coin */}
      <div className="tr-field">
        <label className="tr-label">Coin</label>
        <select
          className="tr-select"
          value={selCoin || ""}
          onChange={e => setTransferForm(f => ({ ...f, coin: e.target.value }))}
        >
          {coinOptions.map(w => (
            <option key={w.id || w.currency?.symbol} value={w.currency?.symbol}>
              {w.currency?.symbol} — {fmt(w.balance)} available
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="tr-field">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <label className="tr-label" style={{margin:0}}>Amount</label>
          <div style={{fontSize:12,color:"#555"}}>
            Bal: <span style={{color:"#aaa",fontWeight:700}}>{fmt(balance)} {sym}</span>
            <button type="button" style={{marginLeft:8,background:"rgba(168,255,62,.12)",border:"1px solid rgba(168,255,62,.3)",color:"#a8ff3e",fontSize:11,fontWeight:800,padding:"3px 8px",borderRadius:5,cursor:"pointer"}}
              onClick={() => setTransferForm(f => ({ ...f, amount: String(balance) }))}>MAX</button>
          </div>
        </div>
        <div style={{position:"relative"}}>
          <input
            className="tr-input"
            style={{paddingRight:60}}
            placeholder="0.00"
            type="number" min="0" step="any"
            value={amount}
            onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
          <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#a8ff3e",fontWeight:800,fontSize:13}}>{sym}</span>
        </div>
      </div>

      {msg && (
        <div className={`tr-msg ${msg.type}`}>
          {msg.type === "success" ? "✓" : "⚠"} {msg.text}
        </div>
      )}

      <button type="submit" className="tr-submit" disabled={loading || !amount}>
        {loading ? "Transferring..." : "Confirm Transfer"}
      </button>

      <style jsx>{`
        .tr-dir-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .tr-dir-box {
          flex: 1; background: rgba(255,255,255,.05); border-radius: 14px;
          padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,.08);
        }
        .tr-dir-lbl { display: block; font-size: 11px; color: #555; margin-bottom: 6px; text-transform: uppercase; }
        .tr-dir-val { font-size: 16px; font-weight: 800; color: #fff; }
        .tr-swap-btn {
          width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(168,255,62,.3);
          background: rgba(168,255,62,.1); color: #a8ff3e; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .tr-field { margin-bottom: 16px; }
        .tr-label { display: block; font-size: 12px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
        .tr-select, .tr-input {
          width: 100%; padding: 13px 14px; background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
          color: #fff; font-size: 15px; outline: none; box-sizing: border-box;
          appearance: none;
        }
        .tr-select:focus, .tr-input:focus { border-color: rgba(168,255,62,.4); }
        .tr-msg {
          padding: 12px 14px; border-radius: 10px; margin-bottom: 14px;
          font-size: 13px; font-weight: 600;
        }
        .tr-msg.success { background: rgba(168,255,62,.1); color: #a8ff3e; }
        .tr-msg.error { background: rgba(255,80,80,.1); color: #ff6b6b; }
        .tr-submit {
          width: 100%; padding: 15px; border-radius: 14px; border: none;
          background: #a8ff3e; color: #111; font-size: 16px; font-weight: 800;
          cursor: pointer; margin-top: 4px;
        }
        .tr-submit:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </form>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BankingPage() {
  const {
    user, loading: authLoading, isAuthenticated,
    fetchDashboard, fetchTradeHistory, fetchWalletList, fetchWalletView,
    fetchDepositHistory, fetchWithdrawHistory,
    submitWithdraw, submitTransfer,
  } = useAuth();

  // ── Page data ──
  const [pageLoading, setPageLoading] = useState(false);
  const [dashboardResponse, setDashboardResponse] = useState(null);
  const [walletResponses, setWalletResponses] = useState({ spot: null, funding: null });
  const [depositHistoryResponse, setDepositHistoryResponse] = useState(null);
  const [withdrawHistoryResponse, setWithdrawHistoryResponse] = useState(null);
  const [tradeHistoryResponse, setTradeHistoryResponse] = useState(null);

  // ── UI state ──
  const [activeTab, setActiveTab]         = useState("overview");  // overview | spot | funding | history
  const [activeWalletType, setActiveWalletType] = useState("spot");
  const [hideBalance, setHideBalance]     = useState(false);
  const [walletSearch, setWalletSearch]   = useState("");
  const [hideZero, setHideZero]           = useState(false);

  // ── Deposit flow ──
  // steps: null → "coin" → "network" → "address"
  const [depositStep,  setDepositStep]   = useState(null);
  const [depositCoin,  setDepositCoin]   = useState(null);
  const [depositNet,   setDepositNet]    = useState(null);
  const [depositDetail,setDepositDetail] = useState(null);
  const [depositLoad,  setDepositLoad]   = useState(false);
  const [copyDone,     setCopyDone]      = useState(false);
  const [coinSearch,   setCoinSearch]    = useState("");

  // ── Withdraw flow ──
  // steps: null → "coin" → "network" → "form"
  const [withdrawStep, setWithdrawStep]  = useState(null);
  const [withdrawCoin, setWithdrawCoin]  = useState(null);
  const [withdrawNet,  setWithdrawNet]   = useState(null);
  const [withdrawForm, setWithdrawForm]  = useState({ address: "", amount: "" });
  const [withdrawLoad, setWithdrawLoad]  = useState(false);
  const [withdrawMsg,  setWithdrawMsg]   = useState(null);

  // ── Transfer modal ──
  const [showTransfer, setShowTransfer]  = useState(false);
  const [transferForm, setTransferForm]  = useState({ from: "spot", to: "funding", coin: "", amount: "" });
  const [transferLoad, setTransferLoad]  = useState(false);
  const [transferMsg,  setTransferMsg]   = useState(null);

  // ── Load data ──
  const loadData = async () => {
    if (!isAuthenticated) return;
    setPageLoading(true);
    const [dash, trades, spot, funding, deps, wdls] = await Promise.allSettled([
      fetchDashboard(),
      fetchTradeHistory(),
      fetchWalletList("spot"),
      fetchWalletList("funding"),
      fetchDepositHistory(),
      fetchWithdrawHistory(),
    ]);
    const settle = r => r.status === "fulfilled" ? r.value : null;
    setDashboardResponse(settle(dash));
    setTradeHistoryResponse(settle(trades));
    setWalletResponses({ spot: settle(spot), funding: settle(funding) });
    setDepositHistoryResponse(settle(deps));
    setWithdrawHistoryResponse(settle(wdls));
    setPageLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) loadData();
  }, [authLoading, isAuthenticated]);

  // ── Derived ──
  const spotWallets    = collectionItems(walletResponses.spot,    "wallets");
  const fundingWallets = collectionItems(walletResponses.funding, "wallets");
  const allWallets     = activeWalletType === "funding" ? fundingWallets : spotWallets;
  const deposits       = collectionItems(depositHistoryResponse,  "deposits");
  const withdrawals    = collectionItems(withdrawHistoryResponse, "withdrawals");
  const trades         = collectionItems(tradeHistoryResponse,    "trades");

  const estimatedBalance = Number(
    walletResponses[activeWalletType]?.data?.estimated_balance ??
    dashboardResponse?.data?.estimated_balance ?? 0
  );

  const filteredWallets = useMemo(() => {
    let list = allWallets.filter(isCrypto);
    if (hideZero) list = list.filter(w => Number(w.balance || 0) > 0);
    const q = walletSearch.trim().toLowerCase();
    if (q) list = list.filter(w =>
      String(w.currency?.symbol || "").toLowerCase().includes(q) ||
      String(w.currency?.name || "").toLowerCase().includes(q)
    );
    return list;
  }, [allWallets, walletSearch, hideZero]);

  // init transfer coin
  useEffect(() => {
    if (showTransfer && !transferForm.coin && spotWallets.length > 0) {
      setTransferForm(f => ({ ...f, coin: spotWallets[0]?.currency?.symbol || "" }));
    }
  }, [showTransfer]);

  // ── Deposit handlers ──
  const openDepositFlow = () => {
    setDepositStep("coin"); setCoinSearch(""); setDepositCoin(null);
    setDepositNet(null); setDepositDetail(null); setCopyDone(false);
  };
  const onDepositCoinSelect = async (wallet) => {
    setDepositCoin(wallet);
    setDepositStep("network");
  };
  const onDepositNetSelect = async (net) => {
    setDepositNet(net);
    setDepositStep("address");
    setDepositLoad(true);
    setDepositDetail(null);
    try {
      const sym = depositCoin?.currency?.symbol;
      if (sym && fetchWalletView) {
        const res = await fetchWalletView(activeWalletType, sym);
        setDepositDetail(res?.data || null);
      }
    } catch (_) {}
    setDepositLoad(false);
  };
  const closeDeposit = () => { setDepositStep(null); };
  const copyAddress = (addr) => {
    if (!addr) return;
    navigator.clipboard?.writeText(addr).then(() => {
      setCopyDone(true); setTimeout(() => setCopyDone(false), 2000);
    });
  };

  // ── Withdraw handlers ──
  const openWithdrawFlow = () => {
    setWithdrawStep("coin"); setCoinSearch(""); setWithdrawCoin(null);
    setWithdrawNet(null); setWithdrawForm({ address: "", amount: "" }); setWithdrawMsg(null);
  };
  const onWithdrawCoinSelect = (wallet) => {
    setWithdrawCoin(wallet);
    setWithdrawStep("network");
  };
  const onWithdrawNetSelect = (net) => {
    setWithdrawNet(net);
    setWithdrawStep("form");
    setWithdrawMsg(null);
  };
  const closeWithdraw = () => { setWithdrawStep(null); };
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawLoad(true); setWithdrawMsg(null);
    const sym = withdrawCoin?.currency?.symbol;
    try {
      const res = await submitWithdraw({
        currency: sym, amount: withdrawForm.amount,
        address: withdrawForm.address, wallet_type: activeWalletType,
      });
      if (res?.status === "success") {
        setWithdrawMsg({ type: "success", text: res?.message?.success?.[0] || "Withdrawal submitted!" });
        setWithdrawForm({ address: "", amount: "" });
        loadData();
      } else {
        const err = res?.message?.error?.[0] || res?.message?.[0] || (typeof res?.message === "string" ? res.message : null) || "Withdrawal failed.";
        setWithdrawMsg({ type: "error", text: err });
      }
    } catch (_) { setWithdrawMsg({ type: "error", text: "Network error." }); }
    setWithdrawLoad(false);
  };

  // ── Transfer handlers ──
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferLoad(true); setTransferMsg(null);
    try {
      const res = await submitTransfer({
        currency: transferForm.coin, from_wallet: transferForm.from,
        to_wallet: transferForm.to, amount: transferForm.amount,
      });
      if (res?.status === "success") {
        setTransferMsg({ type: "success", text: res?.message?.success?.[0] || "Transfer successful!" });
        setTransferForm(f => ({ ...f, amount: "" }));
        loadData();
      } else {
        const err = res?.message?.error?.[0] || (typeof res?.message === "string" ? res.message : null) || "Transfer failed.";
        setTransferMsg({ type: "error", text: err });
      }
    } catch (_) { setTransferMsg({ type: "error", text: "Network error." }); }
    setTransferLoad(false);
  };

  const swapTransfer = () => setTransferForm(f => ({ ...f, from: f.to, to: f.from }));

  // ── Deposit modal title ──
  const depositTitle = depositStep === "coin" ? "Select Coin" : depositStep === "network" ? "Select Network" : depositStep === "address" ? "Deposit Address" : "";
  const depositBack  = depositStep === "network" ? () => setDepositStep("coin") : depositStep === "address" ? () => setDepositStep("network") : null;

  // ── Withdraw modal title ──
  const withdrawTitle = withdrawStep === "coin" ? "Select Coin" : withdrawStep === "network" ? "Select Network" : withdrawStep === "form" ? "Withdraw" : "";
  const withdrawBack  = withdrawStep === "network" ? () => setWithdrawStep("coin") : withdrawStep === "form" ? () => setWithdrawStep("network") : null;

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0a0a10",color:"#fff"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(168,255,62,.2)",borderTopColor:"#a8ff3e",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{color:"#666"}}>Loading...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0a0a10",color:"#fff",padding:24}}>
        <div style={{textAlign:"center",maxWidth:360}}>
          <div style={{fontSize:64,marginBottom:20}}>🔐</div>
          <h2 style={{fontWeight:800,fontSize:24,marginBottom:8}}>Sign in required</h2>
          <p style={{color:"#666",marginBottom:28}}>Please login to access your wallet</p>
          <Link href="/login" style={{display:"inline-block",padding:"14px 40px",background:"#a8ff3e",color:"#111",fontWeight:800,borderRadius:12,textDecoration:"none",fontSize:16}}>Login</Link>
        </div>
      </div>
    );
  }

  const accountUser = dashboardResponse?.data?.user || user;
  const maskBal = hideBalance ? "****" : fmtUsd(estimatedBalance);

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="header">
        <div className="header-left">
          <Link href="/" className="back-link"><IcBack /></Link>
          <span className="header-title">Assets</span>
        </div>
        <div className="header-right">
          <button className="hdr-btn" onClick={() => setHideBalance(b => !b)}>
            {hideBalance ? <IcEyeOff /> : <IcEye />}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {["overview","spot","funding","history"].map(t => (
          <button key={t} className={`tab ${activeTab === t ? "tab-active" : ""}`} onClick={() => {
            setActiveTab(t);
            if (t === "spot" || t === "funding") setActiveWalletType(t);
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview / Wallet Tabs ── */}
      {(activeTab === "overview" || activeTab === "spot" || activeTab === "funding") && (
        <>
          {/* Total Assets Card */}
          <div className="assets-card">
            <div className="assets-label">Total Assets (USD)</div>
            {pageLoading ? (
              <div className="assets-loading"/>
            ) : (
              <div className="assets-value">{maskBal}</div>
            )}
            <div className="assets-sub">
              {activeTab === "overview" ? "All wallets" : activeTab === "spot" ? "Spot Wallet" : "Funding Wallet"}
            </div>
          </div>

          {/* Action buttons */}
          <div className="action-row">
            <button className="action-btn" onClick={openDepositFlow}>
              <div className="action-icon"><IcDeposit /></div>
              <span>Deposit</span>
            </button>
            <button className="action-btn" onClick={openWithdrawFlow}>
              <div className="action-icon"><IcWithdraw /></div>
              <span>Withdraw</span>
            </button>
            <button className="action-btn" onClick={() => { setShowTransfer(true); setTransferMsg(null); }}>
              <div className="action-icon"><IcTransfer /></div>
              <span>Transfer</span>
            </button>
            <button className="action-btn" onClick={() => setActiveTab("history")}>
              <div className="action-icon"><IcHistory /></div>
              <span>History</span>
            </button>
          </div>

          {/* Wallet type toggle */}
          <div className="wallet-toggle">
            <button className={`wt-btn ${activeWalletType === "spot" ? "wt-active" : ""}`} onClick={() => setActiveWalletType("spot")}>Spot</button>
            <button className={`wt-btn ${activeWalletType === "funding" ? "wt-active" : ""}`} onClick={() => setActiveWalletType("funding")}>Funding</button>
          </div>

          {/* Search & filter */}
          <div className="wallet-toolbar">
            <div className="wt-search">
              <IcSearch />
              <input className="wt-search-inp" placeholder="Search coin..." value={walletSearch} onChange={e => setWalletSearch(e.target.value)} />
            </div>
            <button className={`wt-zero-btn ${hideZero ? "wt-zero-active" : ""}`} onClick={() => setHideZero(b => !b)}>
              {hideZero ? "Show All" : "Hide Zero"}
            </button>
          </div>

          {/* Wallet list */}
          <div className="wallet-list">
            {pageLoading ? (
              Array.from({length:5}).map((_, i) => <div key={i} className="wallet-skeleton"/>)
            ) : filteredWallets.length === 0 ? (
              <div className="wallet-empty">
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <div style={{color:"#555"}}>No assets found</div>
                <button className="wallet-deposit-cta" onClick={openDepositFlow}>Deposit Now</button>
              </div>
            ) : filteredWallets.map(w => {
              const sym   = w.currency?.symbol || "?";
              const bal   = Number(w.balance || 0);
              const onHold= Number(w.balance_on_hold || 0);
              const avail = bal - onHold;
              const usdVal= Number(w.usd_value || w.usdt_value || 0);
              return (
                <div key={w.id || sym} className="wallet-row">
                  <CoinIcon symbol={sym} size={40} />
                  <div className="wr-info">
                    <span className="wr-sym">{sym}</span>
                    <span className="wr-name">{w.currency?.name || sym}</span>
                  </div>
                  <div className="wr-bal-col">
                    <span className="wr-bal">{hideBalance ? "****" : fmt(avail)}</span>
                    <span className="wr-usd">{hideBalance ? "****" : `≈ $${fmtUsd(usdVal)}`}</span>
                  </div>
                  <div className="wr-actions">
                    <button className="wr-btn wr-dep" onClick={() => { openDepositFlow(); setTimeout(() => onDepositCoinSelect(w), 50); }}>
                      <IcDeposit />
                    </button>
                    <button className="wr-btn wr-wdl" onClick={() => { openWithdrawFlow(); setTimeout(() => onWithdrawCoinSelect(w), 50); }}>
                      <IcWithdraw />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── History Tab ── */}
      {activeTab === "history" && (
        <div className="history-section">
          <div className="hist-tabs">
            <button className="hist-tab hist-tab-active">Deposits</button>
          </div>

          <div className="hist-list">
            {deposits.length === 0 ? (
              <div className="hist-empty">
                <div style={{fontSize:40,marginBottom:12}}>📋</div>
                <div style={{color:"#555"}}>No deposit history</div>
              </div>
            ) : deposits.slice(0,20).map((d, i) => {
              const sym = d?.wallet?.currency?.symbol || d?.currency_symbol || "?";
              const amt = Number(d?.amount || 0);
              const stat= String(d?.status || "pending").toLowerCase();
              const statColor = stat.includes("1") || stat === "approved" || stat === "success" ? "#a8ff3e" : stat.includes("3") || stat === "rejected" ? "#ff6b6b" : "#ffc107";
              return (
                <div key={d.id || i} className="hist-row">
                  <CoinIcon symbol={sym} size={36} />
                  <div className="hr-info">
                    <span className="hr-title">Deposit {sym}</span>
                    <span className="hr-date">{fmtDate(d.created_at)}</span>
                  </div>
                  <div className="hr-right">
                    <span className="hr-amt">+{fmt(amt)} {sym}</span>
                    <span className="hr-stat" style={{color: statColor}}>{stat === "1" ? "Approved" : stat === "2" ? "Pending" : stat === "3" ? "Rejected" : stat}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hist-tabs" style={{marginTop:24}}>
            <button className="hist-tab hist-tab-active">Withdrawals</button>
          </div>

          <div className="hist-list">
            {withdrawals.length === 0 ? (
              <div className="hist-empty">
                <div style={{fontSize:40,marginBottom:12}}>📋</div>
                <div style={{color:"#555"}}>No withdrawal history</div>
              </div>
            ) : withdrawals.slice(0,20).map((w, i) => {
              const sym = w?.withdraw_currency?.symbol || w?.currency_symbol || "?";
              const amt = Number(w?.amount || 0);
              const stat= String(w?.status || "pending").toLowerCase();
              const statColor = stat === "1" || stat === "approved" || stat === "success" ? "#a8ff3e" : stat === "3" || stat === "rejected" ? "#ff6b6b" : "#ffc107";
              return (
                <div key={w.id || i} className="hist-row">
                  <CoinIcon symbol={sym} size={36} />
                  <div className="hr-info">
                    <span className="hr-title">Withdraw {sym}</span>
                    <span className="hr-date">{fmtDate(w.created_at)}</span>
                  </div>
                  <div className="hr-right">
                    <span className="hr-amt" style={{color:"#ff6b6b"}}>-{fmt(amt)} {sym}</span>
                    <span className="hr-stat" style={{color: statColor}}>{stat === "1" ? "Approved" : stat === "2" ? "Pending" : stat === "3" ? "Rejected" : stat}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Deposit Modal ── */}
      <BottomSheet show={!!depositStep} onClose={closeDeposit} title={depositTitle} onBack={depositBack}>
        {depositStep === "coin" && (
          <CoinSelectStep wallets={ALL_DEPOSIT_COINS} search={coinSearch} setSearch={setCoinSearch} onSelect={onDepositCoinSelect} mode="deposit" />
        )}
        {depositStep === "network" && depositCoin && (
          <NetworkSelectStep coin={depositCoin} onSelect={onDepositNetSelect} />
        )}
        {depositStep === "address" && (
          <DepositAddressStep coin={depositCoin} network={depositNet} detail={depositDetail} loading={depositLoad} copyDone={copyDone} onCopy={copyAddress} />
        )}
      </BottomSheet>

      {/* ── Withdraw Modal ── */}
      <BottomSheet show={!!withdrawStep} onClose={closeWithdraw} title={withdrawTitle} onBack={withdrawBack}>
        {withdrawStep === "coin" && (
          <CoinSelectStep wallets={ALL_DEPOSIT_COINS.map(c => { const w = [...spotWallets,...fundingWallets].find(x => String(x.currency?.symbol||"").toUpperCase()===c.currency.symbol); return w||c; })} search={coinSearch} setSearch={setCoinSearch} onSelect={onWithdrawCoinSelect} mode="withdraw" />
        )}
        {withdrawStep === "network" && withdrawCoin && (
          <NetworkSelectStep coin={withdrawCoin} onSelect={onWithdrawNetSelect} />
        )}
        {withdrawStep === "form" && withdrawCoin && (
          <WithdrawFormStep coin={withdrawCoin} network={withdrawNet} form={withdrawForm} setForm={setWithdrawForm} loading={withdrawLoad} msg={withdrawMsg} onSubmit={handleWithdrawSubmit} />
        )}
      </BottomSheet>

      {/* ── Transfer Modal ── */}
      <BottomSheet show={showTransfer} onClose={() => { setShowTransfer(false); setTransferMsg(null); }} title="Transfer">
        <TransferContent
          wallets={spotWallets.length ? spotWallets : fundingWallets}
          transferForm={transferForm}
          setTransferForm={setTransferForm}
          loading={transferLoad}
          msg={transferMsg}
          onSubmit={handleTransferSubmit}
          onSwap={swapTransfer}
        />
      </BottomSheet>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a10; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh; background: #0a0a10;
          max-width: 480px; margin: 0 auto; padding-bottom: 40px;
        }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; position: sticky; top: 0; z-index: 100;
          background: rgba(10,10,16,.9); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .back-link {
          width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.07);
          display: flex; align-items: center; justify-content: center;
          color: #aaa; text-decoration: none;
        }
        .back-link:hover { background: rgba(255,255,255,.12); color: #fff; }
        .header-title { font-size: 18px; font-weight: 800; }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .hdr-btn {
          width: 34px; height: 34px; background: rgba(255,255,255,.07);
          border: none; border-radius: 50%; color: #aaa; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .hdr-btn:hover { background: rgba(255,255,255,.12); color: #fff; }

        /* Tabs */
        .tabs {
          display: flex; padding: 12px 20px 0; gap: 4px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .tab {
          padding: 8px 16px; border: none; background: none; cursor: pointer;
          font-size: 14px; font-weight: 600; color: #555; border-radius: 8px 8px 0 0;
          transition: color .15s;
        }
        .tab-active { color: #fff; background: rgba(168,255,62,.1); border-bottom: 2px solid #a8ff3e; }

        /* Assets card */
        .assets-card {
          margin: 20px 20px 0; padding: 24px;
          background: linear-gradient(135deg, #161624 0%, #0f1a0f 100%);
          border-radius: 20px; border: 1px solid rgba(168,255,62,.1);
        }
        .assets-label { font-size: 13px; color: #666; margin-bottom: 8px; }
        .assets-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
        .assets-loading {
          height: 40px; width: 180px; border-radius: 8px;
          background: rgba(255,255,255,.06); animation: shimmer 1.5s infinite;
        }
        .assets-sub { font-size: 12px; color: #444; margin-top: 6px; }

        /* Action buttons */
        .action-row {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 8px; padding: 16px 20px;
        }
        .action-btn {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 14px 8px; background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08); border-radius: 16px;
          cursor: pointer; color: #fff; font-size: 12px; font-weight: 600;
        }
        .action-btn:hover { background: rgba(255,255,255,.09); }
        .action-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: rgba(168,255,62,.12); color: #a8ff3e;
          display: flex; align-items: center; justify-content: center;
        }

        /* Wallet type toggle */
        .wallet-toggle {
          display: flex; gap: 0; margin: 0 20px 16px;
          background: rgba(255,255,255,.05); border-radius: 12px; padding: 4px;
        }
        .wt-btn {
          flex: 1; padding: 9px; border: none; background: none; cursor: pointer;
          font-size: 14px; font-weight: 600; color: #555; border-radius: 9px;
        }
        .wt-active { background: rgba(168,255,62,.15); color: #a8ff3e; }

        /* Wallet toolbar */
        .wallet-toolbar {
          display: flex; align-items: center; gap: 10px; padding: 0 20px 12px;
        }
        .wt-search {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,.06); border-radius: 10px; padding: 9px 12px;
          color: #555;
        }
        .wt-search-inp {
          flex: 1; background: none; border: none; outline: none; color: #fff; font-size: 14px;
        }
        .wt-search-inp::placeholder { color: #444; }
        .wt-zero-btn {
          padding: 9px 12px; background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08); border-radius: 10px;
          color: #666; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
        }
        .wt-zero-active { color: #a8ff3e; border-color: rgba(168,255,62,.3); background: rgba(168,255,62,.07); }

        /* Wallet list */
        .wallet-list { padding: 0 20px; display: flex; flex-direction: column; gap: 4px; }
        .wallet-skeleton {
          height: 64px; border-radius: 14px; background: rgba(255,255,255,.05);
          animation: shimmer 1.5s infinite;
        }
        .wallet-empty { text-align: center; padding: 48px 0; }
        .wallet-deposit-cta {
          margin-top: 16px; padding: 12px 32px; background: #a8ff3e;
          color: #111; font-weight: 800; border: none; border-radius: 12px;
          font-size: 15px; cursor: pointer;
        }
        .wallet-row {
          display: flex; align-items: center; gap: 12px; padding: 12px 14px;
          background: rgba(255,255,255,.03); border-radius: 14px;
          border: 1px solid rgba(255,255,255,.05);
        }
        .wallet-row:hover { background: rgba(255,255,255,.06); }
        .wr-info { flex: 1; display: flex; flex-direction: column; }
        .wr-sym { font-size: 15px; font-weight: 700; }
        .wr-name { font-size: 12px; color: #555; margin-top: 2px; }
        .wr-bal-col { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .wr-bal { font-size: 14px; font-weight: 700; }
        .wr-usd { font-size: 11px; color: #555; }
        .wr-actions { display: flex; gap: 6px; }
        .wr-btn {
          width: 32px; height: 32px; border-radius: 9px; border: none;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .wr-dep { background: rgba(168,255,62,.12); color: #a8ff3e; }
        .wr-wdl { background: rgba(255,107,107,.1); color: #ff6b6b; }

        /* History */
        .history-section { padding: 16px 20px; }
        .hist-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
        .hist-tab {
          padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1);
          background: none; color: #666; font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .hist-tab-active { background: rgba(168,255,62,.1); color: #a8ff3e; border-color: rgba(168,255,62,.3); }
        .hist-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        .hist-empty { text-align: center; padding: 32px 0; }
        .hist-row {
          display: flex; align-items: center; gap: 12px; padding: 12px 14px;
          background: rgba(255,255,255,.03); border-radius: 12px;
        }
        .hr-info { flex: 1; display: flex; flex-direction: column; }
        .hr-title { font-size: 14px; font-weight: 700; }
        .hr-date { font-size: 12px; color: #555; margin-top: 2px; }
        .hr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .hr-amt { font-size: 14px; font-weight: 700; color: #a8ff3e; }
        .hr-stat { font-size: 11px; font-weight: 600; text-transform: capitalize; }
      `}</style>
    </div>
  );
}
