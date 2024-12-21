const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer"); // 引入 multer 用於處理文件上傳
const app = express();
const PORT = 3000;

// 設定圖片儲存路徑為 public/picture/upload 資料夾
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public", "picture", "upload")); // 指定儲存路徑
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // 根據時間戳命名文件
  },
});

const upload = multer({ storage: storage });

// 暫存財務紀錄
let records = [];
const dataFilePath = path.join(__dirname, "data.json");

// 暫存日曆事件
let events = [];
const eventsFilePath = path.join(__dirname, "events.json");

// 載入資料
function loadData() {
  try {
    const data = fs.readFileSync(dataFilePath, "utf8");
    if (data) {
      records = JSON.parse(data);
    }
  } catch (err) {
    console.error("資料檔案讀取錯誤，使用預設空資料。", err);
    records = []; // 若檔案不存在或格式錯誤，使用空陣列
  }

  // 載入事件資料
  try {
    const eventData = fs.readFileSync(eventsFilePath, "utf8");
    if (eventData) {
      events = JSON.parse(eventData);
    }
  } catch (err) {
    console.error("事件檔案讀取錯誤，使用預設空資料。", err);
    events = [];
  }
}

// 寫入資料
function saveData() {
  try {
    console.log("準備寫入資料到檔案...", records); // Debug: 檢查 records 內容
    fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), "utf8");
    console.log("資料已寫入檔案");
  } catch (err) {
    console.error("無法寫入資料檔案！", err);
  }
}

// 寫入事件資料
function saveEvents() {
  try {
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2), "utf8");
  } catch (err) {
    console.error("無法寫入事件資料檔案！", err);
  }
}

// 初始載入資料
loadData();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// --- 財務管理 API ---

// GET /api/records - 取得所有財務紀錄
app.get("/api/records", (req, res) => {
  console.log("收到 GET 請求，返回所有財務紀錄");
  res.json(records);
});

// POST /api/records - 新增財務紀錄
app.post("/api/records", (req, res) => {
  console.log("收到 POST 請求，新增財務紀錄", req.body);
  const { date, item, amount, type } = req.body;

  if (!date || !item || isNaN(amount) || !type) {
    return res.status(400).json({ error: "所有欄位為必填！" });
  }

  // 新增財務紀錄
  const record = {
    id: records.length + 1, // 簡單的 ID，自增
    date,
    item,
    amount: parseFloat(amount),
    type,
  };
  records.push(record);

  // 儲存資料到檔案
  saveData();

  res.status(201).json(record);
});

// DELETE /api/records/:id - 刪除財務紀錄
app.delete("/api/records/:id", (req, res) => {
  console.log("收到 DELETE 請求，刪除紀錄 ID:", req.params.id);
  const id = parseInt(req.params.id);
  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "找不到該紀錄！" });
  }

  // 刪除紀錄
  records.splice(index, 1);

  // 儲存資料到檔案
  saveData();

  res.json({ success: true });
});

// --- 圖片管理 API ---

// 上傳圖片的路由
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "請選擇一張圖片！" });
  }

  // 回傳圖片的儲存路徑
  const imagePath = `/picture/upload/${req.file.filename}`;
  res
    .status(200)
    .json({ message: "圖片上傳成功", file: req.file, path: imagePath });
});

// 取得已上傳的圖片列表
app.get("/api/images", (req, res) => {
  const uploadDir = path.join(__dirname, "public", "picture", "upload");

  // 讀取 upload 資料夾中的所有檔案
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "無法讀取圖片資料夾" });
    }

    // 返回檔案的路徑
    const imagePaths = files.map((file) => `/picture/upload/${file}`);
    res.json(imagePaths);
  });
});

// 刪除圖片的路由
app.delete("/api/delete-image/:filename", (req, res) => {
  const filename = req.params.filename; // 接收到的應該是檔案名稱
  const filePath = path.join(
    __dirname,
    "public",
    "picture",
    "upload",
    filename
  );

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("刪除圖片失敗：", err);
      return res.status(500).json({ error: "無法刪除圖片，可能檔案不存在" });
    }
    res.json({ message: "圖片刪除成功" });
  });
});

// --- 日曆事件管理 API ---

// GET /api/events - 取得所有事件
app.get("/api/events", (req, res) => {
  res.json(events);
});

// POST /api/add-event - 新增事件
app.post("/api/add-event", (req, res) => {
  const { title, start, color } = req.body;
  if (!title || !start) {
    return res.status(400).json({ error: "事件標題與開始時間為必填項目！" });
  }

  const event = {
    id: events.length + 1,
    title,
    start,
    color,
  };
  events.push(event);
  saveEvents();
  res.status(201).json(event);
});

// DELETE /api/delete-event/:id - 刪除事件
app.delete("/api/delete-event/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = events.findIndex((event) => event.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "找不到該事件！" });
  }

  // 刪除事件
  events.splice(index, 1);

  // 儲存事件資料到檔案
  saveEvents();

  res.json({ success: true });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});
