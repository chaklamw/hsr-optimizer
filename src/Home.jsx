import { useState } from 'react';

export default function HomePage({ onNavigate }) {

  return (
    <div>
      <h1>WuWa Planner</h1>
      <p className="subtitle">Pick a tool to get started.</p>

      <div className="card-grid">
        <button className="nav-card" onClick={() => onNavigate('pulls')}>
          <h3>Pull History</h3>
          <p>See your pull history and see upcoming banners.</p>
        </button>

        <button className="nav-card" onClick={() => onNavigate('echoes')}>
          <h3>Echo Calculator</h3>
          <p>Score a build against the theoretical optimal loadout.</p>
        </button>
      </div>
    </div>
  );
}