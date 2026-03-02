const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("index", {
    title: "Node.js CRM",
    message: "Serverul rulează corect 🎉"
  });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
