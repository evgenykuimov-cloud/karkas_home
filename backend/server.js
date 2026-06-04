const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(rootDir, "uploads");
const dbPath = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 4173);
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const inviteCode = process.env.ADMIN_INVITE_CODE || "";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const seedProjects = [
  {
    id: "scandi-94",
    title: "Сканди 94",
    status: "Проект",
    area: "94 м2",
    floors: "1 этаж",
    rooms: "3 спальни",
    price: "от 4,8 млн ₽",
    package: "Теплый контур",
    buildTime: "60 дней",
    image: "assets/project-scandi.jpg",
    description: "Компактный дом для постоянного проживания с кухней-гостиной и террасой.",
    features: ["кухня-гостиная", "терраса", "три спальни"],
    specs: ["утепление 200 мм", "силовой каркас", "вентилируемый фасад"],
    photos: [{ src: "assets/project-scandi.jpg", alt: "Сканди 94" }],
    plans: [],
    order: 1
  },
  {
    id: "fjord-126",
    title: "Фьорд 126",
    status: "Проект",
    area: "126 м2",
    floors: "1 этаж",
    rooms: "4 спальни",
    price: "от 6,3 млн ₽",
    package: "Под ключ",
    buildTime: "74 дня",
    image: "assets/project-scandi.jpg",
    description: "Просторная одноэтажная планировка с мастер-спальней и котельной.",
    features: ["мастер-спальня", "котельная", "просторная гостиная"],
    specs: ["свайный фундамент", "утепление 200 мм", "кровля металлочерепица"],
    photos: [{ src: "assets/project-scandi.jpg", alt: "Фьорд 126" }],
    plans: [],
    order: 2
  },
  {
    id: "nord-164",
    title: "Норд 164",
    status: "Проект",
    area: "164 м2",
    floors: "2 этажа",
    rooms: "4 спальни",
    price: "от 8,1 млн ₽",
    package: "Под отделку",
    buildTime: "90 дней",
    image: "assets/hero-house.jpg",
    description: "Двухэтажный дом с вторым светом, панорамным остеклением и кабинетом.",
    features: ["второй свет", "кабинет", "панорамные окна"],
    specs: ["усиленная кровля", "утепление 200 мм", "инженерная подготовка"],
    photos: [{ src: "assets/hero-house.jpg", alt: "Норд 164" }],
    plans: [],
    order: 3
  }
];

function createEmptyDb() {
  return { users: [], projects: seedProjects };
}

function readDb() {
  if (!fs.existsSync(dbPath)) {
    const db = createEmptyDb();
    writeDb(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function issueToken(user, res) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: "7d" });
  res.cookie("kh_auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function authRequired(req, res, next) {
  const token = req.cookies.kh_auth;
  if (!token) return res.status(401).json({ error: "Требуется вход" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Сессия недействительна" });
  }
}

function normalizeProject(input, existing = {}) {
  const id = existing.id || input.id || crypto.randomUUID();
  const photos = Array.isArray(input.photos) ? input.photos : [];
  const plans = Array.isArray(input.plans) ? input.plans : [];
  return {
    id,
    title: String(input.title || "").trim(),
    status: String(input.status || "Проект").trim(),
    area: String(input.area || "").trim(),
    floors: String(input.floors || "").trim(),
    rooms: String(input.rooms || "").trim(),
    price: String(input.price || "").trim(),
    package: String(input.package || "").trim(),
    buildTime: String(input.buildTime || "").trim(),
    image: photos[0]?.src || input.image || "",
    description: String(input.description || "").trim(),
    features: Array.isArray(input.features) ? input.features.map(String).filter(Boolean) : [],
    specs: Array.isArray(input.specs) ? input.specs.map(String).filter(Boolean) : [],
    photos,
    plans,
    order: Number(input.order || existing.order || 999),
    updatedAt: new Date().toISOString()
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) return callback(new Error("Можно загружать только изображения"));
    callback(null, true);
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(rootDir));

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const name = String(req.body.name || "").trim();
  const code = String(req.body.inviteCode || "");

  if (!email.includes("@") || password.length < 8) {
    return res.status(400).json({ error: "Укажите email и пароль минимум 8 символов" });
  }

  const db = readDb();
  const isFirstUser = db.users.length === 0;
  if (!isFirstUser && inviteCode && code !== inviteCode) {
    return res.status(403).json({ error: "Неверный код приглашения" });
  }
  if (!isFirstUser && !inviteCode) {
    return res.status(403).json({ error: "Регистрация новых администраторов закрыта" });
  }
  if (db.users.some((user) => user.email === email)) {
    return res.status(409).json({ error: "Пользователь уже существует" });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);
  issueToken(user, res);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const db = readDb();
  const user = db.users.find((item) => item.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }
  issueToken(user, res);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("kh_auth");
  res.json({ ok: true });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/projects", (_req, res) => {
  const db = readDb();
  res.json({ projects: db.projects.sort((a, b) => (a.order || 999) - (b.order || 999)) });
});

app.post("/api/projects", authRequired, (req, res) => {
  const db = readDb();
  const project = normalizeProject(req.body, { order: db.projects.length + 1 });
  if (!project.title) return res.status(400).json({ error: "Название проекта обязательно" });
  db.projects.push(project);
  writeDb(db);
  res.status(201).json({ project });
});

app.put("/api/projects/:id", authRequired, (req, res) => {
  const db = readDb();
  const index = db.projects.findIndex((project) => project.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Проект не найден" });
  const project = normalizeProject(req.body, db.projects[index]);
  if (!project.title) return res.status(400).json({ error: "Название проекта обязательно" });
  db.projects[index] = project;
  writeDb(db);
  res.json({ project });
});

app.delete("/api/projects/:id", authRequired, (req, res) => {
  const db = readDb();
  db.projects = db.projects.filter((project) => project.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

app.post("/api/uploads", authRequired, upload.array("files", 20), (req, res) => {
  const files = req.files.map((file) => ({
    src: `/uploads/${file.filename}`,
    alt: file.originalname.replace(/\.[^.]+$/, ""),
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  }));
  res.status(201).json({ files });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Karkas Home backend: http://127.0.0.1:${port}`);
});
