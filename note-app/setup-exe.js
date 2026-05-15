import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = import.meta.dirname;

console.log('⚙️ Uygulamanız Masaüstü programına (.exe) dönüştürülmeye hazırlanıyor...');
console.log('Lütfen arkanıza yaslanın, bu işlem biraz sürebilir...\n');

// 1. main.cjs dosyasını oluştur
const mainJsContent = `const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
`;

fs.writeFileSync(path.join(__dirname, 'main.cjs'), mainJsContent);
console.log('✅ Masaüstü pencere ayarları (main.cjs) oluşturuldu.');

// 2. vite.config.js dosyasını güncelle
const viteConfigPath = path.join(__dirname, 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  if (!viteConfig.includes('base:')) {
    viteConfig = viteConfig.replace('plugins:', "base: './',\n  plugins:");
    fs.writeFileSync(viteConfigPath, viteConfig);
    console.log('✅ Vite derleme ayarları (vite.config.js) güncellendi.');
  }
}

// 3. package.json dosyasını güncelle
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  let pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  pkg.main = "main.cjs";
  if (!pkg.scripts) pkg.scripts = {};
  pkg.scripts["pack:exe"] = "vite build && electron-builder --win";
  
  pkg.build = {
    ...pkg.build,
    appId: "com.noteapp.desktop",
    productName: "NoteApp",
    directories: { output: "release" },
    win: { target: "nsis" },
    files: [ "dist/**/*", "main.cjs", "server.js", "package.json" ]
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log('✅ Paket ayarları (package.json) güncellendi.\n');
}

// 4. Komutları otomatik çalıştır
console.log('📦 Gerekli Electron altyapısı indiriliyor... (Lütfen bekleyin)');
try {
  execSync('npm install electron electron-builder --save-dev', { stdio: 'inherit' });
  console.log('\n🚀 Masaüstü (exe) dosyası derleniyor... (Bilgisayarınıza bağlı olarak 1-2 dk sürebilir)');
  execSync('npm run pack:exe', { stdio: 'inherit' });
  console.log('\n🎉 HARİKA! İşlem başarıyla tamamlandı.');
  console.log('👉 Uygulamanızın .exe dosyasını "note-app/release" klasörünün içinde bulabilirsiniz!');
} catch (err) {
  console.error('\n❌ Bir hata oluştu. Hatayı yapay zekaya gönderebilirsiniz:', err.message);
}