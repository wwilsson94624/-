const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');  // 引入 CORS 套件
const app = express();
const PORT = 3000;

let records = []; // 暫存財務紀錄
const dataFilePath = path.join(__dirname, 'data.json');

// 載入資料
function loadData() {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        if (data) {
            records = JSON.parse(data);
        }
    } catch (err) {
        console.error('資料檔案讀取錯誤，使用預設空資料。', err);
        records = []; // 若檔案不存在或格式錯誤，使用空陣列
    }
}

// 寫入資料
function saveData() {
    try {
        console.log('準備寫入資料到檔案...', records);  // Debug: 檢查 records 內容
        fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), 'utf8');
        console.log('資料已寫入檔案');
    } catch (err) {
        console.error('無法寫入資料檔案！', err);
    }
}

// 初始載入資料
loadData();

// 中間件：解析 JSON 格式的請求
app.use(express.json());

// 啟用 CORS 中介軟體
app.use(cors());

// 靜態檔案伺服功能
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/records - 取得所有財務紀錄
app.get('/api/records', (req, res) => {
    console.log('收到 GET 請求，返回所有財務紀錄'); // 日誌輸出
    res.json(records);
});

// POST /api/records - 新增財務紀錄
app.post('/api/records', (req, res) => {
    console.log('收到 POST 請求，新增財務紀錄', req.body); // 日誌輸出
    const { date, item, amount, type } = req.body;

    if (!date || !item || isNaN(amount) || !type) {
        return res.status(400).json({ error: '所有欄位為必填！' });
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
app.delete('/api/records/:id', (req, res) => {
    console.log('收到 DELETE 請求，刪除紀錄 ID:', req.params.id); // 日誌輸出
    const id = parseInt(req.params.id);
    const index = records.findIndex(record => record.id === id);

    if (index === -1) {
        return res.status(404).json({ error: '找不到該紀錄！' });
    }

    // 刪除紀錄
    records.splice(index, 1);

    // 儲存資料到檔案
    saveData();

    res.json({ success: true });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行於 http://localhost:${PORT}`);
});
