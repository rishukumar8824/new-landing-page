import { useState } from "react";
import Link from "next/link";

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function IconGiftBtn() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function IconGoogle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function IconApple() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
function IconTelegram() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#2AABEE">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.12 14.053l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.696.533z"/>
    </svg>
  );
}

function Navbar() {
  const navLinks = ["Market", "Quick Buy", "Spot", "Futures", "Copy Trading"];
  return (
    <nav
      className="flex items-center justify-between px-6 border-b border-gray-900 z-50 flex-shrink-0"
      style={{ background: "#0a0a0a", height: "60px" }}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" width="32" height="32">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#a8ff3e" strokeWidth="2.5"/>
            <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#a8ff3e" fontFamily="Arial">M</text>
          </svg>
          <span className="text-white font-bold text-lg tracking-tight">
            Bitcovex
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((l) => (
            <Link key={l} href="/" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">{l}</Link>
          ))}
          <button className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1">
            More <IconChevronDown />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-white text-sm font-medium hover:text-gray-300">Log In</Link>
        <Link href="/register" className="px-5 py-2 rounded-full text-sm font-bold text-black" style={{ background: "#a8ff3e" }}>
          Register
        </Link>
        <div className="auth-nav-icons flex items-center gap-3 text-gray-400 ml-1">
          <button className="hover:text-white transition-colors"><IconSearch /></button>
          <button className="hover:text-white transition-colors"><IconGift /></button>
          <button className="hover:text-white transition-colors"><IconGlobe /></button>
          <button className="hover:text-white transition-colors"><IconSun /></button>
          <button className="hover:text-white transition-colors"><IconDownload /></button>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .auth-nav-icons { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

function PromoPanel() {
  return (
    <div
      className="flex flex-col justify-center px-16 py-12 relative overflow-hidden"
      style={{
        width: "46%",
        flexShrink: 0,
        background: "#0a0a0a",
        backgroundImage: `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 28px,
          rgba(255,255,255,0.03) 28px,
          rgba(255,255,255,0.03) 29px
        )`,
      }}
    >
      <div className="mb-8">
        <h2 className="text-white text-3xl font-black leading-snug mb-1">
          Bitcovex Newcomer Gift Package
        </h2>
        <p className="text-2xl font-black">
          Up to <span style={{ color: "#a8ff3e" }}>6,888 USDT</span>{" "}
          <span className="text-white">per user</span>
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div
          className="rounded-3xl border border-gray-700 overflow-hidden shadow-2xl"
          style={{ width: "260px", background: "#111", padding: "14px" }}
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-3">
            <span className="text-gray-400 text-sm">‹</span>
            <span className="text-white text-sm font-semibold">Welfare Center</span>
            <span className="text-gray-400 text-sm">···</span>
          </div>
          <div className="rounded-2xl p-4 mb-3" style={{ background: "#1a1a1a" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white text-sm font-bold">Welfare Center</p>
                <p className="text-gray-500 text-xs mt-1">Participate in activities,</p>
                <p className="text-gray-500 text-xs">complete tasks, and receive rewards</p>
              </div>
              <span className="text-3xl ml-2">🎁</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-1 mb-4">
            <span className="text-white text-xs font-bold border-b-2 border-white pb-1">Beginner Tasks</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded text-black text-[10px]" style={{ background: "#a8ff3e" }}>NEW</span>
            <span className="text-gray-500 text-xs">Limited-Time Benefits</span>
          </div>
          <div className="px-1">
            <p className="text-white text-sm font-bold">Welcome Gift! ⓘ</p>
            <p className="text-gray-500 text-xs mt-1">Activities are updated daily at 00:00 (UTC+8)</p>
            <p className="text-gray-400 text-xs mt-3 mb-2">Countdown</p>
            <div className="flex gap-1.5">
              {[["10","d"],["12","h"],["23","m"],["56","s"]].map(([n, u]) => (
                <div key={u} className="flex items-center gap-0.5">
                  <span className="text-white text-xs font-bold px-2 py-1 rounded" style={{ background: "#222" }}>{n}</span>
                  <span className="text-gray-500 text-[10px]">{u}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-4">KYC Verification (1/4)</p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-4 rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "#fff" }}>
          <svg width="52" height="52" viewBox="0 0 48 48">
            <rect x="2" y="2" width="18" height="18" rx="2" fill="none" stroke="#000" strokeWidth="2.5"/>
            <rect x="6" y="6" width="10" height="10" fill="#000"/>
            <rect x="28" y="2" width="18" height="18" rx="2" fill="none" stroke="#000" strokeWidth="2.5"/>
            <rect x="32" y="6" width="10" height="10" fill="#000"/>
            <rect x="2" y="28" width="18" height="18" rx="2" fill="none" stroke="#000" strokeWidth="2.5"/>
            <rect x="6" y="32" width="10" height="10" fill="#000"/>
            <rect x="28" y="28" width="4" height="4" fill="#000"/>
            <rect x="34" y="28" width="4" height="4" fill="#000"/>
            <rect x="40" y="28" width="6" height="4" fill="#000"/>
            <rect x="28" y="34" width="4" height="4" fill="#000"/>
            <rect x="34" y="34" width="4" height="4" fill="#000"/>
            <rect x="40" y="34" width="6" height="4" fill="#000"/>
            <rect x="28" y="40" width="18" height="6" fill="#000"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-sm">Scan to Download Now</p>
          <p className="text-white text-base font-bold">iOS &amp; Android</p>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [tab, setTab] = useState("email");
  const [showReferral, setShowReferral] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", referral: "" });

  const inputStyle = {
    background: "#141414",
    border: "1px solid #2a2a2a",
    outline: "none",
    color: "#fff",
    width: "100%",
    padding: "14px 16px",
    borderRadius: "8px",
    fontSize: "14px",
  };
  const focusStyle = (e) => (e.target.style.borderColor = "#a8ff3e");
  const blurStyle  = (e) => (e.target.style.borderColor = "#2a2a2a");

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <Navbar />

      <div className="flex flex-1">
        <div className="auth-promo-wrap">
          <PromoPanel />
        </div>

        {/* Right: Register form */}
        <div className="auth-form-wrap flex flex-1 items-center justify-center px-16 py-12" style={{ background: "#0d0d0d" }}>
          <div style={{ width: "100%", maxWidth: "440px" }}>
            <h1 className="text-white font-black mb-1" style={{ fontSize: "24px", lineHeight: 1.15 }}>
              Register Bitcovex Account
            </h1>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "32px" }}>
              Bitcovex Welcome Pack, up to{" "}
              <span style={{ color: "#a8ff3e", fontWeight: 600 }}>6,888 USDT</span> per user
            </p>

            {/* Tabs */}
            <div className="flex gap-8 mb-8" style={{ borderBottom: "1px solid #222" }}>
              {[{ key: "email", label: "Email" }, { key: "phone", label: "Phone Number" }].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="pb-3 text-sm font-semibold relative"
                  style={{ color: tab === t.key ? "#fff" : "#555", background: "none", border: "none", cursor: "pointer" }}
                >
                  {t.label}
                  {tab === t.key && (
                    <span className="absolute bottom-0 left-0 right-0 rounded-full" style={{ height: "2px", background: "#a8ff3e" }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Email / Phone */}
              {tab === "email" ? (
                <div>
                  <label style={{ display: "block", color: "#fff", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Email</label>
                  <input
                    type="email"
                    placeholder="Please enter the email address"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", color: "#fff", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Phone Number</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={{ ...inputStyle, width: "auto", minWidth: "80px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                      +1 <IconChevronDown />
                    </button>
                    <input type="tel" placeholder="Phone number" style={{ ...inputStyle }} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                </div>
              )}

              {/* Referral code */}
              <div>
                <button
                  onClick={() => setShowReferral((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", color: "#888", fontSize: "14px", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
                >
                  Referral Code (Optional)
                  <span style={{ transform: showReferral ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex" }}>
                    <IconChevronDown />
                  </span>
                </button>
                {showReferral && (
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    style={{ ...inputStyle, marginTop: "8px" }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                    value={form.referral}
                    onChange={(e) => setForm((p) => ({ ...p, referral: e.target.value }))}
                  />
                )}
              </div>

              {/* Agreement */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <button
                  onClick={() => setAgreed((v) => !v)}
                  style={{
                    marginTop: "2px",
                    flexShrink: 0,
                    width: "16px",
                    height: "16px",
                    borderRadius: "3px",
                    background: agreed ? "#a8ff3e" : "transparent",
                    border: `1.5px solid ${agreed ? "#a8ff3e" : "#444"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {agreed && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.5 }}>
                  I have read and agree to the{" "}
                  <span style={{ color: "#a8ff3e", fontWeight: 600, cursor: "pointer" }}>Bitcovex User Agreement</span>
                </p>
              </div>

              {/* Next button */}
              <button
                disabled={!agreed}
                style={{
                  width: "100%",
                  padding: "15px",
                  background: agreed ? "#a8ff3e" : "#3a4a1e",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: agreed ? "#000" : "#666",
                  cursor: agreed ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <IconGiftBtn /> Next
              </button>

              {/* Login link */}
              <p style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#a8ff3e", fontWeight: 600 }}>Log In</Link>
              </p>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#222" }} />
              <span style={{ color: "#444", fontSize: "13px" }}>Or use another method</span>
              <div style={{ flex: 1, height: "1px", background: "#222" }} />
            </div>

            {/* Social */}
            <div style={{ display: "flex", justifyContent: "center", gap: "40px" }}>
              {[
                { icon: <IconGoogle />, label: "Google" },
                { icon: <IconApple />, label: "Apple" },
                { icon: <IconTelegram />, label: "Telegram" },
              ].map((s) => (
                <button key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {s.icon}
                  </div>
                  <span style={{ color: "#666", fontSize: "12px" }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .auth-promo-wrap {
          display: flex;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .auth-promo-wrap {
            display: none;
          }
          .auth-form-wrap {
            padding: 32px 20px !important;
            align-items: flex-start !important;
            padding-top: 40px !important;
          }
        }
        @media (max-width: 480px) {
          .auth-form-wrap {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
