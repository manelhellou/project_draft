import dotenv from 'dotenv';
import axios from 'axios';
import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

dotenv.config();

// Database connection setup
const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: fs.readFileSync('us-east-2-bundle.pem').toString(),
    }
});
// Connect to the database
db.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => console.error("Connection error", err.stack));




function hello(string) {
    console.log("hello")
    return 'hello ' + string;
}

hello();