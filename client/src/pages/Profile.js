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
    }
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      if (user.hashtags) {
          setEditTags(user.hashtags);
      }
    }
  };

  const onCameraClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    } else {
      alert("프로필 수정 버튼을 먼저 눌러주세요!");
    }
  };

  // 저장 버튼 클릭 (서버 전송)
  const handleSave = async () => {
    // 1. 보낼 데이터 포장 (FormData 사용)
    const formData = new FormData();
    formData.append('nickname', editName);
    formData.append('statusMsg', editStatus);
    formData.append('hashtags', editTags);
    if (file) {
      formData.append('profileImg', file);
    }

    try {
      const response = await api.post('/user/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        alert("저장되었습니다!");
        if (setUser) setUser(response.data.user); 
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
      alert("저장에 실패했습니다.");
    }
  };

  return (
    <Container>
      <ProfileCard>
        <ImageWrapper onClick={onCameraClick}>
           <ProfileImg src={preview} />
           {isEditing && <CameraIcon><FaCamera /></CameraIcon>}
           <input 
             type="file" 
             style={{ display: 'none' }} 
             ref={fileInputRef} 
             onChange={handleFileChange}
             accept="image/*"
           />
        </ImageWrapper>

        <UserInfo>
          {isEditing ? (
            <EditInput 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)} 
              placeholder="닉네임"
            />
          ) : (
            <Name>{user?.nickname}</Name>
          )}
          
          {isEditing ? (
            <EditInput 
              value={editStatus} 
              onChange={(e) => setEditStatus(e.target.value)} 
              placeholder="상태 메시지"
            />
          ) : (
            <StatusMsg>{user?.status_msg || "상태 메시지가 없습니다."}</StatusMsg>
          )}
          
          <Stats>
            <StatItem><b>이메일</b> {user?.email}</StatItem>
            <StatItem><b>역할</b> {user?.role === 'admin' ? '관리자' : '학생'}</StatItem>
          </Stats>

          {isEditing ? (
             <EditInput 
                value={editTags} 
                onChange={(e) => setEditTags(e.target.value)} 
                placeholder="#해시태그 (쉼표로 구분 ex. #수학, #정보)"
             />
          ) : (
             <Tags>
                {/* 문자열로 저장된 태그를 화면에 예쁘게 쪼개서 보여주기 */}
                {user?.hashtags ? user.hashtags.split(',').map((tag, i) => (
                    <Tag key={i}>{tag.trim()}</Tag>
                )) : <Tag>#태그없음</Tag>}
             </Tags>
          )}

          {isEditing ? (
             <ButtonGroup>
               <SaveButton onClick={handleSave}>저장</SaveButton>
               <CancelButton onClick={() => {
                 setIsEditing(false);
                 setFile(null);
                 setPreview(user?.profile_img || "/default.png"); // 취소 시 원래 이미지로 복구
               }}>취소</CancelButton>
             </ButtonGroup>
          ) : (
             <EditButton onClick={() => setIsEditing(true)}>프로필 수정</EditButton>
          )}
        </UserInfo>
      </ProfileCard>
    </Container>
  );
};

export default Profile;

// --- 스타일 (기존과 동일) ---
const Container = styled.div` padding: 50px; display: flex; justify-content: center; `;
const ProfileCard = styled.div` background: white; width: 100%; max-width: 500px; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; display: flex; flex-direction: column; align-items: center; `;
const ImageWrapper = styled.div` position: relative; width: 120px; height: 120px; margin-bottom: 20px; cursor: pointer; `;
const ProfileImg = styled.img` width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background-color: #ddd; `;
const CameraIcon = styled.div` position: absolute; bottom: 5px; right: 5px; background: #4a90e2; color: white; padding: 8px; border-radius: 50%; font-size: 14px; `;
const UserInfo = styled.div` width: 100%; `;
const Name = styled.h2` font-size: 24px; font-weight: bold; margin-bottom: 5px; `;
const StatusMsg = styled.p` color: #666; margin-bottom: 20px; min-height: 24px; `;
const Stats = styled.div` display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 15px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; `;
const StatItem = styled.div` font-size: 16px; b { font-weight: bold; color: #333; } `;
const Tags = styled.div` display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 30px; `;
const Tag = styled.span` background-color: #e3f2fd; color: #4a90e2; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; `;
const EditInput = styled.input` font-size: 16px; padding: 8px; margin-bottom: 10px; width: 80%; text-align: center; border: 1px solid #ddd; border-radius: 5px; `;
const ButtonGroup = styled.div` display: flex; justify-content: center; gap: 10px; `;
const EditButton = styled.button` background-color: #4a90e2; color: white; border: none; padding: 10px 30px; border-radius: 5px; font-size: 16px; cursor: pointer; &:hover { background-color: #357abd; } `;
const SaveButton = styled(EditButton)` background-color: #5cb85c; &:hover { background-color: #4cae4c; } `;
const CancelButton = styled(EditButton)` background-color: #d9534f; &:hover { background-color: #c9302c; } `;