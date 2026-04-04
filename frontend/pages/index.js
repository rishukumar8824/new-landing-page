import { useEffect, useState } from "react";
import Link from "next/link";

// ── SVG Icons ──────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
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
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
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
function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
function IconGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function IconApple() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.12 14.053l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.696.533z"/>
    </svg>
  );
}
function IconQR() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
      <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
      <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
      <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconSupport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

// ── 3D-style MGBX Logo ─────────────────────────────────────────────────────
function MGBXLogo3D() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="animate-float logo-glow">
        <svg viewBox="0 0 420 420" width="420" height="420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="outerRingGrad" cx="50%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#e8e8e8"/>
              <stop offset="40%" stopColor="#b0b0b0"/>
              <stop offset="70%" stopColor="#787878"/>
              <stop offset="100%" stopColor="#404040"/>
            </radialGradient>
            <radialGradient id="innerRingGrad" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="#d0d8ff"/>
              <stop offset="50%" stopColor="#8899cc"/>
              <stop offset="100%" stopColor="#334466"/>
            </radialGradient>
            <radialGradient id="mGrad" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f0f0f0"/>
              <stop offset="50%" stopColor="#aaaaaa"/>
              <stop offset="100%" stopColor="#555555"/>
            </radialGradient>
            <radialGradient id="crossGrad" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#aaccff"/>
              <stop offset="100%" stopColor="#224488"/>
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.5"/>
            </filter>
          </defs>

          {/* Outer elliptical ring */}
          <ellipse cx="210" cy="210" rx="185" ry="185" fill="none" stroke="url(#outerRingGrad)" strokeWidth="18" opacity="0.9"/>
          {/* Highlight on ring */}
          <ellipse cx="210" cy="210" rx="185" ry="185" fill="none" stroke="url(#outerRingGrad)" strokeWidth="6" strokeDasharray="80 500" strokeDashoffset="-30" opacity="0.6"/>

          {/* Inner tilt ring (slightly rotated ellipse) */}
          <ellipse cx="210" cy="215" rx="130" ry="80" fill="none" stroke="url(#innerRingGrad)" strokeWidth="10" opacity="0.75" transform="rotate(-15, 210, 215)"/>

          {/* Horizontal bar (cross piece) */}
          <rect x="80" y="200" width="260" height="22" rx="4" fill="url(#crossGrad)" opacity="0.85"/>
          {/* Highlight on bar */}
          <rect x="80" y="200" width="260" height="8" rx="4" fill="#88aaee" opacity="0.5"/>

          {/* M letter shape */}
          <g filter="url(#shadow)">
            {/* Left vertical leg of M */}
            <rect x="118" y="130" width="28" height="110" rx="6" fill="url(#mGrad)"/>
            {/* Right vertical leg of M */}
            <rect x="274" y="130" width="28" height="110" rx="6" fill="url(#mGrad)"/>
            {/* Left diagonal of M */}
            <polygon points="118,130 146,130 210,185 174,185" fill="url(#mGrad)"/>
            {/* Right diagonal of M */}
            <polygon points="246,185 210,185 274,130 302,130" fill="url(#mGrad)"/>
            {/* Center point of M */}
            <polygon points="174,185 246,185 210,215" fill="url(#mGrad)" opacity="0.85"/>
          </g>

          {/* Highlight shimmer on M */}
          <rect x="120" y="130" width="12" height="80" rx="3" fill="white" opacity="0.25"/>

          {/* Glow at intersection of cross and ring */}
          <circle cx="90" cy="211" r="14" fill="#5588cc" opacity="0.6" filter="url(#glow)"/>
          <circle cx="330" cy="211" r="14" fill="#5588cc" opacity="0.6" filter="url(#glow)"/>

          {/* Top and bottom ring glow points */}
          <circle cx="210" cy="26" r="10" fill="#aaaaaa" opacity="0.5" filter="url(#glow)"/>
          <circle cx="210" cy="394" r="10" fill="#aaaaaa" opacity="0.3" filter="url(#glow)"/>
        </svg>
      </div>
    </div>
  );
}

// ── Small logo for navbar ──────────────────────────────────────────────────
function NavLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" width="36" height="36">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#a8ff3e" strokeWidth="2.5"/>
        <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#a8ff3e" fontFamily="Arial">B</text>
      </svg>
      <span className="text-white font-bold text-xl tracking-tight">
        Bitcovex
      </span>
    </div>
  );
}

function applyTiltHover(event) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  const rotateY = (px - 0.5) * 16;
  const rotateX = (0.5 - py) * 14;

  card.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
  card.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
  card.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
  card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
}

function resetTiltHover(event) {
  const card = event.currentTarget;
  card.style.setProperty("--mx", "50%");
  card.style.setProperty("--my", "50%");
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
}

function PromoBrandMark() {
  return (
    <div className="promo-brand">
      <svg viewBox="0 0 40 40" width="18" height="18" aria-hidden="true">
        <defs>
          <linearGradient id="promoBrandRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d9ff63" />
            <stop offset="100%" stopColor="#78b7ff" />
          </linearGradient>
          <linearGradient id="promoBrandBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#74b7ff" />
            <stop offset="100%" stopColor="#355fcb" />
          </linearGradient>
          <linearGradient id="promoBrandM" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f4f7ff" />
            <stop offset="100%" stopColor="#94a1bf" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#promoBrandRing)" strokeWidth="2.2"/>
        <ellipse cx="20" cy="20.5" rx="10.5" ry="5.6" fill="none" stroke="url(#promoBrandRing)" strokeWidth="1.5" opacity="0.55" transform="rotate(-14 20 20.5)"/>
        <rect x="8.5" y="18.4" width="23" height="2.8" rx="1.4" fill="url(#promoBrandBar)" opacity="0.85"/>
        <path d="M13 25V14.6h2.5l4.5 4.5 4.5-4.5H27V25h-2.5v-6.1l-4.5 4.3-4.5-4.3V25z" fill="url(#promoBrandM)"/>
      </svg>
      <span>Bitcovex</span>
    </div>
  );
}

