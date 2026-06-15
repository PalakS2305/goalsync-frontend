

let editingGoalId = null;
let allGoals = [];

// ── Page Load ──
document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("employee");
  if (!user) return;

  document.getElementById("navUserName").textContent = user.name;
  loadGoals();
});

// ── Open Modal ──
function openGoalModal() {
  editingGoalId = null;
  document.getElementById("modalTitle").textContent = "Add New Goal";
  clearModalForm();
  document.getElementById("goalModal").style.display = "flex";
}

// ── Close Modal ──
function closeGoalModal() {
  document.getElementById("goalModal").style.display = "none";
  clearModalForm();
}

// ── Clear Modal Form ──
function clearModalForm() {
  document.getElementById("thrustArea").value = "";
  document.getElementById("goalTitle").value = "";
  document.getElementById("goalDesc").value = "";
  document.getElementById("uomType").value = "";
  document.getElementById("targetValue").value = "";
  document.getElementById("weightage").value = "";
  document.getElementById("uomHint").style.display = "none";
  document.getElementById("modalError").style.display = "none";
}

// ── Handle UoM Change ──
function handleUomChange() {
  const uom = document.getElementById("uomType").value;
  const hint = document.getElementById("uomHint");
  const hText = document.getElementById("uomHintText");
  const tGrp = document.getElementById("targetGroup");
  const tLbl = document.getElementById("targetLabel");

  const hints = {
    min: "📈 Higher achievement = better score. E.g. Sales revenue.",
    max: "📉 Lower achievement = better score. E.g. Bug count.",
    percentage_min: "📊 Higher % = better. E.g. Customer satisfaction.",
    percentage_max: "📊 Lower % = better. E.g. Defect rate.",
    timeline: "📅 Goal is to complete by a deadline.",
    zero: "⭕ Target is zero. Any non-zero = failure.",
  };

  if (uom && hints[uom]) {
    hint.style.display = "block";
    hText.textContent = hints[uom];
  } else {
    hint.style.display = "none";
  }

  if (uom === "zero") {
    tGrp.style.display = "none";
  } else {
    tGrp.style.display = "block";
    tLbl.textContent = uom === "timeline" ? "Target (days)" : "Target Value *";
  }
}

// ── Load Goals ──
async function loadGoals() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/goals/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("Error loading goals:", data.error);
      return;
    }

    allGoals = data.goals;
    renderGoals(data.goals, data.total_weightage);
  } catch (err) {
    console.error("Network error loading goals:", err);
  }
}

// ── Render Goals ──
function renderGoals(goals, totalWeightage) {
  const list = document.getElementById("goalsList");
  const emptyState = document.getElementById("emptyState");
  const submitSec = document.getElementById("submitSection");

  updateWeightageBar(totalWeightage, goals.length);

  if (goals.length === 0) {
    list.innerHTML = "";
    list.appendChild(emptyState);
    emptyState.style.display = "block";
    submitSec.style.display = "none";
    return;
  }

  emptyState.style.display = "none";

  const returned = goals.find((g) => g.status === "returned");
  if (returned && returned.manager_comment) {
    document.getElementById("managerCommentBox").style.display = "block";
    document.getElementById("managerCommentText").textContent =
      returned.manager_comment;
  }

  list.innerHTML = goals
    .map(
      (goal) => `
    <div class="goal-card ${goal.status}" id="goal-${goal.id}">
      <div class="goal-card-left">
        <div class="goal-card-title">${goal.title}</div>
        <div style="color:#6b7280; font-size:0.85rem; margin-top:4px;">
          ${goal.description || "No description"}
        </div>
        <div class="goal-card-meta">
          <span class="meta-tag">${goal.thrust_area}</span>
          <span class="meta-tag">${formatUom(goal.uom_type)}</span>
          ${
            goal.target_value
              ? `<span class="meta-tag">Target: ${goal.target_value}</span>`
              : ""
          }
          <span class="meta-tag weightage">${goal.weightage}%</span>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; 
                  align-items:flex-end; gap:10px;">
        <span class="goal-status-badge status-${goal.status}">
          ${goal.status}
        </span>
        ${
          ["draft", "returned"].includes(goal.status)
            ? `
          <div class="goal-card-actions">
            <button class="btn-edit" 
                    onclick="editGoal(${goal.id})">Edit</button>
            <button class="btn-delete" 
                    onclick="deleteGoal(${goal.id})">Delete</button>
          </div>`
            : ""
        }
      </div>
    </div>
  `,
    )
    .join("");

  const hasDrafts = goals.some((g) => g.status === "draft");

  if (hasDrafts) {
    submitSec.style.display = "flex";
    const readyText =
      totalWeightage === 100
        ? "✅ Ready to submit — weightage is 100%"
        : `⚠️ Total weightage is ${totalWeightage}% (needs 100%)`;
    document.getElementById("submitStatusText").textContent = readyText;
    document.getElementById("submitBtn").disabled = totalWeightage !== 100;
  } else {
    submitSec.style.display = "flex";
    document.getElementById("submitStatusText").textContent =
      "✅ Goals submitted — awaiting manager approval";
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("submitBtn").textContent = "Submitted";
  }
}

