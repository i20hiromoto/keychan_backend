import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import { PythonShell } from "python-shell";

const app = express();
const port = process.env.PORT || 3001;

// JSONファイルパス
const userDataFilePath = process.env.USER_DATA_PATH || "data/userdata.json";
const roomDataFilePath = process.env.ROOM_DATA_PATH || "data/roomdata.json";
const scriptPath = process.env.PYTHON_SCRIPT_PATH || "python/getcard.py";

let userData: { username: string; password: string }[] = [];
let roomData: { name: string; status: boolean; student?: string }[] = [];

try {
  const userDataJson = fs.readFileSync(userDataFilePath, "utf-8");
  const roomDataJson = fs.readFileSync(roomDataFilePath, "utf-8");
  userData = JSON.parse(userDataJson);
  roomData = JSON.parse(roomDataJson);
} catch (err) {
  console.error("Error loading data files:", err);
}

app.use((req, res, next) => {
  res.status(404).json({ message: "Endpoint not found" });
});
// CORS設定
app.use(
  cors({
    origin: "https://key-chan.vercel.app", // フロントエンドのURLを指定
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // クッキーや認証情報を含める場合に必要
    optionsSuccessStatus: 200,
  })
);

app.use(bodyParser.json());

// ログインAPIの実装
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = userData.find(
    (user) => user.username === username && user.password === password
  );

  if (user) {
    res.json({ message: "Login successful", user });
  } else {
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
  } else {
    const newUser = { username, password };
    userData.push(newUser);
    fs.writeFile(userDataFilePath, JSON.stringify(userData, null, 2), (err) => {
      if (err) {
        console.error("Error writing user data file:", err);
        res.status(500).json({ message: "Internal server error" });
      } else {
        res.json({ message: "User created successfully", user: newUser });
      }
    });
  }
});

// Pythonスクリプトを呼び出すAPI
app.get("/api/callpy", (req, res) => {
  PythonShell.run(scriptPath, undefined)
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
  } else {
    roomData[roomIndex].status = true;
    roomData[roomIndex].student = JSON.parse(student).username;
    fs.writeFile(roomDataFilePath, JSON.stringify(roomData, null, 2), (err) => {
      if (err) {
        console.error("Error writing room data file:", err);
        res.status(500).json({ message: "Internal server error" });
      } else {
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
  } else {
    roomsToUpdate.forEach((rm) => {
      rm.status = false;
      rm.student = "";
    });

    fs.writeFile(roomDataFilePath, JSON.stringify(roomData, null, 2), (err) => {
      if (err) {
        console.error("Error writing room data file:", err);
        res.status(500).json({ message: "Internal server error" });
      } else {
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
    const roomData = JSON.parse(fs.readFileSync(roomDataFilePath, "utf-8"));
    const filteredRoomData = roomData.filter((data: any) => !data.status);
    res.json(filteredRoomData);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 全部屋データを取得するAPI
app.get("/api/get/all", (req, res) => {
  try {
    const roomData = JSON.parse(fs.readFileSync(roomDataFilePath, "utf-8"));
    res.json(roomData);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
