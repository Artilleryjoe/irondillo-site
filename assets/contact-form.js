(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const widget = document.getElementById("turnstile-widget");
  if (!form || !status || !widget) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const clean = (value) => value.replace(/[\u0000\r]/g, "").trim();
  let turnstileReady;

  function loadTurnstile() {
    if (turnstileReady) return turnstileReady;
    turnstileReady = fetch("/api/contact-config", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("configuration unavailable");
        const config = await response.json();
        if (!config || typeof config.turnstileSiteKey !== "string" || !config.turnstileSiteKey) {
          throw new Error("configuration unavailable");
        }
        await new Promise((resolve, reject) => {
          if (window.turnstile) return resolve();
          const script = document.createElement("script");
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("verification unavailable"));
          document.head.appendChild(script);
        });
        return config.turnstileSiteKey;
      });
    return turnstileReady;
  }

  async function getTurnstileToken() {
    const sitekey = await loadTurnstile();
    return new Promise((resolve, reject) => {
      let widgetId;
      widget.textContent = "";
      widgetId = window.turnstile.render(widget, {
        sitekey,
        size: "invisible",
        execution: "execute",
        callback: resolve,
        "error-callback": () => reject(new Error("verification failed")),
        "expired-callback": () => reject(new Error("verification expired")),
      });
      window.turnstile.execute(widgetId);
    });
  }

  function responseMessage(code) {
    if (code === 429) return "Too many requests were received. Please wait a few minutes and try again.";
    if (code === 503) return "The contact form is temporarily unavailable. Please try again later or use the email alternative.";
    if (code === 502 || code >= 500) return "Your message could not be delivered right now. Please try again later or use the email alternative.";
    return "Your message was not accepted. Please check the fields and try again.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    const data = new FormData(form);
    if (clean(String(data.get("company") || ""))) {
      status.textContent = "Your message could not be submitted. Please check the form and try again.";
      return;
    }

    if (submitButton) submitButton.disabled = true;
    status.textContent = "Verifying and sending your message…";

    try {
      const turnstileToken = await getTurnstileToken();
      const body = {};
      for (const field of ["name", "email", "phone", "urgency", "message", "company"]) {
        body[field] = clean(String(data.get(field) || ""));
      }
      body.turnstileToken = turnstileToken;

      const response = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status !== 202) {
        status.textContent = responseMessage(response.status);
        return;
      }

      form.reset();
      widget.textContent = "";
      status.textContent = "Thanks—your message was accepted. We’ll be in touch soon.";
    } catch {
      status.textContent = "The contact form is temporarily unavailable. Please try again later or use the email alternative.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
