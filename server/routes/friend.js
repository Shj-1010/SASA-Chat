const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. 내 친구 목록 & 받은 요청 조회
router.get('/list', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send('로그인 필요');
    const myId = req.user.id;

    try {
        // 친구 목록 (상태가 'accepted'인 경우)
        const [friends] = await db.query(`
            SELECT u.id, u.nickname, u.status_msg, u.profile_img 
            FROM friends f
            JOIN users u ON (f.requester_id = u.id OR f.receiver_id = u.id)
            WHERE (f.requester_id = ? OR f.receiver_id = ?) AND f.status = 'accepted' AND u.id != ?
        `, [myId, myId, myId]);

        // 받은 요청 목록 (내가 receiver이고 상태가 'pending')
        const [received] = await db.query(`
            SELECT u.id, u.nickname, u.status_msg, u.profile_img, f.id as request_id
            FROM friends f
            JOIN users u ON f.requester_id = u.id
            WHERE f.receiver_id = ? AND f.status = 'pending'
        `, [myId]);

        // 보낸 요청 목록 (내가 requester이고 상태가 'pending')
        const [sent] = await db.query(`
            SELECT u.id, u.nickname, u.status_msg, u.profile_img, f.id as request_id
            FROM friends f
            JOIN users u ON f.receiver_id = u.id
            WHERE f.requester_id = ? AND f.status = 'pending'
        `, [myId]);

        res.json({ friends, received, sent });
    } catch (err) {
        console.error(err);
        res.status(500).send('DB Error');
    }
});

// 2. 유저 검색 (닉네임으로 친구 찾기)
router.get('/search', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.json([]);
    try {
        const [users] = await db.query(`
            SELECT id, nickname, status_msg, profile_img FROM users 
            WHERE nickname LIKE ? AND id != ?
        `, [`%${keyword}%`, req.user.id]);
        res.json(users);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// 3. 친구 요청 보내기
router.post('/request', async (req, res) => {
    const { receiverId } = req.body;
    const requesterId = req.user.id;
    try {
        // 이미 요청했거나 친구인지 확인
        const [exists] = await db.query(`
            SELECT * FROM friends 
            WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
        `, [requesterId, receiverId, receiverId, requesterId]);

        if (exists.length > 0) return res.json({ success: false, msg: '이미 요청했거나 친구입니다.' });

        await db.query(`INSERT INTO friends (requester_id, receiver_id) VALUES (?, ?)`, [requesterId, receiverId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Error');
    }
});

// 4. 친구 요청 수락
router.post('/accept', async (req, res) => {
    const { requestId } = req.body;
    try {
        await db.query(`UPDATE friends SET status = 'accepted' WHERE id = ?`, [requestId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Error');
    }
});

// 5. 친구 삭제 / 요청 거절 / 요청 취소 (통합 삭제)
router.post('/delete', async (req, res) => {
    const { targetId, isRequestId } = req.body; // isRequestId: friends 테이블의 id인지, user id인지 구분
    const myId = req.user.id;
    try {
        if (isRequestId) {
             // 요청 ID로 바로 삭제 (거절/취소)
             await db.query(`DELETE FROM friends WHERE id = ?`, [targetId]);
        } else {
             // 친구 관계 끊기 (상대방 ID로 찾아서 삭제)
             await db.query(`
                DELETE FROM friends 
                WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
             `, [myId, targetId, targetId, myId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Error');
    }
});

module.exports = router;