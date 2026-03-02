const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// static files (CSS)
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>CRM App</title>
        <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <div class="container">
            <h1>🚀 Node.js CRM is running</h1>
            <p>Dacă vezi asta, aplicația funcționează corect.</p>
            <div class="card">
                <h2>Pasul 1 complet</h2>
                <p>Serverul răspunde și UI-ul se încarcă.</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
