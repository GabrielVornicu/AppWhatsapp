require("dotenv").config();

const app = require("./app");
const { startQueueRunner } = require("./workers/queueRunner");

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);

  // pornește worker-ul de mesaje
  startQueueRunner();
});
