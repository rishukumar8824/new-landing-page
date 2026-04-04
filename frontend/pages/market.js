import { useState } from "react";
import Link from "next/link";

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function NavLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" width="36" height="36">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#a8ff3e" strokeWidth="2.5" />
        <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#a8ff3e" fontFamily="Arial">
          M
        </text>
      </svg>
      <span className="text-white font-bold text-xl tracking-tight">
        MGBX<span style={{ color: "#a8ff3e" }}>✕</span>
      </span>
    </div>
  );
}

function TokenSvg({ symbol, size = 28 }) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 28 28",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    style: { display: "block", flexShrink: 0 },
  };

  switch (symbol) {
    case "ETH":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#627EEA" />
          <path d="M14 4.6 8.8 14l5.2 3.04 5.2-3.04L14 4.6Z" fill="#F4F7FF" />
          <path d="M14 23.4 8.8 15.32 14 18.36 19.2 15.32 14 23.4Z" fill="#DDE5FF" />
          <path d="M14 17.16 8.8 14 14 11.12 19.2 14 14 17.16Z" fill="#BAC8FF" />
        </svg>
      );
    case "BTC":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#F7931A" />
          <path
            d="M15.34 6.2h-1.54l-.18 1.78c-.36-.02-.72-.02-1.06 0L12.38 6.2h-1.54l.2 1.98H8.96v1.84h1.24l-.62 6.12H8.32v1.84h1.08l-.2 1.82h1.54l.18-1.76c.34.02.68.02 1.02 0l-.18 1.76h1.54l.18-1.84c2.96-.2 4.74-1.42 4.74-3.56 0-1.42-.74-2.32-2-2.74 1-.5 1.56-1.34 1.56-2.44 0-1.98-1.62-3.12-4.44-3.22l.18-1.8Zm-1.88 8.08c1.48 0 2.2.42 2.2 1.24 0 .88-.78 1.34-2.32 1.34-.4 0-.8-.02-1.16-.08l.26-2.46c.28-.02.6-.04 1.02-.04Zm-.28-4.48c1.36 0 2.04.38 2.04 1.16 0 .84-.72 1.26-2.14 1.26-.28 0-.58 0-.88-.02l.24-2.32c.24-.06.46-.08.74-.08Z"
            fill="#fff"
          />
          <path d="M11.98 6.1v15.8M15.18 6.1v15.8" stroke="#fff" strokeWidth="1.1" opacity="0.9" />
        </svg>
      );
    case "SOL":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#111" />
          <path d="M8 8.2h11l-2.2 2.7H5.8L8 8.2Z" fill="#7CFFB2" />
          <path d="M9.2 12.65h11l-2.18 2.7H7.02l2.18-2.7Z" fill="#A35CFF" />
          <path d="M8 17.1h11l-2.2 2.7H5.8L8 17.1Z" fill="#1EE6D2" />
        </svg>
      );
    case "BNB":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#171717" />
          <path d="M14 6.1 16.8 8.9 14 11.7 11.2 8.9 14 6.1Zm4.5 4.5 2.8 2.8-2.8 2.8-2.8-2.8 2.8-2.8Zm-9 0 2.8 2.8-2.8 2.8-2.8-2.8 2.8-2.8Zm4.5 4.5 2.8 2.8-2.8 2.8-2.8-2.8 2.8-2.8Zm0-3.56 1.9 1.9-1.9 1.9-1.9-1.9 1.9-1.9Z" fill="#F3BA2F" />
        </svg>
      );
    case "XRP":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#131313" />
          <path d="M7.2 8.8c1.4 0 2.42.54 3.5 1.7 1.28 1.34 2.46 2.02 4.3 2.02 1.52 0 2.7-.58 3.82-1.72" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7.2 19.2c1.4 0 2.42-.54 3.5-1.7 1.28-1.34 2.46-2.02 4.3-2.02 1.52 0 2.7.58 3.82 1.72" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "ADA":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#1652F0" />
          {[14, 8.5, 19.5, 10.2, 17.8, 10.2, 17.8, 6.6, 21.4, 6.6, 21.4, 14, 21.4, 19.5, 17.8, 17.8, 10.2, 17.8, 10.2, 6.6].map((value, index, arr) =>
            index % 2 === 0 ? (
              <circle key={`${index}-${value}`} cx={value} cy={arr[index + 1]} r={index === 0 ? "2.1" : index < 6 ? "1.25" : "1.05"} fill="#fff" />
            ) : null
          )}
          <circle cx="14" cy="9.6" r="1.1" fill="#fff" />
          <circle cx="14" cy="18.4" r="1.1" fill="#fff" />
        </svg>
      );
    case "LINK":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#F7FAFF" />
          <path d="M14 6.3 20.15 9.85v8.3L14 21.7l-6.15-3.55v-8.3L14 6.3Z" stroke="#295ADA" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );
    case "TRX":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#EB3349" />
          <path d="m7.4 8.7 11.9 1.82-6.18 8.76L7.4 8.7Z" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="m7.4 8.7 5.72 4.36m6.18-2.54-6.18 2.54m0 0-1.16 6.22" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "DOGE":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#C2A633" />
          <path d="M10 7.2h4.28c3.2 0 5.32 1.92 5.32 4.94 0 3.08-2.14 5.08-5.38 5.08H10V7.2Zm2.3 2.08v5.86h1.7c1.88 0 3.02-1.08 3.02-3 0-1.78-1.16-2.86-3-2.86h-1.72Z" fill="#fff" />
          <path d="M9.18 14h7.64" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
        </svg>
      );
    case "UNI":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#FF007A" />
          <path d="M10.1 18.2c.34-3.62 2.48-6.62 6.1-8.58l-.96-1.34 3.08.44-.94 2.72-.96-.86c-2.1 1.36-3.38 3.12-3.92 5.3h4.26c1.08 0 1.94.88 1.94 1.96v.34H10.1Z" fill="#fff" />
          <path d="M15.98 8.36 17.78 6.9" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "ATOM":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#2E3148" />
          <circle cx="14" cy="14" r="1.8" fill="#fff" />
          <ellipse cx="14" cy="14" rx="7.4" ry="2.8" stroke="#fff" strokeWidth="1.3" />
          <ellipse cx="14" cy="14" rx="7.4" ry="2.8" stroke="#fff" strokeWidth="1.3" transform="rotate(60 14 14)" />
          <ellipse cx="14" cy="14" rx="7.4" ry="2.8" stroke="#fff" strokeWidth="1.3" transform="rotate(120 14 14)" />
        </svg>
      );
    case "HBAR":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#111" />
          <path d="M10 8.2v11.6m8-11.6v11.6M10 11.4h8M10 16.6h8M11.9 8.2v11.6m4.2-11.6v11.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "STX":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#111" />
          <path d="M9.1 8.8h9.8M9.1 19.2h9.8M10.2 10.2l7.6 7.6M17.8 10.2l-7.6 7.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "ENS":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#0F172A" />
          <path d="M14.3 6.4 18.9 10.4v7.42L14.3 21l-2.08-1.42v-7.46l2.08-5.72Z" fill="#62A7FF" />
          <path d="M13.7 6.4 9.1 10.4v7.42L13.7 21l2.08-1.42v-7.46L13.7 6.4Z" fill="#8DE0FF" />
        </svg>
      );
    case "APT":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#111" />
          {["7.2", "10.2", "13.2", "16.2", "19.2"].map((y) => (
            <rect key={y} x="7" y={y} width="14" height="1.8" rx="0.9" fill="#fff" />
          ))}
        </svg>
      );
    case "SHIB":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#F97316" />
          <path d="m8.2 10.4 2.4-2.42 2.16 1.62L14 8l1.24 1.6 2.16-1.62 2.4 2.42-.84 7.3H9.04l-.84-7.3Z" fill="#fff" />
          <path d="M11.18 13.3h1.28m4.36 0h-1.28M13 15.8h2" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M12.1 13.1c0 .52-.36.94-.8.94s-.8-.42-.8-.94.36-.94.8-.94.8.42.8.94Zm5.6 0c0 .52-.36.94-.8.94s-.8-.42-.8-.94.36-.94.8-.94.8.42.8.94Z" fill="#F97316" />
        </svg>
      );
    case "OP":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#FF0420" />
          <text x="14" y="17.5" textAnchor="middle" fontSize="8.6" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
            OP
          </text>
        </svg>
      );
    case "COMP":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#00D395" />
          <rect x="8.1" y="8.3" width="3.1" height="11.4" rx="1.2" fill="#D7FFF0" />
          <rect x="12.45" y="6.9" width="3.1" height="14.2" rx="1.2" fill="#ECFFF8" />
          <rect x="16.8" y="9.6" width="3.1" height="8.8" rx="1.2" fill="#B8F6E3" />
        </svg>
      );
    case "REEF":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#A855F7" />
          <circle cx="11" cy="12" r="3.2" stroke="#fff" strokeWidth="1.8" />
          <circle cx="17.1" cy="16.1" r="2.55" stroke="#fff" strokeWidth="1.8" />
          <circle cx="17.8" cy="10" r="1.35" fill="#fff" />
        </svg>
      );
    case "CFX":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#374151" />
          <path d="M18.9 9.5c-1.24-1.2-2.64-1.8-4.26-1.8-2.82 0-5.04 2.16-5.04 5s2.22 5.14 5.04 5.14c1.62 0 3.02-.58 4.26-1.8" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M18.3 7.86 13.9 14l4.4 6.14" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "AVAX":
      return (
        <svg {...svgProps}>
          <circle cx="14" cy="14" r="14" fill="#E84142" />
          <path d="M14 6.6 19.8 17c.34.6-.08 1.34-.76 1.34h-2.5c-.36 0-.68-.2-.84-.52L14 14.7l-1.7 3.12a.96.96 0 0 1-.84.52H9c-.68 0-1.1-.74-.76-1.34L14 6.6Z" fill="#fff" />
          <path d="M8.96 19.7h4.14c.5 0 .82.54.58.98l-1.2 2.14a.66.66 0 0 1-.58.34H9.24a.66.66 0 0 1-.58-.98l.72-1.26c.12-.22.34-.36.58-.36Z" fill="#fff" opacity="0.86" />
        </svg>
      );
    default:
      return null;
  }
}

