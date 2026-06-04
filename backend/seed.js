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

module.exports = { seedProjects };
