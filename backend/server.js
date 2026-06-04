const app = require("./app");
const storage = require("./storage");

const port = Number(process.env.PORT || 4173);

storage.init().then(() => {
  app.listen(port, () => {
    console.log(`Karkas Home backend: http://127.0.0.1:${port}`);
  });
});
