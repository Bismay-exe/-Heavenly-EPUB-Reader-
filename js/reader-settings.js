
// Heavenly EPUB Reader - Reader, Bookshelf, Settings, Stats, Backup/Restore (Workers + Pause/Resume/Cancel)

// Elements
const fileInput = document.getElementById("fileInput");
const bookList = document.getElementById("bookList");
const readerContainer = document.getElementById("reader-container");
const bookshelf = document.getElementById("bookshelf");
const backBtn = document.getElementById("backBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const continueDiv = document.getElementById("continueReading");
const continueBtn = document.getElementById("continueBtn");
const continueTitle = document.getElementById("continueTitle");

const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

const progressWrap = document.getElementById("restoreProgress");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const cancelBtn = document.getElementById("cancelProgress");

const downloadAllBtn = document.getElementById("downloadAllBtn");
const restoreBtn = document.getElementById("restoreZipBtn");
const restoreInput = document.getElementById("restoreZipInput");

// Settings & Stats panel elements
const openSettings = document.getElementById("openSettings");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const fontSizeSlider = document.getElementById("fontSizeSlider");
const lineHeightSlider = document.getElementById("lineHeightSlider");
const themeSelect = document.getElementById("themeSelect");

const openStats = document.getElementById("openStats");
const statsPanel = document.getElementById("statsPanel");
const closeStats = document.getElementById("closeStats");
const timeSpentEl = document.getElementById("timeSpent");
const pagesReadEl = document.getElementById("pagesRead");
const totalPagesEl = document.getElementById("totalPages");
const progressPercentEl = document.getElementById("progressPercent");
const timeLeftEl = document.getElementById("timeLeft");

// State
let savedBooks = JSON.parse(localStorage.getItem("bookshelf")) || [];
let currentBook = null;
let rendition = null;
let startTime = null;
let pagesRead = parseInt(localStorage.getItem("pagesRead")) || 0;
let totalPages = 0;
let avgTimePerPage = 1;

let cancelOperation = false;
let pauseOperation = false;
let runNextStep = null;

// ---------- Bookshelf Rendering ----------
function renderBookshelf() {
  bookList.innerHTML = "";
  savedBooks.forEach((book, index) => {
    const div = document.createElement("div");
    div.className = "book-card";

    const isMissing = !book.fileName; // no filename means not in IDB yet

    div.innerHTML = `
      <div class="book-cover">
        <img src="\${book.cover || 'assets/cover.png'}" alt="cover" />
        \${isMissing ? '<span class="missing-label">⚠️ Missing</span>' : ''}
        <button class="remove-btn" title="Remove Book">❌</button>
      </div>
      <p>\${book.title || 'Untitled'}</p>
      <small>\${book.progress ? book.progress + '%' : 'Not started'}</small>
      \${isMissing ? '<button class="reimport-btn">📂 Re-import EPUB</button>' : '<button class="download-btn">📥 Download</button>'}
    `;

    if (!isMissing) {
      div.querySelector("img").onclick = () => openBook(index);
      div.querySelector("p").onclick = () => openBook(index);
      div.querySelector("small").onclick = () => openBook(index);
    }

    // Remove
    div.querySelector(".remove-btn").onclick = async (e) => {
      e.stopPropagation();
      if (confirm(\`Remove "\${book.title}" from bookshelf?\`)) {
        const fileName = book.fileName;
        savedBooks.splice(index, 1);
        localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
        if (fileName) await deleteBookFromDB(fileName);
        renderBookshelf();
        updateContinueReading();
      }
    };

    // Re-import
    const reimportBtn = div.querySelector(".reimport-btn");
    if (reimportBtn) {
      reimportBtn.onclick = () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = ".epub";
        input.onchange = async (event) => {
          const file = event.target.files[0];
          if (!file) return;
          const buf = await file.arrayBuffer();
          await saveBookToDB(file.name, new Uint8Array(buf));
          book.fileName = file.name;
          localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
          alert(\`Re-imported "\${book.title}" ✅\`);
          renderBookshelf();
        };
        input.click();
      };
    }

    // Download
    const downloadBtn = div.querySelector(".download-btn");
    if (downloadBtn) {
      downloadBtn.onclick = async (e) => {
        e.stopPropagation();
        const fileData = await getBookFromDB(book.fileName);
        if (!fileData) { alert("⚠️ File missing. Please re-import."); return; }
        const blob = new Blob([fileData], { type: "application/epub+zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = book.fileName || "book.epub";
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    bookList.appendChild(div);
  });

  updateContinueReading();
}
renderBookshelf();

// ---------- File Upload -> Add to Bookshelf ----------
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();

  const bookData = {
    title: file.name.replace(/\.epub$/i, ""),
    cover: "assets/cover.png",
    fileName: file.name,
    progress: 0,
    location: null
  };

  await saveBookToDB(bookData.fileName, new Uint8Array(buf));
  savedBooks.push(bookData);
  localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
  renderBookshelf();
});

// ---------- Open Book ----------
async function openBook(index) {
  const bookMeta = savedBooks[index];
  if (!bookMeta || !bookMeta.fileName) {
    alert("⚠️ EPUB missing, please re-import.");
    return;
  }

  const content = await getBookFromDB(bookMeta.fileName);
  if (!content) { alert("⚠️ EPUB missing in storage."); return; }

  currentBook = ePub(content);
  rendition = currentBook.renderTo("viewer", { width: "100%", height: "70vh" });
  await rendition.display(bookMeta.location || undefined);

  // Save last opened
  localStorage.setItem("lastOpenedBook", index);

  // Track progress and locations
  currentBook.ready.then(() => {
    currentBook.locations.generate(1600).then(() => {
      rendition.on("relocated", (location) => {
        const progress = currentBook.locations.percentageFromCfi(location.start.cfi) * 100;
        savedBooks[index].progress = Math.floor(progress);
        savedBooks[index].location = location.start.cfi;
        localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
        renderBookshelf();
        // update stats panel quick numbers
        totalPages = location.start.displayed?.total || totalPages;
        pagesRead = Math.max(pagesRead, location.start.displayed?.page || pagesRead);
        updateStats();
      });
    });
  });

  // Reader UI state
  bookshelf.classList.add("hidden");
  readerContainer.classList.remove("hidden");

  // Session stats start
  startTime = Date.now();
}

// Navigation
prevBtn.onclick = () => rendition && rendition.prev();
nextBtn.onclick = () => rendition && rendition.next();
backBtn.onclick = () => {
  readerContainer.classList.add("hidden");
  bookshelf.classList.remove("hidden");
  // log reading time to dailyStats
  if (startTime) {
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startTime) / 60000));
    const today = new Date().toISOString().split("T")[0];
    let dailyStats = JSON.parse(localStorage.getItem("dailyStats")) || {};
    dailyStats[today] = (dailyStats[today] || 0) + elapsedMinutes;
    localStorage.setItem("dailyStats", JSON.stringify(dailyStats));
  }
};

// ---------- Continue Reading ----------
function updateContinueReading() {
  let lastIndex = localStorage.getItem("lastOpenedBook");
  if (lastIndex !== null && savedBooks[lastIndex]) {
    continueDiv.classList.remove("hidden");
    continueTitle.textContent = savedBooks[lastIndex].title;
    continueBtn.onclick = () => openBook(parseInt(lastIndex));
  } else {
    continueDiv.classList.add("hidden");
  }
}
updateContinueReading();

// ---------- Export / Import Bookshelf (JSON metadata only) ----------
exportBtn.onclick = () => {
  if (savedBooks.length === 0) { alert("No books to export."); return; }
  const dataStr = JSON.stringify(savedBooks, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "bookshelf_backup.json"; a.click();
  URL.revokeObjectURL(url);
};
importBtn.onclick = () => importFile.click();
importFile.onchange = (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        savedBooks = imported;
        localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
        renderBookshelf();
        alert("Bookshelf imported. Missing EPUBs can be re-imported.");
      } else alert("Invalid file format.");
    } catch { alert("Failed to import JSON."); }
  };
  reader.readAsText(file);
};

// ---------- Clear All ----------
clearAllBtn.onclick = async () => {
  if (savedBooks.length === 0) { alert("No books to clear."); return; }
  if (confirm("Remove ALL books?")) {
    // remove files from IDB
    for (const b of savedBooks) { if (b.fileName) await deleteBookFromDB(b.fileName); }
    savedBooks = [];
    localStorage.removeItem("bookshelf");
    localStorage.removeItem("lastOpenedBook");
    renderBookshelf();
  }
};

// ---------- Settings Panel ----------
openSettings.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));

fontSizeSlider.addEventListener("input", () => {
  if (!rendition) return;
  rendition.themes.default({ "body": { "font-size": fontSizeSlider.value + "px" } });
  localStorage.setItem("readerFontSize", fontSizeSlider.value);
});
lineHeightSlider.addEventListener("input", () => {
  if (!rendition) return;
  rendition.themes.default({ "body": { "line-height": lineHeightSlider.value } });
  localStorage.setItem("readerLineHeight", lineHeightSlider.value);
});
themeSelect.addEventListener("change", () => {
  document.body.classList.remove("light", "dark", "sepia");
  document.body.classList.add(themeSelect.value);
  localStorage.setItem("readerTheme", themeSelect.value);
});

window.addEventListener("DOMContentLoaded", () => {
  const savedFontSize = localStorage.getItem("readerFontSize") || 18;
  const savedLineHeight = localStorage.getItem("readerLineHeight") || 1.5;
  const savedTheme = localStorage.getItem("readerTheme") || "light";
  fontSizeSlider.value = savedFontSize;
  lineHeightSlider.value = savedLineHeight;
  themeSelect.value = savedTheme;
  document.body.classList.add(savedTheme);
});

// ---------- Stats Panel ----------
openStats.addEventListener("click", () => { updateStats(); statsPanel.classList.remove("hidden"); });
closeStats.addEventListener("click", () => statsPanel.classList.add("hidden"));

function updateStats() {
  const elapsedMinutes = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0;
  timeSpentEl.textContent = `${elapsedMinutes} min`;
  pagesReadEl.textContent = pagesRead;
  totalPagesEl.textContent = totalPages;
  const percent = totalPages > 0 ? ((pagesRead / totalPages) * 100).toFixed(1) : 0;
  progressPercentEl.textContent = `${percent}%`;
  const estTimeLeft = Math.max(0, Math.floor((totalPages - pagesRead) * avgTimePerPage));
  timeLeftEl.textContent = `${estTimeLeft} min`;
}

// Track daily reading time on unload as well
window.addEventListener("beforeunload", () => {
  if (!startTime) return;
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startTime) / 60000));
  const today = new Date().toISOString().split("T")[0];
  let dailyStats = JSON.parse(localStorage.getItem("dailyStats")) || {};
  dailyStats[today] = (dailyStats[today] || 0) + elapsedMinutes;
  localStorage.setItem("dailyStats", JSON.stringify(dailyStats));

  // Track reading day for streak
  let readingHistory = JSON.parse(localStorage.getItem("readingHistory")) || [];
  if (!readingHistory.includes(today)) {
    readingHistory.push(today);
    localStorage.setItem("readingHistory", JSON.stringify(readingHistory));
  }
});

// ---------- Backup (ZIP) with Web Worker + Pause/Resume/Cancel ----------
let backupWorker;
downloadAllBtn.addEventListener("click", async () => {
  if (savedBooks.length === 0) { alert("No books to back up."); return; }

  // start UI
  progressWrap.style.display = "block";
  progressBar.style.width = "0%";
  progressText.innerText = "Preparing backup...";
  pauseOperation = false; cancelOperation = false;
  pauseResumeBtn.innerText = "⏸ Pause";

  const fileNames = savedBooks.filter(b => b.fileName).map(b => b.fileName);
  if (fileNames.length === 0) { alert("No EPUBs available."); progressWrap.style.display = "none"; return; }

  if (backupWorker) backupWorker.terminate();
  backupWorker = new Worker("js/workers/backupWorker.js");

  backupWorker.postMessage({ type: "start", fileNames });

  backupWorker.onmessage = (e) => {
    const { type } = e.data;
    if (type === "progress") {
      const { percent } = e.data;
      progressBar.style.width = percent + "%";
      progressText.innerText = `Backing up... ${percent}%`;
    } else if (type === "complete") {
      const { blob } = e.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "Heavenly_Library_Backup.zip"; a.click();
      URL.revokeObjectURL(url);
      progressText.innerText = "✅ Backup Complete!";
      setTimeout(() => progressWrap.style.display = "none", 3000);
    } else if (type === "canceled") {
      progressText.innerText = "❌ Backup canceled.";
      setTimeout(() => progressWrap.style.display = "none", 2000);
    }
  };
});

pauseResumeBtn.onclick = () => {
  if (!backupWorker && !restoreWorker) return;
  pauseOperation = !pauseOperation;
  pauseResumeBtn.innerText = pauseOperation ? "▶ Resume" : "⏸ Pause";
  const msg = { type: pauseOperation ? "pause" : "resume" };
  if (backupWorker) backupWorker.postMessage(msg);
  if (restoreWorker) restoreWorker.postMessage(msg);
};
cancelBtn.onclick = () => {
  cancelOperation = true;
  if (backupWorker) backupWorker.postMessage({ type: "cancel" });
  if (restoreWorker) restoreWorker.postMessage({ type: "cancel" });
};

// ---------- Restore from ZIP with Web Worker ----------
let restoreWorker;
restoreBtn.onclick = () => restoreInput.click();
restoreInput.onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const overwrite = confirm("Restore mode:\n\nOK = Overwrite existing books\nCancel = Skip existing books");
  const existing = savedBooks.map(b => b.fileName).filter(Boolean);

  progressWrap.style.display = "block";
  progressBar.style.width = "0%";
  progressText.innerText = "Starting restore...";
  pauseOperation = false; cancelOperation = false;
  pauseResumeBtn.innerText = "⏸ Pause";

  if (restoreWorker) restoreWorker.terminate();
  restoreWorker = new Worker("js/workers/restoreWorker.js");

  // read file as array buffer to pass to worker
  const buf = await file.arrayBuffer();
  restoreWorker.postMessage({ type: "start", zipBuffer: buf, overwrite, existing });

  restoreWorker.onmessage = async (e) => {
    const { type } = e.data;
    if (type === "progress") {
      const { percent } = e.data;
      progressBar.style.width = percent + "%";
      progressText.innerText = `Restoring... ${percent}%`;
    } else if (type === "item") {
      // item processed; add to bookshelf if new or overwritten (metadata only here)
      const { fileName, action } = e.data; // action: "new" | "overwritten" | "skipped"
      if (action === "new") {
        if (!savedBooks.find(b => b.fileName === fileName)) {
          savedBooks.push({ title: fileName.replace(/\.epub$/i, ""), fileName, progress: 0 });
        }
      }
      if (action === "overwritten") {
        const ex = savedBooks.find(b => b.fileName === fileName);
        if (ex) ex.progress = 0;
      }
      localStorage.setItem("bookshelf", JSON.stringify(savedBooks));
    } else if (type === "complete") {
      renderBookshelf();
      progressText.innerText = `✅ Restore Complete!`;
      setTimeout(() => progressWrap.style.display = "none", 3000);
    } else if (type === "canceled") {
      progressText.innerText = "❌ Restore canceled.";
      setTimeout(() => progressWrap.style.display = "none", 2000);
    }
  };

  // reset input
  restoreInput.value = "";
};
