const express = require('express');
const passport = require('passport');
const router = express.Router();

// 1. 구글 로그인 버튼 누르면 이동하는 주소
// http://localhost:5000/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. 구글 인증 후 돌아오는 주소 (Callback)
// 성공하면 프론트엔드 메인화면(http://localhost:3000)으로 보냄
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
    (req, res) => {
        // 로그인 성공! 리액트 화면으로 리다이렉트
        res.redirect('http://localhost:3000'); 
    }
);

// 3. 현재 로그인된 유저 정보 확인 (프론트엔드에서 사용)
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
        res.redirect('http://localhost:3000');
    });
});

module.exports = router;