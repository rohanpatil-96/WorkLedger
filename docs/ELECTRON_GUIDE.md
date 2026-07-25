# Electron Setup & Build Guide (MacBook Pro / macOS)

This guide walks you through setting up and compiling your **WorkLedger** application for Electron on your macOS machine (including resolving the infamous `"Application entry file does not exist"` error).

---

## 🔍 Root Cause of the Entry File Error

When you ran `npm run electron:pack` or `npm run build` in the `electron/` directory, you received the following error:
```
Application entry file "build/src/index.js" in the "...resources/app.asar" does not exist.
```

### Why does this happen?
1. By default, `@capacitor-community/electron` configures `package.json` with `"main": "build/src/index.js"`.
2. However, the default `electron/tsconfig.json` is configured to output compiled files into `build/` but **does not specify a `rootDir`**.
3. Because all source files are nested inside `src/` (e.g. `src/index.ts`, `src/preload.ts`), TypeScript infers the common root directory as `./src/` and flattens the output. 
4. This means `src/index.ts` is compiled to `build/index.js` (with the `src/` prefix stripped).
5. When Electron or `electron-builder` tries to run or pack the app, it looks for `build/src/index.js`, which does not exist!

### 💡 The Fix
We added an automated utility to **automatically patch** `electron/tsconfig.json` and enforce `"rootDir": "./"`. Under this configuration:
* `src/index.ts` compiles to `build/src/index.js`
* `src/preload.ts` compiles to `build/src/preload.js`
* The entry points match `package.json` perfectly and build smoothly!

---

## 🚀 Step-by-Step Installation & Build Process

Follow these steps on your MacBook terminal to get your Electron app running and compiling perfectly from scratch:

### Step 1: Extract and Setup
1. Unzip your exported code into your new project folder (e.g., `workledgerPC`).
2. Open your terminal and navigate to the project directory:
   ```bash
   cd /path/to/workledgerPC
   ```
3. Install the root React web dependencies:
   ```bash
   npm install
   ```

### Step 2: Add Electron Platform
1. Initialize the Electron community platform:
   ```bash
   npx cap add @capacitor-community/electron
   ```
   *(This creates the `electron/` subdirectory on your computer.)*

### Step 3: Run the Auto-Patch Utility
We created a custom automated script to fix the configuration issue for you with a single command:
1. Run the patch command in the root folder:
   ```bash
   npm run patch-electron
   ```
   *(This will inspect `electron/tsconfig.json` and insert `"rootDir": "./"` safely.)*

### Step 4: Build React Web App & Copy Assets
1. Compile the React frontend:
   ```bash
   npm run build
   ```
2. Sync/copy assets to the Electron folder:
   ```bash
   npx cap copy
   ```

### Step 5: Install & Build Electron App
1. Move to the `electron` directory:
   ```bash
   cd electron
   ```
2. Install the Electron dependencies:
   ```bash
   npm install
   ```
3. Compile the Electron backend:
   ```bash
   npm run build
   ```
   *(You will now see your compiled files successfully generated inside `build/src/index.js`!)*

### Step 6: Start or Pack the App
* **To run the app in Live Development mode**:
  ```bash
  npm run electron:start
  ```
* **To package the app for macOS (.app / .dmg)**:
  ```bash
  npm run electron:pack
  ```

---

## 🛠️ Troubleshooting: "Electron failed to install correctly" (macOS Fix)

If you see this error when running `npm run electron:start` or during packaging:
```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

This occurs because the platform-specific native binary of Electron was either **blocked from downloading** during installation, **interrupted**, or has an **architecture mismatch** (e.g. running an Intel Node version on Apple Silicon M1/M2/M3).

Here are the step-by-step methods to fix this, ordered from quickest to most thorough.

### Fix A: Run the Manual Installer Script (Quickest & Most Direct)
Sometimes the package files are there, but the post-install script that downloads the physical Electron desktop runner was skipped. You can trigger it manually:
1. Open your terminal in the `electron/` directory:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC/electron
   ```
2. Manually run the postinstall downloader script:
   ```bash
   node node_modules/electron/install.js
   ```
3. Once completed, test running the app again:
   ```bash
   npm run electron:start
   ```

---

