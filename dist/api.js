"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const python_shell_1 = require("python-shell");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// JSONファイルパス
const userDataFilePath = process.env.USER_DATA_PATH || "data/userdata.json";
const roomDataFilePath = process.env.ROOM_DATA_PATH || "data/roomdata.json";
const scriptPath = process.env.PYTHON_SCRIPT_PATH || "python/getcard.py";
let userData = [];
let roomData = [];
try {
    const userDataJson = fs_1.default.readFileSync(userDataFilePath, "utf-8");
    const roomDataJson = fs_1.default.readFileSync(roomDataFilePath, "utf-8");
    userData = JSON.parse(userDataJson);
    roomData = JSON.parse(roomDataJson);
}
catch (err) {
    console.error("Error loading data files:", err);
}
app.use((req, res, next) => {
    res.status(404).json({ message: "Endpoint not found" });
});
// CORS設定
app.use((0, cors_1.default)({
    origin: "https://key-chan.vercel.app", // フロントエンドのURLを指定
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // クッキーや認証情報を含める場合に必要
    optionsSuccessStatus: 200,
}));
app.use(body_parser_1.default.json());
// ログインAPIの実装
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = userData.find((user) => user.username === username && user.password === password);
    if (user) {
        res.json({ message: "Login successful", user });
    }
    else {
        res.status(401).json({ message: "Invalid username or password" });
    }
});
// サインアップAPIの実装
app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    const userExists = userData.some((user) => user.username === username);
    const passExists = userData.some((user) => user.password === password);
    if (userExists || passExists) {
        res.status(401).json({ message: "Username or password already exists" });
    }
    else {
        const newUser = { username, password };
        userData.push(newUser);
        fs_1.default.writeFile(userDataFilePath, JSON.stringify(userData, null, 2), (err) => {
            if (err) {
                console.error("Error writing user data file:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            else {
                res.json({ message: "User created successfully", user: newUser });
            }
        });
    }
});
// Pythonスクリプトを呼び出すAPI
app.get("/api/callpy", (req, res) => {
    python_shell_1.PythonShell.run(scriptPath, undefined)
        .then((messages) => {
        res.json({
            message: "Python script executed successfully",
            output: messages,
        });
    })
        .catch((error) => {
        console.error("Error executing Python script:", error);
        res.status(500).json({ message: "Internal server error" });
    });
});
// 部屋を貸し出すAPI
app.post("/api/rent/room", (req, res) => {
    const { name, student } = req.body;
    const room = roomData.find((rm) => rm.name === name);
    const roomIndex = roomData.findIndex((rm) => rm.name === name);
    if (!room) {
        res.status(404).json({ message: "Room not found" });
    }
    else {
        roomData[roomIndex].status = true;
        roomData[roomIndex].student = JSON.parse(student).username;
        fs_1.default.writeFile(roomDataFilePath, JSON.stringify(roomData, null, 2), (err) => {
            if (err) {
                console.error("Error writing room data file:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            else {
                res.json({ message: "Status updated successfully", room });
            }
        });
    }
});
// 部屋の貸し出しを解除するAPI
app.post("/api/back/room", (req, res) => {
    const { student } = req.body;
    const username = JSON.parse(student).username;
    const roomsToUpdate = roomData.filter((rm) => rm.student === username);
    if (roomsToUpdate.length === 0) {
        res.status(404).json({ message: "No rooms found for the user" });
    }
    else {
        roomsToUpdate.forEach((rm) => {
            rm.status = false;
            rm.student = "";
        });
        fs_1.default.writeFile(roomDataFilePath, JSON.stringify(roomData, null, 2), (err) => {
            if (err) {
                console.error("Error writing room data file:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            else {
                res.json({
                    message: "Status updated successfully",
                    rooms: roomsToUpdate,
                });
            }
        });
    }
});
// 未借用の部屋データを取得するAPI
app.get("/api/get/dontborrowed", (req, res) => {
    try {
        const roomData = JSON.parse(fs_1.default.readFileSync(roomDataFilePath, "utf-8"));
        const filteredRoomData = roomData.filter((data) => !data.status);
        res.json(filteredRoomData);
    }
    catch (error) {
        console.error("An error occurred:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
// 全部屋データを取得するAPI
app.get("/api/get/all", (req, res) => {
    try {
        const roomData = JSON.parse(fs_1.default.readFileSync(roomDataFilePath, "utf-8"));
        res.json(roomData);
    }
    catch (error) {
        console.error("An error occurred:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
// サーバーの起動
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
