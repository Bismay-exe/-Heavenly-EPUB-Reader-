
// restoreWorker.js - runs in Web Worker
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

const DB_NAME = "HeavenlyEPUBReader";
const DB_VERSION = 1;
const STORE_NAME = "books";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveBookToDB(bookId, fileData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id: bookId, fileData });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

let paused = false;
let canceled = false;

self.onmessage = async (e) => {
  const { type } = e.data;
  if (type === "pause") paused = true;
  else if (type === "resume") { paused = false; }
  else if (type === "cancel") { canceled = true; }
  else if (type === "start") {
    const { zipBuffer, overwrite, existing } = e.data;
    const existingSet = new Set(existing || []);

    const zip = await JSZip.loadAsync(zipBuffer);
    const files = Object.keys(zip.files).filter(n => n.toLowerCase().endsWith(".epub"));

    for (let i = 0; i < files.length; i++) {
      if (canceled) { self.postMessage({ type: "canceled" }); return; }
      while (paused) { await new Promise(r => setTimeout(r, 100)); }

      const fileName = files[i];
      const epubData = await zip.files[fileName].async("uint8array");

      if (existingSet.has(fileName)) {
        if (overwrite) {
          await saveBookToDB(fileName, epubData);
          self.postMessage({ type: "item", fileName, action: "overwritten" });
        } else {
          self.postMessage({ type: "item", fileName, action: "skipped" });
        }
      } else {
        await saveBookToDB(fileName, epubData);
        self.postMessage({ type: "item", fileName, action: "new" });
      }

      const percent = Math.round(((i + 1) / files.length) * 100);
      self.postMessage({ type: "progress", percent });
    }

    self.postMessage({ type: "complete" });
  }
};
