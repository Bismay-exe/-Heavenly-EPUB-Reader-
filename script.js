// ===== CONFIG =====
const CONFIG = {
  githubUser: 'Bismay-exe',          // change to your username
  githubRepo: '✨ Heavenly EPUB Reader 📖',         // change to your repo
  epubsFolder: 'epubs',
  coversFolder: 'covers',
  backgroundsFolder: 'backgrounds',
  manifestFile: 'library.json'          // local fallback
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
  // defaults prefill
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
  try {
    const apiUrl = `https://api.github.com/repos/${CONFIG.githubUser}/${CONFIG.githubRepo}/contents/${CONFIG.epubsFolder}`;
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('GitHub API error');
    const files = await res.json();
    items = files.filter(f => f.type === 'file' && /\.epub$/i.test(f.name))
                 .map(f => ({ name: f.name, path: f.download_url || f.path }));
  } catch (err) {
    try {
      const res = await fetch(CONFIG.manifestFile);
      if (res.ok) {
        const manifest = await res.json();
        items = manifest.books || [];
      }
    } catch {}
  }

  if(!items.length){
    bookGrid.innerHTML = `<p class="muted">No books found. Add .epub files to <code>/${CONFIG.epubsFolder}</code> and matching cover images to <code>/${CONFIG.coversFolder}</code>.</p>`;
    return;
  }

  bookGrid.innerHTML = '';
  for (const it of items){
    const base = it.name.replace(/\.epub$/i,'');
    const coverCandidates = [
      `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.coversFolder}/${base}.jpg`,
      `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/main/${CONFIG.coversFolder}/${base}.png`,
      `${CONFIG.coversFolder}/${base}.jpg`,
      `${CONFIG.coversFolder}/${base}.png`
    ];
    const cover = await firstReachable(coverCandidates) || 'assets/placeholder.png';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${cover}" alt="${base} cover">
      <div class="title">${beautifyName(base)}</div>
    `;
    card.addEventListener('click', () => {
      let url = it.path;
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

// ===== BACKGROUNDS =====
const bgGallery = document.getElementById('bg-gallery');
async function loadGithubBackgrounds() {
  const user = CONFIG.githubUser;
  const repo = CONFIG.githubRepo;
  const folder = CONFIG.backgroundsFolder;
  const fallbackBg = 'backgrounds/bg.jpg';
  try {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${folder}`;
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('GitHub API error');
    const files = await res.json();
    let loadedAny = false;
    files.forEach(file => {
      if(file.type === "file" && /\.(jpg|jpeg|png|webp)$/i.test(file.name)){
        const img = document.createElement('img');
        img.src = file.download_url;
        img.className = 'bg-thumb';
        img.alt = file.name;
        img.addEventListener('click', () => {
          document.body.style.background = `url('${img.src}') no-repeat center center fixed`;
          document.body.style.backgroundSize = 'cover';
          persist('bgImage', img.src);
        });
        bgGallery.appendChild(img);
        loadedAny = true;
      }
    });
    if(!loadedAny) setFallbackBackground(fallbackBg);
  } catch (err) {
    const savedBg = read('bgImage');
    if (savedBg) setFallbackBackground(savedBg); else setFallbackBackground(fallbackBg);
  }
}

function setFallbackBackground(src) {
  document.body.style.background = `url('${src}') no-repeat center center fixed`;
  document.body.style.backgroundSize = 'cover';
}

// ===== VIEW SWITCH =====
function showLibrary(){
  readerLayout.classList.add('hidden');
  librarySection.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
}

