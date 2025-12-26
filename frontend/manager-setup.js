// ===== CONFIG =====
const API_BASE_URL = "http://localhost:5000";
const PROJECT_DETAILS_API = (id) => `${API_BASE_URL}/api/projects/${id}`;
const PROJECT_SETUP_API = (id) =>
  `${API_BASE_URL}/api/projects/${id}/manager-setup`;

const token = localStorage.getItem("token");
const projectId = new URLSearchParams(window.location.search).get("projectId");

// ===== STEP NAVIGATION =====
document.getElementById("goToStep2Btn").onclick = () => switchStep(2);
document.getElementById("goToStep3Btn").onclick = () => switchStep(3);
document.getElementById("backToStep1Btn").onclick = () => switchStep(1);
document.getElementById("backToStep2Btn").onclick = () => switchStep(2);

// ===== ELEMENTS =====
const stepLabel = document.getElementById("stepLabel");
const panels = document.querySelectorAll(".step-panel");
const indicators = document.querySelectorAll(".step-item");

const titleDisplay = document.getElementById("projectTitleDisplay");
const descDisplay = document.getElementById("projectDescriptionDisplay");
const fileLink = document.getElementById("projectFileLink");

// Requirements
const reqInput = document.getElementById("reqInput");
const addReqBtn = document.getElementById("addReqBtn");
const reqList = document.getElementById("reqList");

// Tasks
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDescriptionInput = document.getElementById("taskDescriptionInput");
const taskDeadlineInput = document.getElementById("taskDeadlineInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const tasksTableBody = document.getElementById("tasksTable");

// Team
const memberEmailInput = document.getElementById("memberEmailInput");
const addMemberBtn = document.getElementById("addMemberBtn");
const teamList = document.getElementById("teamList");

// Assignments
const taskSelect = document.getElementById("taskSelect");
const memberSelect = document.getElementById("memberSelect");
const assignTaskBtn = document.getElementById("assignTaskBtn");
const assignmentList = document.getElementById("assignmentList");

const projectDeadlineInput = document.getElementById("projectDeadlineInput");
const submitBtn = document.getElementById("submitSetupBtn");

// ===== STATE =====
let step = 1;
let requirements = [];
let tasks = [];
let teamMembers = [];
let assignments = [];

// ===== HELPERS =====
function showAlert(msg) {
  alert(msg);
}

function switchStep(to) {
  step = to;
  panels.forEach((p) => p.classList.remove("active"));
  indicators.forEach((i) => i.classList.remove("active"));

  document.getElementById(`step${to}`).classList.add("active");
  indicators[to - 1].classList.add("active");
  stepLabel.textContent = `Step ${to} of 3`;
}

// ===== LOAD PROJECT =====
async function loadProject() {
  const res = await fetch(PROJECT_DETAILS_API(projectId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  titleDisplay.textContent = data.title || "—";
  descDisplay.textContent = data.description || "—";

  if (data.requirementFileUrl) {
    fileLink.href = data.requirementFileUrl;
    fileLink.style.display = "inline-block";
  } else {
    fileLink.style.display = "none";
  }
}

// ===== REQUIREMENTS =====
addReqBtn.onclick = () => {
  const val = reqInput.value.trim();
  if (!val) return;

  requirements.push(val);
  reqInput.value = "";
  renderReq();
};

function renderReq() {
  reqList.innerHTML = "";
  requirements.forEach((r, i) => {
    const li = document.createElement("li");
    li.textContent = r;
    li.onclick = () => {
      requirements.splice(i, 1);
      renderReq();
    };
    reqList.appendChild(li);
  });
}

// ===== TASKS =====
addTaskBtn.onclick = () => {
  const title = taskTitleInput.value.trim();
  const deadline = taskDeadlineInput.value;

  if (!title || !deadline)
    return showAlert("Task title & deadline required");

  tasks.push({
    taskNumber: tasks.length + 1,
    title,
    description: taskDescriptionInput.value,
    deadline,
  });

  taskTitleInput.value = "";
  taskDescriptionInput.value = "";
  taskDeadlineInput.value = "";

  renderTasks();
  populateTaskSelect();
};

function renderTasks() {
  tasksTableBody.innerHTML = "";
  tasks.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.taskNumber}</td>
      <td>${t.title}</td>
      <td>${t.deadline}</td>
    `;
    tasksTableBody.appendChild(tr);
  });
}

// ===== TEAM =====
addMemberBtn.onclick = () => {
  const email = memberEmailInput.value.trim();
  if (!email.includes("@")) return showAlert("Invalid email");

  if (teamMembers.some((m) => m.email === email))
    return showAlert("Member already added");

  teamMembers.push({
    email,
    role: teamMembers.length === 0 ? "SCRUM_MASTER" : "TEAM_MEMBER",
  });

  memberEmailInput.value = "";
  renderTeam();
  populateMemberSelect();
};

function renderTeam() {
  teamList.innerHTML = "";
  teamMembers.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = `${m.email} (${m.role})`;
    teamList.appendChild(li);
  });
}

// ===== ASSIGNMENTS =====
assignTaskBtn.onclick = () => {
  const taskIndex = taskSelect.value;
  const email = memberSelect.value;
  if (taskIndex === "" || !email) return;

  const task = tasks[taskIndex];

  if (
    assignments.some((a) => a.taskNumber === task.taskNumber)
  ) {
    return showAlert("Task already assigned");
  }

  assignments.push({
    taskNumber: task.taskNumber,
    assignee: email,
  });

  renderAssignments();
};

function renderAssignments() {
  assignmentList.innerHTML = "";
  assignments.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = `Task ${a.taskNumber} → ${a.assignee}`;
    assignmentList.appendChild(li);
  });
}

function populateTaskSelect() {
  taskSelect.innerHTML = `<option value="">Select task</option>`;
  tasks.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `Task ${t.taskNumber}: ${t.title}`;
    taskSelect.appendChild(o);
  });
}

function populateMemberSelect() {
  memberSelect.innerHTML = `<option value="">Select member</option>`;
  teamMembers.forEach((m) => {
    const o = document.createElement("option");
    o.value = m.email;
    o.textContent = m.email;
    memberSelect.appendChild(o);
  });
}

// ===== SUBMIT =====
submitBtn.onclick = async () => {
  if (!projectDeadlineInput.value)
    return showAlert("Project deadline required");

  const res = await fetch(PROJECT_SETUP_API(projectId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      requirements,
      tasks,
      teamMembers,
      assignments,
      projectDeadline: projectDeadlineInput.value,
    }),
  });

  if (!res.ok) return showAlert("Setup failed");

  alert("Setup complete 🎉");
  window.location.href = "dashboard.html";
};

// ===== INIT =====
window.onload = loadProject;

let memberDebounce = null;

memberEmailInput.addEventListener("input", () => {
  const query = memberEmailInput.value.trim();

  if (!query || query.length < 2) {
    memberEmailSuggestions.innerHTML = "";
    return;
  }

  clearTimeout(memberDebounce);

  memberDebounce = setTimeout(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) return;

      const users = await res.json();
      memberEmailSuggestions.innerHTML = "";

      users.forEach((u) => {
        if (!u.email) return;
        const opt = document.createElement("option");
        opt.value = u.email;
        memberEmailSuggestions.appendChild(opt);
      });
    } catch (err) {
      console.error("Member email suggestion error:", err);
    }
  }, 300);
});
