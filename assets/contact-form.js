(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  if (!form || !status) return;

  const clean = (value) => value.replace(/[\u0000\r]/g, "").trim();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    const data = new FormData(form);

    // Silently discard automated submissions that fill the hidden honeypot.
    if (clean(String(data.get("company") || ""))) {
      form.reset();
      status.textContent = "Thanks. Your message is ready for review.";
      return;
    }

    const name = clean(String(data.get("name") || ""));
    const email = clean(String(data.get("email") || ""));
    const phone = clean(String(data.get("phone") || "")) || "Not provided";
    const urgency = clean(String(data.get("urgency") || "General question"));
    const message = clean(String(data.get("message") || ""));
    const body = [
      `Name: ${name}`,
      `Reply email: ${email}`,
      `Phone: ${phone}`,
      `Urgency: ${urgency}`,
      "",
      "How can we help?",
      message,
    ].join("\n");
    const mailto = `mailto:contact@irondillo.com?subject=${encodeURIComponent("New Iron Dillo contact request")}&body=${encodeURIComponent(body)}`;

    status.textContent = "Opening a private draft in your email app…";
    window.location.assign(mailto);
  });
})();
