/**
 * db-connect.js
 * Connects courses-workspace-demo.html Contact Information panel
 * to live data from daytona_lms dbo.User via local API + ngrok tunnel.
 *
 * Add just before </body> in courses-workspace-demo.html:
 *   <script src="db-connect.js"></script>
 */

/* ── ✏️  Your ngrok URL — update this each time you restart ngrok ── */
const DB_API = "https://pentatomic-consecutively-sherri.ngrok-free.dev";
/* ──────────────────────────────────────────────────────────────── */

const AVATAR_SVG = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
const EMAIL_SVG  = `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;

(async function () {
  "use strict";

  /* ── Fetch helper ─────────────────────────────────────────── */
  async function get(path) {
    // Adding query param avoids the ngrok browser warning without a custom header
    const res = await fetch(DB_API + path + "?bypass=1");
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  /* ── Status badge ─────────────────────────────────────────── */
  function showBadge(ok) {
    let b = document.getElementById("db-status-badge");
    if (!b) {
      b = document.createElement("div");
      b.id = "db-status-badge";
      b.style.cssText =
        "position:fixed;bottom:16px;right:16px;z-index:9999;" +
        "padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;" +
        "color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:inherit;";
      document.body.appendChild(b);
    }
    b.style.background = ok ? "#16a34a" : "#dc2626";
    b.textContent = ok ? "🟢 DB Connected — daytona_lms" : "🔴 DB Offline — static data";
  }

  /* ── Build instructor card (matches existing .contact-card.instructor) ── */
  function instructorCard(u) {
    return `
      <div class="contact-card instructor">
        <div class="contact-avatar instructor-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <p class="role">Instructor</p>
          <h4>${u.firstName} ${u.lastName}</h4>
          <p><a href="mailto:${u.email}">${u.email}</a></p>
        </div>
      </div>`;
  }

  /* ── Build student card (matches existing .contact-card) ────── */
  function studentCard(u) {
    const fullName = `${u.firstName} ${u.lastName}`;
    const mailto   = `https://outlook.office365.com/mail/deeplink/compose?to=${encodeURIComponent(u.email)}`;
    return `
      <div class="contact-card">
        <div class="contact-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <p class="role">Student</p>
          <h4>${fullName}</h4>
          <a href="${mailto}" target="_blank" class="email-icon-link" title="Email ${fullName}">
            ${EMAIL_SVG}<span class="email-label">email</span>
          </a>
        </div>
      </div>`;
  }

  /* ── Admin card ─────────────────────────────────────────────── */
  function adminCard(u) {
    return `
      <div class="contact-card instructor">
        <div class="contact-avatar instructor-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <p class="role">Admin</p>
          <h4>${u.firstName} ${u.lastName}</h4>
          <p><a href="mailto:${u.email}">${u.email}</a></p>
        </div>
      </div>`;
  }

  /* ── Patch the contacts grid ────────────────────────────────── */
  function patchGrid(users) {
    const grid = document.querySelector(".contacts-grid");
    if (!grid) { console.warn("db-connect: .contacts-grid not found"); return; }

    const active = users.filter(u => u.isActive);

    const cards = active.map(u => {
      if (u.role === "INSTRUCTOR") return instructorCard(u);
      if (u.role === "ADMIN")      return adminCard(u);
      return studentCard(u);
    }).join("");

    grid.innerHTML = cards;
    console.log(`✅ Contacts grid updated — ${active.length} users from daytona_lms`);
  }

  /* ── Main ───────────────────────────────────────────────────── */
  try {
    await get("/api/health");
    const users = await get("/api/users");
    patchGrid(users);
    showBadge(true);
  } catch (err) {
    console.warn("db-connect: API unreachable →", err.message);
    showBadge(false);
  }

})();