// ===== OPEN BOOK =====
async function openBook(resource, opts = {}) {
  const mode = (readingModeSelect && readingModeSelect.value) || read('readingMode') || read('defaultReadingMode') || 'scrolled';

  // UI
  librarySection.classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  if (infoBtn) infoBtn.classList.remove('hidden');

  // Clean previous
  if (rendition) { try { rendition.destroy(); } catch {} }
  if (book) { try { book.destroy(); } catch {} }

  book = ePub(resource);
  rendition = book.renderTo('viewer', {
    width: '100%',
    height: '100%',
    flow: mode === 'paginated' ? 'paginated' : 'scrolled',
    spread: mode === 'paginated' ? 'always' : 'none'
  });
  applyRenditionTheme();
  await rendition.display(opts.cfi || undefined);

  await book.ready;

  // Spine & TOC
  spine = book.spine?.items || [];
  currentSpineIndex = 0;

  try {
    const nav = await book.loaded.navigation;
    toc = nav.toc || [];
    buildTOC(toc);
    if (toc.length && toc[0].href) {
      const idx = book.spine?.indexFromHref(toc[0].href);
      if (idx >= 0) currentSpineIndex = idx;
    }
  } catch {
    tocList.innerHTML = '<li><em>No table of contents</em></li>';
  }

  // Metadata
  loadBookMeta(book);

  // Track relocation for recents
  rendition.on('relocated', (loc) => {
    try {
      currentSpineIndex = book.spine?.indexFromCfi(loc.start.cfi) ?? currentSpineIndex;
      const href = loc.start.href;
      let chapLabel = null;
      if (toc && toc.length){
        const item = toc.find(it => it.href === href);
        if(item) chapLabel = item.label;
      }
      const title = book.package?.metadata?.title || resource.split('/').pop();
      const recentObj = {
        url: resource,
        title,
        cover: opts.cover || currentCoverUrl || 'assets/placeholder.png',
        chapter: chapLabel,
        cfi: loc.start.cfi,
        time: Date.now()
      };
      addOrUpdateRecent(recentObj);
      loadRecent();
      loadContinue();
    } catch {}
  });
}

// ===== TOC =====
function buildTOC(items) {
  tocList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  items.forEach((item, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = item.label?.trim() || `Chapter ${i+1}`;
    a.href = '#';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.href) {
        rendition.display(item.href);
        const idx = book.spine?.indexFromHref(item.href);
        if (idx >= 0) currentSpineIndex = idx;
      }
    });
    li.appendChild(a);

    if (item.subitems?.length) {
      const sub = document.createElement('ul');
      item.subitems.forEach((si, j) => {
        const sli = document.createElement('li');
        const sa = document.createElement('a');
        sa.textContent = '— ' + (si.label?.trim() || `Section ${i+1}.${j+1}`);
        sa.href = '#';
        sa.addEventListener('click', (e) => {
          e.preventDefault();
          if (si.href) {
            rendition.display(si.href);
            const idx = book.spine?.indexFromHref(si.href);
            if (idx >= 0) currentSpineIndex = idx;
          }
        });
        sli.appendChild(sa);
        sub.appendChild(sli);
      });
      li.appendChild(sub);
    }

    fragment.appendChild(li);
  });
  tocList.appendChild(fragment);
}

// TOC filter + header search
function filterTOC(term){
  const q = term.trim().toLowerCase();
  [...tocList.querySelectorAll('li')].forEach(li => {
    const text = li.innerText.toLowerCase();
    li.style.display = text.includes(q) ? '' : 'none';
  });
}
tocFilter?.addEventListener('input', e => filterTOC(e.target.value));
chapterSearch?.addEventListener('input', e => filterTOC(e.target.value));

// ===== CHAPTER NAV =====
prevBtn?.addEventListener('click', () => { goChapter(-1); });
nextBtn?.addEventListener('click', () => { goChapter(1); });
function goChapter(delta){
  if (!book || !spine.length) return;
  let idx = currentSpineIndex + delta;
  idx = Math.max(0, Math.min(spine.length - 1, idx));
  currentSpineIndex = idx;
  const href = spine[idx].href;
  rendition.display(href);
}

// ===== TEXT & BG STYLES =====
fontSizeSelect?.addEventListener('change', () => {
  if (rendition) rendition.themes.override('font-size', fontSizeSelect.value);
  persist('defaultFontSize', fontSizeSelect.value);
});

textColorPicker?.addEventListener('input', () => { applyRenditionTheme(); });