function CoinIcon({ symbol }) {
  const svgIcon = TokenSvg({ symbol });
  if (svgIcon) return svgIcon;

  const iconMap = {
    ETH: { colors: ["#627EEA", "#9bb3ff"], label: "Ξ", text: "#fff" },
    BTC: { colors: ["#F7931A", "#ffcb6b"], label: "₿", text: "#fff" },
    SOL: { colors: ["#9945FF", "#14f195"], label: "S", text: "#fff" },
    XRP: { colors: ["#151515", "#7d7d7d"], label: "X", text: "#fff" },
    ADA: { colors: ["#0d47a1", "#64b5f6"], label: "A", text: "#fff" },
    DOGE: { colors: ["#C2A633", "#ffe082"], label: "Ð", text: "#111" },
    BNB: { colors: ["#F3BA2F", "#fce38a"], label: "B", text: "#111" },
    LTC: { colors: ["#345D9D", "#aab7d4"], label: "Ł", text: "#fff" },
    TRX: { colors: ["#ff1744", "#ff8a80"], label: "T", text: "#fff" },
    LINK: { colors: ["#295ADA", "#8ab4ff"], label: "⬡", text: "#fff" },
    AVAX: { colors: ["#E84142", "#ff9a9a"], label: "A", text: "#fff" },
    SUI: { colors: ["#62d0ff", "#1f7ae0"], label: "S", text: "#fff" },
    ATOM: { colors: ["#2E3148", "#7f8ccf"], label: "A", text: "#fff" },
    NEAR: { colors: ["#111111", "#61ffa8"], label: "N", text: "#fff" },
    TON: { colors: ["#0098EA", "#8fd9ff"], label: "T", text: "#fff" },
    ETC: { colors: ["#3ab67a", "#a2ffd5"], label: "E", text: "#111" },
    APT: { colors: ["#111111", "#bdbdbd"], label: "A", text: "#fff" },
    ARB: { colors: ["#28A0F0", "#9dd8ff"], label: "A", text: "#fff" },
    OP: { colors: ["#ff0420", "#ff9ca9"], label: "O", text: "#fff" },
    SEI: { colors: ["#ff6b6b", "#ffb199"], label: "S", text: "#fff" },
    INJ: { colors: ["#00c2ff", "#7b61ff"], label: "I", text: "#fff" },
    AAVE: { colors: ["#b6509e", "#2ebac6"], label: "A", text: "#fff" },
    UNI: { colors: ["#ff007a", "#ff9ed0"], label: "U", text: "#fff" },
    MKR: { colors: ["#1abc9c", "#9af6e1"], label: "M", text: "#111" },
    RUNE: { colors: ["#00a3ff", "#80d8ff"], label: "R", text: "#111" },
    DOT: { colors: ["#e6007a", "#ff9ccc"], label: "•", text: "#fff" },
    FIL: { colors: ["#00c3ff", "#98ebff"], label: "F", text: "#111" },
    ICP: { colors: ["#ff5ea9", "#7b61ff"], label: "∞", text: "#fff" },
    HBAR: { colors: ["#111111", "#8c8c8c"], label: "H", text: "#fff" },
    ALGO: { colors: ["#111111", "#6e6e6e"], label: "A", text: "#fff" },
    XTZ: { colors: ["#2c7df7", "#90bbff"], label: "T", text: "#fff" },
    VET: { colors: ["#15bdff", "#8ce4ff"], label: "V", text: "#111" },
    EOS: { colors: ["#111111", "#9ca3af"], label: "E", text: "#fff" },
    ONT: { colors: ["#32c5ff", "#b1ecff"], label: "O", text: "#111" },
    QNT: { colors: ["#4f46e5", "#b7b3ff"], label: "Q", text: "#fff" },
    "1INCH": { colors: ["#243b55", "#95a7ff"], label: "1", text: "#fff" },
    COMP: { colors: ["#00d395", "#96ffd9"], label: "C", text: "#111" },
    SUSHI: { colors: ["#8b5cf6", "#ff7eb3"], label: "S", text: "#fff" },
    CRV: { colors: ["#ff8a00", "#ffd166"], label: "C", text: "#111" },
    SNX: { colors: ["#00d1ff", "#b26bff"], label: "S", text: "#fff" },
    YFI: { colors: ["#006ae3", "#81b8ff"], label: "Y", text: "#fff" },
    GMX: { colors: ["#4d3cff", "#6ed0ff"], label: "G", text: "#fff" },
    DYDX: { colors: ["#6c63ff", "#111111"], label: "D", text: "#fff" },
    JTO: { colors: ["#00d4aa", "#84ffe0"], label: "J", text: "#111" },
    JUP: { colors: ["#00d4ff", "#74ffa6"], label: "J", text: "#111" },
    WIF: { colors: ["#f4c542", "#ffeaa7"], label: "W", text: "#111" },
    PEPE: { colors: ["#22c55e", "#bbf7d0"], label: "P", text: "#111" },
    FLOKI: { colors: ["#f59e0b", "#ffd699"], label: "F", text: "#111" },
    BONK: { colors: ["#fb923c", "#ffe0b2"], label: "B", text: "#111" },
    SHIB: { colors: ["#f97316", "#ffcc80"], label: "S", text: "#111" },
    ENA: { colors: ["#111111", "#ff6ec7"], label: "E", text: "#fff" },
    ONDO: { colors: ["#111111", "#89f7fe"], label: "O", text: "#fff" },
    PENDLE: { colors: ["#3b82f6", "#22d3ee"], label: "P", text: "#fff" },
    TAO: { colors: ["#111111", "#facc15"], label: "T", text: "#fff" },
    FET: { colors: ["#1d4ed8", "#c4b5fd"], label: "F", text: "#fff" },
    RENDER: { colors: ["#ef4444", "#ff9fa8"], label: "R", text: "#fff" },
    GRT: { colors: ["#6d28d9", "#f472b6"], label: "G", text: "#fff" },
    IMX: { colors: ["#111111", "#e5e7eb"], label: "I", text: "#fff" },
    STX: { colors: ["#111111", "#f5f5f5"], label: "S", text: "#fff" },
    RAY: { colors: ["#22c55e", "#7c3aed"], label: "R", text: "#fff" },
    PYTH: { colors: ["#8b5cf6", "#f472b6"], label: "P", text: "#fff" },
    KAS: { colors: ["#00e0ff", "#a3f7ff"], label: "K", text: "#111" },
    BCH: { colors: ["#8dc351", "#d9ffb3"], label: "B", text: "#111" },
    XLM: { colors: ["#111111", "#cfd8dc"], label: "X", text: "#fff" },
    XMR: { colors: ["#ff6600", "#ffc09f"], label: "M", text: "#111" },
    ZEC: { colors: ["#f4b400", "#ffe082"], label: "Z", text: "#111" },
    ORDI: { colors: ["#111111", "#d4d4d4"], label: "O", text: "#fff" },
    SATS: { colors: ["#f7931a", "#ffda8b"], label: "S", text: "#111" },
    TIA: { colors: ["#7c3aed", "#f472b6"], label: "T", text: "#fff" },
    STRK: { colors: ["#5b5bd6", "#c6c6ff"], label: "S", text: "#fff" },
    CFX: { colors: ["#374151", "#9ca3af"], label: "C", text: "#fff" },
    ROSE: { colors: ["#f472b6", "#fdba74"], label: "R", text: "#111" },
    KNC: { colors: ["#10b981", "#99f6e4"], label: "K", text: "#111" },
    ENS: { colors: ["#60a5fa", "#bfdbfe"], label: "E", text: "#111" },
    BAT: { colors: ["#f59e0b", "#fdba74"], label: "B", text: "#111" },
    CELO: { colors: ["#22c55e", "#fde68a"], label: "C", text: "#111" },
    HOT: { colors: ["#7c3aed", "#c4b5fd"], label: "H", text: "#fff" },
    REEF: { colors: ["#a855f7", "#f0abfc"], label: "R", text: "#111" },
    ANKR: { colors: ["#3b82f6", "#93c5fd"], label: "A", text: "#111" },
    EGLD: { colors: ["#2dd4bf", "#99f6e4"], label: "E", text: "#111" },
    NFT: { colors: ["#111111", "#f5f5f5"], label: "N", text: "#fff" },
    XAU: { colors: ["#D4AF37", "#fff3bf"], label: "Au", text: "#111" },
    STO: { colors: ["#dadada", "#f9fafb"], label: "✪", text: "#111" },
    NOM: { colors: ["#63d471", "#bbf7d0"], label: "N", text: "#111" },
    SIR: { colors: ["#fda085", "#ffe0d1"], label: "S", text: "#111" },
    BAN: { colors: ["#ffe29f", "#fff8e1"], label: "B", text: "#111" },
    RIV: { colors: ["#1d4ed8", "#93c5fd"], label: "R", text: "#fff" },
  };

  const fallbackSeed = symbol.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), 0);
  const fallbackHue = fallbackSeed % 360;
  const fallback = {
    colors: [`hsl(${fallbackHue} 78% 54%)`, `hsl(${(fallbackHue + 48) % 360} 82% 72%)`],
    label: symbol.length > 4 ? symbol.slice(0, 2) : symbol[0],
    text: "#fff",
  };

  const config = iconMap[symbol] || fallback;
  const background = `radial-gradient(circle at 30% 30%, ${config.colors[1]}, ${config.colors[0]})`;

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 900,
        color: config.text,
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px rgba(0,0,0,0.22)",
        textTransform: "uppercase",
      }}
    >
      {config.label}
    </div>
  );
}