// ── Update Progress Bar ──
function updateWeightageBar(total, count) {
  const bar = document.getElementById("weightageBar");
  const text = document.getElementById("weightageText");
  const remaining = document.getElementById("remainingText");
  const goalCount = document.getElementById("goalCountText");

  text.textContent = `${total}% / 100%`;
  remaining.textContent = `${Math.max(0, 100 - total)}% remaining`;
  goalCount.textContent = `${count} of 8 goals added`;
  bar.style.width = `${Math.min(total, 100)}%`;

  bar.className = "progress-bar-fill";
  if (total === 100) bar.classList.add("complete");
  if (total > 100) bar.classList.add("over");
}

// ── Format UoM ──
function formatUom(uom) {
  const map = {
    min: "Higher is Better",
    max: "Lower is Better",
    percentage_min: "% Higher is Better",
    percentage_max: "% Lower is Better",
    timeline: "Timeline",
    zero: "Zero Target",
  };
  return map[uom] || uom;
}

// ── Edit Goal ──
function editGoal(id) {
  const goal = allGoals.find((g) => g.id === id);
  if (!goal) return;

  editingGoalId = id;
  document.getElementById("modalTitle").textContent = "Edit Goal";
  document.getElementById("thrustArea").value = goal.thrust_area;
  document.getElementById("goalTitle").value = goal.title;
  document.getElementById("goalDesc").value = goal.description || "";
  document.getElementById("uomType").value = goal.uom_type;
  document.getElementById("targetValue").value = goal.target_value || "";
  document.getElementById("weightage").value = goal.weightage;

  handleUomChange();
  document.getElementById("goalModal").style.display = "flex";
}

// ── Save Goal ──
async function saveGoal() {
  const token = localStorage.getItem("token");

  const thrust_area = document.getElementById("thrustArea").value;
  const title = document.getElementById("goalTitle").value.trim();
  const description = document.getElementById("goalDesc").value.trim();
  const uom_type = document.getElementById("uomType").value;
  const target_value = document.getElementById("targetValue").value;
  const weightage = document.getElementById("weightage").value;

  if (!thrust_area || !title || !uom_type || !weightage) {
    showModalError("Please fill all required fields.");
    return;
  }

  if (parseFloat(weightage) < 10) {
    showModalError("Minimum weightage is 10%.");
    return;
  }

  const body = {
    thrust_area,
    title,
    description,
    uom_type,
    target_value: target_value || null,
    weightage: parseFloat(weightage),
  };

  try {
    const url = editingGoalId
      ? `${API_URL}/api/goals/${editingGoalId}`
      : `${API_URL}/api/goals`;
    const method = editingGoalId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      showModalError(data.error || "Failed to save goal.");
      return;
    }

    closeGoalModal();
    loadGoals();
  } catch (err) {
    showModalError("Cannot connect to server.");
  }
}

// ── Delete Goal ──
async function deleteGoal(id) {
  if (!confirm("Are you sure you want to delete this goal?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to delete goal.");
      return;
    }

    loadGoals();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Submit Goals ──
async function submitAllGoals() {
  if (!confirm("Submit all goals for manager approval?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/goals/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to submit goals.");
      return;
    }

    alert(data.message);
    loadGoals();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Show Modal Error ──
function showModalError(msg) {
  const box = document.getElementById("modalError");
  document.getElementById("modalErrorText").textContent = msg;
  box.style.display = "block";
}
