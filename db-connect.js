/**
 * db-connect.js
 * Drop-in script that connects courses-workspace-demo.html to the
 * local daytona_lms SQL Server database via ngrok tunnel.
 *
 * HOW TO USE:
 *  1. Start your API:  npm start  (in the Connections folder)
 *  2. Start ngrok:     ngrok http 3000
 *  3. Copy the https URL ngrok gives you and paste it below
 *  4. Add this to your courses-workspace-demo.html just before </body>:
 *     <script src="db-connect.js"></script>
 */

/* ── ✏️  PASTE YOUR NGROK URL HERE (update each time you restart ngrok) ── */
const DB_API = "https://pentatomic-consecutively-sherri.ngrok-free.dev";
/* ─────────────────────────────────────────────────────────────────────── */

(async function () {
  "use strict";

  /* ── Helpers ────────────────────────────────────────────────── */
  async function get(path) {
    const res = await fetch(DB_API + path, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
  }

  function badge(text, color) {
    const b = document.createElement("span");
    b.style.cssText =
      `display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;
       font-weight:700;background:${color};color:#fff;margin-left:8px;
       vertical-align:middle;letter-spacing:.3px`;
    b.textContent = text;
    return b;
  }

  /* ── Status indicator in page header ───────────────────────── */
  function showStatus(connected) {
    const existing = document.getElementById("db-status-badge");
    if (existing) existing.remove();

    const b = document.createElement("div");
    b.id = "db-status-badge";
    b.style.cssText =
      `position:fixed;bottom:16px;right:16px;z-index:9999;
       padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;
       color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:inherit;
       background:${connected ? "#16a34a" : "#dc2626"}`;
    b.textContent = connected
      ? "🟢 DB Connected — daytona_lms"
      : "🔴 DB Offline — demo data";
    document.body.appendChild(b);
  }

  /* ── Patch Communications panel (Contact Information) ───────── *
   *  Replaces hard-coded instructor/student names & emails with   *
   *  real data from dbo.User                                      *
   * ────────────────────────────────────────────────────────────── */
  function patchContacts(users) {
    // Find the Contact Information section inside the Communications modal
    const contactSection = [...document.querySelectorAll("h3, h4, strong")]
      .find(el => el.textContent.trim() === "Contact Information");
    if (!contactSection) return;

    const container = contactSection.closest("div, section, .modal-body, [class*='contact']")
      || contactSection.parentElement;

    // Build new contact list
    const instructor = users.find(u => u.role === "INSTRUCTOR");
    const students   = users.filter(u => u.role === "STUDENT");

    let html = `<h3 style="font-size:14px;font-weight:700;margin:12px 0 10px">Contact Information</h3>`;

    if (instructor) {
      html += `
        <div style="margin-bottom:12px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px">Instructor</div>
          <div style="font-weight:700;font-size:13.5px;margin-top:2px">
            ${instructor.firstName} ${instructor.lastName}
            <span style="display:inline-block;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;margin-left:6px">INSTRUCTOR</span>
          </div>
          <a href="mailto:${instructor.email}" style="font-size:12px;color:#2563eb">${instructor.email}</a>
        </div>`;
    }

    students.forEach(s => {
      html += `
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px">Student</div>
          <div style="font-weight:600;font-size:13px;margin-top:2px">${s.firstName} ${s.lastName}</div>
          <a href="mailto:${s.email}" style="font-size:12px;color:#2563eb">${s.email}</a>
        </div>`;
    });

    // Replace existing contact info block if found, otherwise append
    const existingContacts = container.querySelector(".db-contacts");
    if (existingContacts) {
      existingContacts.innerHTML = html;
    } else {
      // Try to replace the parent section
      const parent = contactSection.parentElement;
      const wrapper = document.createElement("div");
      wrapper.className = "db-contacts";
      wrapper.innerHTML = html;
      // Insert after the h3
      contactSection.replaceWith(wrapper);
    }

    console.log(`✅ Contacts patched with ${users.length} users from DB`);
  }

  /* ── Patch course data anywhere it appears ──────────────────── */
  function patchCourses(courses) {
    // Look for any element that has "Course" heading inside the sidebar or main
    const courseSection = document.getElementById("db-courses-section");
    if (!courseSection) return; // only runs if you add id="db-courses-section" to an element

    courseSection.innerHTML = courses.map(c => `
      <div style="padding:10px 0;border-bottom:1px solid #f1f3f5">
        <div style="font-weight:700;font-size:13px">${c.title}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${c.instructorName || "—"}</div>
        ${c.description ? `<div style="font-size:12px;color:#374151;margin-top:4px">${c.description}</div>` : ""}
      </div>
    `).join("");
  }

  /* ── Live Users Table  (inject into page if #db-users-table exists) ── */
  function patchUsersTable(users) {
    const target = document.getElementById("db-users-table");
    if (!target) return;

    const roleBadge = r => ({
      ADMIN:      `<span style="background:#fee2e2;color:#991b1b;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:700">ADMIN</span>`,
      INSTRUCTOR: `<span style="background:#dbeafe;color:#1e40af;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:700">INSTRUCTOR</span>`,
      STUDENT:    `<span style="background:#d1fae5;color:#065f46;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:700">STUDENT</span>`,
    }[r] || r);

    target.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Name</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Email</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Role</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:9px 12px;color:#9ca3af">${u.userId}</td>
              <td style="padding:9px 12px;font-weight:600">${u.firstName} ${u.lastName}</td>
              <td style="padding:9px 12px;font-size:12.5px;color:#374151">${u.email}</td>
              <td style="padding:9px 12px">${roleBadge(u.role)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  /* ── Main ───────────────────────────────────────────────────── */
  try {
    // Check API_BASE is set
    if (DB_API.includes("XXXX")) {
      console.warn("⚠️ db-connect.js: Update DB_API with your ngrok URL");
      showStatus(false);
      return;
    }

    // Health check
    await get("/api/health");

    // Fetch data in parallel
    const [users, courses] = await Promise.all([
      get("/api/users").catch(() => []),
      get("/api/courses").catch(() => []),
    ]);

    // Patch the page
    patchContacts(users);
    patchCourses(courses);
    patchUsersTable(users);
    showStatus(true);

    console.log(`✅ daytona_lms connected — ${users.length} users, ${courses.length} courses`);

  } catch (err) {
    console.warn("⚠️ db-connect.js: Could not reach API →", err.message);
    showStatus(false);
  }

})();
