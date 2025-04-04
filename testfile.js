require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');

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


db.query(query)

function hello(string) {
    console.log("hello")
    return 'hello ' + string;
}

hello();