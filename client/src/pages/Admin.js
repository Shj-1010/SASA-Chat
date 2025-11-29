import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../api';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState({ id: null, nickname: '' });
  const [duration, setDuration] = useState('1h');

  const fetchData = async () => {
    try {
      const resUsers = await api.get('/admin/users');
      setUsers(resUsers.data);
      const resReports = await api.get('/admin/reports');
      setReports(resReports.data);
    } catch (err) {
      alert("관리자 권한이 없습니다.");
      window.location.href = "/";
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openBanModal = (userId, nickname) => {
      setTargetUser({ id: userId, nickname });
      setDuration('1h');
      setIsModalOpen(true);
  };

  const submitBan = async () => {
    try {
        await api.post('/admin/ban', { 
            userId: targetUser.id, 
            duration: duration 
        });
        alert(`[${targetUser.nickname}]님에 대한 처리가 완료되었습니다.`);
        setIsModalOpen(false);
        fetchData(); // 목록 갱신
    } catch (err) {
        alert("오류가 발생했습니다.");
    }
  };

  return (
    <Container>
      <Header>관리자 대시보드</Header>
      
      <TabGroup>
          <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>회원 관리</Tab>
          <Tab active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>신고 내역</Tab>
      </TabGroup>

      {/* 1. 회원 관리 탭 */}
      {activeTab === 'users' && (
          <TableContainer>
            <Table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>이메일</th>
                    <th>닉네임</th>
                    <th>상태</th>
                    <th>관리</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.nickname}</td>
                    <td>
                        {u.ban_expires_at && new Date(u.ban_expires_at) > new Date()
                            ? <Badge color="red">정지됨 (~{new Date(u.ban_expires_at).toLocaleDateString()})</Badge> 
                            : <Badge color="green">정상</Badge>}
                    </td>
                    <td>
                        {/* 관리자 본인은 제재 불가 */}
                        {u.role !== 'admin' && (
                            <BanBtn onClick={() => openBanModal(u.id, u.nickname)}>제재 / 해제</BanBtn>
                        )}
                    </td>
                    </tr>
                ))}
                </tbody>
            </Table>
          </TableContainer>
      )}

      {/* 2. 신고 내역 탭 */}
      {activeTab === 'reports' && (
          <TableContainer>
            <Table>
                <thead>
                <tr>
                    <th>신고자</th>
                    <th>대상자</th>
                    <th>신고 사유</th>
                    <th>시간</th>
                </tr>
                </thead>
                <tbody>
                {reports.map(r => (
                    <tr key={r.id}>
                        <td>{r.reporter_email}</td>
                        <td>{r.target_nickname}</td>
                        <td style={{color: '#d9534f', fontWeight:'bold'}}>{r.reason}</td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan="4" style={{textAlign:'center'}}>신고 내역이 없습니다.</td></tr>}
                </tbody>
            </Table>
          </TableContainer>
      )}

      {/* --- 제재 관리 모달 --- */}
      {isModalOpen && (
          <ModalOverlay onClick={() => setIsModalOpen(false)}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <ModalHeader>
                      <h3>제재 관리</h3>
                      <CloseBtn onClick={() => setIsModalOpen(false)}>&times;</CloseBtn>
                  </ModalHeader>
                  
                  <ModalBody>
                      <TargetInfo>
                          대상: <b>{targetUser.nickname}</b>
                      </TargetInfo>
                      
                      <Label>제재 기간 선택</Label>
                      <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                          <option value="1h">1시간 정지</option>
                          <option value="3h">3시간 정지</option>
                          <option value="6h">6시간 정지</option>
                          <option value="12h">12시간 정지</option>
                          <option value="24h">24시간 정지</option>
                          <option value="7d">7일 정지</option>
                          <option value="30d">30일 정지</option>
                          <option value="1y">1년 정지</option>
                          <option value="forever">영구 차단</option>
                          <option value="release">제재 해제</option>
                      </Select>
                      <Description>
                          {duration === 'release' 
                            ? "해당 사용자의 모든 제재를 즉시 해제합니다." 
                            : "해당 기간 동안 사용자의 접속을 차단합니다."}
                      </Description>
                  </ModalBody>

                  <ModalFooter>
                      <CancelBtn onClick={() => setIsModalOpen(false)}>취소</CancelBtn>
                      <ConfirmBtn onClick={submitBan} isRelease={duration === 'release'}>
                          {duration === 'release' ? '해제하기' : '적용하기'}
                      </ConfirmBtn>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

    </Container>
  );
};

export default Admin;

// --- 스타일 ---
const Container = styled.div` padding: 40px; max-width: 1000px; margin: 0 auto; `;
const Header = styled.h1` margin-bottom: 30px; padding-bottom: 10px; border-bottom: 2px solid #333; font-size: 24px; `;
const TabGroup = styled.div` margin-bottom: 20px; display: flex; gap: 10px; `;
const Tab = styled.button` padding: 10px 20px; font-size: 16px; cursor: pointer; background: ${props => props.active ? '#333' : '#eee'}; color: ${props => props.active ? 'white' : 'black'}; border: none; border-radius: 5px; font-weight: bold; transition: 0.2s; &:hover { background: #555; color: white; } `;

const TableContainer = styled.div` background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; `;
const Table = styled.table` width: 100%; border-collapse: collapse; 
  th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
  th { background-color: #f8f9fa; font-weight: bold; color: #555; }
  tr:hover { background-color: #f8f9fa; }
`;
const Badge = styled.span` padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; background-color: ${props => props.color === 'red' ? '#ffebee' : '#e8f5e9'}; color: ${props => props.color === 'red' ? '#c62828' : '#2e7d32'}; `;
const BanBtn = styled.button` background: #ff6b6b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s; &:hover { background: #fa5252; } `;

/* 모달 스타일 */
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; `;
const ModalBox = styled.div` background: white; width: 400px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); overflow: hidden; animation: fadeIn 0.2s ease-out; `;
const ModalHeader = styled.div` background: #333; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; h3 { margin: 0; font-size: 18px; } `;
const CloseBtn = styled.button` background: none; border: none; color: white; font-size: 24px; cursor: pointer; `;
const ModalBody = styled.div` padding: 20px; `;
const TargetInfo = styled.div` font-size: 16px; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px solid #eee; `;
const Label = styled.div` font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #555; `;
const Select = styled.select` width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; margin-bottom: 10px; outline: none; `;
const Description = styled.p` font-size: 13px; color: #888; margin: 0; `;
const ModalFooter = styled.div` padding: 15px 20px; background: #f8f9fa; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; `;
const CancelBtn = styled.button` padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; &:hover { background: #eee; } `;
const ConfirmBtn = styled.button` padding: 10px 20px; border: none; background: ${props => props.isRelease ? '#5cb85c' : '#d9534f'}; color: white; border-radius: 6px; font-weight: bold; cursor: pointer; &:hover { opacity: 0.9; } `;