const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: '로그인 필요' });
    
    const myId = req.user.id;

    try {
        // 1. 내 정보(해시태그) 가져오기
        const [me] = await db.query('SELECT hashtags FROM users WHERE id = ?', [myId]);
        const myTags = me[0].hashtags ? me[0].hashtags.split(' ') : []; // ['#축구', '#게임'] 형태로 변환

        // 2. 다른 유저들 가져오기 (나는 제외)
        // (실제 서비스에선 친구인 사람도 제외해야 하지만 일단 간단하게 구현)
        const [users] = await db.query('SELECT id, nickname, status_msg, profile_img, hashtags FROM users WHERE id != ?', [myId]);

        // 3. 채팅방들 가져오기
        const [rooms] = await db.query('SELECT * FROM chatrooms');

        // --- 알고리즘: 태그 일치 점수 계산 ---
        
        // (1) 유저 추천 점수 계산
        const recommendedUsers = users.map(user => {
            const userTags = user.hashtags ? user.hashtags.split(' ') : [];
            // 교집합 개수 구하기
            const score = userTags.filter(tag => myTags.includes(tag)).length;
            return { ...user, score };
        })
        .filter(u => u.score > 0) // 하나라도 겹치는 사람만
        .sort((a, b) => b.score - a.score); // 점수 높은 순 정렬

        // (2) 채팅방 추천 점수 계산 (채팅방 제목이나 태그에 내 관심사가 포함되면 추천)
        const recommendedRooms = rooms.map(room => {
            // 채팅방은 해시태그 컬럼이 없으니 제목(title)이나 별도 태그 컬럼이랑 비교
            // 여기선 제목에 내 태그가 포함되어 있는지로 단순화
            let score = 0;
            myTags.forEach(tag => {
                const keyword = tag.replace('#', ''); // '#' 떼고 검색
                if (room.title.includes(keyword)) score++;
            });
            return { ...room, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

        // 결과가 너무 없으면 그냥 최신순/랜덤으로 몇 개 채워주기 (보완 로직)
        // 이번엔 일단 매칭된 것만 보냄
        
        res.json({ users: recommendedUsers, rooms: recommendedRooms });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;