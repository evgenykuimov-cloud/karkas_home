let currentUser = null;
let projects = [];
let activeId = null;

const authPanel = document.querySelector("[data-auth-panel]");
const appPanel = document.querySelector("[data-app-panel]");
const authForm = document.querySelector("[data-auth-form]");
const authMode = document.querySelector("[data-auth-mode]");
const authTitle = document.querySelector("[data-auth-title]");
const authSubmit = document.querySelector("[data-auth-submit]");
const authToggle = document.querySelector("[data-auth-toggle]");
const authError = document.querySelector("[data-auth-error]");
const userEmail = document.querySelector("[data-user-email]");
const listRoot = document.querySelector("[data-project-list]");
const form = document.querySelector("[data-editor-form]");
const previewRoot = document.querySelector("[data-preview]");
const saveStatus = document.querySelector("[data-save-status]");

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Ошибка запроса");
  return payload;
}

function setAuthMode(mode) {
  authMode.value = mode;
  const isRegister = mode === "register";
  authTitle.textContent = isRegister ? "Регистрация администратора" : "Вход в админку";
  authSubmit.textContent = isRegister ? "Зарегистрироваться" : "Войти";
  authToggle.textContent = isRegister ? "Уже есть аккаунт" : "Создать аккаунт";
  document.querySelector("[data-name-field]").hidden = !isRegister;
  document.querySelector("[data-invite-field]").hidden = !isRegister;
}

function showApp() {
  authPanel.hidden = true;
  appPanel.hidden = false;
  userEmail.textContent = currentUser.email;
}

function showAuth() {
  authPanel.hidden = false;
  appPanel.hidden = true;
  userEmail.textContent = "";
}

async function bootstrap() {
  try {
    const payload = await api("/api/auth/me");
    currentUser = payload.user;
    showApp();
    await loadProjects();
  } catch {
    showAuth();
    await loadPublicProjects();
  }
}

async function loadPublicProjects() {
  try {
    const payload = await api("/api/projects");
    projects = payload.projects;
    activeId = projects[0]?.id || null;
    renderList();
    fillForm(activeProject());
  } catch {
    projects = window.KARKAS_PROJECTS || [];
  }
}

async function loadProjects() {
  const payload = await api("/api/projects");
  projects = payload.projects;
  activeId = activeId || projects[0]?.id || null;
  renderList();
  fillForm(activeProject());
}

function activeProject() {
  return projects.find((project) => project.id === activeId) || projects[0] || null;
}

function listFromText(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForm(project) {
  form.reset();
  if (!project) {
    renderMedia({ photos: [], plans: [] });
    renderPreview({});
    return;
  }
  form.elements.title.value = project.title || "";
  form.elements.status.value = project.status || "Проект";
  form.elements.area.value = project.area || "";
  form.elements.floors.value = project.floors || "";
  form.elements.rooms.value = project.rooms || "";
  form.elements.price.value = project.price || "";
  form.elements.package.value = project.package || "";
  form.elements.buildTime.value = project.buildTime || "";
  form.elements.description.value = project.description || "";
  form.elements.features.value = (project.features || []).join(", ");
  form.elements.specs.value = (project.specs || []).join(", ");
  renderMedia(project);
  renderPreview(project);
}

function readForm(project = {}) {
  const photos = project.photos || [];
  return {
    ...project,
    title: form.elements.title.value.trim(),
    status: form.elements.status.value,
    area: form.elements.area.value.trim(),
    floors: form.elements.floors.value.trim(),
    rooms: form.elements.rooms.value.trim(),
    price: form.elements.price.value.trim(),
    package: form.elements.package.value.trim(),
    buildTime: form.elements.buildTime.value.trim(),
    description: form.elements.description.value.trim(),
    features: listFromText(form.elements.features.value),
    specs: listFromText(form.elements.specs.value),
    image: photos[0]?.src || project.image || "",
    photos,
    plans: project.plans || []
  };
}

function renderList() {
  listRoot.innerHTML = projects
    .map(
      (project) => `
        <button type="button" class="${project.id === activeId ? "is-active" : ""}" data-project-id="${project.id}">
          <strong>${project.title || "Без названия"}</strong>
          <small>${[project.area, project.price].filter(Boolean).join(" · ") || "Заполните параметры"}</small>
        </button>
      `
    )
    .join("");
}

function renderMedia(project) {
  renderMediaGroup("[data-photo-preview]", project.photos || [], "photos");
  renderMediaGroup("[data-plan-preview]", project.plans || [], "plans");
}

function renderMediaGroup(selector, items, field) {
  document.querySelector(selector).innerHTML = items
    .map(
      (item, index) => `
        <figure class="media-thumb">
          <img src="${item.src}" alt="${item.alt || ""}">
          <button type="button" data-remove-media="${field}" data-media-index="${index}">×</button>
        </figure>
      `
    )
    .join("");
}

function renderPreview(project) {
  const image = project.photos?.[0]?.src || project.image || "";
  previewRoot.innerHTML = `
    ${image ? `<img src="${image}" alt="${project.title || ""}">` : ""}
    <div>
      <h3>${project.title || "Название проекта"}</h3>
      <p>${project.description || "Описание проекта появится здесь."}</p>
      <ul>
        ${[project.area, project.floors, project.rooms, project.package].filter(Boolean).map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <strong>${project.price || "Стоимость"}</strong>
    </div>
  `;
}

function setStatus(text) {
  saveStatus.textContent = text;
  window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 2200);
}

