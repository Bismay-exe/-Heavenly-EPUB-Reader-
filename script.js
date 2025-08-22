// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',
  githubRepo: 'Heavenly-EPUB-Reader',
  epubsFolder: 'epubs',
  coversFolder: 'covers',
  backgroundsFolder: 'backgrounds',
  manifestFile: 'library.json'
};

// ===== DOM =====
const themeToggle = document.getElementById('theme-toggle');
const homeBtn = document.getElementById('home-btn');
const librarySection = document.getElementById('library');
const bookGrid = document.getElementById('book-grid');
const readerLayout = document.getElementById('reader-layout');
const viewer = document.getElementById('viewer');
const tocList = document.getElementById('toc-list');
const tocFilter = document.getElementById('toc-filter');
const chapterSearch = document.getElementById('chapter-search');

const fontSizeSelect = document.getElementById('font-size');
const prevBtn = document.getElementById('prev-ch');
const nextBtn = document.getElementById('next-ch');
const textColorPicker = document.getElementById('text-color');
const bgStyleSelect = document.getElementById('bg-style');
const readingModeSelect = document.getElementById('reading-mode');
const readerOnlyEls = document.querySelectorAll('.reader-only');

const infoBtn = document.getElementById('info-btn');
const bookMetaDiv = document.getElementById('book-meta');

const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');

const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// ===== STATE =====
let book = null;
let rendition = null;
let toc = [];
let currentChapterIndex = 0;
let currentCoverUrl = null;

// ===== UTIL =====
function persist(key, val){ try { localStorage.setItem(key, val); } catch {} }
function read(key){ try { return localStorage.getItem(key); } catch { return null; } }
function beautifyName(s){ return s.replace(/[_-]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase()); }

// ===== THEME =====
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? "☀️ Light Mode" : "🌙 Dark Mode";
  applyRenditionTheme();
  persist('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

window.addEventListener('load', () => {
  const savedTheme = read('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = "☀️ Light Mode";
  }
  init();
});

homeBtn?.addEventListener('click', showLibrary);

// ===== INIT =====
async function init(){
  await loadLibrary();
}

// ===== LIBRARY LOADER =====
async function loadLibrary(){
  bookGrid.innerHTML = '<p class="muted">Loading library…</p>';
  let items = [];

  try {
    const res = await fetch(CONFIG.manifestFile);
    if (res.ok) {
      const manifest = await res.json();
      items = manifest.books || manifest;
    }
  } catch(e){ console.error("Library manifest error:", e); }

  if(!items.length){
    bookGrid.innerHTML = `<p class="muted">No books found. Add .epub files to <code>/${CONFIG.epubsFolder}</code> and matching cover images to <code>/${CONFIG.coversFolder}</code>.</p>`;
    return;
  }

  bookGrid.innerHTML = '';
  for (const it of items){
    const base = (it.file || it.name).replace(/\.epub$/i,'');
    const cover = `${CONFIG.coversFolder}/${it.cover || base + ".jpg"}`;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${cover}" alt="${base} cover" onerror="this.src='assets/placeholder.png'">
      <div class="title">${it.title || beautifyName(base)}</div>
    `;
    card.addEventListener('click', () => {
      openBook(it.file, { cover });
    });
    bookGrid.appendChild(card);
  }
}

// ===== OPEN BOOK =====
async function openBook(file, { cover } = {}) {
  librarySection.classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn.classList.remove('hidden');

  // Load directly from GitHub Pages (same origin)
  const url = `${CONFIG.epubsFolder}/${file}`;

  book = ePub(url);
  rendition = book.renderTo(viewer, { width: "100%", height: "100%", flow: "scrolled" });
  rendition.display();

  currentCoverUrl = cover;
  applyRenditionTheme();

  await loadTOC();
}

// ===== TOC LOADER =====
async function loadTOC() {
  try {
    const navigation = await book.loaded.navigation;
    toc = navigation.toc;

    if (!toc || !toc.length) {
      const spine = await book.loaded.spine;
      toc = spine.items.map((item, index) => ({
        label: item.label || `Chapter ${index + 1}`,
        href: item.href
      }));
    }

    if (!toc || !toc.length) {
      tocList.innerHTML = "<li><em>No chapters found.</em></li>";
      return;
    }

    renderTOC(toc);
    currentChapterIndex = 0;
  } catch (err) {
    console.error("Error loading TOC:", err);
    tocList.innerHTML = "<li><em>Failed to load TOC.</em></li>";
  }
}

// ===== RENDER TOC =====
function renderTOC(items, parentEl = tocList) {
  parentEl.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = item.label.trim() || "Untitled Chapter";
    a.href = "#";
    a.addEventListener("click", e => {
      e.preventDefault();
      currentChapterIndex = index;
      rendition.display(item.href);
    });
    li.appendChild(a);
    parentEl.appendChild(li);
  });
}

// ===== CHAPTER NAV =====
prevBtn?.addEventListener("click", () => {
  if (currentChapterIndex > 0) {
    currentChapterIndex--;
    rendition.display(toc[currentChapterIndex].href);
  }
});
nextBtn?.addEventListener("click", () => {
  if (currentChapterIndex < toc.length - 1) {
    currentChapterIndex++;
    rendition.display(toc[currentChapterIndex].href);
  }
});

// ===== CHAPTER SEARCH =====
chapterSearch?.addEventListener("input", () => {
  const term = chapterSearch.value.toLowerCase().trim();
  if (!term) {
    renderTOC(toc);
    return;
  }
  const filtered = toc.filter(item => item.label.toLowerCase().includes(term));
  if (filtered.length) {
    renderTOC(filtered);
  } else {
    tocList.innerHTML = `<li><em>No chapters found for "${term}"</em></li>`;
  }
});

// ===== THEME APPLIED TO EPUB =====
function applyRenditionTheme() {
  if (!rendition) return;

  const fontSize = fontSizeSelect.value;
  const textColor = textColorPicker.value;
  const bgStyle = bgStyleSelect.value;
  const isDark = document.body.classList.contains('dark');
  let backgroundColor = bgStyle === 'black' ? '#000' : 'transparent';

  rendition.themes.default({
    'body': {
      fontSize: fontSize,
      color: textColor,
      background: backgroundColor,
      'line-height': '1.6',
      'font-family': "'Poppins', sans-serif"
    }
  });

  if (isDark && bgStyle === 'transparent') {
    rendition.themes.default({
      'body': { background: '#111' }
    });
  }
}

fontSizeSelect?.addEventListener('change', applyRenditionTheme);
textColorPicker?.addEventListener('input', applyRenditionTheme);
bgStyleSelect?.addEventListener('change', applyRenditionTheme);

// ===== MODALS =====
creditsBtn?.addEventListener("click", () => {
  creditsModal.style.display = "flex";
});
shortcutsBtn?.addEventListener("click", () => {
  shortcutsModal.style.display = "flex";
});
settingsBtn?.addEventListener("click", () => {
  settingsModal.style.display = "flex";
});
closeModalButtons.forEach(btn => {
  btn.addEventListener("click", e => {
    const target = e.target.dataset.target;
    if (target) document.getElementById(target).style.display = "none";
  });
});

function showLibrary() {
  librarySection.classList.remove('hidden');
  readerLayout.classList.add('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
  infoBtn.classList.add('hidden');
}
