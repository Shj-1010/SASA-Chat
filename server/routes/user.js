const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// 사진 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 프로필 수정 API
router.post('/update', upload.single('profileImg'), async (req, res) => {

  // console.log("프론트에서 온 데이터:", req.body);

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  // 1. 프론트에서 보낸 데이터 받기
  const { nickname, statusMsg, hashtags } = req.body; // hashtags가 여기 꼭 있어야 함!
  const userId = req.user.id;
  
  // 2. SQL 업데이트문 작성 (hashtags = ? 포함 확인!)
  let sql = 'UPDATE users SET nickname = ?, status_msg = ?, hashtags = ?';
  let params = [nickname, statusMsg, hashtags];

  // 사진이 있으면 사진도 업데이트
  if (req.file) {
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    sql += ', profile_img = ?';
    params.push(imageUrl);
  }

  sql += ' WHERE id = ?';
  params.push(userId);

  try {
    // 3. DB 업데이트 실행
    await db.query(sql, params);
    
    // 4. 업데이트된 최신 정보를 다시 가져와서 프론트에 돌려줌
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("업데이트 에러:", err);
    res.status(500).json({ message: '서버 에러 발생' });
  }
});

module.exports = router;  