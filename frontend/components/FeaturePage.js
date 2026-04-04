import Link from "next/link";

function FeatureLogo() {
  return (
    <div className="feature-logo">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#a8ff3e" strokeWidth="2.5" />
        <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#a8ff3e" fontFamily="Arial">
          M
        </text>
      </svg>
      <span>
        MGBX<span>✕</span>
      </span>
      <style jsx>{`
        .feature-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .feature-logo span span {
          color: #a8ff3e;
        }
      `}</style>
    </div>
  );
}

export default function FeaturePage({
  eyebrow,
  title,
  description,
  points = [],
  ctaLabel = "Open Market",
  ctaHref = "/market",
}) {
  return (
    <div className="feature-page">
      <header className="feature-header">
        <Link href="/" className="feature-home-link">
          <FeatureLogo />
        </Link>
        <div className="feature-actions">
          <Link href="/login" className="feature-ghost">Log In</Link>
          <Link href="/register" className="feature-primary">Register</Link>
        </div>
      </header>

      <main className="feature-main">
        <section className="feature-hero">
          <p className="feature-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="feature-copy">{description}</p>

          <div className="feature-cta-row">
            <Link href={ctaHref} className="feature-primary large">{ctaLabel}</Link>
            <Link href="/" className="feature-ghost large">Back Home</Link>
          </div>
        </section>

        <section className="feature-card">
          <h2>Inside This Section</h2>
          <div className="feature-points">
            {points.map((point) => (
              <div key={point} className="feature-point">{point}</div>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .feature-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(168, 255, 62, 0.14), transparent 24%),
            linear-gradient(180deg, #070707 0%, #0a0a0f 100%);
          color: #fff;
        }

        .feature-header {
          max-width: 1200px;
          margin: 0 auto;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .feature-home-link {
          text-decoration: none;
        }

        .feature-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-primary,
        .feature-ghost {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 800;
          font-size: 14px;
        }

        .feature-primary {
          color: #111;
          background: #a8ff3e;
          box-shadow: 0 10px 24px rgba(168, 255, 62, 0.18);
        }

        .feature-ghost {
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
        }

        .feature-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px 64px;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 24px;
        }

        .feature-hero,
        .feature-card {
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
        }

        .feature-hero {
          padding: 42px;
        }

        .feature-card {
          padding: 30px;
        }

        .feature-eyebrow {
          margin: 0 0 14px;
          color: #a8ff3e;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 12px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: clamp(40px, 7vw, 68px);
          line-height: 0.96;
          letter-spacing: -0.05em;
        }

        .feature-copy {
          margin: 22px 0 0;
          max-width: 640px;
          color: #98a2b3;
          font-size: 18px;
          line-height: 1.7;
        }

        .feature-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 28px;
        }

        .feature-primary.large,
        .feature-ghost.large {
          min-height: 48px;
          padding: 0 22px;
          font-size: 15px;
        }

        .feature-card h2 {
          margin: 0 0 18px;
          font-size: 22px;
        }

        .feature-points {
          display: grid;
          gap: 12px;
        }

        .feature-point {
          padding: 14px 16px;
          border-radius: 16px;
          color: #d0d5dd;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }

        @media (max-width: 900px) {
          .feature-main {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .feature-header {
            padding: 16px;
          }

          .feature-actions {
            gap: 8px;
          }

          .feature-primary,
          .feature-ghost {
            min-height: 38px;
            padding: 0 14px;
            font-size: 13px;
          }

          .feature-main {
            padding: 20px 16px 44px;
            gap: 18px;
          }

          .feature-hero,
          .feature-card {
            border-radius: 22px;
          }

          .feature-hero {
            padding: 26px 20px;
          }

          .feature-card {
            padding: 22px 18px;
          }

          .feature-copy {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
