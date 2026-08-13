import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [uid, setUid] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate(`/profile/${uid}`);
  }

  return (
    <div className="home-hero">
      <div className="home-grid">
        <div>
          <span className="home-eyebrow">Honkai: Star Rail</span>
          <h1 className="home-heading">Showcase Lookup</h1>
          <p className="home-subtitle">Enter a UID to view their character showcase.</p>

          <form className="home-form" onSubmit={handleSubmit}>
            <input
              className="home-input"
              type="text"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="Enter UID"
            />
            <button className="home-submit" type="submit">Search</button>
          </form>
        </div>

        <div className="home-illustration">
          <svg width="360" height="360" viewBox="0 0 360 360" fill="none">
            <line x1="60" y1="280" x2="140" y2="210" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="140" y1="210" x2="120" y2="120" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="120" y1="120" x2="210" y2="90" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="210" y1="90" x2="280" y2="150" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="280" y1="150" x2="300" y2="240" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="140" y1="210" x2="230" y2="230" stroke="#6a4f94" strokeWidth="1.5" />
            <line x1="230" y1="230" x2="300" y2="240" stroke="#6a4f94" strokeWidth="1.5" />

            <circle cx="60" cy="280" r="3" fill="#ece7f5" opacity="0.5" />
            <circle cx="120" cy="120" r="2.5" fill="#ece7f5" opacity="0.4" />
            <circle cx="280" cy="150" r="3" fill="#ece7f5" opacity="0.5" />
            <circle cx="230" cy="230" r="2.5" fill="#ece7f5" opacity="0.4" />

            <circle cx="140" cy="210" r="5" fill="#f2d16d" />
            <circle cx="210" cy="90" r="5" fill="#b98cf2" />
            <circle cx="300" cy="240" r="5" fill="#b98cf2" />

            <circle cx="40" cy="60" r="1.5" fill="#ece7f5" opacity="0.3" />
            <circle cx="320" cy="80" r="1.5" fill="#ece7f5" opacity="0.3" />
            <circle cx="330" cy="310" r="1.5" fill="#ece7f5" opacity="0.3" />
            <circle cx="80" cy="330" r="1.5" fill="#ece7f5" opacity="0.3" />
          </svg>
        </div>
      </div>
    </div>
  );
}