const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ users: [], rooms: [] });

    const myId = req.user.id;
    
    try {
        // 1. 내 정보 가져오기 (해시태그 분석용)
        const [me] = await db.query('SELECT hashtags FROM users WHERE id = ?', [myId]);
        const myTags = me[0].hashtags ? me[0].hashtags.split(',').map(t => t.trim()) : [];

        // --- 🤝 유저 추천 로직 ---
        
        // SQL 설명:
        // 1. 나 자신 제외 (u.id != ?)
        // 2. 이미 친구인 사람 제외 (NOT IN friendships)
        // 3. (옵션) 내 태그와 겹치는 게 있으면 점수를 더 줘서 정렬하고 싶지만, 
        //    일단은 간단하게 '랜덤' 혹은 '최신순'으로 가져오되 태그가 겹치면 UI에서 강조됨.
        
        const [users] = await db.query(`
            SELECT id, nickname, profile_img, status_msg, hashtags 
            FROM users 
            WHERE id != ? 
            AND id NOT IN (
                SELECT receiver_id FROM friendships WHERE sender_id = ? AND status = 'accepted'
                UNION
                SELECT sender_id FROM friendships WHERE receiver_id = ? AND status = 'accepted'
            )
            ORDER BY RAND() 
            LIMIT 5
        `, [myId, myId, myId]);

        // --- 💬 채팅방 추천 로직 ---

        // SQL 설명:
        // 1. 내가 이미 참여한 방은 제외 (NOT IN room_participants)
        
        const [rooms] = await db.query(`
            SELECT c.id, c.title, c.hashtags, 
            (SELECT COUNT(*) FROM room_participants WHERE room_id = c.id) as user_count
            FROM chatrooms c
            WHERE c.id NOT IN (
                SELECT room_id FROM room_participants WHERE user_id = ?
            )
            ORDER BY created_at DESC 
            LIMIT 5
        `, [myId]);

        // [Javascript 레벨에서 정교한 필터링]
        // SQL로 태그 매칭하기 복잡하므로, 가져온 5명 중에서 내 태그랑 겹치는 순서로 재정렬
        
        const sortedUsers = users.sort((a, b) => {
            const aMatch = countMatchingTags(myTags, a.hashtags);
            const bMatch = countMatchingTags(myTags, b.hashtags);
            return bMatch - aMatch; // 매칭 개수 많은 순서로 정렬
        });

        const sortedRooms = rooms.sort((a, b) => {
            const aMatch = countMatchingTags(myTags, a.hashtags);
            const bMatch = countMatchingTags(myTags, b.hashtags);
            return bMatch - aMatch;
        });

        res.json({ users: sortedUsers, rooms: sortedRooms });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

// 태그 겹치는 개수 세는 함수
function countMatchingTags(myTags, targetTagsStr) {
    if (!targetTagsStr || myTags.length === 0) return 0;
    const targetTags = targetTagsStr.split(',').map(t => t.trim());
    // 교집합 개수 구하기
    const intersection = myTags.filter(x => targetTags.includes(x));
    return intersection.length;
}

module.exports = router;