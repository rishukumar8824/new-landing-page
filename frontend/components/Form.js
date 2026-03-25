import { useState } from "react";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const FALLBACK_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";

export default function Form() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preference: "buy"
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!/^\d{10}$/.test(form.phone)) {
      nextErrors.phone = "Mobile number must be 10 digits.";
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
      const response = await fetch(`${API_URL}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          preference: form.preference
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit lead.");
      }

      const preferenceLabel = form.preference === "buy" ? "Buy" : "Sell";
      const message = `Hello, my name is ${form.name.trim()}\nMy phone number is ${form.phone}\nI want to ${preferenceLabel} USDT.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappNumber = data.whatsappNumber || FALLBACK_WHATSAPP;

      toast.success("Lead saved. Opening WhatsApp...");
      window.location.href = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="Enter your name"
          disabled={loading}
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
          value={form.phone}
          onChange={(event) => {
            const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 10);
            setForm((prev) => ({ ...prev, phone: onlyDigits }));
          }}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="10-digit mobile number"
          disabled={loading}
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
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          disabled={loading}
        >
          <option value="buy">Buy USDT</option>
          <option value="sell">Sell USDT</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Submitting..." : "Start WhatsApp Chat"}
      </button>
    </form>
  );
}
