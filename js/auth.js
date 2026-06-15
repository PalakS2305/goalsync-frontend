// Backend URL — auto switches based on environment
const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://goalsync-backend-omlr.onrender.com";

// ── Login Handler ──
async function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const loginBtn = document.getElementById("loginBtn");

  hideError();

  if (!email || !password) {
    showError("Please enter both email and password.");
    return;
  }

  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Login failed. Please try again.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    const role = data.user.role;

    if (role === "employee") {
      window.location.href = "pages/employee-dashboard.html";
    } else if (role === "manager") {
      window.location.href = "pages/manager-dashboard.html";
    } else if (role === "admin") {
      window.location.href = "pages/admin-dashboard.html";
    } else {
      showError("Unknown role. Contact administrator.");
    }
  } catch (err) {
    showError("Cannot connect to server. Make sure backend is running.");
  } finally {
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
}

// ── Show / Hide Error ──
function showError(message) {
  const box = document.getElementById("errorBox");
  const msg = document.getElementById("errorMsg");
  msg.textContent = message;
  box.classList.add("show");
}

function hideError() {
  document.getElementById("errorBox").classList.remove("show");
}

// ── Enter key to login ──
document.addEventListener("DOMContentLoaded", () => {
  const passwordField = document.getElementById("password");
  if (passwordField) {
    passwordField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }
});

// ── Logout ──
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../index.html";
}

// ── Get logged in user from localStorage ──
function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// ── Protect dashboard pages ──
function requireAuth(expectedRole) {
  const token = localStorage.getItem("token");
  const user = getUser();

  if (!token || !user) {
    window.location.href = "../index.html";
    return null;
  }

  if (expectedRole && user.role !== expectedRole) {
    alert("Access denied. Redirecting...");
    window.location.href = "../index.html";
    return null;
  }

  return user;
}

// ── Toast Notification System ──
function showToast(message, type = "success", duration = 3000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${icons[type] || "•"}</span>
    <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Loading State Helper ──
function setLoading(buttonId, isLoading, originalText) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Loading..." : originalText;
}