### Fix B: Clean Reinstall of Electron with Script Flags
If your npm environment blocks life-cycle scripts (such as `postinstall`), you can bypass the block by running npm install with explicit flags:
1. Navigate to the `electron/` folder:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC/electron
   ```
2. Delete the corrupt or incomplete Electron folder:
   ```bash
   rm -rf node_modules/electron
   ```
3. Reinstall Electron with script execution enabled:
   ```bash
   npm install electron --foreground-scripts --install-links
   ```

---

### Fix C: Architecture-Specific Force Download (For Apple Silicon M1/M2/M3)
If you are on an Apple Silicon Macbook and your terminal or Node runtime is configured to run under Intel emulation (or vice-versa), Electron might fail to download the matching binary. You can force the installer to pull the exact macOS version you need:

1. Navigate to the `electron/` folder:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC/electron
   ```
2. Delete the local Electron folder:
   ```bash
   rm -rf node_modules/electron
   ```
3. Run one of the following commands based on your CPU architecture:
   * **For Apple Silicon (M1, M2, M3 Max, etc.)**:
     ```bash
     electron_config_platform=darwin electron_config_arch=arm64 npm install
     ```
   * **For Intel Macs**:
     ```bash
     electron_config_platform=darwin electron_config_arch=x64 npm install
     ```

---

### Fix D: Nuclear Clean & Cache Purge
If there is a corrupt zip file in your local npm or Electron download cache, standard reinstalls might keep unpacking the broken file. Clear everything out:
1. Navigate to the `electron/` folder:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC/electron
   ```
2. Delete the lockfile and all installed modules:
   ```bash
   rm -rf node_modules package-lock.json
   ```
3. Force-clean your npm cache:
   ```bash
   npm cache clean --force
   ```
4. Reinstall all modules cleanly:
   ```bash
   npm install
   ```

---

## 💻 Alternative: Building a Windows App WITHOUT Electron

No! **You do not need Electron to build a Windows or macOS desktop application.** 

Since WorkLedger is a modern, responsive React Single-Page Application (SPA), the output is a standard web bundle (HTML, CSS, and JS in `dist/`). You can wrap this bundle into a beautiful, lightweight desktop app using alternative, much simpler tools that don't suffer from Electron's installation bugs.

Here are the two best, modern alternatives to Electron:

### ⚡ Alternative 1: Tauri (Recommended - Ultra-Lightweight & Fast)
**Tauri** is the modern successor to Electron. Instead of embedding a giant Chromium browser inside your app (which makes the file size 100MB+ and hogs RAM), Tauri uses your operating system's built-in web viewer (**Microsoft Edge WebView2** on Windows, **WebKit/Safari** on macOS).

#### Why Tauri is better than Electron:
* **Tiny Installer Size**: A Tauri Windows app is only **~5-10 MB** (compared to Electron's 100MB+).
* **Super Low Memory**: Uses about 30-50% less RAM than Electron.
* **No Download Issues**: Tauri builds natively on your system and doesn't require downloading giant prebuilt binaries from GitHub.

#### How to build with Tauri:
1. In your root directory, install the Tauri CLI:
   ```bash
   npm install -D @tauri-apps/cli
   ```
2. Initialize Tauri in your project:
   ```bash
   npx tauri init
   ```
   * *When prompted:*
     * **What is your frontend dev server URL?** -> `http://localhost:3000`
     * **Where are your web assets located?** -> `../dist` (This points to your compiled React frontend build folder)
     * **What is your frontend build command?** -> `npm run build`
3. To run in development mode:
   ```bash
   npx tauri dev
   ```
4. To package into a native Windows `.exe` / `.msi` (or macOS `.app` / `.dmg`):
   ```bash
   npx tauri build
   ```

---

### 🌐 Alternative 2: Progressive Web App (PWA) (Easiest - Zero Code)
Because **WorkLedger** is fully responsive and supports offline caching, it is designed to run perfectly as a Progressive Web App (PWA).

#### Why PWAs are great:
* **Zero Overhead**: No Electron, no Tauri, no installers to build, no dependencies to break.
* **Native OS Integration**: Installs with its own window, taskbar/dock icon, offline functionality, and auto-updates every time you update your website.
* **No Compiler Errors**: Safe from any local node or system library compilation issues.

#### How to install it as an app on Windows or macOS:
1. Deploy the compiled web files (the `dist` folder) to any free web host (such as **GitHub Pages**, **Vercel**, **Netlify**, or **Cloudflare Pages**).
2. Open the URL in **Google Chrome** or **Microsoft Edge**.
3. In the browser URL bar, look for the **Install App** icon (looks like a monitor with a small down arrow, or the "three dots" menu -> **Install WorkLedger**).
4. Click install! WorkLedger will now launch in its own dedicated, beautifully chromeless desktop window and will pin itself to your Windows Start Menu, Taskbar, or macOS Applications folder.

---

Enjoy your fully compiled, cross-platform **WorkLedger** Desktop Application!
