"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const bodyParser = __importStar(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const python_shell_1 = require("python-shell");
const app = (0, express_1.default)();
const port = 3001;
app.use(bodyParser.json());
// JSONファイルからユーザーデータを読み込む
const userDataFilePath = "data/userdata.json";
const roomDataFilePath = "data/roomdata.json";
const scriptPath = "python/getcard.py";
let userData = [];
let roomData = [];
try {
    const userDataJson = fs.readFileSync(userDataFilePath, "utf-8");
    const roomDataJson = fs.readFileSync(roomDataFilePath, "utf-8");
    userData = JSON.parse(userDataJson);
    roomData = JSON.parse(roomDataJson);
}
catch (err) {
    console.error("Error loading user data:", err);
}
// Expressのミドルウェアの設定
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ログインAPIの実装
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    // ユーザーを検索
    const user = userData.find((user) => user.username === username && user.password === password);
    if (user) {
        res.json({ message: "Login successful", user });
    }
    if (!user) {
        return res
            .status(401)
            .json({ message: "Invalid username, student number, or password" });
    }
});
app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    // ユーザーを検索
    const user = userData.find((user) => user.username === username);
    const pass = userData.find((user) => user.password === password);
    if (user || pass) {
        return res
            .status(401)
            .json({ message: "Username or Student Number already exists" });
    }
    else {
        const newUser = { username, password };
        userData.push(newUser);
        fs.writeFile(userDataFilePath, JSON.stringify(userData, null, 2), (err) => {
            if (err) {
                console.error("Error writing JSON file:", err);
                return res.status(500).json({ message: "Internal server error" });
            }
        });
        res.json({ message: "User created successfully", user: newUser });
    }
});
app.get("/api/callpy", (req, res) => {
    const callPythonScript = (scriptPath) => {
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
    };
    callPythonScript(scriptPath);
});
app.post("/api/rent/room", (req, res) => {
    const rm = roomData.find((rm) => rm.name === req.body.name);
    const rmIndex = roomData.findIndex((rm) => rm.name === req.body.name);
    if (!rm) {
        return res.status(404).json({ message: "Room not found" });
    }
    if (req.body) {
        roomData[rmIndex].status = true;
        const studentData = JSON.parse(req.body.student);
        const username = studentData.username;
        roomData[rmIndex].student = username;
    }
    fs.writeFile("data/roomdata.json", JSON.stringify(roomData, null, 2), (err) => {
        if (err) {
            console.error("Error writing JSON file:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json({ message: "Status updated successfully", room: rm });
    });
});
function findIndicesByCondition(array, condition) {
    return array
        .map((item, index) => (condition(item) ? index : -1))
        .filter((index) => index !== -1);
}
app.post("/api/back/room", (req, res) => {
    const user = JSON.parse(req.body.student);
    const rm = roomData.filter((rm) => rm.student === user.username);
    const indics = findIndicesByCondition(roomData, (rm) => rm.student === user.username);
    if (!rm) {
        return res.status(404).json({ message: "Room not found" });
    }
    if (req.body) {
        for (let i = 0; i < indics.length; i++) {
            roomData[indics[i]].status = false;
            roomData[indics[i]].student = "";
        }
    }
    fs.writeFile("data/roomdata.json", JSON.stringify(roomData, null, 2), (err) => {
        if (err) {
            console.error("Error writing JSON file:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json({ message: "Status updated successfully", room: rm });
    });
});
// 未借用の部屋データを取得するAPI
app.get("/api/get/dontborrowed", (req, res) => {
    try {
        // roomdata.jsonを読み込む
        const roomData = JSON.parse(fs.readFileSync("data/roomdata.json", "utf-8"));
        // statusがfalseのデータのみフィルタリングする
        const filteredRoomData = roomData.filter((data) => !data.status);
        // フィルタリングされたデータをクライアントに送信する
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
        // roomdata.jsonを読み込む
        const roomData = JSON.parse(fs.readFileSync("data/roomdata.json", "utf-8"));
        // フィルタリングなしで全データをクライアントに送信する
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
