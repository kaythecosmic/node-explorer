const { BrowserWindow, app, ipcMain } = require("electron")
const express = require("express")
const path = require("node:path")
const os = require("os")
const multer = require('multer')
const fs = require("fs")
const ejs = require("ejs")

const dbFilePath = "fileList.json"

const PORT = 3000;
const isMacOS = process.platform === 'darwin';
const expressApp = express();
expressApp.engine('html', ejs.renderFile);
expressApp.use(express.static(path.join(__dirname, "assets")))

// Enable CORS middleware
expressApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

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


expressApp.get('/', (req, res) => {
    var filepathtable = __dirname + "/renders/table.html";
    filepathtable = filepathtable.replaceAll("\\", "/");
    console.log(filepathtable);
    res.render(filepathtable)
});

/* =============== Documentation Object ===============
>> function expressApp.post(): Params { '/addNew', (req, res) }
Endpoint: '/addNew'
Handles POST requests, logs form data, and redirects to a new page.
Params 
    req - request object,
    res - response object
*/
expressApp.post('/addNew', uploadList, (req, res) => {
    console.log("Hello World")
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
        console.log(jsonData);

        fs.writeFile(dbFilePath, jsonData, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('JSON file saved successfully.');
            }
        });
    } catch (error) {
        const newRecordPush = JSON.stringify(newRecord, null, 2);
        fs.writeFile(dbFilePath, newRecordPush, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('JSON file saved successfully.');
            }
        });
        console.log("Empty Data File, added first record.");
    }
    finally {
        res.redirect("/")
    };
});

expressApp.get('/displayData', (req, res) => {
    try {
        const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
        let tableHtml = '';
        for (const key in fileListData) {
            if (fileListData.hasOwnProperty(key)) {
                const rowData = fileListData[key];
                tableHtml += `<tr><td>${key}<button onclick="deleteRow('${key}')"><img src ='${app.getAppPath()}/assets/images/trash-2.svg'></button></td>`;
                for (const fileKey in rowData) {
                    if (rowData.hasOwnProperty(fileKey)) {
                        const filePath = rowData[fileKey];
                        console.log(__dirname);

                        const fileUrl = `file://${app.getAppPath()}/${filePath}`;
                        tableHtml += `<td><a href="${fileUrl}" target="_blank">Open File</a></td>`;
                    }
                }
                tableHtml += '</tr>';
            }
        }
        res.send(tableHtml);
    } catch (error) {
        console.error('Error reading or parsing JSON file:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

expressApp.delete('/deleteRow/:key', (req, res) => {
    const keyToDelete = req.params.key;

    try {
        const data = fs.readFileSync(dbFilePath, 'utf8');
        const fileList = JSON.parse(data);

        if (fileList.hasOwnProperty(keyToDelete)) {
            delete fileList[keyToDelete];
            const updatedData = JSON.stringify(fileList, null, 2);
            fs.writeFileSync(dbFilePath, updatedData);
            const folderPathToDelete = path.join(app.getAppPath(), 'database', keyToDelete);
            fs.rmdirSync(folderPathToDelete, { recursive: true });

            console.log(`Row with key ${keyToDelete} deleted successfully.`);
            res.status(200).send(`Row with key ${keyToDelete} deleted successfully.`);
        } else {
            console.error(`Row with key ${keyToDelete} not found.`);
            res.status(404).send(`Row with key ${keyToDelete} not found.`);
        }
    } catch (error) {
        console.error('Error deleting row:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


// Begin the electron code
/* =============== Documentation Object ===============
>> function createWindow(): Params { None }
Function to create the main window and start the Express server.
The main window displays the Document Explorer app.
*/
function createWindow() {
    const mainWindow = new BrowserWindow({
        title: "Document Explorer",
        width: 1600,
        height: 900,
        webPreferences: {
            webSecurity: false
        }
    });
    // let renderFile = path.join(__dirname, "./renders/index.html")
    // mainWindow.loadFile(renderFile);
    mainWindow.loadURL(`http://localhost:${PORT}/`);

    // let renderFile = path.join(__dirname, "./renders/table.html")
    // mainWindow.loadFile("./renders/table.html");

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

