const { BrowserWindow, app, ipcMain } = require("electron")
const express = require("express")
const path = require("path")
const os = require("os")
const bodyParser = require('body-parser');
const multer = require('multer')
const fs = require("fs")
const ejs = require("ejs")
const exphbs = require('express-handlebars');

const dbFilePath = "fileList.json"

const PORT = 3000;
const isMacOS = process.platform === 'darwin';
const expressApp = express();
expressApp.engine('html', ejs.renderFile);
expressApp.use(express.static(path.join(__dirname, "/assets")))

expressApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const databaseConfig = {
    "licenceDocs": "Licence Documents",
    "correspondence": "Correspondence",
    "testReports": "Test Reports",
    "inspectionReport": "Inspection Reports",
}

const multerStore = multer.diskStorage({
    destination: function (req, file, cb) {
        let cmlKey = req.body.cmlNumber;
        let fileType = file.fieldname;
        let keyOnlyNumber = cmlKey.split('-')[0]
        let keyLocation = `database/${keyOnlyNumber}`;
        if (fileType == "single-file") {
            fileType = cmlKey.split('-')[1];
        }
        let fileLocation = `database/${keyOnlyNumber}/${fileType}`;
        try {
            if (!fs.existsSync(keyLocation)) {
                fs.mkdirSync(keyLocation);
                fs.mkdirSync(fileLocation);
            }
            else {
                if (!fs.existsSync(fileLocation)) {
                    fs.mkdirSync(fileLocation);
                }
            }
        } catch (err) {
            console.error("Multer Store Error: " + err);
        }
        cb(null, fileLocation)
    },
    filename: function (req, file, cb) {
        let cmlKey = req.body.cmlNumber;
        const filename = `${cmlKey}-${file.fieldname}-${file.originalname}`;
        cb(null, filename)
    }
})

const upload = multer({ storage: multerStore, preservePath: true, array: 'files' });

const uploadList = upload.fields([
    { name: 'licenceDocs' },
    { name: 'correspondence' },
    { name: 'testReports' },
    { name: 'inspectionReport' },
])

const uplaodSingle = upload.fields([
    { name: 'single-file' },
])


// expressApp.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}/`);
// });

