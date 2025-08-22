// === folder-based reader (no EPUB.js) ===

// ===== STATE =====
let LIB = [];
let currentBook = null; // { title, folder, cover }
let chapters = [];      // array of filenames from chapters.json
let currentIndex = 0;

// ===== DOM =====
const bookGrid = document.getElementById("book-grid");
const librarySection = document.getElementById("library");
const readerLayout = document.getElementById("reader-layout");
const tocList = document.getElementById("toc-list");
const tocFilter = document.getElementById("toc-filter");
const viewer = document.getElementById("viewer");

const homeBtn = document.getElementById("home-btn");
const prevBtn = document.getElementById("prev-ch");
const nextBtn = document.getElementById("next-ch");
const chapterSearch = document.getElementById("chapter-search");

const fontSizeSelect = document.getElementById("font-size");
const textColorPicker = document.getElementById("text-color");
const bgStyleSelect = document.getElementById("bg-style");
const themeToggle = document.getElementById("theme-toggle");

const infoBtn = document.getElementById("info-btn");
const creditsBtn = document.getElementById("credits-btn");
const creditsModal = document.getElementById("credits-modal");
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeBtns = document.querySelectorAll(".close-modal");

const readerOnlyEls = document.querySelectorAll(".reader-only");

// ===== UTIL =====
function persist(key, val){ try { localStorage.setItem(key, val); } catch {} }
function read(key){ try { return localStorage.getItem(key); } catch { return null; } }
function beautifyName(s){ return s.replace(/[_-]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase()); }

// ===== INIT =====
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = read('theme') || read('defaultTheme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeToggle) themeToggle.textContent = "☀️ Light Mode";
  }
  const defaultFont = read('defaultFontSize');
  if (defaultFont && fontSizeSelect) { fontSizeSelect.value = defaultFont; applyFontSize(); }

  loadLibrary();
});

