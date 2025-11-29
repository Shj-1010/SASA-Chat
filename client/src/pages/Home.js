import React, { useState } from 'react';
import styled from 'styled-components';
import Navbar from '../components/Navbar';
import Profile from './Profile';
import Friends from './Friends';
import Chat from './Chat';
import Recommend from './Recommend';
import Admin from './Admin';

const Home = ({ user, setUser }) => { 
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <MainContainer>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      <ContentArea>
        {/* Profile에 user 정보 전달 */}
        {activeTab === 'profile' && <Profile user={user} setUser={setUser} />}
        {activeTab === 'friends' && <Friends />}
        {activeTab === 'chat' && <Chat user={user} />}
        {activeTab === 'recommend' && <Recommend user={user} />}
        {activeTab === 'admin' && <Admin />}
      </ContentArea>
    </MainContainer>
  );
};

export default Home;

const MainContainer = styled.div`
  display: flex;
  width: 100%;
`;

const ContentArea = styled.div`
  /* PC 버전: 메뉴바 너비(80px)만큼 띄움 */
  margin-left: 80px;
  width: calc(100% - 80px);
  height: 100vh;
  background-color: #f8f9fa;
  
  /* 모바일 버전 (768px 이하): 꽉 채우기 */
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
    padding-top: 50px; /* 상단 햄버거 버튼 가리지 않게 여백 */
  }
`;