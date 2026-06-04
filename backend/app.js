const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const storage = require("./storage");
const { uploadsDir, saveUploadedFiles } = require("./uploads");

const app = express();
const rootDir = path.resolve(__dirname, "..");
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const inviteCode = process.env.ADMIN_INVITE_CODE || "";

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
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

async function authRequired(req, res, next) {
  const token = req.cookies.kh_auth;
  if (!token) return res.status(401).json({ error: "Требуется вход" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await storage.findUserById(payload.sub);
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    const imageExt = /\.(jpe?g|png|webp|gif|avif)$/i.test(file.originalname || "");
    if (!file.mimetype.startsWith("image/") && !imageExt) {
      return callback(new Error("Можно загружать только изображения"));
    }
    callback(null, true);
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));
app.use("/assets", express.static(path.join(rootDir, "assets")));
app.use("/data", express.static(path.join(rootDir, "data")));
app.get("/", (_req, res) => res.sendFile(path.join(rootDir, "index.html")));
app.get("/index.html", (_req, res) => res.sendFile(path.join(rootDir, "index.html")));
app.get("/admin.html", (_req, res) => res.sendFile(path.join(rootDir, "admin.html")));
app.get("/styles.css", (_req, res) => res.sendFile(path.join(rootDir, "styles.css")));
app.get("/main.js", (_req, res) => res.sendFile(path.join(rootDir, "main.js")));
app.get("/admin.css", (_req, res) => res.sendFile(path.join(rootDir, "admin.css")));
app.get("/admin.js", (_req, res) => res.sendFile(path.join(rootDir, "admin.js")));

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const name = String(req.body.name || "").trim();
    const code = String(req.body.inviteCode || "");

    if (!email.includes("@") || password.length < 8) {
      return res.status(400).json({ error: "Укажите email и пароль минимум 8 символов" });
    }

    const users = await storage.listUsers();
    const isFirstUser = users.length === 0;
    if (!isFirstUser && inviteCode && code !== inviteCode) {
      return res.status(403).json({ error: "Неверный код приглашения" });
    }
    if (!isFirstUser && !inviteCode) {
      return res.status(403).json({ error: "Регистрация новых администраторов закрыта" });
    }
    if (await storage.findUserByEmail(email)) {
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
    await storage.createUser(user);
    issueToken(user, res);
    res.status(201).json({ user: publicUser(user) });
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await storage.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    issueToken(user, res);
    res.json({ user: publicUser(user) });
  })
);

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("kh_auth");
  res.json({ ok: true });
});

app.get("/api/auth/me", asyncHandler(authRequired), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get(
  "/api/projects",
  asyncHandler(async (_req, res) => {
    res.json({ projects: await storage.listProjects() });
  })
);

app.post(
  "/api/projects",
  asyncHandler(authRequired),
  asyncHandler(async (req, res) => {
    const project = normalizeProject(req.body, { order: (await storage.projectCount()) + 1 });
    if (!project.title) return res.status(400).json({ error: "Название проекта обязательно" });
    await storage.createProject(project);
    res.status(201).json({ project });
  })
);

app.put(
  "/api/projects/:id",
  asyncHandler(authRequired),
  asyncHandler(async (req, res) => {
    const existing = (await storage.listProjects()).find((project) => project.id === req.params.id);
    if (!existing) return res.status(404).json({ error: "Проект не найден" });
    const project = normalizeProject(req.body, existing);
    if (!project.title) return res.status(400).json({ error: "Название проекта обязательно" });
    await storage.updateProject(req.params.id, project);
    res.json({ project });
  })
);

app.delete(
  "/api/projects/:id",
  asyncHandler(authRequired),
  asyncHandler(async (req, res) => {
    await storage.deleteProject(req.params.id);
    res.json({ ok: true });
  })
);

app.post(
  "/api/uploads",
  asyncHandler(authRequired),
  upload.array("files", 20),
  asyncHandler(async (req, res) => {
    const files = await saveUploadedFiles(req.files || []);
    res.status(201).json({ files });
  })
);

app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Ошибка сервера" });
});

module.exports = app;