function PromoTokenBadge({ kind = "coin", colors = ["#8cff4a", "#57b6ff"], className = "" }) {
  const [start, end] = colors;

  const renderIcon = () => {
    switch (kind) {
      case "gift":
        return (
          <svg viewBox="0 0 24 24" width="56%" height="56%" fill="none" stroke="#0b1015" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="10" rx="2" fill="rgba(255,255,255,0.22)" stroke="none" />
            <path d="M12 20V8M4 10h16M7.2 8h9.6" />
            <path d="M10.2 8C8.8 8 8 7.2 8 6.2 8 5.2 8.8 4.6 9.7 4.6c1.2 0 1.9 1 2.3 3.4M13.8 8c1.4 0 2.2-.8 2.2-1.8 0-1-.8-1.6-1.7-1.6-1.2 0-1.9 1-2.3 3.4" />
          </svg>
        );
      case "edge":
        return (
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
            <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" fill="#0f1317" opacity="0.75" />
            <path d="M12 5.2 18.3 8.8v6.4L12 18.8l-6.3-3.6V8.8z" fill="rgba(255,255,255,0.18)" />
            <path d="M8 8.7h8.2L8 15.3h8.2" stroke="#d8ff70" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "drop":
        return (
          <svg viewBox="0 0 24 24" width="58%" height="58%" fill="none">
            <path d="M12 3.6c3 4 5.3 6.7 5.3 10a5.3 5.3 0 1 1-10.6 0c0-3.3 2.3-6 5.3-10z" fill="rgba(255,255,255,0.9)" />
            <path d="M9.2 14.3c.5 1.4 1.6 2.1 3.2 2.1 1.1 0 2-.3 2.7-.9" stroke="#0e141b" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        );
      case "shield":
        return (
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
            <path d="M12 3.8 18.5 6v5.7c0 4.1-2.4 6.8-6.5 8.5-4.1-1.7-6.5-4.4-6.5-8.5V6z" fill="rgba(255,255,255,0.18)" />
            <path d="M12 7.2 8.3 10l1.4 4.4h4.6l1.4-4.4z" fill="#d8ff70" />
          </svg>
        );
      case "trophy":
        return (
          <svg viewBox="0 0 24 24" width="58%" height="58%" fill="none" stroke="#0d1115" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5h8v2.5A4 4 0 0 1 12 11.5 4 4 0 0 1 8 7.5z" fill="rgba(255,255,255,0.28)" stroke="none" />
            <path d="M8 6H5.5a2 2 0 0 0 2 3H8M16 6h2.5a2 2 0 0 1-2 3H16" />
            <path d="M12 11.5V16M9.2 19h5.6M10 16h4" />
          </svg>
        );
      case "mgbx":
        return (
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(8,12,16,0.48)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.2" />
            <ellipse cx="12" cy="12.6" rx="6.4" ry="3.4" stroke="rgba(140,211,255,0.7)" strokeWidth="1.1" transform="rotate(-14 12 12.6)" />
            <rect x="5.3" y="11" width="13.4" height="1.7" rx="0.85" fill="#4a7ce0" opacity="0.9" />
            <path d="M8 15.7V8.3h1.8l2.2 2.2 2.2-2.2H16v7.4h-1.8v-3.5l-2.2 2.1-2.2-2.1v3.5z" fill="#eef3ff" />
          </svg>
        );
      case "coin":
      default:
        return (
          <svg viewBox="0 0 24 24" width="56%" height="56%" fill="none">
            <circle cx="12" cy="12" r="8.2" fill="rgba(255,255,255,0.16)" />
            <path d="M9 12h6M12 9v6" stroke="#0d1115" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div className={`promo-orb ${className}`.trim()} style={{ "--promo-orb-start": start, "--promo-orb-end": end }}>
      {renderIcon()}
    </div>
  );
}

function PromoVisual({ visuals = [] }) {
  return (
    <div className="promo-visual" aria-hidden="true">
      <div className="promo-visual-core" />
      {visuals.map((visual, index) => (
        <PromoTokenBadge
          key={`${visual.kind}-${index}`}
          kind={visual.kind}
          colors={visual.colors}
          className={`promo-orb-${index + 1}`}
        />
      ))}
    </div>
  );
}

function PromoBannerCard({ badge, title, subtext, date, variant = "spot", visuals = [] }) {
  return (
    <article className={`promo-banner-card promo-banner-${variant}`}>
      <div className="promo-banner-copy">
        <PromoBrandMark />
        <span className={`promo-badge promo-badge-${variant}`}>{badge}</span>
        <div className="promo-title-stack">
          {title.map((line, index) => (
            <p key={`${line}-${index}`} className="promo-title-line">{line}</p>
          ))}
        </div>
        {subtext ? <p className="promo-subtext">{subtext}</p> : null}
        {date ? <p className="promo-date">{date}</p> : null}
      </div>
      <PromoVisual visuals={visuals} />
    </article>
  );
}

function CommunityCard({ creator, role, quote, followers, accent, icon, image }) {
  return (
    <div
      className="listing-card listing-card-3d community-card card-straight cursor-pointer"
    >
      <div className="listing-card-glow" />
      <div className="listing-card-beam" />
      <div className="listing-card-floor">
        <span>Followers: {followers}</span>
        <span className="listing-card-arrow">↗</span>
      </div>

      <div className="community-card-inner">
        <div className="community-card-head">
          <div
            className="community-avatar"
            style={{
              background: image
                ? `url(${image}) center/cover no-repeat`
                : `radial-gradient(circle at 30% 30%, ${accent[0]}, ${accent[1]})`
            }}
          >
            {!image ? <span>{icon}</span> : null}
          </div>

          <div>
            <h3 className="community-card-name">{creator}</h3>
            <p className="community-card-role">{role}</p>
          </div>
        </div>

        <p className="community-card-quote">"{quote}"</p>

        <div className="community-card-meta">
          <span>Followers: {followers}</span>
          <span className="community-card-inline-arrow">→</span>
        </div>
      </div>
    </div>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────
function Sparkline({ points, color = "#a8ff3e", variant = "glow" }) {
  const compact = variant === "compact";
  const w = compact ? 146 : 132, h = compact ? 40 : 44;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const min = Math.min(...points), max = Math.max(...points);
  const ys = points.map((v) => h - ((v - min) / (max - min || 1)) * (h - 12) - 6);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${d} L ${w},${h - 4} L 0,${h - 4} Z`;
  const markerX = xs[xs.length - 1];
  const markerY = ys[ys.length - 1];
  const gradId = `spark-grad-${points[0]}-${points[points.length - 1]}-${points.length}`;
  const fillId = `spark-fill-${points[0]}-${points[points.length - 1]}-${points.length}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={compact ? color : "#73ff7c"} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={compact ? color : "#d9ff63"} />
        </linearGradient>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={compact ? "rgba(255,255,255,0)" : "rgba(168,255,62,0.28)"} />
          <stop offset="100%" stopColor="rgba(168,255,62,0)" />
        </linearGradient>
        <filter id={`${gradId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {!compact && <path d={`M0,${h - 4} L${w},${h - 4}`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />}
      {!compact && <path d={area} fill={`url(#${fillId})`} opacity="0.9" />}
      {!compact && <path d={d} fill="none" stroke="rgba(168,255,62,0.18)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={compact ? "2" : "2.2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={compact ? undefined : `url(#${gradId}-glow)`}
      />
      {!compact && <circle cx={markerX} cy={markerY} r="3.8" fill="#d9ff63" opacity="0.18" />}
      {!compact && <circle cx={markerX} cy={markerY} r="2.2" fill="#d9ff63" />}
    </svg>
  );
}

// ── Coin Icon ──────────────────────────────────────────────────────────────
function CoinIcon({ symbol }) {
  const commonStyle = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 18px rgba(0,0,0,0.28)",
  };

  switch (symbol) {
    case "ETH":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #8999ff, #4456d8)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="18" fill="transparent" />
            <path d="M18 6.8 11.7 18l6.3 3.7 6.3-3.7z" fill="#ffffff" opacity="0.96" />
            <path d="M18 28.9 11.7 19.8 18 23.5l6.3-3.7z" fill="#d9e0ff" opacity="0.92" />
            <path d="M18 14.2 11.7 18 18 20.9 24.3 18z" fill="#b7c3ff" opacity="0.82" />
          </svg>
        </div>
      );
    case "BTC":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #ffcb78, #f7931a)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="18" fill="transparent" />
            <text x="18" y="23" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="Arial">₿</text>
          </svg>
        </div>
      );
    case "BNB":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #ffe08a, #f3ba2f)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <g transform="translate(18 18)" fill="#fff8dd">
              <rect x="-3.1" y="-3.1" width="6.2" height="6.2" transform="rotate(45)" rx="0.7" />
              <rect x="-7.8" y="-7.8" width="4.2" height="4.2" transform="rotate(45)" rx="0.6" />
              <rect x="3.6" y="-7.8" width="4.2" height="4.2" transform="rotate(45)" rx="0.6" />
              <rect x="-7.8" y="3.6" width="4.2" height="4.2" transform="rotate(45)" rx="0.6" />
              <rect x="3.6" y="3.6" width="4.2" height="4.2" transform="rotate(45)" rx="0.6" />
            </g>
          </svg>
        </div>
      );
    case "XRP":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #434953, #171b22)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <path d="M10.2 12.2c1.9 0 2.9.8 4.3 2.2l1.3 1.3c1 1 1.6 1.2 2.2 1.2.6 0 1.2-.2 2.2-1.2l1.3-1.3c1.4-1.4 2.4-2.2 4.3-2.2" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round"/>
            <path d="M10.2 23.8c1.9 0 2.9-.8 4.3-2.2l1.3-1.3c1-1 1.6-1.2 2.2-1.2.6 0 1.2.2 2.2 1.2l1.3 1.3c1.4 1.4 2.4 2.2 4.3 2.2" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round"/>
          </svg>
        </div>
      );
    case "TRX":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #ff6a6a, #d71f2a)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <path d="M10 9.8 25.4 13l-6.8 12.9L10 9.8Z" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M10 9.8 17.3 17.2l8.1-4.2" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M17.3 17.2 18.6 25.9" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M17.3 17.2 25.4 13l-6.8 12.9" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "SOL":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #282235, #14101d)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <path d="M10.8 11h13.6l-2.9 3.2H7.9z" fill="#79ffc9" />
            <path d="M12.1 16.5h13.6l-2.9 3.2H9.2z" fill="#a65cff" />
            <path d="M10.8 22h13.6l-2.9 3.2H7.9z" fill="#5fd6ff" />
          </svg>
        </div>
      );
    case "DOGE":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #f5d27b, #c79a3d)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <text x="18" y="23" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff7dc" fontFamily="Arial">Ð</text>
            <path d="M12 11.2h7.6M12 24.8h7.6" stroke="#fff7dc" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
          </svg>
        </div>
      );
    case "USDC":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #63a8ff, #2a63d8)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="9.4" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.95" />
            <path d="M15.8 14.1c.7-.7 1.6-1 2.6-1 1.2 0 2.1.4 2.8 1.1M20.7 21.8c-.7.7-1.6 1.1-2.7 1.1-1.1 0-2-.3-2.7-1" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            <text x="18" y="22" textAnchor="middle" fontSize="12" fontWeight="900" fill="#ffffff" fontFamily="Arial">$</text>
            <path d="M10.8 13.3c-1.1 1.2-1.8 2.8-1.8 4.7 0 1.8.7 3.5 1.8 4.7M25.2 13.3c1.1 1.2 1.8 2.8 1.8 4.7 0 1.8-.7 3.5-1.8 4.7" fill="none" stroke="#dbe9ff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      );
    case "XAU":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #f8dd86, #c89a1f)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="10.5" fill="rgba(255,255,255,0.18)" />
            <text x="18" y="22.3" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff5cc" fontFamily="Arial">Au</text>
          </svg>
        </div>
      );
    case "XAG":
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #f2f2f2, #8f8f8f)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="10.5" fill="rgba(255,255,255,0.22)" />
            <text x="18" y="22.3" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffffff" fontFamily="Arial">Ag</text>
          </svg>
        </div>
      );
    default:
      return (
        <div style={{ ...commonStyle, background: "radial-gradient(circle at 30% 30%, #4a4a4a, #222)" }}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <text x="18" y="22" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Arial">{symbol[0]}</text>
          </svg>
        </div>
      );
  }
}

function getMetricStartValue(value) {
  const match = value.match(/^([^0-9]*)([\d.]+)(.*)$/);

  if (!match) {
    return value;
  }

  const [, prefix, rawNumber, suffix] = match;
  const decimals = rawNumber.includes(".") ? rawNumber.split(".")[1].length : 0;
  const zeroNumber = decimals > 0 ? (0).toFixed(decimals) : "0";

  return `${prefix}${zeroNumber}${suffix}`;
}

