/* ================= CONFIG ================= */
const API_BASE_URL = "http://localhost:5000";
const FINAL_REVIEW_API = (projectId) =>
  `${API_BASE_URL}/api/projects/${projectId}/final-review`;

/* ================= AUTH & META ================= */
const role = document.body.dataset.role;
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("projectId");
const token = localStorage.getItem("token");

/* ================= ELEMENTS ================= */
const projectTitleEl = document.getElementById("projectTitle");
const totalTasksEl = document.getElementById("totalTasks");
const completedTasksEl = document.getElementById("completedTasks");
const inProgressTasksEl = document.getElementById("inProgressTasks");
const blockedTasksEl = document.getElementById("blockedTasks");
const memberTableBody = document.getElementById("memberTableBody");
const finalNotes = document.getElementById("finalNotes");
const saveFinalNotes = document.getElementById("saveFinalNotes");

/* ================= CHARTS ================= */
let taskChart = null;
let memberChart = null;

/* ================= LOAD FINAL REVIEW ================= */
async function loadFinalProjectReview() {
  if (!projectId) {
    console.error("❌ Project ID missing");
    return;
  }

  if (!token) {
    console.error("❌ JWT token missing. Login again.");
    return;
  }

  try {
    const res = await fetch(FINAL_REVIEW_API(projectId), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("📡 Final Review API Status:", res.status);

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ API ERROR:", err);
      return;
    }

    const data = await res.json();
    console.log("✅ Final Review Data:", data);

    renderProject(data.project);
    renderStats(data.tasks);
    renderMembers(data.members);
    renderCharts(data.tasks, data.members);
    loadNotes();

  } catch (err) {
    console.error("❌ Fetch failed:", err);
  }
}

/* ================= RENDER FUNCTIONS ================= */
function renderProject(project) {
  projectTitleEl.textContent =
    project?.title || "Final Project Review";
}

function renderStats(tasks) {
  totalTasksEl.textContent = tasks?.total || 0;
  completedTasksEl.textContent = tasks?.completed || 0;
  inProgressTasksEl.textContent = tasks?.inProgress || 0;
  blockedTasksEl.textContent = tasks?.blocked || 0;
}

function renderMembers(members = []) {
  memberTableBody.innerHTML = "";

  if (!members.length) {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted small">
          No member data available
        </td>
      </tr>
    `;
    return;
  }

  members.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.role.replace("_", " ")}</td>
      <td class="text-success">${m.done}</td>
      <td>${m.total}</td>
      <td>${m.uploads}</td>
    `;
    memberTableBody.appendChild(tr);
  });
}

function renderCharts(tasks, members) {
  if (taskChart) taskChart.destroy();
  if (memberChart) memberChart.destroy();

  taskChart = new Chart(
    document.getElementById("taskStatusChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "In Progress", "Blocked"],
        datasets: [
          {
            data: [
              tasks.completed || 0,
              tasks.inProgress || 0,
              tasks.blocked || 0,
            ],
            backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
          },
        ],
      },
    }
  );

  memberChart = new Chart(
    document.getElementById("memberContributionChart"),
    {
      type: "bar",
      data: {
        labels: members.map((m) => m.name),
        datasets: [
          {
            label: "Tasks Completed",
            data: members.map((m) => m.done),
            backgroundColor: "#6366f1",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true },
        },
      },
    }
  );
}

/* ================= NOTES (LOCAL STORAGE) ================= */
function notesKey() {
  return `final-project-notes-${projectId}`;
}

function loadNotes() {
  finalNotes.value = localStorage.getItem(notesKey()) || "";
}

saveFinalNotes.addEventListener("click", () => {
  localStorage.setItem(notesKey(), finalNotes.value);
});

/* ================= INIT ================= */
window.addEventListener("DOMContentLoaded", () => {
  loadFinalProjectReview();
});
