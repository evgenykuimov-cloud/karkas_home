const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { seedProjects } = require("./seed");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "db.json");
const usePostgres = Boolean(process.env.DATABASE_URL);
let pool;
let initialized = false;

function createEmptyDb() {
  return { users: [], projects: seedProjects };
}

function readJsonDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const db = createEmptyDb();
    writeJsonDb(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeJsonDb(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initPostgres() {
  if (initialized) return;
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'admin',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 999,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM projects");
  if (rows[0].count === 0) {
    for (const project of seedProjects) {
      await client.query(
        "INSERT INTO projects (id, data, order_index) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [project.id, project, project.order || 999]
      );
    }
  }
  initialized = true;
}

async function init() {
  if (usePostgres) {
    await initPostgres();
    return;
  }
  readJsonDb();
}

async function listUsers() {
  await init();
  if (!usePostgres) return readJsonDb().users;
  const { rows } = await getPool().query("SELECT * FROM users ORDER BY created_at ASC");
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  }));
}

async function findUserById(id) {
  await init();
  if (!usePostgres) return readJsonDb().users.find((user) => user.id === id);
  const { rows } = await getPool().query("SELECT * FROM users WHERE id = $1", [id]);
  const row = rows[0];
  return row
    ? {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        createdAt: row.created_at
      }
    : null;
}

async function findUserByEmail(email) {
  await init();
  if (!usePostgres) return readJsonDb().users.find((user) => user.email === email);
  const { rows } = await getPool().query("SELECT * FROM users WHERE email = $1", [email]);
  const row = rows[0];
  return row
    ? {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        createdAt: row.created_at
      }
    : null;
}

async function createUser(user) {
  await init();
  if (!usePostgres) {
    const db = readJsonDb();
    db.users.push(user);
    writeJsonDb(db);
    return user;
  }
  await getPool().query(
    "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.id, user.email, user.name, user.role, user.passwordHash, user.createdAt]
  );
  return user;
}

async function listProjects() {
  await init();
  if (!usePostgres) {
    return readJsonDb().projects.sort((a, b) => (a.order || 999) - (b.order || 999));
  }
  const { rows } = await getPool().query("SELECT data FROM projects ORDER BY order_index ASC, updated_at DESC");
  return rows.map((row) => row.data);
}

async function projectCount() {
  await init();
  if (!usePostgres) return readJsonDb().projects.length;
  const { rows } = await getPool().query("SELECT COUNT(*)::int AS count FROM projects");
  return rows[0].count;
}

async function createProject(project) {
  await init();
  if (!usePostgres) {
    const db = readJsonDb();
    db.projects.push(project);
    writeJsonDb(db);
    return project;
  }
  await getPool().query("INSERT INTO projects (id, data, order_index) VALUES ($1, $2, $3)", [
    project.id,
    project,
    project.order || 999
  ]);
  return project;
}

async function updateProject(id, project) {
  await init();
  if (!usePostgres) {
    const db = readJsonDb();
    const index = db.projects.findIndex((item) => item.id === id);
    if (index === -1) return null;
    db.projects[index] = project;
    writeJsonDb(db);
    return project;
  }
  const result = await getPool().query(
    "UPDATE projects SET data = $2, order_index = $3, updated_at = NOW() WHERE id = $1",
    [id, project, project.order || 999]
  );
  return result.rowCount ? project : null;
}

async function deleteProject(id) {
  await init();
  if (!usePostgres) {
    const db = readJsonDb();
    const before = db.projects.length;
    db.projects = db.projects.filter((project) => project.id !== id);
    writeJsonDb(db);
    return before !== db.projects.length;
  }
  const result = await getPool().query("DELETE FROM projects WHERE id = $1", [id]);
  return result.rowCount > 0;
}

module.exports = {
  init,
  listUsers,
  findUserById,
  findUserByEmail,
  createUser,
  listProjects,
  projectCount,
  createProject,
  updateProject,
  deleteProject
};
