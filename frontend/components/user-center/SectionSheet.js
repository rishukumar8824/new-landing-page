export default function SectionSheet({ title, open, onClose, children }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close"
      />
      <section className="relative z-10 max-h-[90vh] w-full overflow-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 px-5 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded bg-zinc-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
