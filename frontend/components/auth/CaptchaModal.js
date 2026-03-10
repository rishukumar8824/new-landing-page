import { useEffect, useMemo, useRef, useState } from "react";

let geetestScriptPromise = null;

function loadGeetestScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser environment is required."));
  }

  if (window.initGeetest4) {
    return Promise.resolve();
  }

  if (geetestScriptPromise) {
    return geetestScriptPromise;
  }

  geetestScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.geetest.com/v4/gt4.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Geetest script."));
    document.body.appendChild(script);
  });

  return geetestScriptPromise;
}

export default function CaptchaModal({ open, captchaId, onSuccess, onClose }) {
  const [error, setError] = useState("");
  const rootId = useMemo(() => `geetest-root-${Math.random().toString(16).slice(2)}`, []);
  const captchaRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let disposed = false;

    async function boot() {
      try {
        if (!captchaId) {
          throw new Error("Captcha ID is missing. Set NEXT_PUBLIC_GEETEST_CAPTCHA_ID.");
        }

        await loadGeetestScript();

        if (disposed) {
          return;
        }

        window.initGeetest4(
          {
            captchaId,
            product: "bind",
            language: "en"
          },
          (captchaObj) => {
            if (disposed) {
              captchaObj.destroy();
              return;
            }

            captchaRef.current = captchaObj;
            captchaObj.appendTo(`#${rootId}`);

            captchaObj.onSuccess(() => {
              const validate = captchaObj.getValidate();
              onSuccess(validate || null);
            });

            captchaObj.onError(() => {
              setError("Captcha failed. Please refresh and try again.");
            });
          }
        );
      } catch (err) {
        setError(err.message || "Unable to initialize captcha.");
      }
    }

    void boot();

    return () => {
      disposed = true;
      if (captchaRef.current && typeof captchaRef.current.destroy === "function") {
        captchaRef.current.destroy();
      }
      captchaRef.current = null;
    };
  }, [captchaId, onSuccess, open, rootId]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Security Verification</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">Complete Geetest challenge to continue.</p>
        <div id={rootId} className="min-h-[320px] rounded-2xl border border-zinc-800 bg-zinc-900 p-2" />

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
