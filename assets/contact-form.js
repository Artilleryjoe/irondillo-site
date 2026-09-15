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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    const token = window.turnstile?.getResponse(widgetId);
    if (!token) {
      status.textContent = "Please complete the verification challenge.";
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

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error();
      form.reset();
      window.turnstile.reset(widgetId);
      status.textContent = "Thanks. Your message was sent.";
    } catch {
      window.turnstile.reset(widgetId);
      status.textContent = "We could not send your message. Please try again later or email us directly.";
    } finally {
      button.disabled = false;
    }
  });
})();
