const { BrowserWindow, app } = require("electron")
const express = require("express")
const path = require("node:path")
const os = require("os")
const multer = require('multer')
const fs = require("fs")

const dbFilePath = "fileList.json"

const PORT = 3000;
const isMacOS = process.platform === 'darwin';
const expressApp = express();


const multerStore = multer.diskStorage({
    destination: function (req, file, cb) {
        let cmlKey = req.body.cmlNumber;
        let location = `database/${cmlKey}`;
        const folderName = `database/${cmlKey}`;
        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName);
            }
        } catch (err) {
            console.error(err);
        }
        cb(null, location)
    },
    filename: function (req, file, cb) {
        const uniqueKey = Date.now();
        const filename = `${uniqueKey}-${file.originalname}`;
        cb(null, filename)
    }
})

const upload = multer({ storage: multerStore, preservePath: true });

const uploadList = upload.fields([
    { name: 'licenceDocs', maxCount: 1 },
    { name: 'correspondence', maxCount: 1 },
    { name: 'testReports', maxCount: 1 },
    { name: 'inspectionReport', maxCount: 1 },
])

/* =============== Documentation Object ===============
>> function expressApp.post(): Params { '/addNew', (req, res) }
Endpoint: '/addNew'
Handles POST requests, logs form data, and redirects to a new page.
Params 
    req - request object,
    res - response object
*/

expressApp.post('/addNew', uploadList, (req, res) => {

    const newCMLKey = req.body.cmlNumber;
    const allFiles = req.files;

    const newRecord = {
        [newCMLKey.toString()]: {
            "licenceDocs": allFiles.licenceDocs[0].path.replaceAll("\\", "/"),
            "correspondence": allFiles.correspondence[0].path.replaceAll("\\", "/"),
            "testReports": allFiles.testReports[0].path.replaceAll("\\", "/"),
            "inspectionReport": allFiles.inspectionReport[0].path.replaceAll("\\", "/")
        }
    }

    try {
        const data = fs.readFileSync(dbFilePath, 'utf8');
        const fileList = JSON.parse(data);
        let combined = { ...fileList, ...newRecord }

        const jsonData = JSON.stringify(combined, null, 2);

        fs.writeFile(dbFilePath, jsonData, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('JSON file saved successfully.');
            }
        });
    } catch (error) {
        console.log("Error reading or parsing JSON file:", error.message);
    };
});

/* =============== Documentation Object ===============
>> function createWindow(): Params { None }
Function to create the main window and start the Express server.
The main window displays the Document Explorer app.
*/

function createWindow() {
    const mainWindow = new BrowserWindow({
        title: "Document Explorer",
        width: 1600,
        height: 900
    });
    let renderFile = path.join(__dirname, "./renders/index.html")
    mainWindow.loadFile(renderFile);

    expressApp.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (!isMacOS) {
        app.quit();
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})