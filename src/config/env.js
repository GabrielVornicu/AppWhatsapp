require("dotenv").config();

const requiredEnv = [
  "DATABASE_URL",
  "PORT",
  "NODE_ENV"
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  port: process.env.PORT,
  dbUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
};