bgStyleSelect?.addEventListener('change', () => {
  const mode = bgStyleSelect.value; // 'black' | 'transparent'
  if (mode === 'black'){
    viewerWrap.style.background = 'rgba(0,0,0,0.75)';
  } else {
    viewerWrap.style.background = getComputedStyle(document.body).getPropertyValue('--glass');
    if (document.body.classList.contains('dark')) viewerWrap.style.background = 'var(--glass-dark)';
  }
});

function applyRenditionTheme() {
  if (!rendition) return;
  const isDark = document.body.classList.contains('dark');
  const textColor = textColorPicker?.value || (isDark ? '#f0f0f0' : '#111111');

  rendition.themes.register('heavenly', {
    'body': { 'background': 'transparent', 'color': textColor },
    'p, li': { 'line-height': '1.8' }
  });
  rendition.themes.select('heavenly');
  rendition.themes.override('font-family', 'Poppins, sans-serif');
  if (fontSizeSelect) rendition.themes.override('font-size', fontSizeSelect.value);
}

// ===== READING MODE =====
if (readingModeSelect){
  const savedMode = read('readingMode') || read('defaultReadingMode') || 'scrolled';
  readingModeSelect.value = savedMode;
  readingModeSelect.addEventListener('change', () => {
    const mode = readingModeSelect.value;
    persist('readingMode', mode);
    reflowRendition(mode);
  });
}

function reflowRendition(mode){
  if (!book || !rendition) return;
  let currentCfi = null;
  try {
    const loc = rendition.currentLocation();
    currentCfi = loc && (loc.start?.cfi || loc.end?.cfi);
  } catch {}
  try { rendition.destroy(); } catch {}
  rendition = book.renderTo('viewer', {
    width: '100%',
    height: '100%',
    flow: mode === 'paginated' ? 'paginated' : 'scrolled',
    spread: mode === 'paginated' ? 'always' : 'none'
  });
  applyRenditionTheme();
  if (currentCfi) { rendition.display(currentCfi); } else { rendition.display(); }
  rendition.on('relocated', (loc) => {
    try { currentSpineIndex = book.spine?.indexFromCfi(loc.start.cfi) ?? currentSpineIndex; } catch {}
  });
}

// ===== MODALS =====
infoBtn?.addEventListener('click', () => { infoModal.style.display = 'flex'; });
shortcutsBtn?.addEventListener('click', () => { shortcutsModal.style.display = 'flex'; });
settingsBtn?.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
document.querySelectorAll('.modal .close-modal').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    document.getElementById(target).style.display = 'none';
  });
});
window.addEventListener('click', (e) => {
  if(e.target.classList.contains('modal')) e.target.style.display = 'none';
});

function loadBookMeta(b){
  if(!b) return;
  b.loaded.metadata.then(meta => {
    let html = `<p><strong>Title:</strong> ${meta.title || 'Unknown'}</p>`;
    if(meta.creator) html += `<p><strong>Author:</strong> ${meta.creator}</p>`;
    if(meta.publisher) html += `<p><strong>Publisher:</strong> ${meta.publisher}</p>`;
    if(meta.language) html += `<p><strong>Language:</strong> ${meta.language}</p>`;
    if(meta.description) html += `<p><strong>Description:</strong> ${meta.description}</p>`;
    bookMetaDiv.innerHTML = html;
  }).catch(()=>{
    bookMetaDiv.innerHTML = '<p><em>No metadata available.</em></p>';
  });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key.toLowerCase() === 'f'){ e.preventDefault(); chapterSearch?.focus(); }
  if(e.key.toLowerCase() === 'd'){ themeToggle?.click(); }
  if(e.key.toLowerCase() === 'm'){
    if(readingModeSelect){
      readingModeSelect.value = readingModeSelect.value === 'scrolled' ? 'paginated' : 'scrolled';
      readingModeSelect.dispatchEvent(new Event('change'));
    }
  }
  if(e.key === '+'){ changeFontSize(1); }
  if(e.key === '-'){ changeFontSize(-1); }
  if(e.key === 'ArrowLeft'){ goChapter(-1); }
  if(e.key === 'ArrowRight'){ goChapter(1); }
});