// ===== LIBRARY =====
async function loadLibrary(){
  bookGrid.innerHTML = '<p class="muted">Loading library…</p>';
  try {
    const res = await fetch('library.json');
    LIB = await res.json();
  } catch (e) {
    console.error('Failed to load library.json', e);
    bookGrid.innerHTML = '<p class="muted">Could not load library.json.</p>';
    return;
  }

  if (!Array.isArray(LIB) || !LIB.length){
    bookGrid.innerHTML = '<p class="muted">No books found in library.json.</p>';
    return;
  }

  bookGrid.innerHTML = '';
  LIB.forEach(item => {
    const coverPath = `${item.folder}/${item.cover || 'cover.jpg'}`;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = \`
      <img src="\${coverPath}" alt="\${item.title} cover" onerror="this.src='assets/placeholder.png'">
      <div class="title">\${item.title}</div>
    \`;
    card.addEventListener('click', () => openBook(item));
    bookGrid.appendChild(card);
  });
}

// ===== OPEN BOOK =====
async function openBook(bookMeta){
  currentBook = bookMeta;
  librarySection.classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn?.classList.remove('hidden');

  // Load chapters.json
  try {
    const res = await fetch(\`\${currentBook.folder}/chapters.json\`);
    chapters = await res.json();
  } catch (e) {
    console.error('Failed to load chapters.json', e);
    tocList.innerHTML = '<li><em>No chapters.json found.</em></li>';
    return;
  }

  // Build TOC
  renderTOC();

  // Load last location if any
  const key = \`pos::\${currentBook.folder}\`;
  const saved = read(key);
  currentIndex = 0;
  if (saved) {
    const idx = parseInt(saved, 10);
    if (!isNaN(idx) && idx >= 0 && idx < chapters.length) currentIndex = idx;
  }

  // Display chapter
  displayChapter(currentIndex, /*pushPos=*/false);
}

// ===== RENDER TOC =====
function renderTOC(){
  tocList.innerHTML = '';
  chapters.forEach((fname, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = deriveChapterTitle(fname, i);
    a.href = '#';
    a.addEventListener('click', e => {
      e.preventDefault();
      displayChapter(i);
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });
}

// Derive a human title from filename like "01.xhtml" or "chapter-12.xhtml"
function deriveChapterTitle(fname, index){
  const base = fname.replace(/\.xhtml$/i,'').replace(/[-_]+/g,' ').trim();
  const num = base.match(/\d+/)?.[0];
  if (num) return \`Chapter \${parseInt(num,10)}\`;
  return \`Chapter \${index+1}\`;
}

// ===== DISPLAY CHAPTER =====
async function displayChapter(index, pushPos = true){
  if (index < 0 || index >= chapters.length) return;
  currentIndex = index;

  const url = \`\${currentBook.folder}/\${chapters[index]}\`;
  try {
    const res = await fetch(url);
    const html = await res.text();
    // Extract <body> content if full XHTML is provided
    const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : html;
    viewer.innerHTML = content;

    // Apply current styles
    applyTextColor();
    applyFontSize();
    applyBackgroundStyle();

    // Save position
    if (pushPos) persist(\`pos::\${currentBook.folder}\`, String(currentIndex));

    // Highlight active TOC item
    highlightTOC(currentIndex);

    // Scroll to top
    viewer.scrollTop = 0;
  } catch (e) {
    console.error('Failed to load chapter', url, e);
    viewer.innerHTML = '<p style="padding:16px"><em>Failed to load chapter.</em></p>';
  }
}

// ===== TOC helpers =====
function highlightTOC(idx){
  [...tocList.querySelectorAll('li')].forEach((li, i) => {
    li.style.opacity = i === idx ? '1' : '0.85';
    li.style.fontWeight = i === idx ? '700' : '400';
  });
}

// ===== NAVIGATION =====
prevBtn?.addEventListener('click', () => {
  if (!chapters.length) return;
  const i = Math.max(0, currentIndex - 1);
  if (i !== currentIndex) displayChapter(i);
});
nextBtn?.addEventListener('click', () => {
  if (!chapters.length) return;
  const i = Math.min(chapters.length - 1, currentIndex + 1);
  if (i !== currentIndex) displayChapter(i);
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key.toLowerCase() === 'f'){ e.preventDefault(); chapterSearch?.focus(); }
  if(e.key.toLowerCase() === 'd'){ themeToggle?.click(); }
  if(e.key === 'ArrowLeft'){ prevBtn?.click(); }
  if(e.key === 'ArrowRight'){ nextBtn?.click(); }
  if(e.key === '+'){ bumpFontSize(1); }
  if(e.key === '-'){ bumpFontSize(-1); }
});

// ===== SEARCH / FILTER =====
function filterTOC(term){
  const q = term.trim().toLowerCase();
  [...tocList.querySelectorAll('li')].forEach(li => {
    const text = li.innerText.toLowerCase();
    li.style.display = text.includes(q) ? '' : 'none';
  });
}
document.getElementById('toc-filter')?.addEventListener('input', e => filterTOC(e.target.value));
chapterSearch?.addEventListener('input', e => filterTOC(e.target.value));

// ===== THEME + STYLES =====
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? "☀️ Light Mode" : "🌙 Dark Mode";
  persist('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

fontSizeSelect?.addEventListener('change', () => {
  applyFontSize();
  persist('defaultFontSize', fontSizeSelect.value);
});
function applyFontSize(){
  document.documentElement.style.setProperty('--chapter-font-size', fontSizeSelect?.value || '100%');
}

textColorPicker?.addEventListener('input', applyTextColor);
function applyTextColor(){
  const color = textColorPicker?.value || '#111111';
  viewer.style.color = color;
}

bgStyleSelect?.addEventListener('change', applyBackgroundStyle);
function applyBackgroundStyle(){
  const mode = bgStyleSelect?.value || 'transparent';
  const wrap = document.getElementById('viewer-wrap');
  if (mode === 'black'){
    wrap.style.background = 'rgba(0,0,0,0.75)';
  } else {
    wrap.style.background = getComputedStyle(document.body).getPropertyValue('--glass');
    if (document.body.classList.contains('dark')) wrap.style.background = 'var(--glass-dark)';
  }
}

// ===== MODALS =====
creditsBtn?.addEventListener("click", () => { creditsModal.style.display = "flex"; });
shortcutsBtn?.addEventListener("click", () => { shortcutsModal.style.display = "flex"; });
settingsBtn?.addEventListener("click", () => { settingsModal.style.display = "flex"; });

closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    document.getElementById(targetId).style.display = "none";
  });
});
window.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) e.target.style.display = "none";
});

// Reset All
document.getElementById('reset-all')?.addEventListener('click', () => {
  localStorage.clear();
  location.reload();
});

// Home
homeBtn?.addEventListener('click', () => {
  readerLayout.classList.add('hidden');
  librarySection.classList.remove('hidden');
  document.querySelectorAll('.reader-only').forEach(el => el.classList.add('hidden'));
});
