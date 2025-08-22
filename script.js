// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',
  githubRepo: 'Heavenly-EPUB-Reader',
  epubsFolder: 'epubs',
  coversFolder: 'covers',
  manifestFile: 'library.json'
};

// ===== DOM =====
const themeToggle = document.getElementById('theme-toggle');
const homeBtn = document.getElementById('home-btn');
const bookGrid = document.getElementById('book-grid');
const readerLayout = document.getElementById('reader-layout');
const viewer = document.getElementById('viewer');
const tocList = document.getElementById('toc-list');
const prevBtn = document.getElementById('prev-ch');
const nextBtn = document.getElementById('next-ch');
const chapterSearch = document.getElementById('chapter-search');

const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

const readerOnlyEls = document.querySelectorAll('.reader-only');

// ===== STATE =====
let book = null;
let rendition = null;
let toc = [];
let currentLocation = null;

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

// ===== THEME INIT =====
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

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  persist('theme', isDark ? 'dark' : 'light');
});

// ===== INIT =====
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
                   path: `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.epubsFolder}/${f.name}`
                 }));
  } catch (err) {
    console.warn("GitHub API failed, using manifest:", err);
    try {
      const res = await fetch(CONFIG.manifestFile);
      if (res.ok) items = await res.json();
    } catch(e){ console.error("Library manifest error:", e); }
  }

  bookGrid.innerHTML = '';
  for (const it of items){
    const base = it.file.replace(/\.epub$/i,'');
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
      openBook(it.path);
    });
    bookGrid.appendChild(card);
  }
}

// ===== OPEN BOOK =====
async function openBook(url){
  book = ePub(url);
  rendition = book.renderTo("viewer", {
    width: "100%",
    height: "100%",
    flow: "scrolled"
  });
  rendition.display();

  // Show reader UI
  document.getElementById('library').classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn.classList.remove('hidden');

  // Load TOC
  const navigation = await book.loaded.navigation;
  toc = navigation.toc;
  renderTOC();

  // Update location tracking
  rendition.on("relocated", (location) => {
    currentLocation = location;
  });
}

// ===== TOC =====
function renderTOC(){
  tocList.innerHTML = '';
  toc.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = item.label;
    a.href = "#";
    a.addEventListener('click', (e) => {
      e.preventDefault();
      rendition.display(item.href);
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });
}

// ===== CHAPTER NAV =====
prevBtn?.addEventListener('click', () => rendition.prev());
nextBtn?.addEventListener('click', () => rendition.next());
chapterSearch?.addEventListener('input', () => {
  const val = chapterSearch.value.toLowerCase();
  Array.from(tocList.children).forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
});

// ===== HOME BTN =====
homeBtn?.addEventListener('click', () => {
  readerLayout.classList.add('hidden');
  document.getElementById('library').classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
  infoBtn.classList.add('hidden');
});

// ===== MODALS =====
function openModal(modal){ modal.style.display = 'flex'; }
function closeModal(modal){ modal.style.display = 'none'; }

infoBtn?.addEventListener('click', () => openModal(infoModal));
shortcutsBtn?.addEventListener('click', () => openModal(shortcutsModal));
settingsBtn?.addEventListener('click', () => openModal(settingsModal));
creditsBtn?.addEventListener('click', () => openModal(creditsModal));

closeModalButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.target.dataset.target;
    if (target) closeModal(document.getElementById(target));
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
