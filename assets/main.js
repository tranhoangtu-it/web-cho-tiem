// Shared behaviour for every demo site:
// - mobile menu toggle
// - call / Zalo links built from <body data-phone>
// - booking form that turns the customer's answers into a Zalo message (no server, no cost)
// - scroll reveal + footer year
(() => {
  const root = document.documentElement;
  const body = document.body;
  const phone = (body.dataset.phone || "").replace(/\D/g, "");
  const business = body.dataset.business || "";
  // Accepts Vietnamese (0xxxxxxxxx) and international (+61..., +49...) numbers once spaces/dashes are stripped.
  const PHONE_PATTERN = /^\+?\d{8,15}$/;
  // Form messages follow the page language (bilingual pages set <html data-lang="en|vi">).
  const MESSAGES = {
    vi: {
      nameMissing: "Bạn vui lòng nhập tên.",
      phoneInvalid: "Số điện thoại chưa đúng.",
      copied: "Đã sao chép nội dung đặt lịch. Zalo đang mở — bạn chỉ cần dán và bấm gửi.",
      notCopied: "Zalo đang mở — bạn sao chép nội dung bên dưới rồi dán vào khung chat nhé.",
    },
    en: {
      nameMissing: "Please enter your name.",
      phoneInvalid: "Please enter a valid phone number.",
      copied: "Booking details copied. A chat window is opening — just paste and send.",
      notCopied: "A chat window is opening — copy the details below and paste them in.",
    },
  };
  const t = (key) => (MESSAGES[root.dataset.lang] || MESSAGES.vi)[key];

  root.classList.add("js");

  setupNav();
  setupContactLinks();
  setupBookingForm();
  setupReveal();

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  function setupNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function setupContactLinks() {
    if (!phone) return;
    document.querySelectorAll("[data-call]").forEach((a) => { a.href = `tel:${phone}`; });
    document.querySelectorAll("[data-zalo]").forEach((a) => {
      a.href = `https://zalo.me/${phone}`;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  function setupBookingForm() {
    const form = document.querySelector("[data-booking]");
    if (!form) return;
    const status = form.querySelector("[data-status]");
    const fallback = form.querySelector("[data-fallback]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = validate(form);
      if (error) {
        showStatus(status, "error", error);
        return;
      }

      const message = buildMessage(form);
      notifyTelegram(form, message);
      const copied = await copyText(message);
      if (fallback) {
        fallback.hidden = copied;
        fallback.textContent = copied ? "" : message;
      }
      showStatus(status, "ok", t(copied ? "copied" : "notCopied"));
      if (phone) window.open(`https://zalo.me/${phone}`, "_blank", "noopener");
    });
  }

  function notifyTelegram(form, message) {
    try {
      const payload = {
        business,
        page_url: window.location.href,
        name: (form.elements.namedItem("name")?.value || "").trim(),
        phone: (form.elements.namedItem("phone")?.value || "").trim(),
        message,
        website_hp: (form.elements.namedItem("website_hp")?.value || "").trim(),
      };
      fetch("/.netlify/functions/lead_notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Never block the primary booking flow if offline or local preview
    }
  }

  function validate(form) {
    const name = form.elements.namedItem("name");
    const tel = form.elements.namedItem("phone");
    if (name && !name.value.trim()) return t("nameMissing");
    if (tel && !PHONE_PATTERN.test(tel.value.replace(/[\s().-]/g, ""))) return t("phoneInvalid");
    return "";
  }

  function buildMessage(form) {
    const lines = [`Đặt lịch — ${business}`];
    form.querySelectorAll("[name]").forEach((field) => {
      const value = field.value.trim();
      if (!value) return;
      const label = field.dataset.label || field.name;
      lines.push(`${label}: ${value}`);
    });
    return lines.join("\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function showStatus(el, state, text) {
    if (!el) return;
    el.dataset.state = state;
    el.textContent = text;
  }

  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    items.forEach((el) => observer.observe(el));
  }
})();
