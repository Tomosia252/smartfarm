const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// Membaca sertifikat keamanan SSL dari Aiven
const aivenCert = fs.readFileSync(__dirname + '/ca.pem');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    ssl: {
        ca: aivenCert
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;