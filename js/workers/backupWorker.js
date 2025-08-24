
// backupWorker.js - runs in Web Worker
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

async function getBookFromDB(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(bookId);
    request.onsuccess = () => resolve(request.result ? request.result.fileData : null);
    request.onerror = () => reject(request.error);
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
    const { fileNames } = e.data;
    const zip = new JSZip();

    for (let i = 0; i < fileNames.length; i++) {
      if (canceled) { self.postMessage({ type: "canceled" }); return; }
      while (paused) { await new Promise(r => setTimeout(r, 100)); }

      const name = fileNames[i];
      const data = await getBookFromDB(name);
      if (data) zip.file(name, data);

      const percent = Math.round(((i + 1) / fileNames.length) * 100);
      self.postMessage({ type: "progress", percent });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    self.postMessage({ type: "complete", blob });
  }
};