function Sparkline({ points, color = "#53d39c" }) {
  const w = 110;
  const h = 36;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((v) => h - ((v - min) / (max - min || 1)) * (h - 8) - 4);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CATEGORY_OPTIONS = [
  "TradFi",
  "Stocks",
  "Indices",
  "Commodities",
  "Alpha",
  "AI",
  "Meme",
  "DeFi",
  "Layer 1",
  "Solana Ecosystem",
  "RWA",
  "DePIN",
];

const filters = ["All", ...CATEGORY_OPTIONS];

const BASE_ASSETS = [
  ["ETH", 2145.8, 4.58e9],
  ["BTC", 68815.9, 3.51e9],
  ["SOL", 182.44, 1.95e9],
  ["XRP", 1.24, 1.12e9],
  ["ADA", 0.78, 866e6],
  ["DOGE", 0.19, 924e6],
  ["BNB", 585.2, 1.32e9],
  ["LTC", 96.85, 428e6],
  ["TRX", 0.14, 511e6],
  ["LINK", 18.72, 602e6],
  ["AVAX", 43.18, 498e6],
  ["SUI", 1.91, 412e6],
  ["ATOM", 10.74, 268e6],
  ["NEAR", 7.32, 389e6],
  ["TON", 6.88, 315e6],
  ["ETC", 29.61, 171e6],
  ["APT", 13.28, 278e6],
  ["ARB", 1.39, 343e6],
  ["OP", 3.12, 266e6],
  ["SEI", 0.81, 208e6],
  ["INJ", 34.55, 291e6],
  ["AAVE", 126.84, 142e6],
  ["UNI", 11.61, 237e6],
  ["MKR", 2840.4, 83e6],
  ["RUNE", 7.45, 175e6],
  ["DOT", 9.64, 309e6],
  ["FIL", 8.28, 213e6],
  ["ICP", 14.52, 198e6],
  ["HBAR", 0.12, 188e6],
  ["ALGO", 0.26, 165e6],
  ["XTZ", 1.49, 71e6],
  ["VET", 0.043, 182e6],
  ["EOS", 1.09, 98e6],
  ["ONT", 0.36, 62e6],
  ["QNT", 124.3, 88e6],
  ["1INCH", 0.57, 76e6],
  ["COMP", 73.61, 55e6],
  ["SUSHI", 1.28, 49e6],
  ["CRV", 0.62, 81e6],
  ["SNX", 4.41, 44e6],
  ["YFI", 8342.0, 21e6],
  ["GMX", 39.85, 67e6],
  ["DYDX", 3.41, 63e6],
  ["JTO", 4.05, 58e6],
  ["JUP", 1.55, 93e6],
  ["WIF", 2.68, 176e6],
  ["PEPE", 0.0000104, 201e6],
  ["FLOKI", 0.00018, 161e6],
  ["BONK", 0.000024, 144e6],
  ["SHIB", 0.000028, 221e6],
  ["ENA", 0.92, 134e6],
  ["ONDO", 1.05, 117e6],
  ["PENDLE", 6.62, 86e6],
  ["TAO", 548.0, 73e6],
  ["FET", 2.21, 114e6],
  ["RENDER", 9.45, 88e6],
  ["GRT", 0.37, 77e6],
  ["IMX", 2.98, 112e6],
  ["STX", 3.11, 94e6],
  ["RAY", 1.87, 58e6],
  ["PYTH", 0.84, 69e6],
  ["KAS", 0.16, 101e6],
  ["BCH", 522.1, 204e6],
  ["XLM", 0.15, 138e6],
  ["XMR", 146.9, 65e6],
  ["ZEC", 31.4, 42e6],
  ["ORDI", 42.6, 83e6],
  ["SATS", 0.00000038, 26e6],
  ["TIA", 14.82, 96e6],
  ["STRK", 1.67, 108e6],
  ["CFX", 0.31, 74e6],
  ["ROSE", 0.16, 52e6],
  ["KNC", 0.74, 35e6],
  ["ENS", 31.2, 91e6],
  ["BAT", 0.41, 39e6],
  ["CELO", 0.97, 31e6],
  ["HOT", 0.0028, 27e6],
  ["REEF", 0.0035, 18e6],
  ["ANKR", 0.058, 33e6],
  ["EGLD", 46.3, 61e6],
];

const QUOTE_MARKETS = [
  { quote: "USDT", multiplier: 1 },
  { quote: "USDC", multiplier: 1.0015 },
  { quote: "FDUSD", multiplier: 0.9985 },
  { quote: "USDE", multiplier: 1.0032 },
];

const SPECIAL_TAGS = {
  XAU: "Gold 200x",
  BCH: "Bluechip",
  TAO: "AI Leader",
  FET: "AI",
  RENDER: "GPU",
  PEPE: "Meme",
  BONK: "Solana Meme",
  SHIB: "Meme",
  WIF: "Meme",
};

function seedFromText(text) {
  return text.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
}

function formatPrice(value) {
  if (value >= 1000) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (value >= 0.01) return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}

function formatVolume(value) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return `${value.toFixed(0)}`;
}

