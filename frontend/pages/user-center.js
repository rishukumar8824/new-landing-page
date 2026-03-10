import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { userCenterApi } from "../components/user-center/api";
import SectionSheet from "../components/user-center/SectionSheet";

function initials(value) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 1).toUpperCase() : "B";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusText(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "verified") return "Lv.1 Verified";
  if (normalized === "pending") return "Pending";
  return "Unverified";
}

function Badge({ children }) {
  return <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">{children}</span>;
}

function UserCenterRow({ icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-900 py-3 text-left"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full border border-zinc-700 text-[10px] text-zinc-300">{icon}</span>
      <span className="flex-1 text-sm text-zinc-200">{label}</span>
      {value ? <span className="max-w-[46%] truncate text-xs text-zinc-500">{value}</span> : null}
      <span className="text-zinc-600">→</span>
    </button>
  );
}

function TabSwitch({ activeTab, onChange }) {
  const tabs = [
    { key: "my-info", label: "My info" },
    { key: "preference", label: "Preference" },
    { key: "general", label: "General" }
  ];

  return (
    <div className="mt-4 flex items-center gap-4 border-b border-zinc-900 pb-2 text-xs text-zinc-500">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={activeTab === tab.key ? "font-semibold text-zinc-100" : ""}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function RowList({ rows }) {
  return (
    <div className="mt-1">
      {rows.map((row) => (
        <UserCenterRow
          key={row.key}
          icon={row.icon}
          label={row.label}
          value={row.value}
          onClick={row.onClick}
        />
      ))}
    </div>
  );
}

export default function UserCenterPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeSheet, setActiveSheet] = useState("");
  const [activeTab, setActiveTab] = useState("my-info");
  const [feeTab, setFeeTab] = useState("VIP");

  const [summary, setSummary] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [fees, setFees] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [gifts, setGifts] = useState(null);
  const [referral, setReferral] = useState(null);
  const [supportCenter, setSupportCenter] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [helpArticles, setHelpArticles] = useState([]);
  const [about, setAbout] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);

  const [profileForm, setProfileForm] = useState({ nickname: "", avatar: "" });
  const [identityForm, setIdentityForm] = useState({
    country: "",
    name: "",
    idNumberMasked: "",
    kycStatus: "pending"
  });
  const [prefForm, setPrefForm] = useState({
    language: "en",
    currency: "USD",
    theme: "dark",
    trendColors: "green-up",
    pushNotifications: true
  });
  const [addressForm, setAddressForm] = useState({ coin: "USDT", network: "TRC20", address: "", label: "" });
  const [giftForm, setGiftForm] = useState({ asset: "USDT", amount: "" });
  const [giftCode, setGiftCode] = useState("");
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    phone: "",
    email: "",
    fundCode: "",
    twofaCode: "",
    deleteConfirm: ""
  });
  const [ticketForm, setTicketForm] = useState({ subject: "", category: "general", message: "" });
  const [messageDraft, setMessageDraft] = useState("");

  async function refreshAll() {
    setLoading(true);
    try {
      const [
        meRes,
        identityRes,
        prefRes,
        feesRes,
        addressesRes,
        giftsRes,
        referralRes,
        supportRes,
        ticketsRes,
        helpRes,
        aboutRes
      ] = await Promise.all([
        userCenterApi.getMe(),
        userCenterApi.getIdentity(),
        userCenterApi.getPreferences(),
        userCenterApi.getFees(),
        userCenterApi.addresses(),
        userCenterApi.listGifts(),
        userCenterApi.referral(),
        userCenterApi.supportCenter(),
        userCenterApi.listTickets(),
        userCenterApi.helpArticles(),
        userCenterApi.about()
      ]);

      setSummary(meRes.data || null);
      setIdentity(identityRes.identity || null);
      setPreferences(prefRes.preferences || null);
      setFees(feesRes.fees || null);
      setAddresses(addressesRes.items || []);
      setGifts(giftsRes.gifts || null);
      setReferral(referralRes.referral || null);
      setSupportCenter({
        announcements: supportRes.announcements || [],
        tools: supportRes.tools || []
      });
      setTickets(ticketsRes.tickets || []);
      setHelpArticles(helpRes.items || []);
      setAbout(aboutRes.about || null);

      const profile = meRes.data?.profile || {};
      setProfileForm({ nickname: profile.nickname || "", avatar: profile.avatar || "" });

      const nextIdentity = identityRes.identity || {};
      setIdentityForm({
        country: nextIdentity.country || "",
        name: nextIdentity.name || "",
        idNumberMasked: nextIdentity.idNumberMasked || "",
        kycStatus: nextIdentity.kycStatus || "pending"
      });

      const nextPref = prefRes.preferences || {};
      setPrefForm({
        language: nextPref.language || "en",
        currency: nextPref.currency || "USD",
        theme: nextPref.theme || "dark",
        trendColors: nextPref.trendColors || "green-up",
        pushNotifications: Boolean(nextPref.pushNotifications)
      });
    } catch (error) {
      toast.error(error.message || "Failed to load User Center.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const profile = summary?.profile || {};
  const security = summary?.security || { level: "Low", methodsEnabled: 0 };

  const myInfoRows = useMemo(
    () => [
      {
        key: "profile-picture",
        icon: "◎",
        label: "Profile Picture",
        value: "",
        onClick: () => setActiveSheet("profile")
      },
      {
        key: "nickname",
        icon: "¤",
        label: "Nickname",
        value: profile.nickname || profile.maskedEmail || "",
        onClick: () => setActiveSheet("profile")
      },
      {
        key: "uid",
        icon: "◉",
        label: "UID",
        value: profile.uid || "",
        onClick: async () => {
          if (typeof window === "undefined") return;
          try {
            await navigator.clipboard.writeText(String(profile.uid || ""));
            toast.success("UID copied.");
          } catch (error) {
            toast.error("Unable to copy UID.");
          }
        }
      },
      {
        key: "identity",
        icon: "✔",
        label: "Identity Verification",
        value: statusText(identity?.kycStatus || profile.kycStatus),
        onClick: () => setActiveSheet("identity")
      },
      {
        key: "security",
        icon: "◍",
        label: "Security",
        value: "Set up 2FA Verification",
        onClick: () => setActiveSheet("security")
      },
      {
        key: "vip",
        icon: "◇",
        label: "VIP level",
        value: profile.vipLevel || "Non-VIP",
        onClick: () => setActiveSheet("vip")
      },
      {
        key: "fees",
        icon: "%",
        label: "My Fee Rates",
        value: "",
        onClick: () => setActiveSheet("fees")
      }
    ],
    [identity?.kycStatus, profile.kycStatus, profile.maskedEmail, profile.nickname, profile.uid, profile.vipLevel]
  );

  const preferenceRows = useMemo(
    () => [
      {
        key: "addresses",
        icon: "⌂",
        label: "Addresses",
        value: `${addresses.length}`,
        onClick: () => setActiveSheet("addresses")
      },
      {
        key: "preferences",
        icon: "☰",
        label: "Preferences",
        value: `${preferences?.theme || "dark"}`,
        onClick: () => setActiveSheet("preferences")
      },
      {
        key: "gift",
        icon: "✦",
        label: "Gift",
        value: "",
        onClick: () => setActiveSheet("gift")
      },
      {
        key: "referral",
        icon: "↗",
        label: "Referral",
        value: referral?.referralCode || "",
        onClick: () => setActiveSheet("referral")
      }
    ],
    [addresses.length, preferences?.theme, referral?.referralCode]
  );

  const generalRows = useMemo(
    () => [
      {
        key: "socials",
        icon: "◌",
        label: "Socials",
        value: "",
        onClick: () => setActiveSheet("socials")
      },
      {
        key: "events",
        icon: "◈",
        label: "Events",
        value: "",
        onClick: () => setActiveSheet("events")
      },
      {
        key: "support",
        icon: "◑",
        label: "Support",
        value: `${tickets.length}`,
        onClick: () => setActiveSheet("support")
      },
      {
        key: "help",
        icon: "?",
        label: "Help",
        value: `${helpArticles.length}`,
        onClick: () => setActiveSheet("help")
      },
      {
        key: "about",
        icon: "i",
        label: "About",
        value: about?.name || "Bitegit",
        onClick: () => setActiveSheet("about")
      }
    ],
    [about?.name, helpArticles.length, tickets.length]
  );

  async function submitProfile(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.updateProfile(profileForm);
      toast.success("Profile updated.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitIdentity(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.updateIdentity(identityForm);
      toast.success("Identity details saved.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runSecurityAction(action, payload) {
    setBusy(true);
    try {
      const response = await action(payload);
      if (response?.qrDataUrl) {
        toast.success("QR generated. Scroll to copy/setup from response in API logs.");
      } else {
        toast.success("Security setting updated.");
      }
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPreferences(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.updatePreferences(prefForm);
      toast.success("Preferences saved.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAddress(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.addAddress(addressForm);
      setAddressForm((prev) => ({ ...prev, address: "", label: "" }));
      toast.success("Address added.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(addressId) {
    setBusy(true);
    try {
      await userCenterApi.removeAddress(addressId);
      toast.success("Address removed.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createGift(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.createGift({ asset: giftForm.asset, amount: Number(giftForm.amount || 0) });
      setGiftForm((prev) => ({ ...prev, amount: "" }));
      toast.success("Gift created.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function claimGift(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await userCenterApi.claimGift({ giftCode });
      setGiftCode("");
      toast.success("Gift claimed.");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createTicket(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await userCenterApi.createTicket(ticketForm);
      setTicketForm({ subject: "", category: "general", message: "" });
      toast.success(`Ticket #${created.ticketId} created.`);
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openTicket(ticketId) {
    setBusy(true);
    try {
      const response = await userCenterApi.listTicketMessages(ticketId);
      setSelectedTicket(ticketId);
      setTicketMessages(response.messages || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selectedTicket) return;
    setBusy(true);
    try {
      await userCenterApi.sendTicketMessage(selectedTicket, { message: messageDraft });
      setMessageDraft("");
      await openTicket(selectedTicket);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-black text-zinc-100">Loading User Center...</main>;
  }

  const maskedEmail = profile.maskedEmail || "sum***@****";

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto w-full max-w-md px-4 pb-16 pt-5">
        <header className="mb-3 flex items-center justify-between">
          <Link href="/" className="text-lg text-zinc-300">←</Link>
          <h1 className="text-sm font-semibold text-zinc-200">User Center</h1>
          <div className="flex items-center gap-3 text-zinc-500">
            <span>◔</span>
            <span>◎</span>
          </div>
        </header>

        <section>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-zinc-800 text-sm font-bold uppercase">
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                initials(profile.nickname || profile.email)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-semibold">{maskedEmail}</div>
              <p className="text-[11px] text-zinc-500">Bitegit · Bitegit Global</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <div>
                Security level <span className="font-semibold text-red-300">{security.level}</span>
              </div>
              <span className="text-zinc-600">→</span>
            </div>
            <div className="text-[11px] text-zinc-500">At least 1 authentication method needs to be enabled.</div>
          </div>

          <TabSwitch activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "my-info" ? <RowList rows={myInfoRows} /> : null}
          {activeTab === "preference" ? <RowList rows={preferenceRows} /> : null}
          {activeTab === "general" ? <RowList rows={generalRows} /> : null}

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("bitegit_access_token");
                localStorage.removeItem("bitegit_user_email");
                window.location.href = "/";
              }
            }}
            className="mt-5 w-full rounded-full border border-zinc-700 py-2 text-sm text-zinc-200"
          >
            Log Out
          </button>
        </section>
      </div>

      <SectionSheet title="Profile Management" open={activeSheet === "profile"} onClose={() => setActiveSheet("")}>
        <form className="space-y-3" onSubmit={submitProfile}>
          <label className="block text-sm text-zinc-300">
            Nickname
            <input
              value={profileForm.nickname}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, nickname: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Profile Picture URL
            <input
              value={profileForm.avatar}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
            />
          </label>
          <div className="text-xs text-zinc-500">UID: {profile.uid || "-"}</div>
          <button disabled={busy} className="w-full rounded-xl bg-white py-2 font-semibold text-black">Save Profile</button>
        </form>
      </SectionSheet>

      <SectionSheet title="Identity Verification" open={activeSheet === "identity"} onClose={() => setActiveSheet("")}>
        <form className="space-y-3" onSubmit={submitIdentity}>
          <label className="block text-sm text-zinc-300">Country
            <input value={identityForm.country} onChange={(e) => setIdentityForm((p) => ({ ...p, country: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-300">Name
            <input value={identityForm.name} onChange={(e) => setIdentityForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-300">ID Number (masked)
            <input value={identityForm.idNumberMasked} onChange={(e) => setIdentityForm((p) => ({ ...p, idNumberMasked: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-300">KYC status
            <select value={identityForm.kycStatus} onChange={(e) => setIdentityForm((p) => ({ ...p, kycStatus: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <option value="unverified">Unverified</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
            </select>
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-white py-2 font-semibold text-black">Save Identity</button>
        </form>
      </SectionSheet>

      <SectionSheet title="Security Settings" open={activeSheet === "security"} onClose={() => setActiveSheet("")}>
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
            Enabled methods: {security.methodsEnabled} • Current level: {security.level}
          </div>

          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void runSecurityAction(userCenterApi.changePassword, { currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword }); }}>
            <h3 className="font-semibold">Change login password</h3>
            <input placeholder="Current password" type="password" value={securityForm.currentPassword} onChange={(e) => setSecurityForm((p) => ({ ...p, currentPassword: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <input placeholder="New password" type="password" value={securityForm.newPassword} onChange={(e) => setSecurityForm((p) => ({ ...p, newPassword: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Update</button>
          </form>

          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void runSecurityAction(userCenterApi.changePhone, { phone: securityForm.phone }); }}>
            <h3 className="font-semibold">Change phone number</h3>
            <input placeholder="+91..." value={securityForm.phone} onChange={(e) => setSecurityForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Update</button>
          </form>

          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void runSecurityAction(userCenterApi.changeEmail, { email: securityForm.email }); }}>
            <h3 className="font-semibold">Change email</h3>
            <input placeholder="new@email.com" value={securityForm.email} onChange={(e) => setSecurityForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Update</button>
          </form>

          <div className="space-y-2">
            <h3 className="font-semibold">Google Authenticator</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void runSecurityAction(userCenterApi.link2fa, { action: "generate" })} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Generate QR</button>
              <button type="button" disabled={busy} onClick={() => void runSecurityAction(userCenterApi.link2fa, { action: "verify", code: securityForm.twofaCode })} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Verify</button>
              <button type="button" disabled={busy} onClick={() => void runSecurityAction(userCenterApi.link2fa, { action: "disable", code: securityForm.twofaCode })} className="rounded-lg border border-zinc-700 px-4 py-2">Disable</button>
            </div>
            <input placeholder="6-digit authenticator code" value={securityForm.twofaCode} onChange={(e) => setSecurityForm((p) => ({ ...p, twofaCode: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </div>

          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void runSecurityAction(userCenterApi.setFundCode, { fundCode: securityForm.fundCode }); }}>
            <h3 className="font-semibold">Set fund code</h3>
            <input placeholder="6-digit code" value={securityForm.fundCode} onChange={(e) => setSecurityForm((p) => ({ ...p, fundCode: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Set</button>
          </form>

          <div>
            <h3 className="mb-2 font-semibold">Login history</h3>
            <button
              disabled={busy}
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await userCenterApi.loginHistory();
                  const text = (res.items || [])
                    .slice(0, 8)
                    .map((item) => `${formatDate(item.loginTime)} • ${item.device} • ${item.ip}`)
                    .join("\n") || "No login history";
                  alert(text);
                } catch (error) {
                  toast.error(error.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-lg border border-zinc-700 px-4 py-2"
            >
              View History
            </button>
          </div>

          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void runSecurityAction(userCenterApi.deleteAccount, { confirmation: securityForm.deleteConfirm }); }}>
            <h3 className="font-semibold text-red-300">Delete account</h3>
            <p className="text-xs text-zinc-500">Account deletion is permanent. Account stays locked for 50 days recovery.</p>
            <input placeholder="Type DELETE" value={securityForm.deleteConfirm} onChange={(e) => setSecurityForm((p) => ({ ...p, deleteConfirm: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
            <button disabled={busy} className="rounded-lg bg-red-500 px-4 py-2 text-white">Delete Account</button>
          </form>
        </div>
      </SectionSheet>

      <SectionSheet title="VIP" open={activeSheet === "vip"} onClose={() => setActiveSheet("")}>
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span>Current Level</span>
            <Badge>{profile.vipLevel || "Non-VIP"}</Badge>
          </div>
          <div className="text-zinc-400">Upgrade your trading volume to unlock lower maker/taker rates.</div>
        </div>
      </SectionSheet>

      <SectionSheet title="Address Management" open={activeSheet === "addresses"} onClose={() => setActiveSheet("")}>
        <form className="mb-4 space-y-2" onSubmit={submitAddress}>
          <div className="grid grid-cols-2 gap-2">
            <select value={addressForm.coin} onChange={(e) => setAddressForm((p) => ({ ...p, coin: e.target.value }))} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              {["BTC", "USDT", "ETH", "LTC", "BCH", "TRX", "DOGE", "XRP", "SOL", "BNB"].map((coin) => <option key={coin}>{coin}</option>)}
            </select>
            <input value={addressForm.network} onChange={(e) => setAddressForm((p) => ({ ...p, network: e.target.value }))} placeholder="Network" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </div>
          <input value={addressForm.address} onChange={(e) => setAddressForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          <input value={addressForm.label} onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} placeholder="Label" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Add Address</button>
        </form>

        {!addresses.length ? <p className="text-xs text-zinc-500">No withdrawal addresses added.</p> : null}
        <div className="space-y-2">
          {addresses.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs">
              <div className="font-semibold">{item.coin} - {item.network}</div>
              <div className="break-all text-zinc-300">{item.address}</div>
              <div className="mt-1 flex items-center justify-between text-zinc-500">
                <span>{item.label}</span>
                <button type="button" disabled={busy} onClick={() => void deleteAddress(item.id)} className="text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="Preferences" open={activeSheet === "preferences"} onClose={() => setActiveSheet("")}>
        <form className="space-y-3" onSubmit={submitPreferences}>
          <label className="block text-sm">Language
            <input value={prefForm.language} onChange={(e) => setPrefForm((p) => ({ ...p, language: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </label>
          <label className="block text-sm">Currency
            <input value={prefForm.currency} onChange={(e) => setPrefForm((p) => ({ ...p, currency: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </label>
          <label className="block text-sm">Theme
            <select value={prefForm.theme} onChange={(e) => setPrefForm((p) => ({ ...p, theme: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </label>
          <label className="block text-sm">Trend colors
            <select value={prefForm.trendColors} onChange={(e) => setPrefForm((p) => ({ ...p, trendColors: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <option value="green-up">green-up</option>
              <option value="red-up">red-up</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefForm.pushNotifications} onChange={(e) => setPrefForm((p) => ({ ...p, pushNotifications: e.target.checked }))} /> Push notifications
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-white py-2 font-semibold text-black">Save Preferences</button>
        </form>
      </SectionSheet>

      <SectionSheet title="Fees" open={activeSheet === "fees"} onClose={() => setActiveSheet("")}>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.keys(fees || {}).map((tab) => (
            <button key={tab} type="button" onClick={() => setFeeTab(tab)} className={`rounded-full px-3 py-1 text-sm ${feeTab === tab ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"}`}>{tab}</button>
          ))}
        </div>
        <div className="space-y-2">
          {(fees?.[feeTab] || []).map((row) => (
            <div key={`${feeTab}-${row.tierLabel}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
              <div className="font-semibold">{row.tierLabel}</div>
              <div className="mt-1 text-zinc-300">Maker: {row.makerFee} • Taker: {row.takerFee}</div>
              <div className="text-zinc-400">Withdrawal: {row.withdrawalFee} • Min: {row.minWithdrawal}</div>
            </div>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="Crypto Gift" open={activeSheet === "gift"} onClose={() => setActiveSheet("")}>
        <form onSubmit={createGift} className="space-y-2">
          <h3 className="font-semibold">Create gift</h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={giftForm.asset} onChange={(e) => setGiftForm((p) => ({ ...p, asset: e.target.value }))} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              {["USDT", "BTC", "ETH", "BNB", "SOL"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input value={giftForm.amount} onChange={(e) => setGiftForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          </div>
          <button disabled={busy} className="rounded-lg bg-zinc-100 px-4 py-2 text-black">Create</button>
        </form>

        <form onSubmit={claimGift} className="mt-5 space-y-2">
          <h3 className="font-semibold">Claim gift</h3>
          <input value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder="Gift code" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          <button disabled={busy} className="rounded-lg border border-zinc-700 px-4 py-2">Claim</button>
        </form>

        <div className="mt-5 text-sm">
          <h3 className="mb-2 font-semibold">Created gifts</h3>
          {(gifts?.created || []).slice(0, 8).map((gift) => (
            <div key={gift.id} className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              {gift.asset} {gift.amount} • {gift.giftCode} • {gift.status}
            </div>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="Referral" open={activeSheet === "referral"} onClose={() => setActiveSheet("")}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="text-xs text-zinc-400">Referral code</div>
          <div className="text-lg font-semibold">{referral?.referralCode || "-"}</div>
          <div className="mt-2 text-sm text-zinc-300">Invites: {referral?.totalInvites || 0}</div>
          <div className="text-sm text-zinc-300">Rewards: {referral?.totalRewards || 0}</div>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {(referral?.invites || []).slice(0, 20).map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              {item.referredUser} • Reward {item.rewardAmount} • {formatDate(item.createdAt)}
            </div>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="Socials" open={activeSheet === "socials"} onClose={() => setActiveSheet("")}>
        <div className="space-y-2 text-sm">
          <a href="https://x.com" target="_blank" rel="noreferrer" className="block rounded-xl border border-zinc-800 bg-zinc-900 p-3">X (Twitter)</a>
          <a href="https://t.me" target="_blank" rel="noreferrer" className="block rounded-xl border border-zinc-800 bg-zinc-900 p-3">Telegram</a>
          <a href="https://discord.com" target="_blank" rel="noreferrer" className="block rounded-xl border border-zinc-800 bg-zinc-900 p-3">Discord</a>
        </div>
      </SectionSheet>

      <SectionSheet title="Events" open={activeSheet === "events"} onClose={() => setActiveSheet("")}>
        <div className="space-y-2 text-sm">
          {(supportCenter?.announcements || []).map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="font-semibold">{item.title}</div>
              <p className="text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="Support" open={activeSheet === "support"} onClose={() => setActiveSheet("")}>
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">Announcements</h3>
          {(supportCenter?.announcements || []).map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              <div className="font-medium">{item.title}</div>
              <p className="text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>

        <form onSubmit={createTicket} className="mt-4 space-y-2">
          <h3 className="font-semibold">Create support ticket</h3>
          <input value={ticketForm.subject} onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <select value={ticketForm.category} onChange={(e) => setTicketForm((p) => ({ ...p, category: e.target.value }))} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <option value="general">general</option>
              <option value="security">security</option>
              <option value="withdrawal">withdrawal</option>
              <option value="deposit">deposit</option>
              <option value="kyc">kyc</option>
            </select>
            <button disabled={busy} className="rounded-xl bg-zinc-100 px-3 py-2 font-semibold text-black">Create Ticket</button>
          </div>
          <textarea rows={3} value={ticketForm.message} onChange={(e) => setTicketForm((p) => ({ ...p, message: e.target.value }))} placeholder="Describe issue" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2" />
        </form>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
            <h4 className="mb-2 font-semibold">Tickets</h4>
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button key={ticket.id} type="button" onClick={() => void openTicket(ticket.id)} className={`w-full rounded-lg border px-2 py-2 text-left text-xs ${selectedTicket === ticket.id ? "border-white" : "border-zinc-700"}`}>
                  #{ticket.id} • {ticket.subject}<br />{ticket.status}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
            <h4 className="mb-2 font-semibold">Live Chat</h4>
            <div className="mb-2 h-64 overflow-auto rounded-lg border border-zinc-800 bg-black p-2 text-xs">
              {ticketMessages.map((msg) => (
                <div key={msg.id} className={`mb-2 flex ${msg.senderType === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-lg px-2 py-1 ${msg.senderType === "user" ? "bg-zinc-800" : msg.senderType === "agent" ? "bg-blue-900" : "bg-emerald-900"}`}>
                    <div className="font-semibold">{msg.senderType}</div>
                    <div>{msg.message}</div>
                    <div className="text-[10px] text-zinc-400">{formatDate(msg.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Message" className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs" />
              <button disabled={busy || !selectedTicket} className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-semibold text-black">Send</button>
            </form>
          </div>
        </div>
      </SectionSheet>

      <SectionSheet title="Help Center" open={activeSheet === "help"} onClose={() => setActiveSheet("")}>
        <div className="space-y-2 text-sm">
          {helpArticles.map((article) => (
            <article key={article.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-400">{article.topic}</div>
              <h3 className="font-semibold">{article.title}</h3>
              <p className="mt-1 text-zinc-300">{article.content}</p>
            </article>
          ))}
        </div>
      </SectionSheet>

      <SectionSheet title="About" open={activeSheet === "about"} onClose={() => setActiveSheet("")}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <div>Name: {about?.name || "Bitegit"}</div>
          <div>Version: {about?.version || "1.0.0"}</div>
          <div>Description: {about?.description || "User Center"}</div>
          <div>Support: {about?.supportEmail || "support@bitegit.com"}</div>
        </div>
      </SectionSheet>
    </main>
  );
}
