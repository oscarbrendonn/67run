// Electron wrapper for 67 Runner — desktop app entry point.
// Loads the Vite singlefile build (dist/index.html) in a borderless,
// fixed-aspect window so the game runs without browser chrome.
const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "67 Runner",
    backgroundColor: "#0e1124",
    webPreferences: {
      contextIsolation: true,
      sandbox: false,        // Allow external fetch (jsDelivr CDN)
      webSecurity: false,    // Bypass CORS for file:// → https:// asset loads
    },
  });

  // Open DevTools only on F12 (dev), never auto-open
  globalShortcut.register("F12", () => {
    win.webContents.toggleDevTools();
  });
  // Cmd/Ctrl + R to reload, Cmd/Ctrl + Shift + R to hard-reload
  globalShortcut.register(process.platform === "darwin" ? "Cmd+R" : "Ctrl+R", () => {
    win.webContents.reload();
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
