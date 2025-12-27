const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const rootEnv = path.resolve(__dirname, '../.env');
const localEnv = path.resolve(__dirname, '.env');

console.log("Checking ENVs...");

if (fs.existsSync(localEnv)) {
    console.log("Loading backed/.env");
    const conf = dotenv.parse(fs.readFileSync(localEnv));
    console.log("DB_NAME:", conf.DB_NAME);
    console.log("DB_HOST:", conf.DB_HOST);
}
if (fs.existsSync(envPath)) {
    console.log("Loading .env.local");
    const conf = dotenv.parse(fs.readFileSync(envPath));
    console.log("Local DB_NAME:", conf.DB_NAME);
}