function buildTrend(seed) {
  let current = 18 + (seed % 10);
  return Array.from({ length: 13 }, (_, index) => {
    const step = (((seed >> (index % 6)) % 9) - 4) * 0.9;
    current = Math.max(6, current + step + (index % 3 === 0 ? 1.8 : 0.4));
    return Number(current.toFixed(2));
  });
}

const marketRows = BASE_ASSETS.flatMap(([base, basePrice, baseVolume], assetIndex) =>
  QUOTE_MARKETS.map((market, quoteIndex) => {
    const seed = seedFromText(`${base}-${market.quote}`);
    const drift = ((seed % 13) - 6) * 0.0025;
    const lastPriceRaw = basePrice * market.multiplier * (1 + drift);
    const changeValue = Number((((seed % 91) - 38) / 10).toFixed(2));
    const highRaw = lastPriceRaw * (1 + 0.012 + (seed % 5) * 0.003);
    const lowRaw = lastPriceRaw * (1 - 0.014 - (seed % 4) * 0.0025);
    const volumeRaw = baseVolume * (1 + ((seed % 9) - 4) * 0.08 + quoteIndex * 0.05);
    const category = CATEGORY_OPTIONS[assetIndex % CATEGORY_OPTIONS.length];

    return {
      symbol: `${base}${market.quote} PERP`,
      routePair: `${base}${market.quote}`,
      coin: base,
      quote: market.quote,
      category,
      lastPrice: formatPrice(lastPriceRaw),
      change: `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`,
      changeValue,
      high: formatPrice(highRaw),
      low: formatPrice(Math.max(0.00000001, lowRaw)),
      volume: formatVolume(volumeRaw),
      volumeValue: volumeRaw,
      trend: buildTrend(seed),
      tag: SPECIAL_TAGS[base] || null,
    };
  })
);

