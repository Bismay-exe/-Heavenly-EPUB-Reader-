// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',                 
  githubRepo: 'heavenly-epub-reader',       
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

const fontSizeSelect = document.getElementById('font-size');
const prevBtn = document.getElementById('prev-ch');
const nextBtn = document.getElementById('next-ch');
const textColorPicker = document.getElementById('text-color');
const bgStyleSelect = document.getElementById('bg-style');
const readingModeSelect = document.getElementById('reading-mode');
const readerOnlyEls = document.querySelectorAll('.reader-only');

const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
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

// ===== UTIL =====
function persist(key, val){ try { localStorage.setItem(key, val); } catch {} }
function read(key){ try { return localStorage.getItem(key); } catch { return null; } }
function beautifyName(s){ return s.replace(/[_-]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase()); }

async function firstReachable(urls){
  for (const u of urls){
    try { const r = await fetch(u, { method:'HEAD' }); if(r.ok) return u; } catch {}
  }
  return null;
}

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
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
  }
  init();
});

// ===== INIT =====
homeBtn?.addEventListener('click', showLibrary);

async function init(){
  await loadLibrary();
}

// ===== LIBRARY LOADER =====
async function loadLibrary(){
  bookGrid.innerHTML = '<p class="muted">Loading library…</p>';
  let items = [];

  try {
    const apiUrl = `https://api.github.com/repos/${CONFIG.githubUser}/${CONFIG.githubRepo}/contents/${CONFIG.epubsFolder}`;
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('GitHub API error');
    const files = await res.json();
    items = files.filter(f => f.type === 'file' && /\.epub$/i.test(f.name))
                 .map(f => ({ 
                   title: beautifyName(f.name.replace(/\.epub$/i,'')), 
                   file: f.name, 
                   cover: null, 
                   path: `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.epubsFolder}/${f.name}`
                 }));
  } catch (err) {
    console.warn("GitHub API failed, using manifest:", err);
    try {
      const res = await fetch(CONFIG.manifestFile);
      if (res.ok) {
        const manifest = await res.json();
        items = manifest.books || manifest;  
      }
    } catch(e){ console.error("Library manifest error:", e); }
  }

  if(!items.length){
    bookGrid.innerHTML = `<p class="muted">No books found.</p>`;
    return;
  }

  bookGrid.innerHTML = '';
  for (const it of items){
    const base = (it.file || it.name).replace(/\.epub$/i,'');
    const coverCandidates = [
      it.cover ? `${CONFIG.coversFolder}/${it.cover}` : null,
      `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.coversFolder}/${base}.jpg`,
      `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.coversFolder}/${base}.png`,
      `${CONFIG.coversFolder}/${base}.jpg`,
      `${CONFIG.coversFolder}/${base}.png`,
      'assets/placeholder.png'
    ].filter(Boolean);

    const cover = await firstReachable(coverCandidates) || 'assets/placeholder.png';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${cover}" alt="${base} cover">
      <div class="title">${it.title || beautifyName(base)}</div>
    `;
    card.addEventListener('click', () => {
      openBook(it.path || `${CONFIG.epubsFolder}/${it.file}`, cover);
    });
    bookGrid.appendChild(card);
  }
}

// ===== OPEN BOOK =====
async function openBook(url, cover){
  book = ePub(url);
  rendition = book.renderTo("viewer", { width:"100%", height:"100%", flow:"scrolled" });
  rendition.display();

  librarySection.classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn.classList.remove('hidden');

  // Metadata
  book.loaded.metadata.then(meta => {
    bookMetaDiv.innerHTML = `
      <p><strong>Title:</strong> ${meta.title || 'Unknown'}</p>
      <p><strong>Author:</strong> ${meta.creator || 'Unknown'}</p>
    `;
  });

  await loadTOC();
  currentChapterIndex = 0;
  applyRenditionTheme();
}

// ===== TOC =====
async function loadTOC() {
  try {
    const navigation = await book.loaded.navigation;
    toc = navigation.toc;
    renderTOC(toc);
  } catch (err) {
    console.error("Failed to load TOC:", err);
  }
}

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

    if (item.subitems && item.subitems.length > 0) {
      const subUl = document.createElement("ul");
      renderTOC(item.subitems, subUl);
      li.appendChild(subUl);
    }

    parentEl.appendChild(li);
  });
}

// ===== CHAPTER NAVIGATION =====
function goToChapter(index) {
  if (index < 0 || index >= toc.length) return;
  currentChapterIndex = index;
  rendition.display(toc[currentChapterIndex].href);
}

prevBtn.addEventListener("click", () => goToChapter(currentChapterIndex - 1));
nextBtn.addEventListener("click", () => goToChapter(currentChapterIndex + 1));

// ===== THEME FOR EPUB CONTENT =====
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

fontSizeSelect.addEventListener('change', applyRenditionTheme);
textColorPicker.addEventListener('input', applyRenditionTheme);
bgStyleSelect.addEventListener('change', applyRenditionTheme);

// ===== MODALS =====
function openModal(modal) { modal.style.display = 'flex'; }
function closeModal(modal) { modal.style.display = 'none'; }

creditsBtn?.addEventListener('click', () => openModal(creditsModal));
infoBtn?.addEventListener('click', () => openModal(infoModal));
shortcutsBtn?.addEventListener('click', () => openModal(shortcutsModal));
settingsBtn?.addEventListener('click', () => openModal(settingsModal));

closeModalButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const modal = document.getElementById(targetId);
    if (modal) closeModal(modal);
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    closeModal(e.target);
  }
});

// ===== SHOW LIBRARY =====
function showLibrary(){
  readerLayout.classList.add('hidden');
  librarySection.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
  infoBtn.classList.add('hidden');
}
