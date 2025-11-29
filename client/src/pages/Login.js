import React from 'react';
import styled from 'styled-components';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <Container>
      <LoginBox>
        <Logo>SasaChat</Logo>
        <SubTitle>우리만의 익명 소통 공간</SubTitle>
        
        {/* 디자인용 가짜 입력창 (기능 없음) */}
        <Input placeholder="아이디" disabled />
        <Input type="password" placeholder="비밀번호" disabled />
        
        <LoginButton disabled>로그인</LoginButton>

        <Divider>
          <span>또는</span>
        </Divider>

        {/* 진짜 로그인 버튼 */}
        <GoogleButton onClick={handleGoogleLogin}>
          <FcGoogle size="20" />
          <span>학교 구글 계정으로 로그인</span>
        </GoogleButton>
      </LoginBox>
    </Container>
  );
};

export default Login;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
`;

const LoginBox = styled.div`
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Logo = styled.h1`
  font-size: 32px;
  color: #4a90e2;
  margin-bottom: 10px;
  font-weight: bold;
`;

const SubTitle = styled.p`
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
  cursor: not-allowed;
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #ddd;
  color: white;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  margin-top: 10px;
  cursor: not-allowed;
`;

const Divider = styled.div`
  width: 100%;
  text-align: center;
  border-bottom: 1px solid #eee;
  line-height: 0.1em;
  margin: 30px 0;
  span {
    background: #fff;
    padding: 0 10px;
    color: #999;
    font-size: 12px;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  font-weight: bold;
  color: #444;
  transition: 0.2s;

  &:hover {
    background-color: #f8f8f8;
    border-color: #ccc;
  }
`;