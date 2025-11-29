const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db'); // DB 연결

module.exports = (passport) => {
    passport.serializeUser((user, done) => {
        done(null, user.id); // 세션에 user ID만 저장
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
            done(null, rows[0]); // DB에서 유저 정보 찾아서 복구
        } catch (err) {
            done(err);
        }
    });

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. 이미 가입된 유저인지 확인
            const [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);

            if (rows.length > 0) {
                const user = rows[0];

                if (user.ban_expires_at && new Date(user.ban_expires_at) > new Date()) {
                    return done(null, false, { message: `계정이 정지되었습니다. 해제일: ${user.ban_expires_at}` });
                }

                return done(null, user);
            } else {
                // 2. 신규 유저 -> 회원가입 (DB에 저장)
                // 닉네임이 없으므로 일단 '익명_난수'로 임시 설정
                const newNickname = `익명_${Math.floor(Math.random() * 10000)}`;
                
                const [result] = await db.query(
                    'INSERT INTO users (google_id, email, nickname, role) VALUES (?, ?, ?, ?)',
                    [profile.id, profile.emails[0].value, newNickname, 'user']
                );

                const newUser = {
                    id: result.insertId,
                    google_id: profile.id,
                    email: profile.emails[0].value,
                    nickname: newNickname,
                    role: 'user'
                };
                return done(null, newUser);
            }
        } catch (err) {
            console.error(err);
            return done(err);
        }
    }));
};