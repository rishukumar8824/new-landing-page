import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const DEFAULT_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";

export default function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preference: "buy",
    website: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formStartedAt] = useState(() => Date.now());

  const isDisabled = useMemo(() => loading || submitted, [loading, submitted]);

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!/^\d{10}$/.test(form.phone)) {
      nextErrors.phone = "Phone must be 10 digits.";
    }

    if (!["buy", "sell"].includes(form.preference)) {
      nextErrors.preference = "Please select Buy or Sell.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone,
        preference: form.preference,
        website: form.website,
        formStartedAt
      };

      const response = await fetch(`${API_BASE}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit form right now.");
      }

      const preferenceLabel = form.preference === "buy" ? "Buy" : "Sell";
      const message = `Hello, my name is ${form.name.trim()}\nMy phone number is ${form.phone}\nI want to ${preferenceLabel} USDT.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappNumber = data.whatsappNumber || DEFAULT_WHATSAPP;

      setSubmitted(true);
      toast.success("Lead submitted. Redirecting to WhatsApp...");

      setTimeout(() => {
        window.location.href = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      }, 1200);
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="Enter your name"
            disabled={isDisabled}
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Mobile Number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => {
              const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 10);
              setForm((prev) => ({ ...prev, phone: onlyDigits }));
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="10-digit mobile number"
            disabled={isDisabled}
          />
          {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
        </div>

        <div>
          <label htmlFor="preference" className="mb-1 block text-sm font-medium text-slate-700">
            Preference
          </label>
          <select
            id="preference"
            value={form.preference}
            onChange={(event) => setForm((prev) => ({ ...prev, preference: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            disabled={isDisabled}
          >
            <option value="buy">Buy USDT</option>
            <option value="sell">Sell USDT</option>
          </select>
        </div>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          />
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-start to-brand-end px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </span>
          ) : (
            "Start WhatsApp Chat"
          )}
        </button>
      </form>

      <AnimatePresence>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-slate-900/30"
          >
            <motion.div
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              className="rounded-2xl bg-white p-6 text-center shadow-soft"
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="text-sm font-semibold text-slate-800">Success! Opening WhatsApp...</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
