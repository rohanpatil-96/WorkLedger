import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsconfigPath = path.join(__dirname, 'electron', 'tsconfig.json');

function patchTsConfig() {
  if (!fs.existsSync(tsconfigPath)) {
    console.log('\n========================================================================');
    console.log('Notice: electron/tsconfig.json not found yet.');
    console.log('If you are setting up the project on your machine, first run:');
    console.log('  npx cap add @capacitor-community/electron');
    console.log('Once added, run this command again to apply the build patch:');
    console.log('  npm run patch-electron');
    console.log('========================================================================\n');
    return;
  }

  try {
    let content = fs.readFileSync(tsconfigPath, 'utf8');
    
    // Parse JSON safely by stripping simple single-line and multi-line comments
    const jsonClean = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const config = JSON.parse(jsonClean);
    
    if (!config.compilerOptions) {
      config.compilerOptions = {};
    }
    
    // The missing piece that prevents compilation/bundling error!
    config.compilerOptions.rootDir = './';
    
    fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('\n========================================================================');
    console.log('SUCCESS: Patched electron/tsconfig.json with "rootDir": "./" !');
    console.log('Now, when you run "npm run build" in the electron folder, TypeScript');
    console.log('will compile into "build/src/index.js" matching package.json\'s main entry point.');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('Error patching electron/tsconfig.json:', error);
  }
}

patchTsConfig();
