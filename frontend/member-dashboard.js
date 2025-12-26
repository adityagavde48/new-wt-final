// ================= CONFIG =================
const API_BASE_URL = "http://localhost:5000";

const MEMBER_DASHBOARD_API = (projectId) =>
  `${API_BASE_URL}/api/projects/${projectId}/member/dashboard`;

const MEMBER_UPLOADS_API = (projectId) =>
  `${API_BASE_URL}/api/projects/${projectId}/member/uploads`;

const MEMBER_CHAT_API = (projectId) =>
  `${API_BASE_URL}/api/projects/${projectId}/chat`;

// ================= STATE =================
let projectId = null;
let memberName = "Member";
const token = localStorage.getItem("token");

let chatMessages = [];
const myUserId = localStorage.getItem("userId");

// ================= ELEMENTS =================
const projectTitleEl = document.getElementById("projectTitle");
const projectSublineEl = document.getElementById("projectSubline");
const memberNameLabel = document.getElementById("memberNameLabel");

const statTotalUploads = document.getElementById("statTotalUploads");
const statTodayUploads = document.getElementById("statTodayUploads");
const statLastUpload = document.getElementById("statLastUpload");

const sprintLabelInput = document.getElementById("sprintLabelInput");
const noteInput = document.getElementById("noteInput");
const fileInput = document.getElementById("fileInput");
const uploadForm = document.getElementById("uploadForm");
const uploadAlert = document.getElementById("uploadAlert");
const uploadTableBody = document.getElementById("uploadTableBody");

const chatMessagesEl = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

const summaryInput = document.getElementById("summaryInput");
const saveSummaryBtn = document.getElementById("saveSummaryBtn");

const sectionTableBody = document.getElementById("sectionTableBody");
const progressBar = document.getElementById("projectProgressBar");

// ================= HELPERS =================
function formatDateTime(str) {
  if (!str) return "—";
  const d = new Date(str);
  return isNaN(d) ? "—" : d.toLocaleString();
}

function showUploadAlert(msg, type = "info") {
  uploadAlert.textContent = msg;
  uploadAlert.style.color = type === "error" ? "#fecaca" : "#a7f3d0";
}

// ================= SECTIONS =================
const DAY = 24 * 60 * 60 * 1000;

function normalizeSections(sections) {
  const now = Date.now();
  return sections.map(sec => {
    if (
      sec.status === "in_progress" &&
      now - new Date(sec.updatedAt).getTime() > DAY
    ) {
      sec.status = "not_started";
    }
    return sec;
  });
}

function renderSections(sections = []) {
  sectionTableBody.innerHTML = "";

  if (!sections.length) {
    sectionTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center tiny-label">
          No sections assigned yet
        </td>
      </tr>`;
    return;
  }

  const total = sections.length;
  const completed = sections.filter(s => s.status === "done").length;
  const percent = Math.round((completed / total) * 100);
  const weight = Math.round(100 / total);

  progressBar.style.width = percent + "%";
  progressBar.textContent = percent + "%";

  if (percent === 100) {
    progressBar.classList.remove("progress-bar-animated");
  }

  sections.forEach(sec => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sec.title}</td>
      <td>
        <span class="status-pill status-${sec.status}">
          ${sec.status.replace("_", " ")}
        </span>
      </td>
      <td>${weight}%</td>
      <td>
        ${
          sec.status !== "done"
            ? `<button
                class="btn btn-sm btn-outline-info update-section-btn"
                data-id="${sec._id}">
                Update
              </button>`
            : "✔"
        }
      </td>
    `;
    sectionTableBody.appendChild(tr);
  });
}

// ================= DASHBOARD LOAD =================
async function loadMemberDashboard() {
  if (!projectId) return;

  try {
    const res = await fetch(MEMBER_DASHBOARD_API(projectId), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Dashboard load failed");

    const data = await res.json();

    projectTitleEl.textContent = data.project?.title || "Project";
    projectSublineEl.textContent = data.project?.description || "";
    memberNameLabel.textContent = `Hi, ${memberName}`;

    statTotalUploads.textContent = data.stats?.totalUploads || 0;
    statTodayUploads.textContent = data.stats?.todayUploads || 0;
    statLastUpload.textContent = formatDateTime(data.stats?.lastUploadAt);

    renderUploads(data.uploads || []);
    chatMessages = data.chat || [];
    renderChatMessages();

    const cleanSections = normalizeSections(data.sections || []);
    renderSections(cleanSections);

    loadSummaryFromLocal();

  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// ================= UPLOADS =================
function renderUploads(list) {
  uploadTableBody.innerHTML = "";

  if (!list.length) {
    uploadTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="tiny-label text-center">
          No uploads yet
        </td>
      </tr>`;
    return;
  }

  list.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><a href="${u.url}" target="_blank">${u.fileName}</a></td>
      <td>${u.sprintLabel || "—"}</td>
      <td>${u.note || "—"}</td>
      <td>${formatDateTime(u.uploadedAt)}</td>
      <td>✔</td>
    `;
    uploadTableBody.appendChild(tr);
  });
}

async function handleUpload(e) {
  e.preventDefault();

  if (!fileInput.files.length) {
    showUploadAlert("Please choose a file", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("sprintLabel", sprintLabelInput.value.trim());
  formData.append("note", noteInput.value.trim());

  try {
    const res = await fetch(MEMBER_UPLOADS_API(projectId), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    showUploadAlert("Upload successful!");
    uploadForm.reset();
    loadMemberDashboard();

  } catch {
    showUploadAlert("Server error", "error");
  }
}

// ================= CHAT =================
function renderChatMessages() {
  chatMessagesEl.innerHTML = "";

  chatMessages.forEach(msg => {
    const isMine = msg.senderId === myUserId;

    const row = document.createElement("div");
    row.className = `chat-row ${isMine ? "chat-right" : "chat-left"}`;

    row.innerHTML = `
      <div class="chat-bubble ${isMine ? "mine" : ""}">
        ${!isMine ? `<div class="chat-sender">${msg.senderName}</div>` : ""}
        <div>${msg.message}</div>
        <div class="chat-time">
          ${new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    `;
    chatMessagesEl.appendChild(row);
  });

  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  await fetch(MEMBER_CHAT_API(projectId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: text }),
  });

  chatInput.value = "";
  loadMemberDashboard();
}

// ================= LOCAL SUMMARY =================
function saveSummaryToLocal() {
  localStorage.setItem(`member-summary-${projectId}`, summaryInput.value);
}

function loadSummaryFromLocal() {
  const val = localStorage.getItem(`member-summary-${projectId}`);
  if (val) summaryInput.value = val;
}

// ================= EVENTS =================
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    alert("Login required");
    location.href = "login.html";
    return;
  }

  projectId = document.body.getAttribute("data-project-id");
  memberName = document.body.getAttribute("data-member-name") || "Member";

  uploadForm.addEventListener("submit", handleUpload);
  chatSendBtn.addEventListener("click", sendChatMessage);
  saveSummaryBtn.addEventListener("click", saveSummaryToLocal);

  loadMemberDashboard();
});

document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("update-section-btn")) return;

  const sectionId = e.target.dataset.id;

  await fetch(`${API_BASE_URL}/api/sections/${sectionId}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "in_progress" }),
  });

  loadMemberDashboard();
});

document.getElementById("fullProjectBtn")
  ?.addEventListener("click", () => {
    window.location.href = `full-project.html?projectId=${projectId}`;
  });
