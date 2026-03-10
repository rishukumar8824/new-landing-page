import Link from "next/link";
import { useEffect, useState } from "react";
import LeadForm from "../components/Form";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const token = String(localStorage.getItem("bitegit_access_token") || "").trim();
    setAuthenticated(Boolean(token));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-xl flex-col items-center justify-center">
        {!authenticated ? (
          <div className="mb-4 w-full">
            <Link
              href="/auth"
              className="flex h-12 w-full items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white transition hover:bg-black"
            >
              Log in / Sign up
            </Link>
          </div>
        ) : null}
        <section className="w-full rounded-3xl bg-white/95 p-6 shadow-soft backdrop-blur sm:p-8">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Fast Crypto Assistance
          </p>
          <h1 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            Buy or Sell USDT Instantly
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-slate-600 sm:text-base">
            Fast • Secure • Trusted Crypto Exchange
          </p>

          <div className="mt-7">
            <LeadForm />
          </div>
        </section>
      </div>
    </main>
  );
}
