// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',
  githubRepo: 'Heavenly-EPUB-Reader',   // exact repo name
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
  const savedTheme = read('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeToggle) themeToggle.textContent = "☀️ Light Mode";
  }
  init();
});

homeBtn?.addEventListener('click', showLibrary);

async function init(){
  await loadLibrary();
  loadGithubBackgrounds();
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
                   path: f.download_url 
                 }));
  } catch (err) {
    console.warn("GitHub API failed, using manifest:", err);
    try {
      const res = await fetch(CONFIG.manifestFile);
      if (res.ok) items = await res.json();
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
      `${CONFIG.coversFolder}/${base}.jpg`,
      `${CONFIG.coversFolder}/${base}.png`,
      'assets/placeholder.png'
    ];
    const cover = await firstReachable(coverCandidates) || 'assets/placeholder.png';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<img src="${cover}" alt="${base} cover"><div class="title">${it.title}</div>`;
    card.addEventListener('click', () => {
      openBook(it.path || `${CONFIG.epubsFolder}/${it.file}`, { cover });
    });
    bookGrid.appendChild(card);
  }
}

// ===== BACKGROUNDS =====
const bgGallery = document.getElementById('bg-gallery');
async function loadGithubBackgrounds() {
  const user = CONFIG.githubUser;
  const repo = CONFIG.githubRepo;
  const folder = CONFIG.backgroundsFolder;
  try {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${folder}`;
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('GitHub API error');
    const files = await res.json();
    files.forEach(file => {
      if(/\.(jpg|jpeg|png|webp)$/i.test(file.name)){
        const img = document.createElement('img');
        img.src = file.download_url;
        img.className = 'bg-thumb';
        img.addEventListener('click', () => {
          document.body.style.background = `url('${img.src}') no-repeat center center fixed`;
          document.body.style.backgroundSize = 'cover';
          persist('bgImage', img.src);
        });
        bgGallery.appendChild(img);
      }
    });
  } catch {}
}

// ===== BOOK READER =====
async function openBook(url, { cover } = {}){
  librarySection.classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn.classList.remove('hidden');

  book = ePub(url);
  rendition = book.renderTo(viewer, { width: "100%", height: "100%", flow: "scrolled" });
  rendition.display();

  currentCoverUrl = cover;
  applyRenditionTheme();

  await loadTOC();
}

// ===== TOC LOADER with fallback =====
async function loadTOC() {
  try {
    // First try proper navigation
    const navigation = await book.loaded.navigation;
    toc = navigation.toc;

    // Fallback to spine if empty
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

function renderTOC(items, parentEl = tocList) {
  parentEl.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = item.label.trim() || `Chapter ${index + 1}`;
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

// ===== CONTROLS =====
prevBtn?.addEventListener('click', () => {
  if (toc.length && currentChapterIndex > 0) {
    currentChapterIndex--;
    rendition.display(toc[currentChapterIndex].href);
  }
});
nextBtn?.addEventListener('click', () => {
  if (toc.length && currentChapterIndex < toc.length - 1) {
    currentChapterIndex++;
    rendition.display(toc[currentChapterIndex].href);
  }
});

fontSizeSelect.addEventListener('change', applyRenditionTheme);
textColorPicker.addEventListener('input', applyRenditionTheme);
bgStyleSelect.addEventListener('change', applyRenditionTheme);

// ===== APPLY THEME TO BOOK =====
function applyRenditionTheme() {
  if (!rendition) return;

  const fontSize = fontSizeSelect.value;
  const textColor = textColorPicker.value;
  const bgStyle = bgStyleSelect.value;
  const isDark = document.body.classList.contains('dark');
  let backgroundColor = bgStyle === 'black' ? '#000' : 'transparent';

  rendition.themes.default({
    'body': {
      fontSize,
      color: textColor,
      background: backgroundColor,
      'line-height': '1.6',
      'font-family': "'Poppins', sans-serif"
    }
  });

  if (isDark && bgStyle === 'transparent') {
    rendition.themes.default({ 'body': { background: '#111' } });
  }
}

// ===== MODALS =====
function openModal(modal){ modal.style.display="flex"; }
function closeModal(modal){ modal.style.display="none"; }

creditsBtn?.addEventListener('click', ()=>openModal(creditsModal));
shortcutsBtn?.addEventListener('click', ()=>openModal(shortcutsModal));
settingsBtn?.addEventListener('click', ()=>openModal(settingsModal));
infoBtn?.addEventListener('click', ()=>openModal(document.getElementById("info-modal")));

closeModalButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = btn.dataset.target;
    if (target) closeModal(document.getElementById(target));
  });
});

// ===== SHOW LIBRARY =====
function showLibrary(){
  librarySection.classList.remove('hidden');
  readerLayout.classList.add('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
  infoBtn.classList.add('hidden');
}
