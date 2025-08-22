// === script.js (fixed) ===

// ... [Library + EPUB rendering code from previous message remains same]

// ===== MODALS =====
const creditsBtn = document.getElementById("credits-btn");
const creditsModal = document.getElementById("credits-modal");
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeBtns = document.querySelectorAll(".close-modal");

// Open modals
creditsBtn?.addEventListener("click", () => { creditsModal.style.display = "flex"; });
shortcutsBtn?.addEventListener("click", () => { shortcutsModal.style.display = "flex"; });
settingsBtn?.addEventListener("click", () => { settingsModal.style.display = "flex"; });

// Close modals (x button)
closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    document.getElementById(targetId).style.display = "none";
  });
});

// Close when clicking outside modal
window.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});
