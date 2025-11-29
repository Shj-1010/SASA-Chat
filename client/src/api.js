import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // 서버 주소
  withCredentials: true // 중요! 쿠키(세션)를 주고받게 해줌
});

export default api;