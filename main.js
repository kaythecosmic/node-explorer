console.log("Hello, World!");

const { BrowserWindow, app } = require("electron")

function createWindow() {
    const mainWindow = new BrowserWindow({
        title: "Document Explorer",
        width: 500,
        height: 600
    });

    mainWindow.loadFile()
}