expressApp.get('/', (req, res) => {
    var filepathtable = __dirname + "/renders/table.html";
    filepathtable = filepathtable.replaceAll("\\", "/");
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

    const newCMLKey = req.body.cmlNumber;
    const allFiles = req.files;

    // save the record in the json file
    const newRecord = {
        [newCMLKey.toString()]: {
            "licenceDocs": [],
            "correspondence": [],
            "testReports": [],
            "inspectionReport": []
        }
    }

    Object.keys(allFiles).forEach(key => {
        const currFileType = allFiles[key];

        for (let j = 0; j < currFileType.length; j++) {
            const fileURL = currFileType[j].path.replaceAll("\\", "/");
            newRecord[newCMLKey.toString()][key].push(fileURL)
        }
    });

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


expressApp.post('/addSingle', uplaodSingle, (req, res) => {
    const newCMLKey = req.body.cmlNumber;
    const allFiles = req.files;

    var fileKeyPair = newCMLKey.split('-')
    const dbCML = fileKeyPair[0];
    const dbDocType = fileKeyPair[1];

    const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    
    // console.log("allFiles['single-file']");
    // console.log(allFiles["single-file"]);
    const uploadedFilesCount = allFiles["single-file"].length;
    // console.log("fileListData[dbCML][dbDocType]");
    // console.log(fileListData[dbCML][dbDocType]);

    for (let newURLIdx = 0; newURLIdx < uploadedFilesCount; newURLIdx++) { 
        fileListData[dbCML][dbDocType].push(allFiles["single-file"][newURLIdx].path.replaceAll("\\", "/"))
    }
    // fileListData[dbCML][dbDocType] = allFiles["single-file"][0].path.replaceAll("\\", "/");

    const fullFile = JSON.stringify(fileListData, null, 2);
    fs.writeFile(dbFilePath, fullFile, (err) => {
        if (err) {
            console.error('\nError 100: While writing a file\n', err);
        } else {
            console.log('JSON File saved after adding one record.');
        }
        // console.log(`/view/${dbCML}-${dbDocType}`);
        res.redirect(`/view/${dbCML}-${dbDocType}`)
    });
});


expressApp.get('/view/:searchKey?', (req, res) => {

    // console.log(req.params.searchKey);
    const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    const searchKey = req.params.searchKey;
    const keyInfo = searchKey.split('-');

    const cmlNumber = keyInfo[0];
    const fileKey = keyInfo[1];
    const fileList = fileListData[cmlNumber][fileKey];
    var viewtableRows = [];


    // console.log(fileList);

    for (let url = 0; url < fileList.length; url++) {
        const urlString = fileList[url];
        const fileName = urlString.split('/');
        var orgFileName = fileName[fileName.length - 1].split('-');
        orgFileName = orgFileName[orgFileName.length - 1];
        const fileUrl = `file://${app.getAppPath()}/${urlString}`;
        viewtableRows.push({
            "filename": orgFileName,
            "url": fileUrl
        });
    }

    const data = {
        cmlnum: cmlNumber,
        filekey: fileKey,
        filekeyType: databaseConfig[fileKey],
        tableRows: viewtableRows
    }

    console.log(data);
    var filepathView = __dirname + "/renders/view.html";
    filepathView = filepathView.replaceAll("\\", "/");
    res.render(filepathView, { data })
});

expressApp.get('/displayData/:searchKey?', (req, res) => {
    const fileTypes = ["licenceDocs", "correspondence", "testReports", "inspectionReport"];
    try {
        const searchKey = req.params.searchKey || '';
        const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
        let tableHtml = ``;

        for (const key in fileListData) {
            if (fileListData.hasOwnProperty(key)) {
                if (searchKey === '' || key.includes(searchKey)) {
                    const rowData = fileListData[key];
                    tableHtml += `
                    <tr><td>${key}<button onclick="deleteRow('${key}')"><img src ='${app.getAppPath()}/assets/images/trash-2.svg'></button></td>
                    <td>${rowData.orgName}</td>
                    <td>${rowData.ISNumber}</td>`;

                    for (const fileKey in fileTypes) {
                        if (rowData.hasOwnProperty(fileTypes[fileKey])) {
                            const filePath = rowData[fileKey];
                            if (filePath == "") {
                                tableHtml += `
                                <td>
                                    <form action="http://localhost:3000/addSingle" method="POST" enctype="multipart/form-data">
                                        <label for="${key}-${fileKey}" class= "custom-file-upload-table">Browse</label>
                                        <input type="text" name="cmlNumber" id="cmlNumber" value="${key}-${fileKey}" style="display:none">
                                        <input type="file" name="single-file" id="${key}-${fileKey}" onchange="updateTableFileName(this)">
                                        <span id="${key}-${fileKey}-filename"></span>
                                        <input id="${key}-${fileKey}-submit-btn" type="submit" value="Add This File" class="custom-file-upload-table table-submit-btn btn-hide">
                                    </form>
                                </td>`;
                            } else {
                                const fileUrl = `http://localhost:3000/view/${key}-${fileTypes[fileKey]}`;
                                tableHtml += `<td><div class="table-cell-active"><a class="open-link" href="${fileUrl}">View</a><a href="http://localhost:3000/delSingle?cmlNum=${key}&fileDocType=${fileKey}">Delete File</a></div></td>`;
                            }
                        }
                    }
                    tableHtml += '</tr>';
                }
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


expressApp.get('/delSingle', (req, res) => {

    const delCMLKey = req.query.cmlNum;
    const delDocType = req.query.fileDocType;

    console.log((delCMLKey));
    console.log((delDocType));

    const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    fileListData[delCMLKey][delDocType] = "";

    const fullFile = JSON.stringify(fileListData, null, 2);

    fs.writeFile(dbFilePath, fullFile, (err) => {
        if (err) {
            console.error('\nError 100: While writing a file\n', err);
        } else {
            console.log('JSON File saved after adding one record.');
        }
        res.redirect("/")
    });

    // const fileListData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

    // console.log(fileListData)
    // console.log(fileListData[dbCML][dbDocType])
    // fileListData[dbCML][dbDocType] = allFiles["single-file"][0].path.replaceAll("\\", "/");
    // console.log(fileListData)

    // const fullFile = JSON.stringify(fileListData, null, 2);

    // fs.writeFile(dbFilePath, fullFile, (err) => {
    //     if (err) {
    //         console.error('\nError 100: While writing a file\n', err);
    //     } else {
    //         console.log('JSON File saved after adding one record.');
    //     }
    //     res.redirect("/")
    // });

});



// Begin the electron code
/* =============== Documentation Object ===============
>> function createWindow(): Params { None }
Function to create the main window and start the Express server.
The main window displays the Document Explorer app.
// */
// function createWindow() {
//     const mainWindow = new BrowserWindow({
//         title: "Document Explorer",
//         width: 1600,
//         height: 900,
//         webPreferences: {
//             webSecurity: false
//         }
//     });
//     mainWindow.loadURL(`http://localhost:${PORT}/`);

//     expressApp.listen(PORT, () => {
//         console.log(`Server running at http://localhost:${PORT}/`);
//     });
// }
app.on('ready', () => {
    const mainWindowOptions = {
        title: "Document Explorer",
        width: 1600,
        height: 900,
        webPreferences: {
            webSecurity: false
        }
    };


    let mainWindow = new BrowserWindow(mainWindowOptions);
    mainWindow.loadURL(`http://localhost:${PORT}/`);

    expressApp.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

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


