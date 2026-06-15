let currentQuarter = "Q1";
let myGoals = [];
let myAchievements = [];
let logGoalId = null;

// ── Page Load ──
document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("employee");
  if (!user) return;
  document.getElementById("navUserName").textContent = user.name;
  loadData();
});

// ── Load goals and achievements ──
async function loadData() {
  const token = localStorage.getItem("token");
  try {
    const [goalsRes, achRes] = await Promise.all([
      fetch(`${API_URL}/api/goals/my`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/api/quarterly/my`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const goalsData = await goalsRes.json();
    const achData = await achRes.json();

    myGoals = goalsData.goals || [];
    myAchievements = achData.achievements || [];

    renderQuarterlyContent();
  } catch (err) {
    console.error("Load data error:", err);
  }
}

// ── Select Quarter ──
function selectQuarter(q) {
  currentQuarter = q;
  document
    .querySelectorAll(".quarter-btn")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");
  renderQuarterlyContent();
}

// ── Render Content for Selected Quarter ──
function renderQuarterlyContent() {
  const container = document.getElementById("quarterlyContent");
  const approved = myGoals.filter((g) =>
    ["approved", "locked"].includes(g.status),
  );

  if (approved.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3>No approved goals yet</h3>
        <p>Goals must be approved by your manager 
           before you can log achievements.</p>
      </div>`;
    return;
  }

  container.innerHTML = approved
    .map((goal) => {
      const ach = myAchievements.find(
        (a) => a.goal_id === goal.id && a.quarter === currentQuarter,
      );

      return `
      <div class="achievement-card ${ach ? "has-data" : "no-data"}">
        <div class="achievement-header">
          <div>
            <div class="achievement-title">${goal.title}</div>
            <div class="achievement-meta">
              <span class="meta-tag">${goal.thrust_area}</span>
              <span class="meta-tag">${formatUom(goal.uom_type)}</span>
              <span class="meta-tag weightage">
                ${goal.weightage}%
              </span>
            </div>
          </div>
          ${
            ach
              ? `
            <div class="score-display">
              <div class="score-number">
                ${ach.score ? parseFloat(ach.score).toFixed(0) : "—"}%
              </div>
              <div class="score-label">Score</div>
            </div>`
              : ""
          }
        </div>

        <div class="pva-row">
          <div class="pva-item">
            <div class="pva-value">
              ${goal.target_value || "—"}
            </div>
            <div class="pva-label">Target</div>
          </div>
          <div class="pva-item">
            <div class="pva-value">
              ${ach ? ach.actual_value : "—"}
            </div>
            <div class="pva-label">Actual (${currentQuarter})</div>
          </div>
          <div class="pva-item">
            <div class="pva-value">
              <span class="goal-status-badge 
                status-${ach?.goal_status || "not_started"}">
                ${ach?.goal_status || "not started"}
              </span>
            </div>
            <div class="pva-label">Status</div>
          </div>
        </div>

        ${
          ach?.manager_comment
            ? `
          <div class="checkin-comment">
            💬 Manager: ${ach.manager_comment}
          </div>`
            : ""
        }

        <div style="margin-top:14px;">
          <button class="btn-primary" 
                  onclick="openLogModal(${goal.id}, '${goal.title}', 
                    '${goal.uom_type}', ${goal.target_value || 0})">
            ${ach ? "✏️ Update Achievement" : "+ Log Achievement"}
          </button>
        </div>
      </div>`;
    })
    .join("");
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

// ── Open Log Modal ──
function openLogModal(goalId, title, uomType, target) {
  logGoalId = goalId;

  document.getElementById("logModalTitle").textContent =
    `Log ${currentQuarter} Achievement`;
  document.getElementById("logGoalInfo").textContent =
    `Goal: ${title} | Target: ${target} | UoM: ${formatUom(uomType)}`;

  const label =
    uomType === "timeline"
      ? "Actual Days Taken *"
      : uomType === "zero"
        ? "Actual Value (should be 0 for full score) *"
        : "Actual Achievement *";

  document.getElementById("logValueLabel").textContent = label;
  document.getElementById("logActualValue").value = "";
  document.getElementById("logError").style.display = "none";
  document.getElementById("logModal").style.display = "flex";
}

// ── Close Log Modal ──
function closeLogModal() {
  document.getElementById("logModal").style.display = "none";
  logGoalId = null;
}

// ── Save Achievement ──
async function saveAchievement() {
  const actual_value = document.getElementById("logActualValue").value;
  const goal_status = document.getElementById("logGoalStatus").value;

  if (actual_value === "") {
    document.getElementById("logError").style.display = "block";
    document.getElementById("logErrorText").textContent =
      "Please enter your actual achievement value.";
    return;
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/quarterly/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        goal_id: logGoalId,
        quarter: currentQuarter,
        actual_value: parseFloat(actual_value),
        goal_status,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      document.getElementById("logError").style.display = "block";
      document.getElementById("logErrorText").textContent =
        data.error || "Failed to save.";
      return;
    }

    alert(`Achievement saved! Score: ${data.score}%`);
    closeLogModal();
    loadData();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}
