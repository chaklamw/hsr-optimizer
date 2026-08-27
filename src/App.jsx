import { Routes, Route } from 'react-router-dom';
import Home from './Home.jsx';
import ProfilePage from './Profilepage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/:uid" element={<ProfilePage />} />
    </Routes>
  );
}