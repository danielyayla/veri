// Rasterizes veri-app-icon.svg to a 1024x1024 PNG with a transparent
// margin. Run from packages/ui (for the electron binary):
//   npx electron ../../design/app-icon/render-icon.cjs \
//     ../../design/app-icon/veri-app-icon.svg build/icon.png
// qlmanage is not a substitute: its SVG renderer mattes the
// transparent margin onto white, which shows as a white box in the Dock.
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const [svgPath, outPath] = process.argv.slice(2);
if (!svgPath || !outPath) {
  console.error('usage: electron render-icon.cjs <in.svg> <out.png>');
  app.exit(1);
}

app.dock?.hide();
app.whenReady().then(async () => {
  const svg = readFileSync(resolve(svgPath), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('about:blank');
  // Blob URL keeps the canvas same-origin (a file:// image would taint it).
  const dataUrl = await win.webContents.executeJavaScript(`(async () => {
    const url = URL.createObjectURL(new Blob([${JSON.stringify(svg)}], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 1024, 1024);
    const corner = ctx.getImageData(2, 2, 1, 1).data;
    return { png: c.toDataURL('image/png'), cornerAlpha: corner[3] };
  })()`);
  if (dataUrl.cornerAlpha !== 0) {
    console.error(`margin is not transparent (corner alpha ${dataUrl.cornerAlpha})`);
    app.exit(1);
    return;
  }
  writeFileSync(resolve(outPath), Buffer.from(dataUrl.png.split(',')[1], 'base64'));
  console.log(`wrote ${outPath}, corner alpha 0`);
  app.exit(0);
});
