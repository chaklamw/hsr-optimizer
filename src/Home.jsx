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
    <div>
      <h1>HSR Showcase Lookup</h1>
      <p className="subtitle">Enter a UID to view their character showcase.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={uid}
          onChange={(event) => setUid(event.target.value)}
          placeholder="Enter UID"
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}