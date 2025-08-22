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

let book = null;
let rendition = null;
let toc = [];

// ===== THEME =====
window.addEventListener('load', () => {
  if(localStorage.getItem('theme') === 'dark'){
    document.body.classList.add('dark');
    themeToggle.textContent = "☀️ Light Mode";
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
  }
  loadLibrary();
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ===== LOAD LIBRARY =====
async function loadLibrary(){
  const res = await fetch('library.json');
  const books = await res.json();

  bookGrid.innerHTML = '';
  for(const it of books){
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="covers/${it.cover}" alt="${it.title}">
      <div class="title">${it.title}</div>
    `;
    card.addEventListener('click', () => {
      openBook(`epubs/${it.file}`);
    });
    bookGrid.appendChild(card);
  }
}

// ===== OPEN BOOK =====
async function openBook(url){
  book = ePub(url);
  rendition = book.renderTo("viewer", { width:"100%", height:"100%", flow:"scrolled" });
  rendition.display();

  document.getElementById('library').classList.add('hidden');
  readerLayout.classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.remove('hidden'));
  infoBtn.classList.remove('hidden');

  const navigation = await book.loaded.navigation;
  toc = navigation.toc;
  renderTOC();
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

// ===== NAVIGATION =====
prevBtn.addEventListener('click', () => rendition.prev());
nextBtn.addEventListener('click', () => rendition.next());
chapterSearch.addEventListener('input', () => {
  const val = chapterSearch.value.toLowerCase();
  Array.from(tocList.children).forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
});

// ===== HOME =====
homeBtn.addEventListener('click', () => {
  readerLayout.classList.add('hidden');
  document.getElementById('library').classList.remove('hidden');
  readerOnlyEls.forEach(el => el.classList.add('hidden'));
  infoBtn.classList.add('hidden');
});

// ===== MODALS =====
function openModal(modal){ modal.style.display='flex'; }
function closeModal(modal){ modal.style.display='none'; }

infoBtn.addEventListener('click', () => openModal(infoModal));
shortcutsBtn.addEventListener('click', () => openModal(shortcutsModal));
settingsBtn.addEventListener('click', () => openModal(settingsModal));
creditsBtn.addEventListener('click', () => openModal(creditsModal));

closeModalButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.target);
    if(modal) closeModal(modal);
  });
});

window.addEventListener('click', (e) => {
  if(e.target.classList.contains('modal')) closeModal(e.target);
});
