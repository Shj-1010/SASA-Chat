import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api'; // 방금 만든 설정 파일 불러오기
import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  const [user, setUser] = useState(null); // 로그인한 유저 정보
  const [loading, setLoading] = useState(true); // 로딩 중인가?

  // 앱 실행 시 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await api.get('/auth/me'); // 서버에 "나 누구야?" 물어보기
        if (response.data.authenticated) {
          setUser(response.data.user); // 유저 정보 저장
        }
      } catch (error) {
        console.error("로그인 체크 실패:", error);
      } finally {
        setLoading(false); // 확인 끝
      }
    };
    checkLoginStatus();
  }, []);

  if (loading) return <div>로딩 중...</div>; // 깜빡임 방지용

  return (
    <Router>
      <Routes>
        {/* 로그인이 안 되어 있으면 Login 페이지로, 되어 있으면 Home으로 */}
        <Route 
          path="/" 
          element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" />}
        />
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;