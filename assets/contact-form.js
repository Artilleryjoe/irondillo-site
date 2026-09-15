(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const button = form?.querySelector('button[type="submit"]');
  let widgetId;

  if (!form || !status || !button) return;

  window.onTurnstileLoad = async () => {
    try {
      const response = await fetch("/api/contact-config", { credentials: "same-origin" });
      if (!response.ok) throw new Error();
      const config = await response.json();
      widgetId = window.turnstile.render("#turnstile-widget", { sitekey: config.turnstileSiteKey });
      button.disabled = false;
    } catch {
      status.textContent = "The form is temporarily unavailable. Please email us directly.";
    }
  };

  if (!form || !status) return;

  const clean = (value) => value.replace(/[\u0000\r]/g, "").trim();

  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    const data = new FormData(form);

    // Do not send automated submissions that fill the hidden honeypot.
    if (clean(String(data.get("_honey") || ""))) {
      status.textContent = "Your message could not be submitted. Please check the form and try again.";
      return;
    }

    button.disabled = true;
    status.textContent = "Sending…";
    const formData = new FormData(form);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      urgency: formData.get("urgency"),
      message: formData.get("message"),
      company: formData.get("company"),
      turnstileToken: token,
    };

    status.textContent = "Transferring your details to your email app to open a draft…";
    window.location.assign(mailto);
  });
})();
