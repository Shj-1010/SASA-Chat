const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config(); // .env 파일 불러오기

// DB 연결 풀 생성 (접속자가 많아도 버티게 해줌)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 연결 테스트
const promisePool = pool.promise();

promisePool.getConnection()
    .then(conn => {
        console.log("✅ DB 연결 성공! (SasaChat DB)");
        conn.release();
    })
    .catch(err => {
        console.error("❌ DB 연결 실패:", err);
    });

module.exports = promisePool;