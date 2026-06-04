const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const projectsRoot = document.querySelector("[data-projects]");
const galleryRoot = document.querySelector("[data-gallery]");

function syncHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function renderProjects() {
  const projects = window.KARKAS_PROJECTS || [];
  projectsRoot.innerHTML = projects
    .map(
      (project) => `
        <article class="project-card">
          <img src="${project.image}" alt="${project.title}" loading="lazy">
          <div class="project-body">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <ul class="project-meta" aria-label="Параметры проекта">
              <li>${project.area}</li>
              <li>${project.floors}</li>
              <li>${project.rooms}</li>
            </ul>
            <strong class="project-price">${project.price}</strong>
            <a class="button button-primary" href="#contacts">Хочу такой дом</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderGallery() {
  const gallery = window.KARKAS_GALLERY || [];
  galleryRoot.innerHTML = gallery
    .map(
      (item) => `
        <figure class="gallery-item">
          <img src="${item.image}" alt="${item.alt}" loading="lazy">
        </figure>
      `
    )
    .join("");
}

function bindForms() {
  document.querySelectorAll("[data-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = form.querySelector("[data-form-note]");
      const formData = new FormData(form);
      const phone = String(formData.get("phone") || "").trim();

      if (phone.length < 6) {
        note.textContent = "Укажите телефон, чтобы мы могли связаться.";
        return;
      }

      note.textContent = "Спасибо. Мы свяжемся с вами и подготовим следующий шаг.";
      form.reset();
    });
  });
}

navToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("is-open");
  navToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    header.classList.remove("is-open");
    navToggle.setAttribute("aria-label", "Открыть меню");
  }
});

window.addEventListener("scroll", syncHeader, { passive: true });

syncHeader();
renderProjects();
renderGallery();
bindForms();
