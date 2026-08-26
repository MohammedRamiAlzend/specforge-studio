import { app, BrowserWindow, shell, session } from "electron";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "config", "app-config.json");

function configuredAppUrl() {
  const fromEnv = process.env.SPECFORGE_APP_URL?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf8"));
      if (typeof config.appUrl === "string" && config.appUrl.trim()) return config.appUrl.trim();
    } catch {
      // Fall through to the safe local fallback.
    }
  }
  return "http://localhost:5173";
}

function isAllowed(url, appUrl) {
  try {
    const target = new URL(url);
    const origin = new URL(appUrl);
    return target.origin === origin.origin;
  } catch {
    return false;
  }
}

function createWindow() {
  const appUrl = configuredAppUrl();
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f8fafc",
    title: "SpecForge Studio",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      navigateOnDragDrop: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowed(url, appUrl)) shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowed(url, appUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  void window.loadURL(appUrl);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "clipboard-read" || permission === "clipboard-sanitized-write");
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
