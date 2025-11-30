import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaCamera } from 'react-icons/fa';
import api from '../api';

const Profile = ({ user, setUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTags, setEditTags] = useState('');
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setEditName(user.nickname);
      setEditStatus(user.status_msg || '');
      setPreview(user.profile_img || "/default.png");
      setEditTags(user.hashtags || '');
    }
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const onCameraClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  // [수정] 경고창 없이 바로 저장하는 함수
  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('nickname', editName);
      formData.append('status_msg', editStatus);
      formData.append('hashtags', editTags);
      if (file) {
        formData.append('profile_img', file);
      }

      const res = await api.put('/user/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        // user 상태 업데이트
        setUser(res.data.user);
        setIsEditing(false);
        // 저장은 조용히 하고 완료되었다는 것만 살짝 알려줌 (선택사항)
        // alert("저장되었습니다."); 
      }
    } catch (err) {
      console.error(err);
      alert("저장 실패!");
    }
  };

  return (
    <Container>
      <Header>내 프로필</Header>
      <ProfileCard>
        <ImgWrapper>
           <ProfileImg src={preview} alt="profile" />
           {isEditing && (
             <CameraBtn onClick={onCameraClick}>
               <FaCamera />
             </CameraBtn>
           )}
           <input 
             type="file" 
             ref={fileInputRef} 
             style={{display:'none'}} 
             onChange={handleFileChange} 
             accept="image/*"
           />
        </ImgWrapper>

        <UserInfo>
          {isEditing ? (
            <>
               <Label>닉네임</Label>
               <EditInput value={editName} onChange={(e) => setEditName(e.target.value)} />
               
               <Label>상태 메시지</Label>
               <EditInput value={editStatus} onChange={(e) => setEditStatus(e.target.value)} placeholder="상태 메시지 입력" />

               <Label>관심사 태그 (쉼표로 구분)</Label>
               <EditInput value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="예: #운동, #독서" />

               <BtnGroup>
                 <CancelBtn onClick={() => { setIsEditing(false); setPreview(user.profile_img || "/default.png"); }}>취소</CancelBtn>
                 <SaveBtn onClick={handleSave}>저장완료</SaveBtn>
               </BtnGroup>
            </>
          ) : (
            <>
               <Name>{user?.nickname}</Name>
               <StatusMsg>{user?.status_msg || "상태 메시지가 없습니다."}</StatusMsg>
               
               <Stats>
                  <StatItem>친구 <b>{user?.friendCount || 0}</b></StatItem>
                  <StatItem>채팅 <b>{user?.roomCount || 0}</b></StatItem>
               </Stats>

               <Tags>
                 {user?.hashtags ? user.hashtags.split(',').map((tag, i) => (
                    <Tag key={i}>{tag.trim()}</Tag>
                 )) : <Tag>#태그없음</Tag>}
               </Tags>

               <EditBtn onClick={() => setIsEditing(true)}>프로필 수정</EditBtn>
            </>
          )}
        </UserInfo>
      </ProfileCard>
    </Container>
  );
};

export default Profile;

// --- 스타일 컴포넌트 ---
const Container = styled.div` padding: 40px; background-color: #fdfdfd; height: 100%; overflow-y: auto; `;
const Header = styled.h1` font-size: 26px; font-weight: bold; margin-bottom: 30px; color: #333; `;
const ProfileCard = styled.div` background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); display: flex; flex-direction: column; align-items: center; max-width: 500px; margin: 0 auto; text-align: center; `;
const ImgWrapper = styled.div` position: relative; margin-bottom: 30px; `;
const ProfileImg = styled.img` width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #f0f0f0; `;
const CameraBtn = styled.button` position: absolute; bottom: 5px; right: 5px; background: #4a90e2; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); &:hover { background: #357abd; } `;
const UserInfo = styled.div` width: 100%; `;
const Name = styled.h2` font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333; `;
const StatusMsg = styled.p` color: #666; margin-bottom: 30px; min-height: 20px; font-size: 15px; `;
const Stats = styled.div` display: flex; justify-content: center; gap: 30px; margin-bottom: 30px; padding: 20px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; `;
const StatItem = styled.div` font-size: 16px; color: #666; display: flex; flex-direction: column; gap: 5px; b { font-size: 20px; color: #333; } `;
const Tags = styled.div` display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 30px; `;
const Tag = styled.span` background-color: #f8f9fa; color: #4a90e2; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; `;
const Label = styled.div` text-align: left; font-size: 13px; font-weight: bold; color: #888; margin-bottom: 8px; margin-left: 5px; `;
const EditInput = styled.input` font-size: 16px; padding: 12px; margin-bottom: 20px; width: 100%; border: 1px solid #eee; border-radius: 10px; outline: none; box-sizing: border-box; &:focus { border-color: #4a90e2; } `;
const BtnGroup = styled.div` display: flex; gap: 10px; margin-top: 10px; `;
const Button = styled.button` flex: 1; padding: 12px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; border: none; transition: 0.2s; `;
const EditBtn = styled(Button)` background: #4a90e2; color: white; width: 100%; &:hover { background: #357abd; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(74, 144, 226, 0.3); } `;
const SaveBtn = styled(Button)` background: #4a90e2; color: white; &:hover { background: #357abd; } `;
const CancelBtn = styled(Button)` background: #f1f3f5; color: #333; &:hover { background: #e9ecef; } `;