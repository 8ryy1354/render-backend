const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const USERS_FILE = "users.json";

// 读取用户数据
function readUsers() {
  const data = fs.readFileSync(USERS_FILE, "utf8");
  return JSON.parse(data);
}

// 写入用户数据
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 登录接口
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: "用户名或密码错误" });

  res.json({ username: user.username, permission: user.permission });
});

// 记录首次登录时间（只记录一次）
app.post("/record-login", (req, res) => {
  const { username } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).json({ message: "用户不存在" });

  if ((user.permission.type === "day" || user.permission.type === "month") && !user.permission.start) {
    user.permission.start = new Date().toISOString();
    writeUsers(users);
  }

  res.json({ message: "首次登录时间已记录" });
});

// 检查是否可以播放
app.post("/can-play", (req, res) => {
  const { username } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).json({ message: "用户不存在" });

  const { type, used, start } = user.permission;
  const now = new Date();

  if (type === "once" && used) return res.status(403).json({ message: "已使用" });
  if (type === "day" && start && now - new Date(start) > 24 * 60 * 60 * 1000)
    return res.status(403).json({ message: "已过期" });
  if (type === "month" && start && now - new Date(start) > 30 * 24 * 60 * 60 * 1000)
    return res.status(403).json({ message: "已过期" });

  res.json({ message: "可以播放" });
});

// 播放后标记 used = true（适用于 once）
app.post("/mark-used", (req, res) => {
  const { username } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).json({ message: "用户不存在" });

  if (user.permission.type === "once") {
    user.permission.used = true;
    writeUsers(users);
  }

  res.json({ message: "播放标记成功" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
