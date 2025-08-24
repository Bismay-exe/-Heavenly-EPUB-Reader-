
// Dashboard logic: streak + weekly chart + per-book stats
const booksStats = JSON.parse(localStorage.getItem("booksStats")) || {}; // optional legacy
const bookshelfMeta = JSON.parse(localStorage.getItem("bookshelf")) || [];

const booksReadEl = document.getElementById("booksRead");
const hoursSpentEl = document.getElementById("hoursSpent");
const dailyStreakEl = document.getElementById("dailyStreak");
const mostReadBookEl = document.getElementById("mostReadBook");
const booksTable = document.getElementById("booksTable");

// Totals
let totalTime = 0;
let totalBooks = bookshelfMeta.length;
let mostRead = { title: null, progress: -1 };

// Use dailyStats for time aggregation
const dailyStats = JSON.parse(localStorage.getItem("dailyStats")) || {};

// Sum minutes
for (const [, minutes] of Object.entries(dailyStats)) totalTime += minutes;

// Most read book: by progress or pagesRead from booksStats
for (const b of bookshelfMeta) {
  if ((b.progress || 0) > mostRead.progress) mostRead = { title: b.title, progress: b.progress || 0 };
}

// Display
booksReadEl.textContent = totalBooks;
hoursSpentEl.textContent = (totalTime / 60).toFixed(1);
mostReadBookEl.textContent = mostRead.title || "—";

// Table rows
for (const b of bookshelfMeta) {
  const row = document.createElement("tr");
  const bs = booksStats[b.title] || {};
  row.innerHTML = `
    <td>${b.title}</td>
    <td>${bs.pagesRead || "—"}</td>
    <td>${bs.totalPages || "—"}</td>
    <td>${(b.progress || 0)}%</td>
    <td>${bs.timeSpent || 0} min</td>
  `;
  booksTable.appendChild(row);
}

// Streak calculation
let readingHistory = JSON.parse(localStorage.getItem("readingHistory")) || [];
readingHistory = readingHistory.sort((a, b) => new Date(b) - new Date(a));

function calculateStreak(dates) {
  if (dates.length === 0) return 0;
  // ensure today counts if read today
  let streak = 1;
  let current = new Date(dates[0]);
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i]);
    const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) { streak++; current = prev; }
    else if (diff > 1) break;
  }
  return streak;
}
const streak = calculateStreak(readingHistory);
dailyStreakEl.textContent = `${streak} day${streak !== 1 ? "s" : ""} 🔥`;

// Weekly chart from dailyStats (real minutes)
const ctx = document.getElementById("readingChart").getContext("2d");
const today = new Date();
let weekLabels = [];
let weekData = [];
for (let i = 6; i >= 0; i--) {
  const day = new Date();
  day.setDate(today.getDate() - i);
  const dateStr = day.toISOString().split("T")[0];
  const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });
  weekLabels.push(dayLabel);
  weekData.push(dailyStats[dateStr] || 0);
}
new Chart(ctx, {
  type: "bar",
  data: { labels: weekLabels, datasets: [{ label: "Minutes Read", data: weekData, backgroundColor: "rgba(123, 47, 247, 0.7)" }] }
});
