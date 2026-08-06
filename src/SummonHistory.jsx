import { Link } from 'react-router-dom';

export default function SummonHistory() {
  return (
    <div className="page-card">
      <Link className="back-btn" to="/">&larr; Back</Link>
      <h1>Pull Tracking</h1>
      <p className="subtitle">
        Stub for now. This will track your actual pull history, not simulate it.
      </p>
    </div>
  );
}