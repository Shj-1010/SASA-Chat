import React, { useState } from 'react';
import styled from 'styled-components';
import { FaUser, FaUserFriends, FaComments, FaSearch, FaSignOutAlt, FaShieldAlt, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = ({ activeTab, setActiveTab, user }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    if(window.confirm('정말 로그아웃 하시겠습니까?')) {
        // [수정] localhost 대신 진짜 서버 주소로 변경!
        // (Login.js 처럼 배포된 서버 주소를 사용합니다)
        const serverUrl = "https://port-0-sasa-chat-mijx5epp1435215a.sel3.cloudtype.app";
        window.location.href = `${serverUrl}/auth/logout`;
    }
  };

  const handleMenuClick = (tabName) => {
      setActiveTab(tabName);
      setIsOpen(false); 
  };

  return (
    <>
      <MobileMenuIcon onClick={() => setIsOpen(true)}>
        <FaBars />
      </MobileMenuIcon>

      <NavContainer isOpen={isOpen}>
        <MobileCloseBtn onClick={() => setIsOpen(false)}>
            <FaTimes size={24} />
        </MobileCloseBtn>

        <LogoArea>SasaChat</LogoArea>

        <MenuButton active={activeTab === 'profile'} onClick={() => handleMenuClick('profile')}>
          <FaUser size={24} />
          <span>프로필</span>
        </MenuButton>

        <MenuButton active={activeTab === 'friends'} onClick={() => handleMenuClick('friends')}>
          <FaUserFriends size={24} />
          <span>친구</span>
        </MenuButton>

        <MenuButton active={activeTab === 'chat'} onClick={() => handleMenuClick('chat')}>
          <FaComments size={24} />
          <span>채팅</span>
        </MenuButton>

        <MenuButton active={activeTab === 'recommend'} onClick={() => handleMenuClick('recommend')}>
          <FaSearch size={24} />
          <span>추천</span>
        </MenuButton>

        {user?.role === 'admin' && (
            <MenuButton active={activeTab === 'admin'} onClick={() => handleMenuClick('admin')}>
                <FaShieldAlt size={24} />
                <span>관리자</span>
            </MenuButton>
        )}

        <LogoutButton onClick={handleLogout}>
          <FaSignOutAlt size={24} />
          <span>로그아웃</span>
        </LogoutButton>
      </NavContainer>
      
      <Overlay isOpen={isOpen} onClick={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;

// --- 스타일 (개선됨) ---

const NavContainer = styled.div`
  width: 80px;
  height: 100vh;
  background-color: #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2000;
  /* 모바일에선 transition으로 움직이게 함 */
  transition: transform 0.3s ease-in-out;

  @media (max-width: 768px) {
    width: 250px;
    height: 100%;
    /* 닫혀있으면(-100%) 화면 왼쪽 밖으로, 열리면(0) 화면 안으로 */
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    align-items: flex-start;
    padding-top: 0;
    /* 내용물이 너비를 초과해도 튀어나오지 않게 함 */
    overflow-x: hidden; 
    box-shadow: ${({ isOpen }) => (isOpen ? '2px 0 10px rgba(0,0,0,0.2)' : 'none')};
  }
`;

const LogoArea = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    height: 60px;
    font-size: 20px;
    font-weight: bold;
    padding-left: 20px;
    width: 100%;
    border-bottom: 1px solid #444;
    margin-bottom: 10px;
    flex-shrink: 0; /* 로고 영역 찌그러짐 방지 */
  }
`;

const MobileMenuIcon = styled.div`
  display: none;
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 1500;
  font-size: 24px;
  color: #333;
  cursor: pointer;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileCloseBtn = styled.div`
  display: none;
  position: absolute;
  top: 18px;
  right: 15px;
  cursor: pointer;
  color: #aaa;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MenuButton = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80px;
  cursor: pointer;
  background-color: ${(props) => (props.active ? '#4a90e2' : 'transparent')};
  transition: 0.2s;
  /* 버튼 내용이 넘치지 않게 */
  box-sizing: border-box; 
  
  &:hover { background-color: #555; }

  span { font-size: 12px; margin-top: 5px; }

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: flex-start;
    padding-left: 20px;
    gap: 15px;
    height: 60px;
    /* 모바일에서 활성 탭 디자인 */
    border-left: 5px solid ${(props) => (props.active ? '#4a90e2' : 'transparent')};
    background-color: transparent; /* 모바일에선 배경색 대신 글자색/테두리로 표시 */
    color: ${(props) => (props.active ? '#4a90e2' : 'white')};
    
    span { font-size: 16px; margin-top: 0; }
  }
`;

const LogoutButton = styled(MenuButton)`
  margin-top: auto;
  background-color: #d9534f;
  height: 60px;
  flex-shrink: 0; /* 찌그러짐 방지 */
  &:hover { background-color: #c9302c; }
  
  @media (max-width: 768px) {
    border-left: none;
    color: white; /* 로그아웃은 빨간 배경 유지 */
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1900;
  /* 부드러운 페이드 효과 */
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  visibility: ${({ isOpen }) => (isOpen ? 'visible' : 'hidden')};
  transition: 0.3s;

  @media (min-width: 769px) {
    display: none;
  }
`;