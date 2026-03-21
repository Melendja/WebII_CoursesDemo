/**
 * db-connect.js
 * Connects courses-workspace-demo.html to live data from
 * daytona_lms via the Render-hosted API.
 *
 * Add just before </body> in courses-workspace-demo.html:
 *   <script src="db-connect.js"></script>
 */

/* ── API Base URL (Render permanent URL) ────────────────────── */
const DB_API = "https://daytona-lms-api.onrender.com";
/* ──────────────────────────────────────────────────────────── */

const AVATAR_SVG = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
const EMAIL_SVG  = `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;

(async function () {
  "use strict";

  /* ── Fetch helper ─────────────────────────────────────────── */
  async function get(path) {
    const res = await fetch(DB_API + path + "?bypass=1");
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  /* ── Status badge ─────────────────────────────────────────── */
  function showStatus(ok) {
    let b = document.getElementById("db-status-badge");
    if (!b) {
      b = document.createElement("div");
      b.id = "db-status-badge";
      b.style.cssText =
        "position:fixed;bottom:16px;right:16px;z-index:9999;" +
        "padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;" +
        "color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:inherit;" +
        "transition:opacity 3s ease;";
      document.body.appendChild(b);
    }
    b.style.background = ok ? "#16a34a" : "#dc2626";
    b.textContent = ok
      ? "🟢 DB Connected — daytona_lms"
      : "🔴 DB Offline";

    // Fade out the badge after 5 seconds if connected
    if (ok) {
      setTimeout(() => { b.style.opacity = "0"; }, 5000);
      setTimeout(() => { b.remove(); }, 8000);
    }
  }

  /* ── Card builders (Contacts) ─────────────────────────────── */
  function instructorCard(u) {
    return `
      <div class="contact-card instructor">
        <div class="contact-avatar instructor-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <p class="role">Instructor</p>
          <h4>${u.firstName} ${u.lastName}</h4>
          <p>${u.email}</p>
          <p>Office: Building A, Room 215</p>
          <p>Office Hours: Mon &amp; Wed 2:00 PM – 4:00 PM</p>
        </div>
      </div>`;
  }

  function adminCard(u) {
    return `
      <div class="contact-card instructor">
        <div class="contact-avatar instructor-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <p class="role">Administrator</p>
          <h4>${u.firstName} ${u.lastName}</h4>
          <p>${u.email}</p>
        </div>
      </div>`;
  }

  function studentCard(u) {
    return `
      <div class="contact-card">
        <div class="contact-avatar">${AVATAR_SVG}</div>
        <div class="contact-info">
          <h4>${u.firstName} ${u.lastName}</h4>
          <p>${u.email}</p>
        </div>
        <a class="email-icon-link" href="mailto:${u.email}" title="Email ${u.firstName}">
          ${EMAIL_SVG}
        </a>
      </div>`;
  }

  function roleBadge(role) {
    const colors = { ADMIN: "#e74c3c", INSTRUCTOR: "#2b6cb0", STUDENT: "#16a34a" };
    const bg = colors[role] || "#718096";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:${bg}">${role}</span>`;
  }

  /* ── Patch contacts grid ────────────────────────────────────── */
  function patchContacts(users) {
    const grid = document.querySelector(".contacts-grid");
    if (!grid) return;
    const active = users.filter(u => u.isActive);
    const cards = active.map(u => {
      if (u.role === "INSTRUCTOR") return instructorCard(u);
      if (u.role === "ADMIN")      return adminCard(u);
      return studentCard(u);
    }).join("");
    grid.innerHTML = cards;
  }

  /* ── Patch courses info ─────────────────────────────────────── */
  function patchCourses(courses) {
    // Placeholder for future course data patching
    if (courses.length) {
      console.log(`📚 ${courses.length} course(s) loaded from daytona_lms`);
    }
  }

  /* ── Patch users table (admin page) ─────────────────────────── */
  function patchUsersTable(users) {
    const container = document.getElementById("users-table-body");
    if (!container) return;
    container.innerHTML = users.map(u => `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:9px 12px;color:#9ca3af">${u.userId}</td>
        <td style="padding:9px 12px;font-weight:600">${u.firstName} ${u.lastName}</td>
        <td style="padding:9px 12px;font-size:12.5px;color:#374151">${u.email}</td>
        <td style="padding:9px 12px">${roleBadge(u.role)}</td>
      </tr>
    `).join("");
  }

  /* ════════════════════════════════════════════════════════════
     MODULE + LESSON FETCHING — powers live Class Content
  ════════════════════════════════════════════════════════════ */
  async function fetchModulesWithLessons() {
    try {
      // Fetch all modules for courseId=1
      const modules = await get("/api/modules");
      if (!modules || !modules.length) {
        console.log("📦 No modules found in database");
        return;
      }

      // For each module, fetch its lessons
      // Module orderIndex maps to week number
      window.lmsModules = {};

      const lessonPromises = modules.map(async (mod) => {
        try {
          const lessons = await get(`/api/modules/${mod.moduleId}/lessons`);
          const weekNum = mod.orderIndex; // orderIndex = week number
          window.lmsModules[weekNum] = {
            moduleId: mod.moduleId,
            title: mod.title,
            description: mod.description,
            orderIndex: mod.orderIndex,
            lessons: lessons || []
          };
        } catch (err) {
          console.warn(`⚠️ Could not fetch lessons for module ${mod.moduleId}:`, err.message);
        }
      });

      await Promise.all(lessonPromises);

      const totalLessons = Object.values(window.lmsModules)
        .reduce((sum, m) => sum + m.lessons.length, 0);
      console.log(`✅ Loaded ${modules.length} modules with ${totalLessons} lessons from daytona_lms`);

    } catch (err) {
      console.warn("⚠️ Could not fetch modules:", err.message);
    }
  }

  /* ── Main ───────────────────────────────────────────────────── */
  try {
    // Check API_BASE is set
    if (DB_API.includes("XXXX")) {
      console.warn("⚠️ db-connect.js: Update DB_API with your Render URL");
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

    // Fetch modules + lessons for live Class Content
    await fetchModulesWithLessons();

    console.log(`✅ daytona_lms connected — ${users.length} users, ${courses.length} courses`);

  } catch (err) {
    console.warn("⚠️ db-connect.js: Could not reach API →", err.message);
    showStatus(false);
  }

})();