function changeFontSize(delta){
  if(!fontSizeSelect) return;
  let idx = fontSizeSelect.selectedIndex + delta;
  idx = Math.max(0, Math.min(fontSizeSelect.options.length-1, idx));
  fontSizeSelect.selectedIndex = idx;
  fontSizeSelect.dispatchEvent(new Event('change'));
}

// ===== RECENT / CONTINUE =====
function addOrUpdateRecent(bookObj){
  let recents = JSON.parse(read('recentBooks')||'[]');
  recents = recents.filter(b => b.url !== bookObj.url);
  recents.unshift(bookObj);
  recents = recents.slice(0,5);
  persist('recentBooks', JSON.stringify(recents));
}

function loadRecent(){
  let recents = [];
  try { recents = JSON.parse(read('recentBooks')) || []; } catch {}
  if(!recents.length){ recentSection.classList.add('hidden'); return; }
  recentSection.classList.remove('hidden');
  recentGrid.innerHTML = '';
  recents.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${r.cover}" alt="${r.title} cover">
      <div class="title">${r.title}${r.chapter ? " — "+r.chapter : ""}</div>
    `;
    card.addEventListener('click', async () => {
      await openBook(r.url, { cover: r.cover, cfi: r.cfi || null });
      if(r.cfi && rendition) rendition.display(r.cfi);
    });
    recentGrid.appendChild(card);
  });
}

function loadContinue(){
  let recents = [];
  try { recents = JSON.parse(read('recentBooks')) || []; } catch {}
  if(!recents.length){ continueSection.classList.add('hidden'); return; }
  const r = recents[0];
  continueSection.classList.remove('hidden');
  continueContainer.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img src="${r.cover}" alt="${r.title} cover">
    <div class="title">${r.title}${r.chapter ? " — "+r.chapter : ""}</div>
  `;
  card.addEventListener('click', async () => {
    await openBook(r.url, { cover: r.cover, cfi: r.cfi || null });
    if(r.cfi && rendition) rendition.display(r.cfi);
  });
  continueContainer.appendChild(card);
}

// ===== FINISHED =====
function addFinished(bookObj){
  let finished = JSON.parse(read('finishedBooks')||'[]');
  finished = finished.filter(b => b.url !== bookObj.url);
  finished.unshift(bookObj);
  persist('finishedBooks', JSON.stringify(finished));
}

function loadFinished(){
  let finished = [];
  try { finished = JSON.parse(read('finishedBooks')) || []; } catch {}
  if(!finished.length){ finishedSection.classList.add('hidden'); return; }
  finishedSection.classList.remove('hidden');
  finishedGrid.innerHTML = '';
  finished.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${r.cover}" alt="${r.title} cover">
      <div class="title">${r.title} — Finished</div>
    `;
    card.addEventListener('click', async () => { await openBook(r.url, { cover: r.cover }); });
    finishedGrid.appendChild(card);
  });
}

finishBtn?.addEventListener('click', () => {
  let recents = [];
  try { recents = JSON.parse(read('recentBooks')) || []; } catch {}
  if(!recents.length) return;
  const r = recents[0];
  recents = recents.filter(b => b.url !== r.url);
  persist('recentBooks', JSON.stringify(recents));
  addFinished(r);
  loadContinue();
  loadRecent();
  loadFinished();
});

// ===== SETTINGS =====
document.getElementById('settings-theme')?.addEventListener('change', (e)=>{
  persist('defaultTheme', e.target.checked ? 'dark' : 'light');
});

document.getElementById('settings-reading-mode')?.addEventListener('change', (e)=>{
  persist('defaultReadingMode', e.target.value);
});

document.getElementById('settings-font-size')?.addEventListener('change', (e)=>{
  persist('defaultFontSize', e.target.value);
});

document.getElementById('clear-recent')?.addEventListener('click', ()=>{
  persist('recentBooks','[]'); loadRecent(); loadContinue();
});
document.getElementById('clear-finished')?.addEventListener('click', ()=>{
  persist('finishedBooks','[]'); loadFinished();
});
document.getElementById('reset-all')?.addEventListener('click', ()=>{
  localStorage.clear(); location.reload();
});

// ===== END =====
