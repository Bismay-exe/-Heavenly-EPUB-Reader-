# ✨ Heavenly EPUB Reader 📖  

[![GitHub stars](https://img.shields.io/github/stars/Bismay-exe/heavenly-epub-reader?style=for-the-badge&logo=github)](https://github.com/Bismay-exe/heavenly-epub-reader/stargazers)  
[![GitHub forks](https://img.shields.io/github/forks/Bismay-exe/heavenly-epub-reader?style=for-the-badge&logo=github)](https://github.com/Bismay-exe/heavenly-epub-reader/network/members)  
[![GitHub issues](https://img.shields.io/github/issues/Bismay-exe/heavenly-epub-reader?style=for-the-badge)](https://github.com/Bismay-exe/heavenly-epub-reader/issues)  
[![GitHub license](https://img.shields.io/github/license/Bismay-exe/heavenly-epub-reader?style=for-the-badge)](./LICENSE)  
[![Made with EPUB.js](https://img.shields.io/badge/Made%20with-EPUB.js-blue?style=for-the-badge)](https://github.com/futurepress/epub.js)  

---

A modern **glassmorphism-themed EPUB library + reader** built with [EPUB.js](https://github.com/futurepress/epub.js).  
Designed to be **minimal, elegant, and offline-capable**, this project turns your EPUB collection into a sleek digital library hosted on **GitHub Pages**.  

---

## 🌟 Features
- 📖 **Read EPUBs in the browser** (powered by EPUB.js)  
- 🎨 **Glassy UI** with smooth animations  
- 🌙 **Dark / Light theme toggle**  
- 🔎 **Search & filter chapters** in the TOC  
- 🔄 **Continue Reading** from last saved position  
- 🕘 **Recently Read** section (last 5 books)  
- 🏁 **Finished Books** archive  
- ⚙️ **Settings panel**  
  - Default theme, reading mode, font size  
  - Clear Recently Read / Finished Books  
  - Reset all preferences  
- 🔤 **Customize text color & font size**  
- 🖼️ **Custom backgrounds** (transparent or black)  
- ⬅️ ➡️ **Prev / Next chapter navigation**  
- ⌨️ **Keyboard shortcuts** for quick control  
- 📦 **Offline support** with Service Worker  
- 🚀 **Deployable on GitHub Pages**  

---

## 🖼️ Preview

### 📚 Library View
![Library Screenshot](assets/screenshots/library.png)

### 📖 Reader View
![Reader Screenshot](assets/screenshots/reader.png)

*(Screenshots go in `/assets/screenshots/` folder → `library.png` & `reader.png`)*  

---

## 🚀 Getting Started

### 1️⃣ Clone or Download
```bash
git clone https://github.com/Bismay-exe/heavenly-epub-reader.git
cd heavenly-epub-reader
```

Or [📦 download ZIP](https://github.com/Bismay-exe/heavenly-epub-reader/archive/refs/heads/main.zip) and extract.

---

### 2️⃣ Add Your Books
- Put your **EPUB files** in `/epubs/`  
- Add **cover images** (same name as epub) in `/covers/`  
  ```
  epubs/mybook.epub
  covers/mybook.jpg
  ```
- Background images go in `/backgrounds/`

---

### 3️⃣ Configure
Open `script.js` and confirm the config:
```js
const CONFIG = {
  githubUser: "Bismay-exe",
  githubRepo: "heavenly-epub-reader",
  epubsFolder: "epubs",
  coversFolder: "covers",
  backgroundsFolder: "backgrounds",
  manifestFile: "library.json"
};
```

---

### 4️⃣ Deploy to GitHub Pages
1. Push this repo to GitHub.  
2. Go to **Settings → Pages**.  
3. Select branch: `main`, folder: `/ (root)` → Save.  
4. Your reader will be live at:  
   ```
   https://Bismay-exe.github.io/heavenly-epub-reader/
   ```

---

## ⌨️ Keyboard Shortcuts
- ⬅️ / ➡️ : Previous / Next chapter  
- 🔍 `Ctrl + F` : Focus chapter search  
- 🌗 `D` : Toggle Dark/Light theme  
- 📜 `M` : Toggle reading mode  
- 🔠 `+ / -` : Increase / decrease font size  

---

## 📂 Repo Structure
```
heavenly-epub-reader/
├── index.html
├── style.css
├── script.js
├── sw.js
├── README.md
├── epubs/              
├── covers/             
├── backgrounds/        
└── assets/
    ├── placeholder.png
    └── screenshots/
        ├── library.png
        └── reader.png
```

---

## 📝 Credits
- Built with ❤️ using [EPUB.js](https://github.com/futurepress/epub.js)  
- UI inspired by **modern glassmorphism design** ✨  

---

## 👨‍💻 Author
Created by **[Bismay-exe](https://github.com/Bismay-exe)**  

- 🌐 GitHub: [Bismay-exe](https://github.com/Bismay-exe)  
- 📸 Instagram: [@bismay.exe](https://www.instagram.com/bismay.exe)  
- ✈️ Telegram: [@bismay_exe](https://t.me/bismay_exe)  
- 📦 Channel: [Bismay’s Inventory](https://t.me/BismaysInventory)  