async function saveActive() {
  const current = activeProject();
  const payload = readForm(current || {});
  let response;
  if (current?.id) {
    response = await api(`/api/projects/${current.id}`, { method: "PUT", body: JSON.stringify(payload) });
    projects = projects.map((project) => (project.id === current.id ? response.project : project));
  } else {
    response = await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    projects = [response.project, ...projects];
    activeId = response.project.id;
  }
  renderList();
  fillForm(response.project);
  setStatus("Сохранено на сервере");
}

function createProject() {
  activeId = null;
  fillForm({
    title: "Новый проект",
    status: "Проект",
    photos: [],
    plans: [],
    features: [],
    specs: []
  });
  renderList();
}

async function deleteActive() {
  if (!activeId) return;
  await api(`/api/projects/${activeId}`, { method: "DELETE" });
  projects = projects.filter((project) => project.id !== activeId);
  activeId = projects[0]?.id || null;
  renderList();
  fillForm(activeProject());
}

async function uploadFiles(files, field) {
  const current = activeProject() || readForm({});
  const data = new FormData();
  [...files].forEach((file) => data.append("files", file));
  const payload = await api("/api/uploads", { method: "POST", body: data });
  current[field] = [...(current[field] || []), ...payload.files];
  if (field === "photos") current.image = current.photos[0]?.src || "";
  fillForm(current);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";
  const mode = authMode.value;
  const payload = {
    email: authForm.elements.email.value.trim(),
    password: authForm.elements.password.value,
    name: authForm.elements.name.value.trim(),
    inviteCode: authForm.elements.inviteCode.value.trim()
  };
  try {
    const response = await api(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
    currentUser = response.user;
    showApp();
    await loadProjects();
  } catch (error) {
    authError.textContent = error.message;
  }
});

authToggle.addEventListener("click", () => {
  setAuthMode(authMode.value === "login" ? "register" : "login");
});

document.querySelector("[data-logout]").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  currentUser = null;
  showAuth();
});

listRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-id]");
  if (!button) return;
  activeId = button.dataset.projectId;
  renderList();
  fillForm(activeProject());
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveActive();
});

form.addEventListener("input", () => renderPreview(readForm(activeProject() || {})));
document.querySelector("[data-new-project]").addEventListener("click", createProject);
document.querySelector("[data-delete]").addEventListener("click", deleteActive);
document.querySelector("[data-photo-input]").addEventListener("change", (event) => uploadFiles(event.target.files, "photos"));
document.querySelector("[data-plan-input]").addEventListener("change", (event) => uploadFiles(event.target.files, "plans"));

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-media]");
  if (!button) return;
  const current = activeProject() || readForm({});
  const field = button.dataset.removeMedia;
  const index = Number(button.dataset.mediaIndex);
  current[field].splice(index, 1);
  if (field === "photos") current.image = current.photos[0]?.src || "";
  fillForm(current);
});

setAuthMode("login");
bootstrap();