function AnimatedMetric({ value, className, style, delay = 0, duration = 1600 }) {
  const [displayValue, setDisplayValue] = useState(() => getMetricStartValue(value));

  useEffect(() => {
    const match = value.match(/^([^0-9]*)([\d.]+)(.*)$/);

    if (!match) {
      setDisplayValue(value);
      return;
    }

    const [, prefix, rawNumber, suffix] = match;
    const decimals = rawNumber.includes(".") ? rawNumber.split(".")[1].length : 0;
    const target = Number.parseFloat(rawNumber);

    if (Number.isNaN(target)) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    let timeoutId = 0;
    let startedAt = 0;

    const tick = (timestamp) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      const formatted = decimals > 0 ? current.toFixed(decimals) : `${Math.round(current)}`;

      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    setDisplayValue(getMetricStartValue(value));
    timeoutId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [value, delay, duration]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {displayValue}
    </span>
  );
}

// ── Trending Section ───────────────────────────────────────────────────────
const FUTURES_ROWS = [
  { symbol:"ETHUSDT", coin:"ETH", price:"₹2,055.60", usd:"$2,055.60", change:"-0.43%", high:"2,080.32", volume:"2.03B", sparkline:[44,47,49,46,43,41,42,44,45,47,46,44,43,44,40], color:"#ff6b57" },
  { symbol:"BTCUSDT", coin:"BTC", price:"₹66,974.6", usd:"$66,974.60", change:"+0.14%", high:"67,400.0", volume:"1.81B", sparkline:[38,41,40,40,40,40,39,38,38,39,42,41,40,42,40], color:"#9cdc4b" },
  { symbol:"SOLUSDT", coin:"SOL", price:"₹80.51", usd:"$80.51", change:"+1.95%", high:"80.86", volume:"158.05M", sparkline:[26,28,26,27,26,26,26,27,26,27,27,29,28,29,31], color:"#9cdc4b" },
  { symbol:"XAUUSDT", coin:"XAU", price:"₹4,672.71", usd:"$4,672.71", change:"+0.05%", high:"4,678.29", volume:"51.62M", sparkline:[32,32,29,29,34,36,35,35,35,36,35,35,35,36,35], color:"#9cdc4b", tag:"Gold · 200x" },
  { symbol:"XRPUSDT", coin:"XRP", price:"₹1.3221", usd:"$1.32", change:"+2.00%", high:"1.3346", volume:"50.80M", sparkline:[24,26,24,31,32,29,33,32,32,31,27,31,31,30,32], color:"#9cdc4b" },
];

const SPOT_ROWS = [
  { symbol:"BTCUSDT", coin:"BTC", price:"₹66,860.1", usd:"$66,860.10", change:"+0.52%", high:"67,120.0", volume:"1.62B", sparkline:[39,41,40,42,41,40,41,43,44,43,42,43,44,45,46], color:"#9cdc4b" },
  { symbol:"ETHUSDT", coin:"ETH", price:"₹2,048.44", usd:"$2,048.44", change:"+0.38%", high:"2,067.11", volume:"1.18B", sparkline:[33,34,33,35,34,35,36,36,35,36,37,38,37,38,39], color:"#9cdc4b" },
  { symbol:"BNBUSDT", coin:"BNB", price:"₹604.44", usd:"$604.44", change:"+1.05%", high:"611.02", volume:"228.60M", sparkline:[25,26,27,27,28,27,29,29,30,31,30,31,32,32,33], color:"#9cdc4b" },
  { symbol:"SOLUSDT", coin:"SOL", price:"₹80.08", usd:"$80.08", change:"+1.66%", high:"80.74", volume:"143.27M", sparkline:[22,23,24,24,24,25,25,26,26,27,28,28,29,29,30], color:"#9cdc4b" },
  { symbol:"DOGEUSDT", coin:"DOGE", price:"₹0.09111", usd:"$0.09111", change:"+1.24%", high:"0.0925", volume:"45.90M", sparkline:[18,18,19,19,19,20,20,21,21,21,22,22,23,23,24], color:"#9cdc4b" },
];

const GAINER_ROWS = [
  { symbol:"TRXUSDT", coin:"TRX", price:"₹0.3136", usd:"$0.3136", change:"+3.74%", high:"0.3188", volume:"92.11M", sparkline:[20,21,22,22,23,24,24,25,26,26,27,27,28,29,30], color:"#9cdc4b" },
  { symbol:"AVAXUSDT", coin:"A", price:"₹37.42", usd:"$37.42", change:"+3.18%", high:"38.07", volume:"84.02M", sparkline:[20,20,21,22,23,23,24,25,25,26,27,27,28,29,30], color:"#9cdc4b" },
  { symbol:"ADAUSDT", coin:"A", price:"₹0.7442", usd:"$0.7442", change:"+2.81%", high:"0.7581", volume:"71.66M", sparkline:[18,18,19,20,20,21,22,22,23,24,24,25,26,26,27], color:"#9cdc4b" },
  { symbol:"LINKUSDT", coin:"L", price:"₹18.145", usd:"$18.145", change:"+2.10%", high:"18.44", volume:"63.12M", sparkline:[19,20,20,21,21,22,22,23,23,24,25,25,26,26,27], color:"#9cdc4b" },
  { symbol:"DOGEUSDT", coin:"DOGE", price:"₹0.09137", usd:"$0.09137", change:"+1.85%", high:"0.0928", volume:"52.01M", sparkline:[17,17,18,19,19,20,20,21,22,22,23,23,24,24,25], color:"#9cdc4b" },
];

function TrendingSection() {
  const [activeTab, setActiveTab] = useState("futures");
  const tabs = [
    { key:"futures", label:"Popular Futures" },
    { key:"spot", label:"Popular Spot" },
    { key:"gainers", label:"Gainers" },
  ];
  const rows = activeTab === "spot" ? SPOT_ROWS : activeTab === "gainers" ? GAINER_ROWS : FUTURES_ROWS;

  return (
    <section className="scroll-reveal reveal-up trending-shell" data-reveal style={{ maxWidth:1280, margin:"0 auto", padding:"56px 24px 56px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, marginBottom:34 }}>
        <h2 className="trending-section-title" style={{ color:"#fff", fontSize:"clamp(28px, 6.2vw, 76px)", fontWeight:900, letterSpacing:"-0.05em", lineHeight:0.98 }}>Trending Cryptocurrencies</h2>
      </div>

      <div className="trending-tabs-bar" style={{ display:"flex", gap:46, marginBottom:34 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className="trending-tab-btn"
            onClick={() => setActiveTab(t.key)}
            style={{
              padding:"0 0 12px",
              background:"none",
              border:"none",
              color: activeTab===t.key ? "#ffffff" : "#8d8d8d",
              fontSize: activeTab===t.key ? 23 : 20,
              fontWeight: activeTab===t.key ? 800 : 500,
              cursor:"pointer",
              position:"relative"
            }}
          >
            {t.label}
            {activeTab===t.key && <span style={{ position:"absolute", left:0, right:0, bottom:0, height:2, background:"#a8ff3e", borderRadius:999 }} />}
          </button>
        ))}
      </div>

      <div className="trending-desktop-table trending-table-shell">
        <div className="trending-table-head-row" style={{
          display:"grid",
          gridTemplateColumns:"1.65fr 1.25fr 0.9fr 1fr 1.15fr 1.05fr 92px",
          gap:18,
          minWidth:980,
          padding:"0 20px 14px",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          color:"#6f6f6f",
          fontSize:13
        }}>
          <span>Trading Pairs</span>
          <span>Last Traded Price</span>
          <span>24H Change</span>
          <span>24H High</span>
          <span>24H Trading Volume</span>
          <span>Chart</span>
          <span />
        </div>

        <div>
          {rows.map((c) => (
            <Link
              key={c.symbol}
              href={`/trade/${c.symbol}`}
              className="trending-table-row"
              style={{
                display:"grid",
                gridTemplateColumns:"1.65fr 1.25fr 0.9fr 1fr 1.15fr 1.05fr 92px",
                gap:18,
                minWidth:980,
                alignItems:"center",
                padding:"18px 20px",
                textDecoration:"none"
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
                <CoinIcon symbol={c.coin} />
                <div style={{ minWidth:0 }}>
                  <p style={{ color:"#f3f3f3", fontWeight:700, fontSize:15 }}>{c.symbol}</p>
                  <p style={{ color:"#7b7b7b", fontSize:12, marginTop:2 }}>{c.tag || c.usd}</p>
                </div>
              </div>
              <div>
                <p style={{ color:"#ededed", fontWeight:500, fontSize:14 }}>{c.price}</p>
                <p style={{ color:"#6f6f6f", fontSize:12, marginTop:2 }}>{c.usd}</p>
              </div>
              <div style={{ color: c.change.startsWith("-") ? "#ff6b57" : "#52d6a0", fontWeight:600, fontSize:14 }}>{c.change}</div>
              <div style={{ color:"#ededed", fontSize:14 }}>{c.high}</div>
              <div style={{ color:"#ededed", fontSize:14 }}>{c.volume}</div>
              <div style={{ width:146, justifySelf:"start" }}>
                <Sparkline points={c.sparkline} color={c.color} variant="compact" />
              </div>
              <button
                type="button"
                style={{
                  justifySelf:"end",
                  padding:"10px 18px",
                  borderRadius:10,
                  background:"#262626",
                  border:"1px solid rgba(255,255,255,0.06)",
                  color:"#ffffff",
                  fontSize:14,
                  fontWeight:700,
                  cursor:"pointer"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Trade
              </button>
            </Link>
          ))}
        </div>
      </div>

      <div className="trending-mobile-list">
        {rows.map((c) => (
          <Link key={`${c.symbol}-mobile`} href={`/trade/${c.symbol}`} className="trending-mobile-row" style={{ textDecoration:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <CoinIcon symbol={c.coin} />
              <div style={{ minWidth:0 }}>
                <p style={{ color:"#f3f3f3", fontWeight:700, fontSize:15 }}>{c.symbol}</p>
                <p style={{ color:"#7b7b7b", fontSize:11, marginTop:3 }}>{c.tag || c.usd}</p>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:"#ededed", fontWeight:500, fontSize:14 }}>{c.price}</p>
              <p style={{ color:"#6f6f6f", fontSize:11, marginTop:3 }}>{c.usd}</p>
            </div>
            <div
              style={{
                justifySelf:"end",
                minWidth:68,
                textAlign:"center",
                padding:"8px 10px",
                borderRadius:8,
                background: c.change.startsWith("-") ? "rgba(255,107,87,0.18)" : "rgba(82,214,160,0.18)",
                color: c.change.startsWith("-") ? "#ff7d66" : "#72e0aa",
                fontSize:13,
                fontWeight:700
              }}
            >
              {c.change}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const PORTFOLIO_ROWS = [
  [
    { symbol: "AVAX", icon: "A", accent: ["#ff6b57", "#ff9f43"] },
    { symbol: "SUSHI", icon: "S", accent: ["#8b5cf6", "#ec4899"] },
    { symbol: "DYDX", icon: "D", accent: ["#6366f1", "#111827"] },
    { symbol: "KNC", icon: "K", accent: ["#34d399", "#10b981"] },
    { symbol: "SRM", icon: "S", accent: ["#38bdf8", "#0f172a"] },
    { symbol: "JST", icon: "J", accent: ["#f97316", "#dc2626"] },
    { symbol: "MKR", icon: "M", accent: ["#6ee7b7", "#1f2937"] }
  ],
  [
    { symbol: "SLP", icon: "S", accent: ["#fca5a5", "#10b981"] },
    { symbol: "IQ", icon: "I", accent: ["#ec4899", "#f97316"] },
    { symbol: "SPELL", icon: "S", accent: ["#8b5cf6", "#1d4ed8"] },
    { symbol: "COMP", icon: "C", accent: ["#34d399", "#1f2937"] },
    { symbol: "REEF", icon: "R", accent: ["#a855f7", "#7c3aed"] },
    { symbol: "HOT", icon: "H", accent: ["#8b5cf6", "#4f46e5"] },
    { symbol: "CELO", icon: "C", accent: ["#22c55e", "#0f172a"] }
  ],
  [
    { symbol: "SOL", icon: "S", accent: ["#a855f7", "#22c55e"] },
    { symbol: "BAND", icon: "B", accent: ["#4f46e5", "#60a5fa"] },
    { symbol: "ENS", icon: "E", accent: ["#60a5fa", "#38bdf8"] },
    { symbol: "BAT", icon: "B", accent: ["#f59e0b", "#6366f1"] },
    { symbol: "BTT", icon: "B", accent: ["#111827", "#6b7280"] },
    { symbol: "ANKR", icon: "A", accent: ["#93c5fd", "#2563eb"] },
    { symbol: "ROSE", icon: "R", accent: ["#f472b6", "#7c3aed"] }
  ],
  [
    { symbol: "QNT", icon: "Q", accent: ["#d1d5db", "#111827"] },
    { symbol: "1INCH", icon: "1", accent: ["#94a3b8", "#e2e8f0"] },
    { symbol: "WIN", icon: "W", accent: ["#1d4ed8", "#facc15"] },
    { symbol: "EGLD", icon: "E", accent: ["#5eead4", "#0f766e"] },
    { symbol: "NFT", icon: "N", accent: ["#f8fafc", "#111827"] },
    { symbol: "CEEK", icon: "C", accent: ["#f97316", "#7c3aed"] },
    { symbol: "AMP", icon: "A", accent: ["#ec4899", "#facc15"], active: true }
  ]
];

function PortfolioChip({ symbol, icon, accent, active, setActiveSymbol }) {
  return (
    <button
      type="button"
      className={`portfolio-chip${active ? " is-active" : ""}`}
      onMouseEnter={() => setActiveSymbol(symbol)}
      onFocus={() => setActiveSymbol(symbol)}
      onClick={() => setActiveSymbol(symbol)}
    >
      <div
        className="portfolio-chip-icon"
        style={{ background: `radial-gradient(circle at 30% 30%, ${accent[0]}, ${accent[1]})` }}
      >
        <span>{icon}</span>
      </div>
      <span>{symbol}</span>
    </button>
  );
}

function PortfolioRow({
  items,
  reverse = false,
  speed = "28s",
  activeSymbol,
  setActiveSymbol,
  motionClass = "",
  motionName,
  motionDirection,
}) {
  const repeated = [...items, ...items];
  const trackStyle = {
    animationDuration: speed,
    animationName: motionName,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  };

  if (motionDirection) {
    trackStyle.animationDirection = motionDirection;
  }

  return (
    <div className="portfolio-row">
      <div
        className={`portfolio-track${reverse ? " reverse" : ""}${motionClass ? ` ${motionClass}` : ""}`}
        style={trackStyle}
      >
        {repeated.map((item, index) => (
          <PortfolioChip
            key={`${item.symbol}-${index}`}
            {...item}
            active={activeSymbol === item.symbol}
            setActiveSymbol={setActiveSymbol}
          />
        ))}
      </div>
    </div>
  );
}

function PortfolioSection() {
  const [activeSymbol, setActiveSymbol] = useState("AMP");

  return (
    <section className="portfolio-section scroll-reveal reveal-up max-w-7xl mx-auto px-6 py-10" data-reveal>
      <div className="portfolio-shell">
        <h2 className="portfolio-heading">Build Your Crypto Portfolio</h2>

        <div className="portfolio-board">
          <PortfolioRow
            items={PORTFOLIO_ROWS[0]}
            speed="16s"
            motionClass="portfolio-track-row-1"
            motionName="portfolio-marquee-mobile-reverse"
            activeSymbol={activeSymbol}
            setActiveSymbol={setActiveSymbol}
          />
          <PortfolioRow
            items={PORTFOLIO_ROWS[1]}
            reverse
            speed="18s"
            motionClass="portfolio-track-row-2"
            motionName="portfolio-marquee-mobile"
            activeSymbol={activeSymbol}
            setActiveSymbol={setActiveSymbol}
          />
          <PortfolioRow
            items={PORTFOLIO_ROWS[2]}
            speed="12s"
            motionClass="portfolio-track-row-3"
            motionName="portfolio-marquee-mobile-alt"
            motionDirection="alternate"
            activeSymbol={activeSymbol}
            setActiveSymbol={setActiveSymbol}
          />
          <PortfolioRow
            items={PORTFOLIO_ROWS[3]}
            reverse
            speed="20s"
            motionClass="portfolio-track-row-4"
            motionName="portfolio-marquee-mobile-reverse"
            activeSymbol={activeSymbol}
            setActiveSymbol={setActiveSymbol}
          />
        </div>

        <div className="portfolio-cta-wrap">
          <Link href="/trade/ETHUSDT" className="portfolio-cta">
            Trade Now with $10
          </Link>
        </div>
      </div>
    </section>
  );
}

const WHY_MGBX_ITEMS = [
  {
    key: "secure",
    title: "Secure",
    description:
      "We protect user funds with deep reserves, strong controls, and a trading environment designed for confidence.",
    icon: "🛡️",
  },
  {
    key: "seamless",
    title: "Seamless",
    description:
      "Enjoy efficient and real-time online trading. Start your crypto journey with a smoother and faster experience.",
    icon: "💳",
  },
  {
    key: "insights",
    title: "Insights",
    description:
      "Get real-time updates and sharp market signals so your next move feels informed, clear, and intentional.",
    icon: "🌍",
  },
  {
    key: "service",
    title: "Service",
    description:
      "Experience multilingual support and a responsive team that keeps the full trading journey simple and calm.",
    icon: "🎧",
  },
];

function WhyMGBXSection() {
  const [activeReason, setActiveReason] = useState("seamless");

  return (
    <section className="why-section scroll-reveal reveal-up max-w-7xl mx-auto px-6 py-10" data-reveal>
      <div className="why-shell">
        <h2 className="why-heading">Why Bitcovex?</h2>

        <div className="why-grid">
          {WHY_MGBX_ITEMS.map((item) => {
            const isActive = activeReason === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`why-card${isActive ? " is-active" : ""}`}
                onClick={() => setActiveReason(item.key)}
                onMouseEnter={() => setActiveReason(item.key)}
                onFocus={() => setActiveReason(item.key)}
              >
                <div className="why-card-orb">
                  <span>{item.icon}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FOOTER_GROUPS = [
  {
    title: "About Us",
    links: ["About", "Terms of Service", "Privacy Policy", "AML Policy", "Bitcovex Blog", "Have Questions?"],
  },
  {
    title: "Services",
    links: ["Buy Assets", "Download App", "Fees", "Referral Program", "Affiliate Program", "API", "How To Buy?"],
  },
  {
    title: "Support",
    links: ["Help Center", "Submit Request", "Announcements", "FAQ", "Bitcovex Verify"],
  },
  {
    title: "Buy Asset",
    links: ["Buy Bitcoin", "Buy Ethereum", "Buy Bitcovex Token", "Buy XRP", "Buy Solana"],
  },
  {
    title: "Contact Us",
    links: ["support@mgbx.com", "business@mgbx.com", "Listing Application"],
  },
];

function FooterSocial({ label, isDarkMode = true }) {
  const baseStyle = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: isDarkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.14)",
    color: isDarkMode ? "#fff" : "#111827",
    fontSize: 13,
    fontWeight: 800,
    background: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
  };

  return <span style={baseStyle}>{label}</span>;
}

function FooterCloneSection({ isDarkMode = true }) {
  return (
    <footer
      className="footer-clone-root"
      style={{
        background: isDarkMode ? "#090909" : "#f6f8fb",
        borderTop: isDarkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.08)",
        marginTop: 28
      }}
    >
      <div style={{ position:"relative", overflow:"hidden", borderBottom: isDarkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(15,23,42,0.06)" }}>
        <div style={{
          position:"absolute",
          inset:0,
          background:
            isDarkMode
              ? "radial-gradient(circle at 25% 30%, rgba(181,243,49,0.12), transparent 16%), radial-gradient(circle at 76% 36%, rgba(181,243,49,0.12), transparent 13%)"
              : "radial-gradient(circle at 25% 30%, rgba(181,243,49,0.16), transparent 16%), radial-gradient(circle at 76% 36%, rgba(181,243,49,0.12), transparent 13%)",
          opacity:0.9,
          pointerEvents:"none"
        }} />
        <div style={{
          position:"absolute",
          inset:"0 0 auto 0",
          height:"100%",
          background:
            "linear-gradient(120deg, transparent 8%, rgba(255,255,255,0.06) 8.4%, transparent 8.8%, transparent 29%, rgba(255,255,255,0.05) 29.4%, transparent 29.8%, transparent 70%, rgba(255,255,255,0.05) 70.4%, transparent 70.8%)",
          opacity:0.18,
          pointerEvents:"none"
        }} />

        <div className="footer-clone-cta" style={{ maxWidth:1280, margin:"0 auto", padding:"54px 24px 64px", position:"relative", zIndex:1, textAlign:"center" }}>
          <p style={{ color:isDarkMode ? "#f5f5f5" : "#0f172a", fontSize:"clamp(30px, 4vw, 58px)", fontWeight:300, lineHeight:1.16, letterSpacing:"-0.04em", maxWidth:950, margin:"0 auto" }}>
            The easiest way to get started.
            <br />
            <span style={{ fontWeight:400 }}>Sign up today to </span>
            <span style={{ color:"#a8ff3e", fontWeight:500 }}>Buy and Sell 170+ Cryptocurrencies.</span>
          </p>
          <Link
            href="/register"
            style={{
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              marginTop:30,
              minWidth:146,
              height:50,
              padding:"0 28px",
              borderRadius:10,
              background:"#a8ff3e",
              color:"#111",
              fontSize:18,
              fontWeight:800,
              textDecoration:"none",
              boxShadow:"0 8px 28px rgba(168,255,62,0.18)"
            }}
          >
            Sign up
          </Link>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"42px 24px 26px" }}>
        <div className="footer-clone-desktop footer-clone-grid" style={{ display:"grid", gap:28 }}>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 style={{ color:isDarkMode ? "#d7d7d7" : "#0f172a", fontSize:16, fontWeight:700, marginBottom:18 }}>{group.title}</h4>
              <div style={{ display:"grid", gap:14 }}>
                {group.links.map((item) => (
                  <Link key={item} href="/" style={{ color:isDarkMode ? "#9b9b9b" : "#667085", fontSize:15, textDecoration:"none" }}>
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h4 style={{ color:isDarkMode ? "#d7d7d7" : "#0f172a", fontSize:16, fontWeight:700, marginBottom:18 }}>Communities</h4>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <FooterSocial label="X" isDarkMode={isDarkMode} />
              <FooterSocial label="T" isDarkMode={isDarkMode} />
              <FooterSocial label="IG" isDarkMode={isDarkMode} />
              <FooterSocial label="f" isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>

        <div className="footer-clone-mobile">
          {FOOTER_GROUPS.map((group) => (
            <details key={`mobile-${group.title}`} className="footer-mobile-accordion">
              <summary className="footer-mobile-summary">
                <span>{group.title}</span>
                <span>⌄</span>
              </summary>
              <div className="footer-mobile-links">
                {group.links.map((item) => (
                  <Link key={item} href="/" style={{ color:isDarkMode ? "#9b9b9b" : "#667085", fontSize:15, textDecoration:"none" }}>
                    {item}
                  </Link>
                ))}
              </div>
            </details>
          ))}

          <div style={{ marginTop:22 }}>
            <h4 style={{ color:isDarkMode ? "#d7d7d7" : "#0f172a", fontSize:16, fontWeight:700, marginBottom:16 }}>Communities</h4>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <FooterSocial label="X" isDarkMode={isDarkMode} />
              <FooterSocial label="T" isDarkMode={isDarkMode} />
              <FooterSocial label="IG" isDarkMode={isDarkMode} />
              <FooterSocial label="f" isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>

        <div style={{ textAlign:"center", color:isDarkMode ? "#7a7a7a" : "#667085", fontSize:14, marginTop:46 }}>
          Bitcovex @ 2026
        </div>
      </div>
    </footer>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [email, setEmail] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const openMenu = () => setIsMenuOpen(true);
  const zeptbitP2PHref = "/p2p-clone.html";

  const navLinks = [
    { label: "Market", href: "/market" },
    { label: "Quick Buy", href: "/quick-buy" },
    { label: "Spot", href: "/trade/ETHUSDT" },
    { label: "Futures", href: "/trade/BTCUSDT" },
    { label: "P2P", href: zeptbitP2PHref },
    { label: "Copy Trading", href: "/copy-trading" },
  ];

  const promoCards = [
    {
      badge: "New Perpetual Futures Listing",
      title: ["Claim up to", "30,000 USDT"],
      subtext: "Bonus Credits",
      date: "April 01, 2026 00:00 (SGT)",
      variant: "bonus",
      visuals: [
        { kind: "gift", colors: ["#fbd55f", "#f29e1f"] },
        { kind: "coin", colors: ["#d8ff70", "#a8ff3e"] },
        { kind: "mgbx", colors: ["#8fd4ff", "#5f7fff"] },
      ],
    },
    {
      badge: "Spot Listing",
      title: ["EDGE"],
      subtext: "Bitcovex Selections Launch",
      date: "04-01-2026 18:00 (SGT)",
      variant: "spot",
      visuals: [
        { kind: "edge", colors: ["#7cf68f", "#55d7ff"] },
        { kind: "coin", colors: ["#78b8ff", "#57d6ff"] },
        { kind: "mgbx", colors: ["#d8ff70", "#7df57c"] },
      ],
    },
    {
      badge: "April Sprint Week",
      title: ["Split", "10,000 USDT"],
      subtext: "Prize Pool",
      date: "April 02, 2026 00:00 - April 08, 2026 23:59 (SGT)",
      variant: "promo",
      visuals: [
        { kind: "trophy", colors: ["#d8ff70", "#a8ff3e"] },
        { kind: "gift", colors: ["#7e77ff", "#55b5ff"] },
        { kind: "coin", colors: ["#5fd0ff", "#84f2ff"] },
      ],
    },
    {
      badge: "Futures Listing",
      title: ["CLUSDT  BZUSDT", "NATGASUSDT"],
      subtext: "Perpetual Futures",
      date: "04-02-2026 18:00 (SGT)",
      variant: "futures",
      visuals: [
        { kind: "drop", colors: ["#ffffff", "#dbe8ff"] },
        { kind: "coin", colors: ["#68d6ff", "#4f80ff"] },
        { kind: "mgbx", colors: ["#d8ff70", "#9fe8ff"] },
      ],
    },
    {
      badge: "Spot Listing",
      title: ["PRL/USDT", "BSB/USDT"],
      subtext: "Multi-growth pair launch",
      date: "03-28-2026 18:00 (SGT)",
      variant: "spot",
      visuals: [
        { kind: "shield", colors: ["#6fd1ff", "#4e78ff"] },
        { kind: "coin", colors: ["#fbd45e", "#f1a927"] },
        { kind: "mgbx", colors: ["#d8ff70", "#7cf68f"] },
      ],
    },
  ];

  const announcements = [
    "[Announcement] Bitcovex Announcement on the Launch of Event Contracts",
    "[Listing] New Spot Trading Pairs: PRL/USDT & BSB/USDT",
    "[Futures] GOOGLUSDT, NVDAUSDT & METAUSDT now live on Futures",
    "[Promotion] New Member Exclusive Perks – Claim up to 30,000 USDT Bonus Credits",
  ];
  const tickerText = announcements.join("   ·   ");
  const mobileMenuPrimaryLinks = [
    { label: "Explore", href: "/market" },
    { label: "P2P", href: zeptbitP2PHref },
    { label: "Trade", href: "/trade/ETHUSDT" },
    { label: "Buy Crypto", href: "/quick-buy" },
    { label: "Banking", href: "/banking" },
  ];
  const mobileMenuSecondaryLinks = [
    { label: "Download App", href: "/download-app" },
    { label: "Language", href: "/language" },
  ];
  const communityCards = [
    {
      creator: "Trade Travel Chill",
      role: "Crypto Trader and Educator",
      quote: "Learn how to trade crypto, generate profits, protect your gains, and build a calm trading routine.",
      followers: "37.8K",
      accent: ["#f5f5f5", "#6f6f6f"],
      icon: "T"
    },
    {
      creator: "Oracle Fast Money",
      role: "Scalping Mentor",
      quote: "Trading is a war and Bitcovex gives me the speed, clarity, and chart setup I need on the one minute chart.",
      followers: "55K",
      accent: ["#f7de54", "#6a38ff"],
      icon: "O"
    },
    {
      creator: "Noah Diermyer",
      role: "Full-time Market Analyst",
      quote: "What I like most is the smooth order flow and the fact that I can stay locked in without distractions.",
      followers: "5K",
      accent: ["#b18b68", "#2d241f"],
      icon: "N"
    },
    {
      creator: "Crash Trading",
      role: "System Trader",
      quote: "After trying a lot of platforms, Bitcovex still feels one of the cleanest places to execute and manage risk.",
      followers: "51.8K",
      accent: ["#4bd2ff", "#123f7f"],
      icon: "C"
    }
  ];

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("mgbx-theme");
      if (savedTheme === "light") {
        setIsDarkMode(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("mgbx-theme", isDarkMode ? "dark" : "light");
    } catch {}
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const handleMenuFallback = (event) => {
      if (window.innerWidth > 768) return;
      if (isMenuOpen) return;

      const menuButton = document.querySelector(".home-mobile-menu");
      if (!menuButton) return;

      const rect = menuButton.getBoundingClientRect();
      const hitPadding = 12;
      const { clientX, clientY } = event;

      if (typeof clientX !== "number" || typeof clientY !== "number") return;

      const insideHitbox =
        clientX >= rect.left - hitPadding &&
        clientX <= rect.right + hitPadding &&
        clientY >= rect.top - hitPadding &&
        clientY <= rect.bottom + hitPadding;

      if (!insideHitbox) return;

      event.preventDefault();
      event.stopPropagation();
      setIsMenuOpen(true);
    };

    document.addEventListener("pointerup", handleMenuFallback, true);
    document.addEventListener("click", handleMenuFallback, true);

    return () => {
      document.removeEventListener("pointerup", handleMenuFallback, true);
      document.removeEventListener("click", handleMenuFallback, true);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));

    if (nodes.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    nodes.forEach((node, index) => {
      const existingDelay = node.style.getPropertyValue("--reveal-delay").trim();

      if (!existingDelay) {
        node.style.setProperty("--reveal-delay", `${Math.min(index * 0.06, 0.24)}s`);
      }

      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-h-screen page-theme-${isDarkMode ? "dark" : "light"} page-shell`} style={{background:isDarkMode ? "#050505" : "#f6f8fb", paddingTop:"56px"}}>
      {/* ── Navbar ── */}
      <nav className="home-nav flex items-center justify-between px-6 py-3 border-b border-gray-900 sticky top-0 z-50" style={{background:isDarkMode ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.96)", borderColor: isDarkMode ? undefined : "rgba(15,23,42,0.08)"}}>
        {/* Left: Logo + Nav Links */}
        <div className="home-nav-left flex items-center gap-8">
          <NavLogo />
          <div className="home-nav-links hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              link.href ? (
                <Link key={link.label} href={link.href} className="nav-link text-sm font-medium">
                  {link.label}
                </Link>
              ) : (
                <button key={link.label} className="nav-link text-sm font-medium">{link.label}</button>
              )
            )}
            <button className="nav-link text-sm font-medium flex items-center gap-1">
              More <IconChevronDown />
            </button>
          </div>
        </div>
        {/* Right: Actions */}
        <div className="home-nav-actions flex items-center gap-4">
          <Link href="/login" className="home-login-link nav-link text-sm font-medium">Log In</Link>
          <Link href="/register" className="home-register-btn register-btn px-5 py-2 rounded-full text-sm">Register</Link>
          <div className="home-nav-icons flex items-center gap-3 text-gray-400 ml-2">
            <button className="nav-link"><IconSearch /></button>
            <button className="nav-link"><IconGift /></button>
            <button className="nav-link"><IconGlobe /></button>
            <button className="nav-link"><IconDownload /></button>
          </div>
          <button
            type="button"
            className="home-mobile-menu nav-link"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={openMenu}
          >
            <IconMenu />
          </button>
        </div>
      </nav>

      <aside id="mobile-menu" className={`mobile-drawer${isMenuOpen ? " is-open" : ""}`}>
        <div className="mobile-drawer-panel">
          <div className="mobile-drawer-head">
            <Link href="/" className="mobile-drawer-brand" onClick={() => setIsMenuOpen(false)} style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"20px"}}>
              <span className="mobile-drawer-brand-mark" aria-hidden="true" style={{fontSize:"20px",fontWeight:800,color:"#a8ff3e"}}>
                B
              </span>
              <span className="mobile-drawer-brand-word">
                Bitcovex
              </span>
            </Link>
            <button type="button" className="mobile-drawer-close" onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
              ×
            </button>
          </div>

          <div className="mobile-drawer-auth">
            <Link href="/login" className="mobile-drawer-login" onClick={() => setIsMenuOpen(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"52px",borderRadius:"10px",background:"#1e1e1e",border:"1.5px solid rgba(255,255,255,0.16)",color:"#e5e7eb",fontWeight:500,fontSize:"16px",textDecoration:"none"}}>Sign In</Link>
            <Link href="/register" className="mobile-drawer-register" onClick={() => setIsMenuOpen(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"52px",borderRadius:"10px",background:"#a8ff3e",color:"#0a0a0a",fontWeight:700,fontSize:"16px",textDecoration:"none"}}>Sign Up</Link>
          </div>

          <div className="mobile-drawer-links">
            <div className="mobile-drawer-links-group is-primary">
              {mobileMenuPrimaryLinks.map((item) => (
                <Link key={item.label} href={item.href} className="mobile-drawer-link" onClick={() => setIsMenuOpen(false)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:"52px",padding:"0 20px",color:"#f0f0f0",textDecoration:"none",fontSize:"17px",fontWeight:400,borderBottom:"none"}}>
                  <span>{item.label}</span>
                  <span style={{color:"rgba(255,255,255,0.4)",fontSize:"16px"}}>›</span>
                </Link>
              ))}
            </div>

            <div className="mobile-drawer-links-group is-secondary">
              {mobileMenuSecondaryLinks.map((item) => (
                <Link key={item.label} href={item.href} className="mobile-drawer-link" onClick={() => setIsMenuOpen(false)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:"52px",padding:"0 20px",color:"#f0f0f0",textDecoration:"none",fontSize:"17px",fontWeight:400,borderBottom:"none"}}>
                  <span>{item.label}</span>
                  <span style={{color:"rgba(255,255,255,0.4)",fontSize:"16px"}}>›</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mobile-drawer-theme" style={{padding:"0 20px",minHeight:"52px",marginTop:"auto",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#f0f0f0",fontSize:"17px",fontWeight:400}}>
            <span>Dark Mode</span>
            <button
              type="button"
              className={`theme-switch${isDarkMode ? " is-on" : ""}`}
              onClick={() => setIsDarkMode((value) => !value)}
              aria-label="Toggle color theme"
              aria-pressed={isDarkMode}
            >
              <span className="theme-switch-thumb" />
            </button>
          </div>
        </div>
      </aside>
      <button type="button" className={`mobile-drawer-backdrop${isMenuOpen ? " is-open" : ""}`} onClick={() => setIsMenuOpen(false)} aria-label="Close menu" />

      {/* ── Hero Section ── */}
      <section className="hero-glow scroll-reveal reveal-up relative overflow-hidden" data-reveal>
        <div className="home-hero max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center gap-8 min-h-[560px]">
          {/* Left content */}
          <div className="home-hero-copy flex-1 z-10">
            <h1 className="home-hero-title text-5xl font-black leading-tight text-white mb-2">
              Borderless Transactions
            </h1>
            <h1 className="home-hero-title home-hero-gradient text-5xl font-black leading-tight mb-4 shimmer-text">
              Diversified Growth
            </h1>
            <p className="home-hero-subtitle text-gray-400 text-lg mb-10">Multi-Growth Beyond Trading</p>

            {/* Registration input */}
            <div className="home-hero-form flex items-center gap-0 mb-8" style={{maxWidth:"480px"}}>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please Enter Email/Phone Number"
                className="home-hero-input input-dark flex-1 px-5 py-3.5 rounded-l-full text-sm"
                style={{borderRight:"none", borderRadius:"9999px 0 0 9999px"}}
              />
              <Link href="/register" className="home-hero-submit register-btn px-6 py-3.5 text-sm whitespace-nowrap" style={{borderRadius:"0 9999px 9999px 0"}}>
                Register Now
              </Link>
            </div>

            {/* Social login */}
            <div className="home-hero-social flex items-center gap-12">
              <div>
                <p className="text-gray-500 text-xs mb-3">Continue with</p>
                <div className="flex items-center gap-3">
                  <Link href="/login" className="social-btn"><IconGoogle /></Link>
                  <Link href="/login" className="social-btn"><IconApple /></Link>
                  <Link href="/login" className="social-btn"><IconTelegram /></Link>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-3">Download App</p>
                <div className="social-btn" style={{borderRadius:"8px", width:"44px", height:"44px"}}>
                  <IconQR />
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3D Logo */}
          <div className="home-hero-art flex-1 flex items-center justify-center" style={{minHeight:"420px"}}>
            <MGBXLogo3D />
          </div>
        </div>
      </section>

      {/* ── News Ticker ── */}
      <div className="scroll-reveal reveal-up border-t border-b border-gray-900 py-2.5 overflow-hidden" data-reveal style={{background:isDarkMode ? "#080808" : "#ffffff", borderColor: isDarkMode ? undefined : "rgba(15,23,42,0.08)"}}>
        <div className="flex items-center gap-4 px-6">
          <span className="news-badge flex-shrink-0">News Center</span>
          <div className="overflow-hidden flex-1">
            <div className="flex gap-8 animate-ticker whitespace-nowrap">
              {[tickerText, tickerText].map((t, i) => (
                <span key={i} className="text-sm text-gray-400 flex-shrink-0">{t}</span>
              ))}
            </div>
          </div>
          <button className="text-sm flex-shrink-0" style={{color:"#a8ff3e"}}>More</button>
        </div>
      </div>

      {/* ── Listing Cards ── */}
      <section className="scroll-reveal reveal-up max-w-7xl mx-auto px-6 py-10" data-reveal>
        <div className="promo-carousel-shell">
          <div className="promo-carousel-window">
            <div className="promo-carousel-track">
              {[0, 1].map((groupIndex) => (
                <div className="promo-carousel-group" key={`promo-group-${groupIndex}`}>
                  {promoCards.map((card, index) => (
                    <PromoBannerCard key={`${card.badge}-${groupIndex}-${index}`} {...card} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Market Stats Bar ── */}
      <section className="scroll-reveal reveal-up max-w-7xl mx-auto px-6 pb-10" data-reveal>
        <div className="home-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "24h Volume", value: "$2.4B+" },
            { label: "Listed Tokens", value: "500+" },
            { label: "Active Users", value: "10M+" },
            { label: "Countries", value: "180+" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="listing-card p-5 text-center scroll-reveal reveal-up"
              data-reveal
              style={{ "--reveal-delay": `${0.06 * index}s` }}
            >
              <p className="text-2xl font-black" style={{color:"#a8ff3e"}}>
                <AnimatedMetric value={stat.value} delay={index * 180} duration={1700} />
              </p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending Cryptocurrencies ── */}
      <TrendingSection />

      {/* ── Community Cards ── */}
      <section className="community-section max-w-7xl mx-auto px-6 py-8">
        <div className="scroll-reveal reveal-up flex items-center justify-between gap-4 mb-8" data-reveal>
          <h2 className="community-section-heading" style={{ color:"#fff", fontWeight:900 }}>Who is using Bitcovex</h2>
          <button className="nav-link text-sm font-medium">View More</button>
        </div>

        <div className="community-grid">
          {communityCards.map((card, index) => (
            <div
              key={card.creator}
              className={`scroll-reveal ${index % 2 === 0 ? "reveal-left" : "reveal-right"}`}
              data-reveal
              style={{ "--reveal-delay": `${0.08 * index}s` }}
            >
              <CommunityCard {...card} />
            </div>
          ))}
        </div>
      </section>

      <PortfolioSection />
      <WhyMGBXSection />

      {/* ── Bottom promo banner ── */}
      <div className="scroll-reveal reveal-up border-t border-gray-900 py-5 px-6" data-reveal style={{background:isDarkMode ? "#080808" : "#ffffff", borderColor: isDarkMode ? undefined : "rgba(15,23,42,0.08)"}}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="home-promo-title text-white text-base font-semibold">
              <span style={{color:"#a8ff3e", fontWeight:700}}>10,000 USDT</span> exclusive perks for new users
            </p>
            <p className="home-promo-sub text-gray-500 text-sm mt-0.5">Registration can be completed in one minute to receive the highest reward</p>
          </div>
          <Link href="/register" className="px-7 py-2.5 rounded-full font-bold text-black text-sm" style={{background:"#a8ff3e"}}>
            Sign up
          </Link>
        </div>
      </div>

      <FooterCloneSection isDarkMode={isDarkMode} />

      {/* ── Support bubble ── */}
      <button
        className="support-bubble fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center text-black z-50"
        style={{background:"#a8ff3e"}}
      >
        <IconSupport />
      </button>

      <style jsx>{`
        :global(html),
        :global(body),
        :global(#__next) {
          max-width: 100vw;
          overflow-x: hidden;
        }

        .page-shell {
          max-width: 100vw;
          overflow-x: hidden;
        }

        .home-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 9999;
          isolation: isolate;
          overflow: visible;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .home-nav-actions {
          position: relative;
          padding-right: 44px;
          z-index: 82;
        }

        .mobile-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.48);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.24s ease;
          z-index: 60;
        }

        .mobile-drawer-backdrop.is-open,
        .mobile-drawer:target + .mobile-drawer-backdrop {
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          transform: translateX(102%);
          transition: transform 0.28s ease;
          z-index: 10001;
          pointer-events: none;
        }

        .mobile-drawer.is-open,
        .mobile-drawer:target {
          transform: translateX(0);
          pointer-events: auto;
        }

        .mobile-drawer-panel {
          height: 100%;
          padding: 0;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .mobile-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 28px 24px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-drawer-brand {
          display: inline-flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
        }

        .mobile-drawer-brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(168, 255, 62, 0.06);
          color: #a8ff3e;
          box-shadow: inset 0 0 0 1.5px rgba(168, 255, 62, 0.3);
          flex-shrink: 0;
        }

        .mobile-drawer-brand-word {
          color: #f4f4f5;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .mobile-drawer-brand-word span {
          color: #a8ff3e;
          font-weight: 700;
        }

        .mobile-drawer-close {
          font-size: 28px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          background: transparent;
          border: none;
          padding: 4px;
          text-decoration: none;
          appearance: none;
          flex-shrink: 0;
        }

        .mobile-drawer-auth {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 24px 24px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 0;
        }

        .mobile-drawer-login,
        .mobile-drawer-register {
          min-height: 58px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          text-decoration: none;
          font-size: 17px;
        }

        .mobile-drawer-login {
          color: #e5e7eb;
          background: #2a2a2a;
          border: 1.5px solid rgba(255, 255, 255, 0.22);
        }

        .mobile-drawer-register {
          color: #0a0a0a;
          background: #a8ff3e;
          font-weight: 800;
          border: none;
          box-shadow: 0 4px 16px rgba(168, 255, 62, 0.3);
        }

        .mobile-drawer-links {
          display: flex;
          flex-direction: column;
          padding: 8px 0;
          flex: 1;
        }

        .mobile-drawer-links-group {
          display: flex;
          flex-direction: column;
        }

        .mobile-drawer-links-group.is-primary {
          padding-bottom: 0;
        }

        .mobile-drawer-links-group.is-secondary {
          border-top: none;
          margin-top: 0;
          padding-top: 0;
        }

        .mobile-drawer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          text-decoration: none;
          min-height: 96px;
          padding: 0 24px;
          color: #f0f0f0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 23px;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        .mobile-drawer-link span:first-child {
          min-width: 0;
          white-space: nowrap;
        }

        .mobile-drawer-link-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1;
        }

        .mobile-drawer-link-chevron :global(svg) {
          width: 20px;
          height: 20px;
        }

        .mobile-drawer-links-group.is-secondary .mobile-drawer-link:last-child {
          border-bottom: none;
        }

        .mobile-drawer-theme {
          padding: 28px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #f0f0f0;
          font-size: 23px;
          font-weight: 400;
        }

        .theme-switch {
          width: 54px;
          height: 30px;
          border-radius: 999px;
          padding: 3px;
          display: inline-flex;
          align-items: center;
          background: rgba(168, 255, 62, 0.15);
          border: 1px solid rgba(168, 255, 62, 0.3);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .theme-switch.is-on {
          background: rgba(168, 255, 62, 0.28);
          border-color: rgba(168, 255, 62, 0.5);
          justify-content: flex-end;
        }

        .theme-switch-thumb {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }

        .home-mobile-menu {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          cursor: pointer;
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 140;
          pointer-events: auto !important;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          background: transparent;
          border: none;
        }

        .home-mobile-menu :global(svg) {
          pointer-events: none;
        }

        .footer-clone-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .footer-clone-mobile,
        .trending-mobile-list {
          display: none;
        }

        .trending-table-shell {
          overflow: visible;
        }

        :global(.page-theme-light) {
          color: #0f172a;
        }

        :global(.page-theme-light .home-nav) {
          background: rgba(255, 255, 255, 0.96) !important;
        }

        :global(.page-theme-light .nav-link),
        :global(.page-theme-light .home-login-link),
        :global(.page-theme-light .home-hero-title),
        :global(.page-theme-light .home-promo-title),
        :global(.page-theme-light .community-section-heading),
        :global(.page-theme-light .trending-section-title),
        :global(.page-theme-light .portfolio-heading),
        :global(.page-theme-light .why-heading) {
          color: #0f172a !important;
        }

        :global(.page-theme-light .home-hero-subtitle),
        :global(.page-theme-light .text-gray-400),
        :global(.page-theme-light .text-gray-500),
        :global(.page-theme-light .community-card-role),
        :global(.page-theme-light .community-card-quote),
        :global(.page-theme-light .community-card-meta) {
          color: #667085 !important;
        }

        :global(.page-theme-light .input-dark),
        :global(.page-theme-light .social-btn),
        :global(.page-theme-light .listing-card),
        :global(.page-theme-light .promo-banner-card),
        :global(.page-theme-light .community-card),
        :global(.page-theme-light .portfolio-shell),
        :global(.page-theme-light .why-shell),
        :global(.page-theme-light .trending-table-shell),
        :global(.page-theme-light .trending-mobile-list) {
          background: #ffffff !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06) !important;
        }

        :global(.page-theme-light .portfolio-shell) {
          background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
        }

        :global(.page-theme-light .why-card),
        :global(.page-theme-light .trending-mobile-row),
        :global(.page-theme-light .promo-carousel-shell),
        :global(.page-theme-light .promo-carousel-window) {
          border-color: rgba(15, 23, 42, 0.08) !important;
        }

        :global(.page-theme-light footer a),
        :global(.page-theme-light .footer-mobile-summary),
        :global(.page-theme-light .footer-clone-root) {
          color: #0f172a !important;
        }

        :global(.page-theme-light .mobile-drawer-panel) {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        :global(.page-theme-light .mobile-drawer-brand-word) {
          color: #111827;
        }

        :global(.page-theme-light .mobile-drawer-close),
        :global(.page-theme-light .mobile-drawer-login) {
          color: #0f172a;
          background: rgba(15, 23, 42, 0.04);
          border-color: rgba(15, 23, 42, 0.08);
        }

        :global(.page-theme-light .mobile-drawer-link),
        :global(.page-theme-light .mobile-drawer-theme) {
          color: #0f172a;
        }

        :global(.page-theme-light .mobile-drawer-link-chevron) {
          color: rgba(15, 23, 42, 0.48);
        }

        :global(.page-theme-light .mobile-drawer-link) {
          border-bottom-color: rgba(15, 23, 42, 0.08);
        }

        :global(.page-theme-light .theme-switch) {
          background: rgba(15, 23, 42, 0.08);
          border-color: rgba(15, 23, 42, 0.08);
        }

        /* ── Community section heading — responsive font size ── */
        .community-section-heading {
          font-size: 32px;
          line-height: 1.1;
        }

        /* ── Community section — allow reveal overflow on mobile ── */
        .community-section {
          overflow-x: clip; /* clips horizontal overflow from slide-in without affecting vertical scroll */
        }

        .home-listing-strip {
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }

        .home-listing-card,
        .home-listing-card:hover,
        .home-listing-card.is-peeked {
          scroll-snap-align: start;
          --card-translate-y: 0px;
          --card-rotate-x: 0deg;
          --card-rotate-y: 0deg;
          --card-scale: 1;
          --card-opacity: 1;
          --floor-shift: 118%;
          --glow-opacity: 0.18;
          --glow-scale: 1;
          --beam-opacity: 0;
          --beam-shift: -140%;
          transform: none !important;
          transform-origin: center bottom;
          opacity: var(--card-opacity);
          transition:
            transform 0.24s ease,
            box-shadow 0.34s ease,
            border-color 0.34s ease,
            opacity 0.34s ease !important;
        }

        .home-listing-card.is-peeked {
          border-color: rgba(210, 255, 78, 0.38) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 40px rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(210, 255, 78, 0.08),
            0 0 34px rgba(210, 255, 78, 0.12) !important;
        }

        .home-listing-card :global(.listing-card-floor) {
          transform: translateY(var(--floor-shift)) translateZ(26px);
          transition: transform 0.34s ease, box-shadow 0.34s ease;
        }

        .home-listing-card :global(.listing-card-glow) {
          opacity: var(--glow-opacity);
          transform: translateZ(-22px) scale(var(--glow-scale));
          transition: opacity 0.34s ease, transform 0.34s ease;
        }

        .home-listing-card :global(.listing-card-beam) {
          display: none !important;
        }

        :global(.card-straight),
        :global(.card-straight:hover),
        :global(.card-straight.is-peeked) {
          transform: none !important;
          opacity: 1 !important;
        }

        :global(.card-straight .listing-card-beam) {
          display: none !important;
        }

        :global(.card-straight .listing-card-glow) {
          opacity: 0.16 !important;
          transform: translateZ(0) scale(1) !important;
        }

        :global(.card-straight .listing-card-floor) {
          transform: translateY(118%) translateZ(0) !important;
        }

        /* ── Mobile base (≤ 768px) ─────────────────────────── */
        @media (max-width: 768px) {
          /* Remove blur — avoid white-flash / repaint cost on iOS */
          .home-nav {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 16px !important;
            height: 56px;
          }

          /* Kill all expensive animations that cause jank */
          .hero-glow,
          .shimmer-text,
          .animate-float,
          .logo-glow {
            animation: none !important;
            transition: none !important;
            filter: none !important;
          }

          /* ── Navbar left ── */
          .home-nav-left {
            gap: 8px !important;
            min-width: 0;
            flex-shrink: 0;
          }

          /* Hide desktop nav links */
          .home-nav-links {
            display: none !important;
          }

          /* Hide Gift / Globe / Download icons, keep Search */
          .home-nav-icons > button:nth-child(2),
          .home-nav-icons > button:nth-child(3),
          .home-nav-icons > button:nth-child(4) {
            display: none !important;
          }

          /* ── Navbar right: [Login] [Register] [Search] [Menu] ── */
          .home-nav-actions {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-left: auto;
            position: relative !important;
            padding-right: 42px !important;
            z-index: 82 !important;
          }

          .home-nav-icons {
            gap: 0 !important;
            margin-left: 0 !important;
          }

          /* LOGIN button — pill, outlined, same height as Register */
          .home-login-link {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 72px !important;
            height: 38px !important;
            padding: 0 14px !important;
            border: 1.5px solid #2f2f2f !important;
            border-radius: 999px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            color: #e8e8e8 !important;
            background: rgba(255, 255, 255, 0.03) !important;
            white-space: nowrap !important;
          }

          /* REGISTER button — pill, filled, same height */
          .home-register-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 38px !important;
            min-width: 90px !important;
            padding: 0 16px !important;
            border-radius: 999px !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            white-space: nowrap !important;
            margin-right: 2px !important;
          }

          /* Hamburger — shown on mobile */
          .home-mobile-menu {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 44px !important;
            height: 44px !important;
            flex-shrink: 0 !important;
            position: absolute !important;
            right: -6px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            z-index: 120 !important;
          }

          .mobile-drawer,
          .mobile-drawer-backdrop {
            display: block !important;
          }

          /* ── Hero section ── */
          .home-hero {
            min-height: auto !important;
            align-items: flex-start !important;
            gap: 0 !important;
            padding: 24px 16px 16px !important;
          }

          .home-hero-copy {
            width: 100% !important;
          }

          .home-hero-title {
            font-size: 31px !important;
            line-height: 1.07 !important;
            margin-bottom: 4px !important;
            letter-spacing: -0.03em;
          }

          .home-hero-gradient {
            margin-bottom: 12px !important;
          }

          .home-hero-subtitle {
            font-size: 15px !important;
            line-height: 1.5 !important;
            margin-bottom: 20px !important;
            color: #666 !important;
          }

          /* Email input + Register Now — full width pill row */
          .home-hero-form {
            max-width: none !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: stretch;
            gap: 0 !important;
            margin-bottom: 20px !important;
          }

          .home-hero-input {
            border-radius: 999px 0 0 999px !important;
            border-right: none !important;
            min-height: 50px !important;
            padding: 0 18px !important;
            font-size: 14px !important;
          }

          .home-hero-submit {
            border-radius: 0 999px 999px 0 !important;
            min-height: 50px !important;
            min-width: 132px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            padding: 0 20px !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.36),
              0 10px 24px rgba(181, 243, 49, 0.18) !important;
          }

          /* Hide social login row + 3D logo art on mobile */
          .home-hero-social,
          .home-hero-art {
            display: none !important;
          }

          /* ── Listing card strip ── */
          .home-listing-strip {
            gap: 12px !important;
            padding-bottom: 6px !important;
            scroll-snap-type: x mandatory !important;
            scroll-padding-left: 16px !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .home-listing-arrow {
            display: none !important;
          }

          .home-listing-card {
            width: 256px !important;
            min-width: 256px !important;
            scroll-snap-align: start;
            transform: none !important;
            transition: border-color 0.22s ease, box-shadow 0.22s ease !important;
            --floor-shift: 100%;
            --glow-opacity: 0;
            --beam-opacity: 0;
          }

          .home-listing-card :global(.listing-card-floor),
          .home-listing-card :global(.listing-card-beam),
          .home-listing-card :global(.listing-card-glow) {
            display: none !important;
          }

          .home-listing-card.is-peeked {
            border-color: rgba(210, 255, 78, 0.3) !important;
            box-shadow:
              0 8px 24px rgba(0, 0, 0, 0.28),
              0 0 0 1px rgba(210, 255, 78, 0.08) !important;
          }

          .trending-shell {
            padding: 40px 16px 32px !important;
          }

          .trending-section-title {
            font-size: 30px !important;
            line-height: 1.02 !important;
          }

          .trending-desktop-table {
            display: none !important;
          }

          .trending-mobile-list {
            display: grid !important;
            gap: 10px !important;
          }

          .trending-mobile-row {
            display: grid !important;
            grid-template-columns: minmax(0,1fr) auto auto !important;
            gap: 10px !important;
            align-items: center !important;
            padding: 12px 0 !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
          }

          .trending-tabs-bar {
            gap: 18px !important;
            margin-bottom: 22px !important;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }

          .trending-tabs-bar::-webkit-scrollbar {
            display: none;
          }

          .trending-tab-btn {
            font-size: 16px !important;
            white-space: nowrap;
          }

          .trending-table-shell {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 6px !important;
            scrollbar-width: thin;
          }

          .trending-table-shell::-webkit-scrollbar {
            height: 4px;
          }

          .trending-table-shell::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.14);
            border-radius: 999px;
          }

          .support-bubble {
            width: 46px !important;
            height: 46px !important;
            right: 16px !important;
            bottom: 22px !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-drawer,
          .mobile-drawer-backdrop {
            display: block !important;
          }
        }

        /* ── Small phones (≤ 480px) ────────────────────────── */
        @media (max-width: 480px) {
          /* Even tighter nav on small screens */
          .home-nav {
            padding: 0 14px !important;
          }

          /* Shrink logo SVG slightly */
          .home-nav :global(svg[viewBox="0 0 40 40"]) {
            width: 28px !important;
            height: 28px !important;
          }

          /* Hide search icon — gives buttons more breathing room */
          .home-nav-icons {
            display: none !important;
          }

          /* Slightly smaller buttons on very small phones */
          .home-login-link {
            min-width: 64px !important;
            height: 36px !important;
            font-size: 12.5px !important;
            padding: 0 12px !important;
          }

          .home-register-btn {
            min-width: 84px !important;
            height: 36px !important;
            font-size: 12.5px !important;
            padding: 0 14px !important;
          }

          /* Hero text */
          .home-hero-title {
            font-size: 27px !important;
          }

          .home-hero-subtitle {
            font-size: 14px !important;
            margin-bottom: 18px !important;
          }

          /* Form row — keep pill shape, compact */
          .home-hero-input {
            min-height: 48px !important;
            font-size: 13.5px !important;
            padding: 0 16px !important;
          }

          .home-hero-submit {
            min-height: 48px !important;
            min-width: 118px !important;
            font-size: 13.5px !important;
            padding: 0 16px !important;
          }

          /* Listing cards a touch narrower */
          .home-listing-card {
            width: 240px !important;
            min-width: 240px !important;
          }

          /* Nav gap tighter */
          .home-nav-actions {
            gap: 6px !important;
            padding-right: 40px !important;
          }
        }

        /* ── Very small phones (≤ 375px) ───────────────────── */
        @media (max-width: 375px) {
          .home-login-link {
            min-width: 58px !important;
            padding: 0 10px !important;
          }

          .home-register-btn {
            min-width: 80px !important;
            padding: 0 12px !important;
          }

          .home-hero-title {
            font-size: 25px !important;
          }

          .home-hero-submit {
            min-width: 108px !important;
            font-size: 13px !important;
          }

          .footer-clone-cta a {
            min-width: 124px !important;
            height: 46px !important;
            font-size: 16px !important;
          }

          .footer-clone-desktop {
            display: none !important;
          }

          .footer-clone-mobile {
            display: grid !important;
            gap: 8px !important;
          }

          .footer-mobile-accordion {
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding: 2px 0;
          }

          .footer-mobile-summary {
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px 0;
            color: #d7d7d7;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          }

          .footer-mobile-summary::-webkit-details-marker {
            display: none;
          }

          .footer-mobile-links {
            display: grid;
            gap: 12px;
            padding: 0 0 16px;
          }
        }

        /* ── Community heading: responsive ─────────────────── */
        @media (max-width: 768px) {
          .community-section-heading {
            font-size: 26px !important;
          }
        }

        @media (max-width: 480px) {
          .community-section-heading {
            font-size: 22px !important;
          }
        }

        /* ── Market stats grid: better mobile cards ─────────── */
        @media (max-width: 480px) {
          /* Tighten the 2-col stats grid on small screens */
          .home-stats-grid {
            gap: 10px !important;
          }
        }

        @media (max-width: 900px) {
          .footer-clone-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 24px !important;
          }
        }

        @media (max-width: 560px) {
          .footer-clone-cta {
            padding: 38px 18px 44px !important;
          }

          .footer-clone-grid {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
          }
        }

        /* ── Bottom promo banner mobile ─────────────────────── */
        @media (max-width: 480px) {
          .home-promo-title {
            font-size: 14px !important;
          }
          .home-promo-sub {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
