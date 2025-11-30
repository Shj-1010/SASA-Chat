const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. 친구 목록 및 요청 조회 (핵심!)
router.get('/list', async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ friends: [], received: [], sent: [] });
    const myId = req.user.id;

    try {
        // 1) 내 친구 목록 (Status = accepted)
        const [friends] = await db.query(`
            SELECT u.id, u.nickname, u.profile_img, u.status_msg
            FROM users u
            JOIN friendships f ON (f.sender_id = u.id OR f.receiver_id = u.id)
            WHERE (f.sender_id = ? OR f.receiver_id = ?)
            AND f.status = 'accepted'
            AND u.id != ?
        `, [myId, myId, myId]);

        // 2) 받은 요청 (Status = pending, Receiver = Me)
        // [수정] f.created_at 을 확실하게 가져오도록 명시했습니다!
        const [received] = await db.query(`
            SELECT u.id, u.nickname, u.profile_img, u.status_msg, f.id as request_id, f.created_at
            FROM users u
            JOIN friendships f ON f.sender_id = u.id
            WHERE f.receiver_id = ? AND f.status = 'pending'
        `, [myId]);

        // 3) 보낸 요청 (Status = pending, Sender = Me)
        const [sent] = await db.query(`
            SELECT u.id, u.nickname, u.profile_img, u.status_msg, f.id as request_id, f.created_at
            FROM users u
            JOIN friendships f ON f.receiver_id = u.id
            WHERE f.sender_id = ? AND f.status = 'pending'
        `, [myId]);

        res.json({ friends, received, sent });
    } catch (err) {
        console.error(err);
        res.status(500).send('DB Error');
    }
});

// 2. 친구 검색 (나, 이미 친구인 사람 제외)
router.get('/search', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.json([]);
    const myId = req.isAuthenticated() ? req.user.id : 0;

    try {
        const [users] = await db.query(`
            SELECT id, nickname, profile_img, status_msg 
            FROM users 
            WHERE nickname LIKE ? 
            AND id != ?
            AND id NOT IN (
                SELECT receiver_id FROM friendships WHERE sender_id = ?
                UNION
                SELECT sender_id FROM friendships WHERE receiver_id = ?
            )
        `, [`%${keyword}%`, myId, myId, myId]);
        res.json(users);
    } catch (err) { res.status(500).send('Error'); }
});

// 3. 친구 요청 보내기
router.post('/request', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, msg: '로그인 필요' });
    const { receiverId } = req.body;
    const senderId = req.user.id;

    try {
        // 이미 요청했거나 친구인지 확인
        const [check] = await db.query(`
            SELECT * FROM friendships 
            WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?)
        `, [senderId, receiverId, receiverId, senderId]);

        if (check.length > 0) return res.json({ success: false, msg: '이미 요청했거나 친구입니다.' });

        await db.query(`
            INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, 'pending')
        `, [senderId, receiverId]);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, msg: 'Error' }); }
});

// 4. 요청 수락/거절
router.post('/respond', async (req, res) => {
    const { requestId, action } = req.body; // action: 'accept' or 'reject'
    try {
        if (action === 'accept') {
            await db.query("UPDATE friendships SET status = 'accepted' WHERE id = ?", [requestId]);
        } else {
            await db.query("DELETE FROM friendships WHERE id = ?", [requestId]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 5. 친구 삭제 / 요청 취소
router.delete('/:id', async (req, res) => {
    const targetId = req.params.id;
    const myId = req.user.id;
    try {
        // 친구 관계 끊기 (내가 보냈든 받았든 상관없이 삭제)
        await db.query(`
            DELETE FROM friendships 
            WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?)
        `, [myId, targetId, targetId, myId]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 6. 요청 취소 (Request ID로 삭제)
router.delete('/request/:id', async (req, res) => {
    const requestId = req.params.id;
    try {
        await db.query('DELETE FROM friendships WHERE id = ?', [requestId]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

module.exports = router;