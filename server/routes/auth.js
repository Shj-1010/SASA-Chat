const express = require('express');
const passport = require('passport');
const router = express.Router();

// 1. 구글 로그인 버튼 누르면 이동하는 주소
// http://localhost:5000/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. 구글 인증 후 돌아오는 주소 (Callback)
router.get('/google/callback', 
    passport.authenticate('google', { 
        // [수정] 실패 시 /login 페이지로 이동하게 함
        failureRedirect: 'https://web-sasachat-web-mijx5epp1435215a.sel3.cloudtype.app/login' 
    }),
    (req, res) => {
        // [수정] 성공 시 메인 페이지로 이동
        res.redirect('https://web-sasachat-web-mijx5epp1435215a.sel3.cloudtype.app'); 
    }
);

// 3. 현재 로그인된 유저 정보 확인
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false, user: null });
    }
});

// 4. 로그아웃
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        // [수정] 로그아웃 후 메인으로 이동
        res.redirect('https://web-sasachat-web-mijx5epp1435215a.sel3.cloudtype.app');
    });
});

module.exports = router;