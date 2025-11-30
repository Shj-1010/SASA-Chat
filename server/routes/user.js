const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// --- [Multer 설정] 사진 저장하는 도구 ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // uploads 폴더에 저장
    },
    filename: (req, file, cb) => {
        // 파일 이름 안 겹치게: 날짜 + 랜덤숫자 + 원래확장자
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 1. 내 프로필 정보 가져오기
router.get('/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ success: false });
    
    try {
        const [rows] = await db.query(`
            SELECT id, nickname, email, profile_img, status_msg, hashtags, role,
            (SELECT COUNT(*) FROM friendships WHERE (sender_id = users.id OR receiver_id = users.id) AND status='accepted') as friendCount,
            (SELECT COUNT(*) FROM room_participants WHERE user_id = users.id) as roomCount
            FROM users WHERE id = ?
        `, [req.user.id]);
        
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'DB Error' });
    }
});

// 2. 프로필 수정하기 (사진 + 텍스트)
// upload.single('profile_img') -> 이게 있어야 FormData를 해석할 수 있음!
router.put('/profile', upload.single('profile_img'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, msg: '로그인 필요' });

    const userId = req.user.id;
    const { nickname, status_msg, hashtags } = req.body; // 텍스트 데이터 꺼내기
    
    try {
        // 1. 사진이 새로 올라왔는지 확인
        if (req.file) {
            // [경우 A] 사진도 바꾸고, 글도 바꿈
            const imgPath = `/uploads/${req.file.filename}`;
            await db.query(
                'UPDATE users SET nickname=?, status_msg=?, hashtags=?, profile_img=? WHERE id=?',
                [nickname, status_msg, hashtags, imgPath, userId]
            );
        } else {
            // [경우 B] 사진은 그대로, 글만 바꿈
            await db.query(
                'UPDATE users SET nickname=?, status_msg=?, hashtags=? WHERE id=?',
                [nickname, status_msg, hashtags, userId]
            );
        }

        // 2. 업데이트된 최신 정보 다시 가져와서 프론트에 돌려주기
        const [updatedUser] = await db.query(`
            SELECT id, nickname, email, profile_img, status_msg, hashtags, role,
            (SELECT COUNT(*) FROM friendships WHERE (sender_id = users.id OR receiver_id = users.id) AND status='accepted') as friendCount,
            (SELECT COUNT(*) FROM room_participants WHERE user_id = users.id) as roomCount
            FROM users WHERE id = ?
        `, [userId]);

        res.json({ success: true, user: updatedUser[0] });

    } catch (err) {
        console.error("프로필 저장 에러:", err);
        res.status(500).json({ success: false, msg: '서버 저장 중 오류 발생' });
    }
});

module.exports = router;