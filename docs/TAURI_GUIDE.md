# Tauri Desktop Setup & Build Guide (macOS & Windows)

This guide provides a complete, foolproof, step-by-step setup to turn your **WorkLedger** React application into a super lightweight native desktop application using **Tauri**.

---

## 🔍 Root Cause of the `cargo metadata` Error

When you ran `npx tauri dev`, you received:
```
failed to run 'cargo metadata' command ... No such file or directory (os error 2)
```
### Why does this happen?
Tauri's desktop backend is built in **Rust** (which is what makes it so fast and lightweight!). The error occurs because **Rust and its compiler (Cargo) are not yet installed on your MacBook**. 

Once you install Rust, Tauri will run and build perfectly!

---

## 🚀 Step-by-Step Guide: From ZIP to Desktop App

Follow these exact steps from the very beginning.

### 📦 Phase 1: Preparation

1. **Download the ZIP File** from the AI Studio Settings menu.
2. **Move the ZIP File** to your preferred folder (e.g. your home directory or `/Users/ronniep/AIprojects/`).
3. **Unzip/Extract** the folder. Rename the extracted folder to `workledgerPC`.
4. **Open Terminal** on your MacBook and navigate into the folder:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC
   ```

---

### 🦀 Phase 2: Install System Dependencies (Required once)

Because Tauri builds native binaries, you need to install the Rust compiler on your MacBook:

1. **Install Xcode Command Line Tools** (if you don't already have them):
   ```bash
   xcode-select --install
   ```
   *(A pop-up will appear on macOS. Click "Install" and wait for it to finish.)*

2. **Install Rust** (using the official Rust installer):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   * *When prompted, press **`1`** and then **`Enter`** to proceed with the default installation.*

3. **Reload your Terminal environment** to activate Rust (or close and reopen your Terminal window):
   ```bash
   source "$HOME/.cargo/env"
   ```

4. **Verify Rust is installed correctly**:
   ```bash
   rustc --version
   cargo --version
   ```
   *(If both commands output version numbers, you are ready to build!)*

---

### 💻 Phase 3: Initialize and Configure Tauri

1. Make sure you are in your project root folder (`/Users/ronniep/AIprojects/workledgerPC`):
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC
   ```

2. **Install the Web Dependencies** (including Tauri CLI):
   ```bash
   npm install
   npm install -D @tauri-apps/cli
   ```

3. **Initialize Tauri**:
   ```bash
   npx tauri init
   ```
   Tauri will ask you a series of setup questions. **Copy and paste these exact answers**:
   
   * **What is your app name?**
     * Answer: `WorkLedger` (or press *Enter* to accept default)
   * **What should the window title be?**
     * Answer: `WorkLedger` (or press *Enter*)
   * **Where are your web assets (HTML/CSS/JS) located relative to the `<current dir>/src-tauri/tauri.conf.json` file?**
     * Answer: `../dist` *(This is extremely important. It tells Tauri to load your compiled React code from the `dist/` directory!)*
   * **What is the URL of your dev server?**
     * Answer: `http://localhost:5173`
   * **What is your frontend dev command?**
     * Answer: `npm run dev`
   * **What is your frontend build command?**
     * Answer: `npm run build`

*(Tauri will now automatically create a new subfolder called `src-tauri/` in your project folder.)*

4. **Patch the Bundle Identifier** (Crucial for `npx tauri build`):
   Tauri requires a unique identifier (like `com.workledger.app`) instead of the default `com.tauri.dev` to build the final installer.
   We have added an automated command to do this instantly:
   ```bash
   npm run patch-tauri
   ```
   *(This script automatically opens `src-tauri/tauri.conf.json` and changes `"com.tauri.dev"` to `"com.workledger.app"` for you.)*

---

### 🎨 Phase 3.5: Apply Your Custom Brand Logo / Icon

Right now, your desktop build uses Tauri's default brand icon. To apply your beautiful, high-resolution WorkLedger brand icon (`assets/icon.svg`) to your macOS and Windows application builds:

1. **Verify you are in the project root folder**:
   ```bash
   cd /Users/ronniep/AIprojects/workledgerPC
   ```

2. **Run Tauri's built-in icon generator**:
   Tauri comes with an automated utility that reads your high-quality SVG/PNG logo, scales it perfectly, and generates all required formats (`.icns` for macOS, `.ico` for Windows, and multiple `.png` assets for other environments) inside `src-tauri/icons/`:
   ```bash
   npx tauri icon assets/icon.svg
   ```
   *(You will see a success message indicating that all icons have been successfully generated and placed!)*

3. **Rebuild your application**:
   To see the new icons take effect in your live development view or production bundle, simply stop your running processes and run:
   * **For Development**: `npx tauri dev`
   * **For Production Build**: `npx tauri build`
   
   *(Now your macOS `.dmg` installer, `.app` bundle, and Windows taskbar/shortcuts will all display your custom WorkLedger logo perfectly!)*

---

### ⚡ Phase 4: Running and Building Your App

