// ---------- Helpers ----------
function initialsFromName(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------- Render user ----------
function renderUser(user) {
  const initials = initialsFromName(user.name);

  document.getElementById("topAvatar").textContent = initials;
  document.getElementById("sidebarAvatar").textContent = initials;

  document.getElementById("topUserName").textContent = user.name || "";
  document.getElementById("sidebarUserName").textContent = user.name || "";
  document.getElementById("sidebarUserEmail").textContent = user.email || "";
}

// ---------- Render summary ----------
function renderSummary(summary) {
  document.getElementById("summaryActive").textContent =
    summary?.activeProjects ?? 0;
  document.getElementById("summaryTasks").textContent =
    summary?.myTasks ?? 0;
  document.getElementById("summaryDeadlines").textContent =
    summary?.upcomingDeadlines ?? 0;
}

function renderProjects(projects = []) {
  const list = document.getElementById("projectsList");
  const side = document.getElementById("sidebarProjects");

  list.innerHTML = "";
  side.innerHTML = "";

  projects.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4";

    const card = document.createElement("div");
    card.className = "nt-project-card h-100";
    card.dataset.projectId = p.id;

    // ✅ CLICK PROJECT CARD → OPEN more.html
    card.addEventListener("click", (e) => {
      if (e.target.closest(".delete-project-btn")) return;

      localStorage.setItem("selectedProjectId", p.id);

      // 🔥 THIS IS THE KEY LINE
card.addEventListener("click", () => {
  localStorage.setItem("selectedProjectId", p.id);

  if (p.role === "OWNER" || p.role === "MANAGER") {
    window.location.href = `project-dashboard.html?projectId=${p.id}`;
  } else {
    window.location.href = `member-dashboard.html?projectId=${p.id}`;
  }
});
    });

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 class="mb-1">${p.title}</h6>
          <p class="text-muted small mb-2">${p.description || ""}</p>
        </div>
        <div class="d-flex gap-2">
          <span class="nt-role-pill">${p.role}</span>
          ${
            p.role === "OWNER"
              ? `<button class="btn btn-sm btn-danger delete-project-btn"
                   data-project-id="${p.id}">
                   Delete
                 </button>`
              : ""
          }
        </div>
      </div>

      <div class="small text-muted mb-1">Progress</div>
      <div class="nt-progress-bar mb-1">
        <div class="nt-progress-fill" style="width:${p.progress || 0}%"></div>
      </div>
    `;

    col.appendChild(card);
    list.appendChild(col);

    // ✅ SIDEBAR CLICK → OPEN more.html
    const li = document.createElement("li");
    li.textContent = p.title;
    li.addEventListener("click", () => {
      localStorage.setItem("selectedProjectId", p.id);
      window.location.assign("/more.html#projects");
    });

    side.appendChild(li);
  });
}


// ---------- Render analytics ----------
function renderTasks(tasks = []) {
  if (!tasks.length) {
    tasksContainer.innerHTML =
      "<p class='text-secondary'>No tasks assigned</p>";
    return;
  }

  tasksContainer.innerHTML = tasks
    .map((t) => {
      const deadlineText = t.deadline
        ? new Date(t.deadline).toDateString()
        : "No deadline";

      const isOverdue =
        t.deadline && new Date(t.deadline) < new Date() && t.status !== "done";

      return `
        <div class="card dark-card p-3 mb-3" style="cursor:pointer">
          <div class="d-flex justify-content-between">
            <h6 class="mb-1">${t.title}</h6>
            <span class="badge ${
              t.status === "done"
                ? "bg-success"
                : t.status === "in-progress"
                ? "bg-warning"
                : "bg-secondary"
            }">${t.status}</span>
          </div>

          <small class="text-muted">
            Project: ${t.projectTitle || "—"}
          </small><br>

          <small class="${
            isOverdue ? "text-danger" : "text-muted"
          }">
            Deadline: ${deadlineText}
          </small>
        </div>
      `;
    })
    .join("");
}
function renderDeadlines(deadlines = []) {
  if (!deadlines.length) {
    deadlinesContainer.innerHTML =
      "<p class='text-secondary'>No upcoming deadlines</p>";
    return;
  }

  deadlinesContainer.innerHTML = deadlines
    .map((d) => {
      const dueDate = new Date(d.dueDate);
      const isOverdue = dueDate < new Date();

      return `
        <div class="card dark-card p-3 mb-3" style="cursor:pointer">
          <h6 class="mb-1">${d.title}</h6>

          <small class="text-muted">
            Project: ${d.projectTitle || "—"}
          </small><br>

          <small class="${
            isOverdue ? "text-danger" : "text-muted"
          }">
            Due: ${dueDate.toDateString()}
          </small>
        </div>
      `;
    })
    .join("");
}

window.addEventListener("DOMContentLoaded", () => {
  const notifPanel = document.getElementById("notifPanel");
  const notifBtn = document.getElementById("notifBtn");
  const closeNotif = document.getElementById("closeNotif");
  const notificationsContainer =
    document.getElementById("notificationsContainer");
  const notifBadge = document.getElementById("notifBadge");

  if (!notifPanel || !notifBtn || !notificationsContainer) {
    console.error("❌ Notification elements missing");
    return;
  }

  // ---------- Load notifications ----------
  async function loadNotifications(showBadgeOnly = false) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const notifications = await res.json();

      // 🔴 show red badge if unread exists
      const hasUnread = notifications.some((n) => !n.read);
      if (notifBadge) {
        notifBadge.classList.toggle("d-none", !hasUnread);
      }

      if (!showBadgeOnly) {
        renderNotifications(notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }

  // ---------- Open panel ----------
  notifBtn.addEventListener("click", async () => {
    notifPanel.classList.add("active");

    // mark all as read
    await fetch("http://localhost:5000/api/notifications/read-all", {
      method: "PUT",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    notifBadge?.classList.add("d-none");
    loadNotifications();
  });

  // ---------- Close panel ----------
  closeNotif.addEventListener("click", () => {
    notifPanel.classList.remove("active");
  });

  // ---------- Accept / Reject ----------
  notificationsContainer.addEventListener("click", async (e) => {
    const btn = e.target;

    if (
      !btn.classList.contains("accept-btn") &&
      !btn.classList.contains("reject-btn")
    )
      return;

    e.preventDefault();
    e.stopPropagation();

    const li = btn.closest("li");
    const projectId = btn.dataset.projectId;
    const type = btn.dataset.type;
    const token = localStorage.getItem("token");
    const isAccept = btn.classList.contains("accept-btn");

    if (!projectId || !type) return;

    // disable buttons immediately
    li.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
      b.textContent = "Processing...";
    });

    let action = "";
    if (type === "project-invite") {
      action = isAccept ? "accept" : "reject";
    } else if (type === "team-add") {
      action = isAccept ? "team/accept" : "team/reject";
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${projectId}/${action}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Action failed");
        return;
      }

      // ✅ remove notification instantly (NO LOOP)
      li.remove();

      // redirect if backend asks
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }

      // refresh dashboard data
      loadDashboard();
    } catch (err) {
      console.error("Notification action error", err);
    }
  });

  // initial badge check (background)
  loadNotifications(true);
});


// ---------- Render notifications ----------
function renderNotifications(notifications = []) {
  const container = document.getElementById("notificationsContainer");
  container.innerHTML = "";

  if (!notifications.length) {
    container.innerHTML = `
      <li class="list-group-item text-center text-muted">
        No notifications
      </li>`;
    return;
  }

  notifications.forEach((n) => {
    const li = document.createElement("li");
    li.className = "list-group-item";

    // 🔥 deadline alert styling
    if (n.type === "deadline-alert") {
      li.classList.add("list-group-item-danger");
    }

    let buttons = "";
    if (n.type === "project-invite" || n.type === "team-add") {
      buttons = `
        <div class="mt-2 d-flex gap-2">
          <button
            class="btn btn-sm btn-success accept-btn"
            data-project-id="${n.projectId}"
            data-type="${n.type}"
          >Accept</button>

          <button
            class="btn btn-sm btn-danger reject-btn"
            data-project-id="${n.projectId}"
            data-type="${n.type}"
          >Reject</button>
        </div>
      `;
    }

    li.innerHTML = `
      <div>${n.message}</div>
      <small class="text-muted">
        ${new Date(n.createdAt).toLocaleString()}
      </small>
      ${buttons}
    `;

    container.appendChild(li);
  });
}

// ---------- Load dashboard ----------
async function loadDashboard() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const data = await res.json();

    renderUser(data.user || {});
    renderSummary(data.summary || {});
    renderProjects(data.projects || []);
    renderAnalytics(data.managerAnalytics || []);
    renderNotifications(data.notifications || []);
  } catch (err) {
    console.error("Dashboard load failed", err);
  }
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
    return;
  }

  loadDashboard();

  // ✅ CREATE PROJECT
  document.getElementById("newProjectBtn")?.addEventListener("click", () => {
    window.location.href = "create-project.html";
  });

  document
    .getElementById("summaryNewProjectBtn")
    ?.addEventListener("click", () => {
      window.location.href = "create-project.html";
    });

  // ✅ PROFILE
  document.getElementById("profileBtn")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  // ✅ SETTINGS
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    window.location.href = "settings.html";
  });
});

// ---------- DELETE PROJECT (OWNER ONLY) ----------
document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-project-btn")) return;

  e.preventDefault();
  e.stopPropagation();

  const projectId = e.target.dataset.projectId;
  const token = localStorage.getItem("token");

  if (!confirm("Are you sure you want to delete this project?")) return;

  try {
    const res = await fetch(
      `http://localhost:5000/api/projects/${projectId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      alert("Delete failed");
      return;
    }

    alert("Project deleted");
    loadDashboard();
  } catch (err) {
    alert("Error deleting project");
  }
});
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});
// ================= LEFT SIDEBAR NAVIGATION =================

// Active Projects
// ================= LEFT SIDEBAR → more.html SECTIONS =================

// Active Projects
document.getElementById("activeProjectsBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "more.html#projects";
});

// My Tasks
document.getElementById("myTasksBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "more.html#tasks";
});

// Upcoming Deadlines
document.getElementById("upcomingDeadlinesBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "more.html#deadlines";
});

