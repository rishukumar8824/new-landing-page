const iconClass = "h-7 w-7";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9a6 6 0 1 1 0-12c2.3 0 3.8 1 4.7 1.8l3.2-3.1C18 2.9 15.3 2 12 2a10 10 0 1 0 0 20c5.8 0 9.7-4.1 9.7-9.8 0-.7-.1-1.3-.2-2z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
      <path fill="#5AA8E8" d="M21.5 4.7 18.2 20c-.2 1-.8 1.2-1.6.8l-4.3-3.2-2.1 2c-.2.2-.4.4-.8.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.5-.2l-10.1 6.4-4.4-1.4c-.9-.3-1-.9.2-1.3l17-6.5c.8-.3 1.5.2 1.2 1.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
      <path fill="#fff" d="M16.6 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.8.8-3.6.8s-2-.8-3.3-.8c-1.7 0-3.3 1-4.2 2.5-1.8 3.2-.5 7.9 1.3 10.6.9 1.3 1.9 2.8 3.3 2.7 1.3-.1 1.8-.8 3.4-.8s2.1.8 3.5.8c1.4 0 2.4-1.3 3.3-2.6 1-1.5 1.4-3 1.4-3.1-.1 0-2.7-1-2.7-4.7zm-2.4-7c.7-.8 1.2-2 1-3.1-1 .1-2.2.7-2.9 1.5-.7.8-1.3 2-1.1 3.1 1.1.1 2.2-.6 3-1.5z"/>
    </svg>
  );
}

const socialProviders = [
  { key: "google", icon: GoogleIcon, label: "Google" },
  { key: "telegram", icon: TelegramIcon, label: "Telegram" },
  { key: "apple", icon: AppleIcon, label: "Apple" }
];

export default function SocialLoginRow() {
  return (
    <div className="mt-14">
      <div className="flex items-center gap-4 text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-lg">Or</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        {socialProviders.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900/90 ring-1 ring-zinc-800 transition hover:bg-zinc-800"
            aria-label={label}
            title={label}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
