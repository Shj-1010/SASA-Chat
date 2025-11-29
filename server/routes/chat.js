const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. 채팅방 목록 가져오기
router.get('/rooms', async (req, res) => {
    try {
        const [rooms] = await db.query('SELECT * FROM chatrooms ORDER BY created_at DESC');
        res.json(rooms);
    } catch (err) { res.status(500).send('Error'); }
});

// 2. 채팅방 만들기 (해시태그 포함)
router.post('/room', async (req, res) => {
    const { title, hashtags } = req.body; // 해시태그 받기
    const creatorId = req.user.id;
    try {
        await db.query('INSERT INTO chatrooms (title, creator_id, hashtags) VALUES (?, ?, ?)', [title, creatorId, hashtags]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 3. [NEW] 채팅방 삭제하기 (나가기 시 호출)
router.delete('/room/:id', async (req, res) => {
    const roomId = req.params.id;
    try {
        // 방을 지우면 연결된 메시지는 DB 설정(CASCADE) 덕분에 자동 삭제됨
        await db.query('DELETE FROM chatrooms WHERE id = ?', [roomId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

module.exports = router;