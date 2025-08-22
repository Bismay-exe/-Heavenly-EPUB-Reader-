// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',                 // your username
  githubRepo: 'Heavenly-EPUB-Reader',       // URL-safe repo name
  epubsFolder: 'epubs',
  coversFolder: 'covers',
  backgroundsFolder: 'backgrounds',
  manifestFile: 'library.json'              // fallback JSON
};

// ===== DOM =====
const themeToggle = document.getElementById('theme-toggle');
const homeBtn = document.getElementById('home-btn');
const librarySection = document.getElementById('library');
const recentSection = document.getElementById('recent');
const recentGrid = document.getElementById('recent-grid');
const finishedSection = document.getElementById('finished');
const finishedGrid = document.getElementById('finished-grid');
const continueSection = document.getElementById('continue');
const continueContainer = document.getElementById('continue-container');

const bookGrid = document.getElementById('book-grid');
const readerLayout = document.getElementById('reader-layout');
const viewer = document.getElementById('viewer');
const viewerWrap = document.getElementById('viewer-wrap');
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
const infoModal = document.getElementById('info-modal');
const bookMetaDiv = document.getElementById('book-meta');

const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');

const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

const finishBtn = document.getElementById('finish-btn');

// ===== STATE =====
let book = null;
let rendition = null;
let spine = [];
let toc = [];
let currentSpineIndex = 0;
let currentCoverUrl = null;

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

// ===== THEME & INIT =====
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? "☀️ Light Mode" : "🌙 Dark Mode";
  applyRenditionTheme();
  persist('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

window.addEventListener('load', () => {
  const savedTheme = read('theme') || read('defaultTheme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeToggle) themeToggle.textContent = "☀️ Light Mode";
  }
  const defaultMode = read('defaultReadingMode');
  if (defaultMode && readingModeSelect) readingModeSelect.value = defaultMode;
  const defaultFont = read('defaultFontSize');
  if (defaultFont && fontSizeSelect) fontSizeSelect.value = defaultFont;

  init();
});

homeBtn?.addEventListener('click', showLibrary);

async function init(){
  await loadLibrary();
  loadGithubBackgrounds();
  loadRecent();
  loadFinished();
  loadContinue();
}

// ===== LIBRARY LOADER =====
async function loadLibrary(){
  bookGrid.innerHTML = '<p class="muted">Loading library…</p>';
  let items = [];

  // Try GitHub API
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
                   path: f.download_url 
                 }));
  } catch (err) {
    console.warn("GitHub API failed, using manifest:", err);
    try {
      const res = await fetch(CONFIG.manifestFile);
      if (res.ok) {
        const manifest = await res.json();
        items = manifest.books || manifest;  // support both formats
      }
    } catch(e){ console.error("Library manifest error:", e); }
  }

  if(!items.length){
    bookGrid.innerHTML = `<p class="muted">No books found. Add .epub files to <code>/${CONFIG.epubsFolder}</code> and matching cover images to <code>/${CONFIG.coversFolder}</code>.</p>`;
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
      let url = it.path || `${CONFIG.epubsFolder}/${it.file}`;
      if (!/^(http|https):\/\//i.test(url)){
        url = `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${url}`;
      }
      persist('lastBookURL', url);
      currentCoverUrl = cover;
      openBook(url, { cover, cfi: null });
    });
    bookGrid.appendChild(card);
  }
}

// (the rest of your code remains the same, no changes needed)
