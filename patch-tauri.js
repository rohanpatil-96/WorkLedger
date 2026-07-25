import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tauriConfigPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');

function patchTauriConfig() {
  if (!fs.existsSync(tauriConfigPath)) {
    console.log('\n========================================================================');
    console.log('Notice: src-tauri/tauri.conf.json not found yet.');
    console.log('If you are setting up the project, first initialize Tauri with:');
    console.log('  npx tauri init');
    console.log('Once initialized, run this command again to apply the build patch:');
    console.log('  npm run patch-tauri');
    console.log('========================================================================\n');
    return;
  }

  try {
    let content = fs.readFileSync(tauriConfigPath, 'utf8');
    const config = JSON.parse(content);
    
    // Check if the identifier is still the default one
    if (config.tauri && config.tauri.bundle && config.tauri.bundle.identifier === 'com.tauri.dev') {
      config.tauri.bundle.identifier = 'com.workledger.app';
      
      fs.writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('\n========================================================================');
      console.log('SUCCESS: Patched src-tauri/tauri.conf.json!');
      console.log('Changed bundle identifier from "com.tauri.dev" to "com.workledger.app".');
      console.log('You can now compile your production installer using:');
      console.log('  npx tauri build');
      console.log('========================================================================\n');
    } else {
      console.log('\n========================================================================');
      console.log('Notice: Bundle identifier is already customized in src-tauri/tauri.conf.json.');
      console.log('Current Identifier:', config.tauri?.bundle?.identifier);
      console.log('========================================================================\n');
    }
  } catch (error) {
    console.error('Error patching src-tauri/tauri.conf.json:', error);
  }
}

patchTauriConfig();
