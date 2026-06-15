let allUsersData = [];

// ── Page Load ──
document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("admin");
  if (!user) return;
  document.getElementById("navUserName").textContent = user.name;
  loadUsers();
  loadAuditLogs();
  loadAllGoals();
});

// ── Switch Tabs ──
function switchTab(tab) {
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));

  document.getElementById(`tab-${tab}`).classList.add("active");
  event.target.classList.add("active");

  if (tab === "shared") loadEmployeeCheckboxes();
}

// ── Load Users ──
async function loadUsers() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    allUsersData = data.users;
    renderUsers(data.users);
  } catch (err) {
    console.error("Load users error:", err);
  }
}

// ── Render Users Table ──
function renderUsers(users) {
  const container = document.getElementById("usersList");
  if (users.length === 0) {
    container.innerHTML = "<p>No users found.</p>";
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Department</th>
          <th>Manager</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (u) => `
          <tr>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>
              <span class="role-badge badge-${u.role}">
                ${u.role}
              </span>
            </td>
            <td>${u.department || "—"}</td>
            <td>${u.manager_name || "—"}</td>
            <td>
              <button 
                class="${
                  u.is_active ? "btn-toggle-active" : "btn-toggle-inactive"
                }"
                onclick="toggleUser(${u.id})">
                ${u.is_active ? "Active" : "Inactive"}
              </button>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

// ── Toggle User Status ──
async function toggleUser(userId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/toggle`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    loadUsers();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Load All Goals ──
async function loadAllGoals() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderAllGoals(data.goals);
  } catch (err) {
    console.error("Load goals error:", err);
  }
}

// ── Render All Goals Table ──
function renderAllGoals(goals) {
  const container = document.getElementById("allGoalsList");
  if (!goals || goals.length === 0) {
    container.innerHTML = "<p>No goals found.</p>";
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Goal Title</th>
          <th>Thrust Area</th>
          <th>Weightage</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${goals
          .map(
            (g) => `
          <tr>
            <td>${g.employee_name || "—"}</td>
            <td>${g.title}</td>
            <td>${g.thrust_area}</td>
            <td>${g.weightage}%</td>
            <td>
              <span class="goal-status-badge status-${g.status}">
                ${g.status}
              </span>
            </td>
            <td>
              ${
                ["approved", "locked"].includes(g.status)
                  ? `
                <button class="btn-unlock" 
                        onclick="unlockGoal(${g.id})">
                  🔓 Unlock
                </button>`
                  : "—"
              }
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

// ── Unlock Goal ──
async function unlockGoal(goalId) {
  const reason = prompt("Enter reason for unlocking this goal:");
  if (!reason) return;

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/goals/${goalId}/unlock`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    alert(data.message);
    loadAllGoals();
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Load Audit Logs ──
async function loadAuditLogs() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderAuditLogs(data.logs);
  } catch (err) {
    console.error("Load audit logs error:", err);
  }
}

// ── Render Audit Logs ──
function renderAuditLogs(logs) {
  const container = document.getElementById("auditList");
  if (!logs || logs.length === 0) {
    container.innerHTML = "<p>No audit logs yet.</p>";
    return;
  }

  container.innerHTML = logs
    .map(
      (log) => `
    <div class="audit-card">
      <div>
        <span class="audit-action">${log.action}</span>
        <div class="audit-desc">${log.description || "—"}</div>
        <div style="font-size:0.78rem; color:#6b7280; margin-top:4px;">
          By: ${log.user_name || "Unknown"} 
          (${log.user_role || "—"})
        </div>
      </div>
      <div class="audit-meta">
        ${new Date(log.created_at).toLocaleString()}
      </div>
    </div>`,
    )
    .join("");
}

// ── Load Employee Checkboxes for Shared Goal ──
async function loadEmployeeCheckboxes() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const employees = data.users.filter((u) => u.role === "employee");
    const container = document.getElementById("employeeCheckboxes");

    if (employees.length === 0) {
      container.innerHTML = "<p>No employees found.</p>";
      return;
    }

    container.innerHTML = employees
      .map(
        (emp) => `
      <label class="checkbox-item">
        <input type="checkbox" value="${emp.id}" 
               name="empCheck"/>
        ${emp.name} (${emp.department || "No dept"})
      </label>`,
      )
      .join("");
  } catch (err) {
    console.error("Load employees error:", err);
  }
}

// ── Push Shared Goal ──
async function pushSharedGoal() {
  const title = document.getElementById("sgTitle").value.trim();
  const desc = document.getElementById("sgDesc").value.trim();
  const thrust = document.getElementById("sgThrust").value;
  const uom = document.getElementById("sgUom").value;
  const target = document.getElementById("sgTarget").value;
  const checked = document.querySelectorAll('input[name="empCheck"]:checked');
  const emp_ids = Array.from(checked).map((c) => parseInt(c.value));

  if (!title || !uom || emp_ids.length === 0) {
    alert("Please fill title, UoM and select at least one employee.");
    return;
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/shared-goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description: desc,
        thrust_area: thrust,
        uom_type: uom,
        target_value: target || null,
        employee_ids: emp_ids,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    alert(data.message);
  } catch (err) {
    alert("Cannot connect to server.");
  }
}

// ── Export CSV ──
function exportCSV() {
  const token = localStorage.getItem('token');
  window.open(
    `${API_URL}/api/admin/export-csv`, '_blank'
  );
}

// ── Open User Modal ──
async function openUserModal() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const managers = data.users.filter((u) => u.role === "manager");
    const sel = document.getElementById("newManager");
    sel.innerHTML =
      '<option value="">No manager</option>' +
      managers
        .map((m) => `<option value="${m.id}">${m.name}</option>`)
        .join("");
  } catch (err) {
    console.error(err);
  }

  document.getElementById("userModal").style.display = "flex";
}

// ── Close User Modal ──
function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
  document.getElementById("newName").value = "";
  document.getElementById("newEmail").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("newDept").value = "";
  document.getElementById("userModalError").style.display = "none";
}

// ── Create User ──
async function createUser() {
  const name = document.getElementById("newName").value.trim();
  const email = document.getElementById("newEmail").value.trim();
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const dept = document.getElementById("newDept").value.trim();
  const mgr = document.getElementById("newManager").value;

  if (!name || !email || !password || !role) {
    showUserModalError("All required fields must be filled.");
    return;
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        department: dept || null,
        manager_id: mgr || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showUserModalError(data.error);
      return;
    }
    alert(`User "${name}" created successfully!`);
    closeUserModal();
    loadUsers();
  } catch (err) {
    showUserModalError("Cannot connect to server.");
  }
}

function showUserModalError(msg) {
  const box = document.getElementById("userModalError");
  document.getElementById("userModalErrorText").textContent = msg;
  box.style.display = "block";
}

