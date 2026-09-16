(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const turnstileContainer = document.getElementById("contact-turnstile");
  if (!form || !status || !turnstileContainer) return;

  const fields = form.querySelector("[data-contact-fields]");
  if (!fields) return;
  fields.disabled = false;
  const submitButton = form.querySelector('button[type="submit"]');
  const clean = (value) => value.replace(/[\u0000\r]/g, "").trim();
  let submitting = false;
  let widgetId;
  let tokenRequest;

  function responseMessage(code) {
    if (code === 400) return "Your message was not accepted. Please check the fields and complete the verification again.";
    if (code === 403) return "Your request could not be verified. Please refresh the page and try again.";
    if (code === 415) return "The form could not be submitted. Please refresh the page and try again.";
    if (code === 429) return "Too many requests were received. Please wait a few minutes and try again.";
    if (code === 502 || code === 503) return "The form service is temporarily unavailable. Please try again later or use the email alternative.";
    return "Your message was not accepted. Please check the fields and try again.";
  }

  const turnstileReady = (async () => {
    const response = await fetch("/api/contact-config", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Contact verification unavailable");
    const config = await response.json();
    if (!config.turnstileSiteKey || !window.turnstile) throw new Error("Contact verification unavailable");

    await new Promise((resolve) => window.turnstile.ready(resolve));
    widgetId = window.turnstile.render(turnstileContainer, {
      sitekey: config.turnstileSiteKey,
      execution: "execute",
      appearance: "interaction-only",
      callback(token) {
        tokenRequest?.resolve(token);
        tokenRequest = undefined;
      },
      "error-callback"() {
        tokenRequest?.reject(new Error("Contact verification failed"));
        tokenRequest = undefined;
      },
      "expired-callback"() {
        tokenRequest?.reject(new Error("Contact verification expired"));
        tokenRequest = undefined;
      },
    });
    return widgetId;
  })();

  async function requestTurnstileToken() {
    const id = await turnstileReady;
    window.turnstile.reset(id);
    const token = new Promise((resolve, reject) => { tokenRequest = { resolve, reject }; });
    window.turnstile.execute(id);
    return token;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    submitting = true;
    if (submitButton) submitButton.disabled = true;
    status.textContent = "Verifying and sending your message…";

    try {
      const data = new FormData(form);
      const body = {};
      for (const field of ["name", "email", "phone", "urgency", "message", "company"]) {
        body[field] = clean(String(data.get(field) || ""));
      }
      body.turnstileToken = await requestTurnstileToken();

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status !== 202) {
        status.textContent = responseMessage(response.status);
        return;
      }

      form.reset();
      status.textContent = "Thanks—your message was sent successfully. We’ll be in touch soon.";
    } catch {
      status.textContent = "The contact form is temporarily unavailable. Please try again later or use the email alternative.";
    } finally {
      tokenRequest = undefined;
      if (widgetId !== undefined && window.turnstile) window.turnstile.reset(widgetId);
      submitting = false;
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