const summaryCards = [
  {
    title: "Gainers",
    accent: "#60d394",
    rows: marketRows
      .filter((row) => row.quote === "USDT")
      .sort((a, b) => b.changeValue - a.changeValue)
      .slice(0, 12)
      .map((row) => ({ symbol: row.routePair, icon: row.coin, price: row.lastPrice, change: row.change })),
  },
  {
    title: "Losers",
    accent: "#ff6b6b",
    rows: marketRows
      .filter((row) => row.quote === "USDT")
      .sort((a, b) => a.changeValue - b.changeValue)
      .slice(0, 12)
      .map((row) => ({ symbol: row.routePair, icon: row.coin, price: row.lastPrice, change: row.change })),
  },
  {
    title: "Top Volume",
    accent: "#ffb84d",
    rows: marketRows
      .filter((row) => row.quote === "USDT")
      .sort((a, b) => b.volumeValue - a.volumeValue)
      .slice(0, 12)
      .map((row) => ({ symbol: row.routePair, icon: row.coin, price: row.lastPrice, change: row.change })),
  },
];

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState("Futures Trading");
  const [activeFilter, setActiveFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(24);

  const navLinks = [
    { label: "Market", href: "/market", active: true },
    { label: "Quick Buy" },
    { label: "Spot" },
    { label: "Futures" },
    { label: "Copy Trading" },
  ];

  const pageTabs = ["Favorites", "Futures Trading", "Spot Trading"];
  const filteredRows = activeFilter === "All" ? marketRows : marketRows.filter((row) => row.category === activeFilter);
  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasMoreRows = visibleCount < filteredRows.length;

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <nav
        className="market-nav flex items-center justify-between px-6 py-3 border-b border-gray-900 sticky top-0 z-50"
        style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="market-nav-left flex items-center gap-8">
          <Link href="/">
            <NavLogo />
          </Link>
          <div className="market-nav-links hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              link.href ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium"
                  style={{ color: link.active ? "#fff" : "#ccc" }}
                >
                  {link.label}
                </Link>
              ) : (
                <button key={link.label} className="nav-link text-sm font-medium">
                  {link.label}
                </button>
              )
            )}
            <button className="nav-link text-sm font-medium flex items-center gap-1">
              More <IconChevronDown />
            </button>
          </div>
        </div>

        <div className="market-nav-actions flex items-center gap-4">
          <Link href="/login" className="market-login-link hidden md:inline-flex nav-link text-sm font-medium">
            Log In
          </Link>
          <Link href="/register" className="register-btn px-5 py-2 rounded-full text-sm">
            Register
          </Link>
          <div className="market-nav-icons hidden md:flex items-center gap-3 text-gray-400 ml-2">
            <button className="nav-link">
              <IconSearch />
            </button>
            <button className="nav-link">
              <IconGift />
            </button>
            <button className="nav-link">
              <IconGlobe />
            </button>
            <button className="nav-link">
              <IconDownload />
            </button>
          </div>
        </div>
      </nav>

      <main className="market-main max-w-7xl mx-auto px-6 py-14">
        <h1 className="market-title" style={{ color: "#fff", fontSize: 54, fontWeight: 900, lineHeight: 1.02, marginBottom: 34 }}>
          Cryptocurrency Trading Marketplace
        </h1>

        <div className="market-tabs" style={{ display: "flex", gap: 32, marginBottom: 20, borderBottom: "1px solid #1b1b1b" }}>
          {pageTabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  paddingBottom: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  border: "none",
                  background: "none",
                  color: isActive ? "#fff" : "#7a7a7a",
                  borderBottom: isActive ? "2px solid #fff" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="market-summary-grid grid md:grid-cols-3 gap-5 mb-12">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="market-summary-card"
              style={{
                background: "#111111",
                border: "1px solid #1f1f1f",
                borderRadius: 18,
                padding: 18,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              <div className="market-summary-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="market-summary-card-title" style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{card.title}</span>
                  <span style={{ color: card.accent, fontSize: 18 }}>↗</span>
                </div>
                <button className="nav-link text-sm">More</button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: 284,
                  overflowY: "auto",
                  paddingRight: 6,
                }}
              >
                {card.rows.map((row) => (
                  <div key={row.symbol} className="market-summary-row" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 0.8fr", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CoinIcon symbol={row.icon} />
                      <span className="market-summary-row-symbol" style={{ color: "#d5d5d5", fontWeight: 600, fontSize: 14 }}>{row.symbol}</span>
                    </div>
                    <span className="market-summary-row-price" style={{ color: "#e7e7e7", fontWeight: 600, fontSize: 14 }}>{row.price}</span>
                    <span className="market-summary-row-change" style={{ color: row.change.startsWith("-") ? "#ff6b6b" : "#60d394", fontWeight: 700, fontSize: 14 }}>
                      {row.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="market-filters" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          <button
            type="button"
            className="market-filter-chip market-filter-select"
            style={{
              border: "1px solid #2a2a2a",
              background: "#0b0b0b",
              color: "#f0f0f0",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            USDT-M ▾
          </button>

          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                className="market-filter-chip"
                onClick={() => {
                  setActiveFilter(filter);
                  setVisibleCount(24);
                }}
                style={{
                  border: `1px solid ${isActive ? "rgba(168,255,62,0.42)" : "#232323"}`,
                  background: isActive ? "rgba(168,255,62,0.12)" : "#0b0b0b",
                  color: isActive ? "#d7ff74" : "#8d8d8d",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="market-count" style={{ color: "#7d7d7d", fontSize: 13, marginBottom: 14 }}>
          Showing {visibleRows.length} of {filteredRows.length} pairs
        </div>

        <div className="market-table-wrap" style={{ borderTop: "1px solid #171717" }}>
          <div
            className="market-table-head"
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.2fr 1fr 1.3fr 1fr 1.1fr 90px",
              gap: 12,
              color: "#676767",
              fontSize: 13,
              padding: "14px 0",
              borderBottom: "1px solid #171717",
            }}
          >
            <span>Name</span>
            <span>Last Price</span>
            <span>24H</span>
            <span>24H High / 24H Low</span>
            <span>24H Volume</span>
            <span>Trends</span>
            <span>Action</span>
          </div>

          {visibleRows.map((row) => (
            <Link
              key={row.symbol}
              href={`/trade/${row.routePair}`}
              className="market-table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 1.2fr 1fr 1.3fr 1fr 1.1fr 90px",
                gap: 12,
                alignItems: "center",
                padding: "22px 0",
                borderBottom: "1px solid #151515",
                textDecoration: "none",
              }}
            >
              <div className="market-cell market-cell-name" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CoinIcon symbol={row.coin} />
                <div>
                  <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{row.symbol}</div>
                  {row.tag ? (
                    <div style={{ display: "inline-flex", marginTop: 6, fontSize: 11, fontWeight: 700, color: "#73ea8e", background: "#102315", padding: "3px 8px", borderRadius: 999 }}>
                      {row.tag}
                    </div>
                  ) : null}
                </div>
              </div>

              <span className="market-cell market-cell-price market-cell-meta" data-label="Last Price" style={{ color: "#f4f4f4", fontSize: 15, fontWeight: 600 }}>{row.lastPrice}</span>
              <span className="market-cell market-cell-change market-cell-meta" data-label="24H" style={{ color: row.change.startsWith("-") ? "#ff6b6b" : "#60d394", fontSize: 15, fontWeight: 700 }}>{row.change}</span>
              <div className="market-cell market-cell-range market-cell-meta" data-label="24H High / 24H Low" style={{ color: "#d7d7d7", fontSize: 15, lineHeight: 1.6 }}>
                <div>{row.high}</div>
                <div style={{ color: "#8d8d8d" }}>{row.low}</div>
              </div>
              <span className="market-cell market-cell-volume market-cell-meta" data-label="24H Volume" style={{ color: "#f4f4f4", fontSize: 15 }}>{row.volume}</span>
              <div className="market-cell market-cell-trend market-cell-meta" data-label="Trend">
                <Sparkline points={row.trend} />
              </div>
              <span className="market-cell market-cell-action market-cell-meta" data-label="Action" style={{ color: "#a8ff3e", fontSize: 15, fontWeight: 700 }}>Trade</span>
            </Link>
          ))}
        </div>

        {hasMoreRows ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + 24, filteredRows.length))}
              className="register-btn"
              style={{
                minWidth: 190,
                padding: "14px 24px",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              More pairs
            </button>
          </div>
        ) : null}

        <style jsx>{`
          .market-nav,
          .market-main,
          .market-table-row,
          .market-filter-chip,
          .market-summary-card {
            min-width: 0;
          }

          .market-filters {
            scrollbar-width: none;
          }

          .market-filters::-webkit-scrollbar {
            display: none;
          }

          .market-summary-card > div:last-child {
            scrollbar-width: thin;
          }

          @media (max-width: 980px) {
            .market-nav {
              padding: 12px 16px;
            }

            .market-nav-left {
              gap: 14px;
            }

            .market-nav-links,
            .market-nav-icons,
            .market-login-link {
              display: none !important;
            }

            .market-nav-actions {
              gap: 10px;
            }

            .market-main {
              padding: 28px 16px 52px;
            }

            .market-title {
              font-size: 40px !important;
              margin-bottom: 24px !important;
            }

            .market-tabs {
              gap: 20px !important;
              overflow-x: auto;
              white-space: nowrap;
              padding-bottom: 8px;
              scrollbar-width: none;
            }

            .market-tabs::-webkit-scrollbar {
              display: none;
            }

            .market-summary-grid {
              grid-template-columns: 1fr !important;
              margin-bottom: 30px !important;
            }

            .market-filters {
              flex-wrap: nowrap !important;
              overflow-x: auto;
              padding-bottom: 8px;
            }

            .market-filter-chip {
              flex: 0 0 auto;
              white-space: nowrap;
            }

            .market-table-head {
              display: none !important;
            }

            .market-table-row {
              grid-template-columns: 1fr 1fr !important;
              grid-template-areas:
                "name action"
                "price change"
                "range volume"
                "trend trend";
              gap: 14px 16px !important;
              padding: 18px 0 !important;
            }

            .market-cell {
              min-width: 0;
            }

            .market-cell-name {
              grid-area: name;
            }

            .market-cell-price {
              grid-area: price;
            }

            .market-cell-change {
              grid-area: change;
            }

            .market-cell-range {
              grid-area: range;
            }

            .market-cell-volume {
              grid-area: volume;
            }

            .market-cell-trend {
              grid-area: trend;
            }

            .market-cell-action {
              grid-area: action;
              justify-self: end;
              align-self: start;
            }

            .market-cell-meta::before {
              content: attr(data-label);
              display: block;
              color: #6f6f6f;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.03em;
              margin-bottom: 6px;
              text-transform: uppercase;
            }

            .market-cell-trend :global(svg) {
              width: 100%;
              height: 34px;
            }
          }

          @media (max-width: 640px) {
            .market-title {
              font-size: 32px !important;
              line-height: 1.08 !important;
            }

            .market-summary-card {
              padding: 16px !important;
              border-radius: 16px !important;
            }

            .market-summary-card-title {
              font-size: 20px !important;
            }

            .market-summary-row {
              grid-template-columns: 1.25fr 0.9fr 0.75fr !important;
              gap: 8px !important;
            }

            .market-summary-row-symbol,
            .market-summary-row-price,
            .market-summary-row-change {
              font-size: 13px !important;
            }

            .market-filter-chip {
              padding: 9px 12px !important;
              font-size: 12px !important;
            }

            .market-count {
              margin-bottom: 10px !important;
            }

            .market-table-row {
              grid-template-columns: minmax(0, 1fr) auto auto !important;
              grid-template-areas: "name price change" !important;
              gap: 12px !important;
              padding: 16px 0 !important;
              align-items: center !important;
            }

            .market-cell-action {
              display: none !important;
            }

            .market-cell-range,
            .market-cell-volume,
            .market-cell-trend {
              display: none !important;
            }

            .market-cell-name {
              min-width: 0;
            }

            .market-cell-name > div {
              min-width: 0;
            }

            .market-cell-name > div > div:first-child {
              font-size: 15px !important;
              line-height: 1.1 !important;
            }

            .market-cell-price,
            .market-cell-change {
              text-align: right;
              white-space: nowrap;
              font-size: 14px !important;
            }

            .market-cell-meta::before {
              display: none !important;
            }

            .market-summary-row {
              grid-template-columns: minmax(0, 1fr) auto auto !important;
              gap: 10px !important;
            }

            .market-summary-row-symbol {
              min-width: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
