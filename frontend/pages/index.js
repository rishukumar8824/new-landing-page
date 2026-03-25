import Form from "../components/Form";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto flex min-h-[85vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            Buy or Sell USDT Instantly
          </h1>
          <p className="mt-3 text-center text-sm text-slate-600 sm:text-base">
            Fast • Secure • Trusted Crypto Exchange
          </p>

          <div className="mt-8">
            <Form />
          </div>
        </section>
      </div>
    </main>
  );
}
