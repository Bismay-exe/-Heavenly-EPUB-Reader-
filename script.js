// Basic static reader: loads library.json -> book/chapters.json -> displays .xhtml in an iframe.
const els = {
  bookList: document.getElementById("bookList"),
  cover: document.getElementById("cover"),
  bookTitle: document.getElementById("bookTitle"),
  chapterFrame: document.getElementById("chapterFrame"),
  chapterSelect: document.getElementById("chapterSelect"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
};

let state = { library: [], currentBook: null, chapters: [], idx: 0 };

async function loadJSON(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function renderLibrary(list){
  els.bookList.innerHTML = "";
  list.forEach((b) => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.src = `${b.path}/${b.cover}`;
    img.alt = `${b.title} cover`;
    const span = document.createElement("span");
    span.textContent = b.title;
    li.appendChild(img);
    li.appendChild(span);
    li.addEventListener("click", () => openBook(b));
    els.bookList.appendChild(li);
  });
}

function renderChapterSelect(chapters){
  els.chapterSelect.innerHTML = "";
  chapters.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = c.title || c.file;
    els.chapterSelect.appendChild(opt);
  });
  els.chapterSelect.addEventListener("change", (e) => {
    state.idx = parseInt(e.target.value, 10) || 0;
    showChapter();
  }, { once: true });
}

function showChapter(){
  const chap = state.chapters[state.idx];
  if(!chap) return;
  els.chapterSelect.value = String(state.idx);
  els.chapterFrame.src = `${state.currentBook.path}/${chap.file}`;
  document.title = `${chap.title || chap.file} • ${state.currentBook.title}`;
}

async function openBook(book){
  state.currentBook = book;
  els.cover.src = `${book.path}/${book.cover}`;
  els.bookTitle.textContent = book.title;
  const meta = await loadJSON(`${book.path}/chapters.json`);
  state.chapters = meta.chapters || [];
  state.idx = 0;
  renderChapterSelect(state.chapters);
  showChapter();
  history.replaceState({}, "", `?book=${encodeURIComponent(book.id)}`);
}

function prev(){ if(state.idx > 0){ state.idx--; showChapter(); } }
function next(){ if(state.idx < state.chapters.length - 1){ state.idx++; showChapter(); } }

els.prevBtn.addEventListener("click", prev);
els.nextBtn.addEventListener("click", next);

function tryFromURL(){
  const q = new URLSearchParams(location.search);
  const bookId = q.get("book");
  const ch = parseInt(q.get("ch") || "0", 10);
  if(!bookId) return false;
  const found = state.library.find(b => b.id === bookId);
  if(!found) return false;
  openBook(found).then(() => { 
    state.idx = Math.max(0, Math.min(ch, state.chapters.length-1));
    showChapter();
  });
  return true;
}

(async function init(){
  try {
    state.library = await loadJSON("library.json");
    renderLibrary(state.library);
    if(!tryFromURL() && state.library[0]){
      openBook(state.library[0]);
    }
  } catch (e){
    console.error(e);
    alert("Failed to load library. Check console for details.");
  }
})();
