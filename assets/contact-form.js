(() => {
  "use strict";

  const endpoint = "https://formspree.io/f/xldnbpdg";
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form || !status) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const clean = (value) => value.replace(/[\u0000\r]/g, "").trim();

  function responseMessage(code) {
    if (code === 429) return "Too many requests were received. Please wait a few minutes and try again.";
    if (code >= 500) return "The form service is temporarily unavailable. Please try again later or use the email alternative.";
    return "Your message was not accepted. Please check the fields and try again.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      status.textContent = "Please check the highlighted fields before continuing.";
      return;
    }

    const data = new FormData(form);
    if (clean(String(data.get("_gotcha") || ""))) {
      status.textContent = "Your message could not be submitted. Please check the form and try again.";
      return;
    }

    if (submitButton) submitButton.disabled = true;
    status.textContent = "Sending your message…";

    try {
      const body = new FormData();
      for (const field of ["name", "email", "phone", "urgency", "message", "_gotcha"]) {
        body.append(field, clean(String(data.get(field) || "")));
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
      });
      if (!response.ok) {
        status.textContent = responseMessage(response.status);
        return;
      }

      form.reset();
      status.textContent = "Thanks—your message was sent successfully. We’ll be in touch soon.";
    } catch {
      status.textContent = "The contact form is temporarily unavailable. Please try again later or use the email alternative.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
