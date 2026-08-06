import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <h1>WuWa Planner</h1>
      <p className="subtitle">Pick a tool to get started.</p>

      <div className="card-grid">
        <Link className="nav-card" to="/convenes">
          <h3>Pull Tracking</h3>
          <p>Track and review your actual pull history.</p>
        </Link>

        <Link className="nav-card" to="/echoes">
          <h3>Echo Calculator</h3>
          <p>Score a build against the theoretical optimal loadout.</p>
        </Link>
      </div>
    </div>
  );
}