#### 1. First, compile your React frontend:
```bash
npm run build
```
*(This compiles your JSX/TypeScript code into the static HTML, CSS, and JS files inside `/Users/ronniep/AIprojects/workledgerPC/dist`).*

#### 2. Run the Desktop App in Development Mode:
```bash
npx tauri dev
```
*(Tauri will compile its Rust core, open a beautiful native macOS desktop window, and load your hot-reloaded local web development environment!)*

#### 3. Build the Production Installer (.dmg / .app on macOS, .msi on Windows):
```bash
npx tauri build
```

---

## 📂 Where are the compiled installers located?

Once `npx tauri build` finishes, Tauri generates the optimized installers inside your project directory:

### On macOS (running on your MacBook Pro):
* **Full Installer (.dmg)**:
  `src-tauri/target/release/bundle/dmg/WorkLedger_0.0.0_x64.dmg` (or `_arm64.dmg` depending on your chip)
* **Direct Application (.app)**:
  `src-tauri/target/release/bundle/macos/WorkLedger.app`

### On Windows (when you compile on a Windows machine later):
* **Installer (.msi)**:
  `src-tauri/target/release/bundle/msi/WorkLedger_0.0.0_x64_en-US.msi`
* **Direct Executable (.exe)**:
  `src-tauri/target/release/bundle/nsis/WorkLedger_0.0.0_x64-setup.exe`

---

### 🌟 Bonus: Packaging for Windows from your MacBook

Because Tauri builds native binaries, a MacBook Pro can natively compile `.dmg` and `.app` files, but **cannot directly compile a Windows `.exe` file locally**. 

To compile your Windows `.exe` installer with your updated icons, you can use either of the two extremely simple methods below:

---

### 💻 Method A: Compile Directly on any Windows PC (No Code Changes Needed!)
Since you have already run `npx tauri init` and `npx tauri icon assets/icon.svg` on your project folder, the folder is 100% ready for Windows. You just need to run the compilation script on a Windows machine:

1. **Zip your project folder** (`workledgerPC/`) on your Mac and transfer/download it onto any Windows PC.
2. **On the Windows PC, install Rust**:
   * Download and run the official 1-click installer: **[rustup-init.exe](https://win.rustup.rs/)**.
   * *(Keep the default settings during the prompt.)*
3. **Open PowerShell or Command Prompt** inside your unzipped folder on the Windows PC:
   ```powershell
   cd C:\path\to\workledgerPC
   ```
4. **Install Node dependencies** on the Windows machine:
   ```powershell
   npm install
   ```
5. **Compile your frontend and build your Windows `.exe`**:
   ```powershell
   npm run build
   npx tauri build
   ```
6. **Find your compiled files**:
   * **Full Installer (.exe / .msi)**: `src-tauri/target/release/bundle/msi/WorkLedger_0.0.0_x64_en-US.msi`
   * **Direct Portable Executable (.exe)**: `src-tauri/target/release/bundle/nsis/WorkLedger_0.0.0_x64-setup.exe`

---

### ☁️ Method B: Compile Automatically using GitHub (100% Web-Based, No Terminal Commands!)

We have custom-designed a **GitHub Action** workflow file (`.github/workflows/release.yml`) for your project. This allows GitHub's free, secure servers to compile both your macOS `.dmg` and your Windows `.exe` installers inside the cloud completely automatically! 

You don't need to write a single line of Git or terminal commands.

#### Step 1: Export Your Project to GitHub from AI Studio
1. In the upper-right corner of the **Google AI Studio** editor, click the **Settings** menu (gear icon).
2. Click **Export to GitHub**.
3. Log in to your GitHub account (if prompted) and choose to export your code to a new, secure repository (e.g. named `workledgerPC`).

#### Step 2: Run the Cloud Build on GitHub's Web Interface
1. Open your web browser and go to your new repository: `https://github.com/your-username/workledgerPC`.
2. Click the **Actions** tab along the top navigation bar of your repository.
3. On the left sidebar, click on the workflow named **`Build & Release Desktop App`**.
4. On the right side of the screen, look for a button that says **`Run workflow`** (with a little drop-down arrow).
5. Click **`Run workflow`** (keep the branch set to `main` or your default branch) and then click the green **`Run workflow`** button.

*That's it! GitHub will now start a secure Windows server and macOS server in the cloud, compile your React code, generate the brand logos, and build the native desktop installer packages simultaneously! This takes about 3-5 minutes.*

#### Step 3: Download Your Windows `.exe` & macOS `.dmg`
1. Go back to the homepage of your GitHub repository.
2. In the right-hand sidebar, look for the **`Releases`** section.
3. Click on the latest draft or release (e.g., **`WorkLedger v0.0.0`**).
4. Download your compiled, secure installers with your custom logos:
   * **`WorkLedger.exe`** / **`WorkLedger_0.0.0_x64_en-US.msi`** (for Windows users)
   * **`WorkLedger.dmg`** / **`WorkLedger.app`** (for macOS users)
