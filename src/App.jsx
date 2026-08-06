import { Routes, Route } from 'react-router-dom';
import Home from './Home.jsx';
import SummonHistory from './SummonHistory.jsx';
import EchoPlanner from './EchoPlanner.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/summon-history" element={<SummonHistory />} />
      <Route path="/echoes" element={<EchoPlanner />} />
    </Routes>
  );
}