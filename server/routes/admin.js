const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 미들웨어: 관리자인지 확인하는 수문장
const isAdmin = (req, res, next) => {
    // 1차 검사: 로그인이 되어있는가?
    if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "로그인이 필요합니다." });
    }

    // 2차 검사: DB상 역할이 admin인가?
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "관리자 권한이 없습니다." });
    }

    // [NEW] 3차 검사 (최종 보스): 이메일이 진짜 선생님 이메일인가?
    // .env 파일에 적어둔 이메일과 다르면 절대 통과 못 함
    if (req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ message: "접근이 거부되었습니다. (이메일 불일치)" });
    }

    return next(); // 모든 관문 통과!
};

// 1. 모든 유저 조회
router.get('/users', isAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, google_id, email, nickname, role, ban_expires_at FROM users');
        res.json(users);
    } catch (err) { res.status(500).send('DB Error'); }
});

// 2. 모든 신고 내역 조회
router.get('/reports', isAdmin, async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT r.*, u.email as reporter_email 
            FROM reports r
            JOIN users u ON r.reporter_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(reports);
    } catch (err) { res.status(500).send('DB Error'); }
});

// 3. 유저 제재 (기간 정지 / 영구 차단)
router.post('/ban', isAdmin, async (req, res) => {
    const { userId, duration } = req.body; // duration: '1h', '3h', 'forever' 등
    
    let banDate = new Date();
    
    // 시간 계산 로직
    switch(duration) {
        case '1h': banDate.setHours(banDate.getHours() + 1); break;
        case '3h': banDate.setHours(banDate.getHours() + 3); break;
        case '6h': banDate.setHours(banDate.getHours() + 6); break;
        case '12h': banDate.setHours(banDate.getHours() + 12); break;
        case '24h': banDate.setHours(banDate.getHours() + 24); break;
        case '7d': banDate.setDate(banDate.getDate() + 7); break;
        case '30d': banDate.setDate(banDate.getDate() + 30); break;
        case '1y': banDate.setFullYear(banDate.getFullYear() + 1); break;
        case 'forever': banDate.setFullYear(banDate.getFullYear() + 99); break; // 99년 뒤 해제
        case 'release': banDate = null; break; // 차단 해제
        default: return res.status(400).json({ message: "잘못된 기간입니다." });
    }

    try {
        await db.query('UPDATE users SET ban_expires_at = ? WHERE id = ?', [banDate, userId]);
        res.json({ success: true, banExpiresAt: banDate });
    } catch (err) {
        console.error(err);
        res.status(500).send('DB Error');
    }
});

module.exports = router;