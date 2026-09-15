(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

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

    const body = new URLSearchParams();
    data.forEach((value, key) => body.append(key, clean(String(value))));

    if (submitButton) submitButton.disabled = true;
    status.textContent = "Sending your message…";

    try {
      const ajaxAction = new URL(form.action);
      ajaxAction.pathname = `/ajax${ajaxAction.pathname}`;

      const response = await fetch(ajaxAction, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        status.textContent = response.status >= 400 && response.status < 500
          ? "Your message was not accepted. Please check the fields and try again."
          : "The form service is temporarily unavailable. Please try again or use the email alternative.";
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch {
        status.textContent = "The form service could not confirm delivery. Please try again or use the email alternative.";
        return;
      }

      if (result.success !== true && result.success !== "true") {
        status.textContent = "The form service could not confirm delivery. Please try again or use the email alternative.";
        return;
      }

      form.reset();
      status.textContent = "Thanks—your message was sent successfully. We’ll be in touch soon.";
    } catch {
      status.textContent = "We couldn’t reach the form service. Check your connection and try again, or use the email alternative.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
