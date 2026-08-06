import { useState } from 'react';
import Home from './Home.jsx';
import SummonHistory from './SummonHistory.jsx';
import EchoPlanner from './EchoPlanner.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  if (currentPage === 'pulls') {
    return <SummonHistory onBack={() => setCurrentPage('home')} />;
  }
  if (currentPage === 'echoes') {
    return <EchoPlanner onBack={() => setCurrentPage('home')} />;
  }

  return <Home onNavigate={setCurrentPage} />;
}