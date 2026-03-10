import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import CaptchaModal from "../components/auth/CaptchaModal";
import SocialLoginRow from "../components/auth/SocialLoginRow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const GEETEST_CAPTCHA_ID = process.env.NEXT_PUBLIC_GEETEST_CAPTCHA_ID || "";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form");
  const [busy, setBusy] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const title = useMemo(() => (mode === "login" ? "Welcome back!" : "Welcome to Bitegit"), [mode]);
  const canProceed = useMemo(() => {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      return false;
    }
    if (mode === "signup" && !acceptedTerms) {
      return false;
    }
    return true;
  }, [acceptedTerms, email, mode]);

  async function beginOtpSend(geetestPayload) {
    const normalizedEmail = normalizeEmail(email);

    const response = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        referralCode: referralCode.trim() || undefined,
        geetest: geetestPayload
      })
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to send OTP.");
    }

    setStep("otp");
    toast.success("Verification code sent to your email.");
  }

  async function onNextClick(event) {
    event.preventDefault();

    if (!canProceed) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setCaptchaOpen(true);
  }

  async function onCaptchaSuccess(validatePayload) {
    if (!validatePayload) {
      toast.error("Captcha verification failed.");
      return;
    }

    setBusy(true);
    setCaptchaOpen(false);
    try {
      await beginOtpSend(validatePayload);
    } catch (error) {
      toast.error(error.message || "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(event) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const code = otp.replace(/\D/g, "").slice(0, 6);

    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter valid 6-digit OTP.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          otp: code
        })
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "OTP verification failed.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("bitegit_access_token", data.accessToken || "");
        localStorage.setItem("bitegit_user_email", normalizedEmail);
      }

      toast.success("Logged in successfully.");
      window.location.href = "/";
    } catch (error) {
      toast.error(error.message || "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto flex min-h-[90vh] w-full max-w-xl flex-col">
        <div className="mb-14 flex items-center justify-between">
          <Link href="/" className="text-3xl font-black tracking-[0.2em]">BITEGIT</Link>
          <div className="text-zinc-500">Secure Access</div>
        </div>

        {step === "form" ? (
          <form onSubmit={onNextClick} className="flex-1">
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">{title}</h1>

            <div className="mt-12 space-y-6">
              <div>
                <label className="mb-3 block text-2xl font-semibold">Email / Phone number</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email/Phone number"
                  className="h-16 w-full rounded-3xl border border-zinc-800 bg-zinc-900 px-5 text-2xl text-zinc-200 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-600"
                />
              </div>

              {mode === "signup" ? (
                <>
                  <div>
                    <label className="mb-3 block text-2xl font-semibold">Referral code (optional)</label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(event) => setReferralCode(event.target.value)}
                      placeholder="Referral code"
                      className="h-16 w-full rounded-3xl border border-zinc-800 bg-zinc-900 px-5 text-2xl text-zinc-200 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-600"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 text-lg text-zinc-300">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-900"
                    />
                    <span>
                      I have read and agree to the Bitegit <span className="font-semibold text-zinc-100">User Agreement</span>.
                    </span>
                  </label>
                </>
              ) : null}

              <button
                type="submit"
                disabled={!canProceed || busy}
                className="h-16 w-full rounded-full bg-zinc-100 text-3xl font-bold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Please wait..." : "Next"}
              </button>

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="block w-full py-2 text-center text-3xl font-semibold text-zinc-100"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </div>

            <SocialLoginRow />
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="flex-1">
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">OTP Verification</h1>
            <p className="mt-5 text-lg text-zinc-400">Enter the 6-digit code sent to {normalizeEmail(email)}.</p>

            <div className="mt-10 space-y-5">
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                maxLength={6}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                className="h-16 w-full rounded-3xl border border-zinc-800 bg-zinc-900 px-5 text-3xl tracking-[0.3em] text-zinc-200 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-600"
              />

              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="h-16 w-full rounded-full bg-zinc-100 text-3xl font-bold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                }}
                className="block w-full py-2 text-center text-xl font-semibold text-zinc-300"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>

      <CaptchaModal
        open={captchaOpen}
        captchaId={GEETEST_CAPTCHA_ID}
        onClose={() => setCaptchaOpen(false)}
        onSuccess={onCaptchaSuccess}
      />
    </main>
  );
}
