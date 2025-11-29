const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. [전체 목록] 추천 탭용 (모든 방 보여주기)
router.get('/rooms', async (req, res) => {
    try {
        const [rooms] = await db.query('SELECT * FROM chatrooms ORDER BY created_at DESC');
        res.json(rooms);
    } catch (err) { res.status(500).send('Error'); }
});

// 2. [내 목록] 채팅 탭용 (내가 참여한 방만 보여주기) ⭐ NEW
router.get('/my-rooms', async (req, res) => {
    if (!req.isAuthenticated()) return res.json([]);
    try {
        const userId = req.user.id;
        const [myRooms] = await db.query(`
            SELECT c.* FROM chatrooms c
            JOIN room_participants rp ON c.id = rp.room_id
            WHERE rp.user_id = ?
            ORDER BY rp.joined_at DESC
        `, [userId]);
        res.json(myRooms);
    } catch (err) { res.status(500).send('Error'); }
});

// 3. 채팅방 만들기 (만든 사람은 자동으로 참여자로 등록!) ⭐ UPDATE
router.post('/room', async (req, res) => {
    const { title, hashtags } = req.body;
    const creatorId = req.user.id;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 방 만들기
        const [result] = await conn.query(
            'INSERT INTO chatrooms (title, creator_id, hashtags) VALUES (?, ?, ?)', 
            [title, creatorId, hashtags]
        );
        const newRoomId = result.insertId;

        // [중요] 만든 사람을 참여자 명단에 추가
        await conn.query(
            'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
            [newRoomId, creatorId]
        );

        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback();
        res.status(500).send('Error'); 
    } finally {
        conn.release();
    }
});

// 4. [참여하기] 추천 탭에서 방 클릭했을 때 실행 ⭐ NEW
router.post('/join', async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user.id;
    try {
        // 이미 참여했는지 확인하지 않고 INSERT IGNORE (있으면 무시, 없으면 추가)
        await db.query(
            'INSERT IGNORE INTO room_participants (room_id, user_id) VALUES (?, ?)',
            [roomId, userId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 5. 방 나가기 (삭제 대신 목록에서만 제거)
router.delete('/room/:id', async (req, res) => {
    const roomId = req.params.id;
    const userId = req.user.id;
    try {
        // 내 목록에서만 삭제
        await db.query('DELETE FROM room_participants WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        
        // (선택사항) 방에 아무도 없으면 방 폭파? -> 일단은 유지
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

module.exports = router;