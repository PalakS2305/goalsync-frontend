let currentEmployeeId = null;

// ── Page Load ──
document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("manager");
  if (!user) return;

  document.getElementById("navUserName").textContent = user.name;
  loadTeam();
});

// ── Load Team Overview ──
async function loadTeam() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/manager/team`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("Error loading team:", data.error);
      return;
    }

    renderTeam(data.team);
  } catch (err) {
    console.error("Network error:", err);
  }
}

// ── Render Team Cards ──
function renderTeam(team) {
  const list = document.getElementById("teamList");

  if (team.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No team members found</h3>
        <p>No employees are assigned to you yet. 
           Ask admin to assign employees.</p>
      </div>`;
    return;
  }

  list.innerHTML = team
    .map((member) => {
      const s = member.goal_summary;
      const pending = parseInt(s.pending) || 0;
      const approved = parseInt(s.approved) || 0;
      const total = parseInt(s.total_goals) || 0;

      let cardClass = "no-goals";
      let badgeHtml = `<span class="no-goals-badge">No goals yet</span>`;

      if (pending > 0) {
        cardClass = "has-pending";
        badgeHtml = `<span class="pending-badge">
                     ${pending} Pending Review
                   </span>`;
      } else if (total > 0 && approved === total) {
        cardClass = "all-approved";
        badgeHtml = `<span class="approved-badge">
                     All Approved ✓
                   </span>`;
      } else if (total > 0) {
        badgeHtml = `<span class="no-goals-badge">
                     ${total} goal(s) — ${approved} approved
                   </span>`;
      }

      return `
      <div class="team-card ${cardClass}" 
           onclick="openEmployeePanel(${member.id})">
        <div>
          <div class="team-card-name">👤 ${member.name}</div>
          <div class="team-card-dept">
            ${member.department || "No department"} 
            · ${member.email}
          </div>
        </div>
        <div class="team-card-right">
          ${badgeHtml}
          <span style="color:#9ca3af; font-size:1.2rem;">›</span>
        </div>
      </div>`;
    })
    .join("");
}

// ── Open Employee Goals Panel ──
async function openEmployeePanel(employeeId) {
  currentEmployeeId = employeeId;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/manager/team/${employeeId}/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to load employee goals.");
      return;
    }

    renderEmployeePanel(data.employee, data.goals, data.total_weightage);
  } catch (err) {
    console.error("Error loading employee goals:", err);
  }
}

// ── Render Employee Goals Panel ──
function renderEmployeePanel(employee, goals, totalWeightage) {
  document.getElementById("panelEmployeeName").textContent =
    `${employee.name}'s Goals`;
  document.getElementById("panelEmployeeDept").textContent =
    employee.department || "";

  // Weightage bar
  const bar = document.getElementById("panelBar");
  document.getElementById("panelWeightage").textContent =
    `${totalWeightage}% / 100%`;
  bar.style.width = `${Math.min(totalWeightage, 100)}%`;
  bar.className =
    "progress-bar-fill" + (totalWeightage === 100 ? " complete" : "");

  // Goals list
  const goalsList = document.getElementById("panelGoalsList");

  if (goals.length === 0) {
    goalsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>No goals submitted yet</h3>
      </div>`;
  } else {
    goalsList.innerHTML = goals
      .map(
        (goal) => `
      <div class="goal-card ${goal.status}">
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
                ? `<span class="meta-tag">
                 Target: ${goal.target_value}
               </span>`
                : ""
            }
            <span class="meta-tag weightage">${goal.weightage}%</span>
          </div>
        </div>
        <div>
          <span class="goal-status-badge status-${goal.status}">
            ${goal.status}
          </span>
        </div>
      </div>`,
      )
      .join("");
  }

  // Show action buttons if there are submitted goals
  const hasSubmitted = goals.some((g) => g.status === "submitted");
  const actionPanel = document.getElementById("actionPanel");
  const returnBox = document.getElementById("returnBox");

  returnBox.style.display = "none";

  if (hasSubmitted) {
    actionPanel.style.display = "flex";
    const count = goals.filter((g) => g.status === "submitted").length;
    document.getElementById("actionStatus").textContent =
      `${count} goal(s) waiting for your review`;
  } else {
    actionPanel.style.display = "none";
  }

  // Show the panel
  document.getElementById("employeePanel").style.display = "block";

  // Scroll to panel
  document.getElementById("employeePanel").scrollIntoView({
    behavior: "smooth",
  });
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

// ── Close Panel ──
function closePanel() {
  document.getElementById("employeePanel").style.display = "none";
  currentEmployeeId = null;
}

// ── Show Return Comment Box ──
function showReturnBox() {
  document.getElementById("returnBox").style.display = "block";
  document.getElementById("actionPanel").style.display = "none";
}

// ── Hide Return Comment Box ──
function hideReturnBox() {
  document.getElementById("returnBox").style.display = "none";
  document.getElementById("actionPanel").style.display = "flex";
  document.getElementById("returnComment").value = "";
}

// ── Approve Goals ──
async function approveGoals() {
  if (!confirm("Approve all submitted goals for this employee?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `${API_URL}/api/manager/team/${currentEmployeeId}/approve`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to approve goals.");
      return;
    }

    alert(data.message);
    closePanel();
    loadTeam();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Return Goals ──
async function returnGoals() {
  const comment = document.getElementById("returnComment").value.trim();

  if (!comment) {
    alert("Please write a comment before returning goals.");
    return;
  }

  if (!confirm("Return goals to employee with your comment?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `${API_URL}/api/manager/team/${currentEmployeeId}/return`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      },
    );
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to return goals.");
      return;
    }

    alert(data.message);
    closePanel();
    loadTeam();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}
