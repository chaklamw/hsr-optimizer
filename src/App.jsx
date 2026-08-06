import { useState } from 'react';
import Home from './Home.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  if (currentPage === 'pulls' || currentPage === 'echoes') {
    return <p>You clicked: {currentPage}. Page not built yet.</p>;
  }

  return <Home onNavigate={setCurrentPage} />;
}