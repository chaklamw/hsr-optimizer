import { Link } from 'react-router-dom';

export default function EchoPlanner() {
  return (
    <div className="page-card">
      <Link className="back-btn" to="/">&larr; Back</Link>
      <h1>Echo Planner</h1>
      <p className="subtitle">
        Stub for now. Specifics not decided yet.
      </p>
    </div>
  );
}