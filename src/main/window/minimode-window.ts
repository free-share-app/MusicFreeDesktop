import { BrowserWindow, app } from "electron";
import makeWindowFullyDraggable from "./common/make-window-fully-draggable";
import { registerExtensionWindow } from "@/shared/message-hub/main";
import debounce from "@/common/debounce";
import { setAppConfigPath } from "@/shared/app-config/main";
import { ipcMainOn } from "@/shared/ipc/main";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MINIMODE_WINDOW_WEBPACK_ENTRY: string;
declare const MINIMODE_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

/** 更新位置配置 */
const dSetMinimodeWindowConfig = debounce(
  (point: ICommon.IPoint) => {
    setAppConfigPath("private.minimodeWindowPosition", point);
  },
  300,
  {
    leading: false,
    trailing: true,
  }
);

/** 主窗口创建 */
let miniWindow: BrowserWindow | null = null;

export const createMiniModeWindow = (): BrowserWindow => {
  // Create the browser window.
  const width = 340;
  const height = 72;
  miniWindow = new BrowserWindow({
    height,
    width,
    webPreferences: {
      preload: MINIMODE_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      sandbox: false,
    },
    resizable: false,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
  });

  // and load the index.html of the app.
  const initUrl = new URL(MINIMODE_WINDOW_WEBPACK_ENTRY);
  miniWindow.loadURL(initUrl.toString());

  if (!app.isPackaged) {
    miniWindow.on("ready-to-show", () => {
      // Open the DevTools.
      miniWindow.webContents.openDevTools();
    });
  }

  if (process.platform === "win32") {
    makeWindowFullyDraggable(miniWindow, {
      width: 340,
      height: 72,
      onMouseUp(position) {
        if (position) {
          setAppConfigPath("private.minimodeWindowPosition", {
            x: position.x,
            y: position.y,
          });
        }
      },
    });
  } else {
    ipcMainOn("set-minimode-window-pos", (pos) => {
      if (miniWindow) {
        miniWindow.setBounds({
          x: pos.x,
          y: pos.y,
          height,
          width,
        });
        dSetMinimodeWindowConfig(pos);
      }
    });
  }

  registerExtensionWindow(miniWindow);

  return miniWindow;
};

export function showMinimodeWindow() {
  if (!miniWindow) {
    createMiniModeWindow();
    return;
  }
  if (miniWindow.isMinimized()) {
    miniWindow.restore();
  } else if (miniWindow.isVisible()) {
    miniWindow.focus();
  } else {
    miniWindow.show();
  }
  miniWindow.moveTop();
  miniWindow.setSkipTaskbar(false);
}

export function closeMinimodeWindow() {
  if (!miniWindow) {
    return;
  }

  miniWindow.close();
  miniWindow = null;
}

export function getMinimodeWindow() {
  return miniWindow;
}

/************************* IPC */
