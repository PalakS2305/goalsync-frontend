document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("admin");
  if (!user) return;

  document.getElementById("navUserName").textContent = user.name;
  document.getElementById("navAvatar").textContent = user.name
    .charAt(0)
    .toUpperCase();

  loadAnalytics();
});

async function loadAnalytics() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    // Summary stats
    const c = data.completion;
    document.getElementById("totalGoals").textContent = c.total_goals || 0;
    document.getElementById("approvedGoals").textContent = c.approved || 0;
    document.getElementById("pendingGoals").textContent = c.pending || 0;
    document.getElementById("draftGoals").textContent = c.draft || 0;

    // Status Chart
    const statusLabels = data.goals.map((g) => g.status);
    const statusData = data.goals.map((g) => parseInt(g.count));
    new Chart(document.getElementById("statusChart"), {
      type: "doughnut",
      data: {
        labels: statusLabels,
        datasets: [
          {
            data: statusData,
            backgroundColor: [
              "#e5e7eb",
              "#fef3c7",
              "#d1fae5",
              "#fee2e2",
              "#ede9fe",
            ],
            borderColor: [
              "#9ca3af",
              "#f59e0b",
              "#059669",
              "#dc2626",
              "#7c3aed",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });

    // Thrust Area Chart
    const thrustLabels = data.thrust.map((t) => t.thrust_area);
    const thrustData = data.thrust.map((t) => parseInt(t.count));
    new Chart(document.getElementById("thrustChart"), {
      type: "bar",
      data: {
        labels: thrustLabels,
        datasets: [
          {
            label: "Number of Goals",
            data: thrustData,
            backgroundColor: "#0f3460",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    // Quarterly Score Chart
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const scoreMap = {};
    data.scores.forEach((s) => {
      scoreMap[s.quarter] = parseFloat(s.avg_score);
    });
    const scoreData = quarters.map((q) => scoreMap[q] || 0);

    new Chart(document.getElementById("scoreChart"), {
      type: "line",
      data: {
        labels: quarters,
        datasets: [
          {
            label: "Average Score (%)",
            data: scoreData,
            borderColor: "#059669",
            backgroundColor: "rgba(5,150,105,0.1)",
            borderWidth: 3,
            pointRadius: 6,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: "Score (%)" },
          },
        },
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
  }
}
