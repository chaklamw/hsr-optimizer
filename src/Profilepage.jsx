import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProfilePage() {
  const { uid } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`http://localhost:3001/api/hsr/${uid}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong fetching this profile.');
        setLoading(false);
      });
  }, [uid]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="status warn">{error}</p>;

  const player = data.detailInfo;

  return (
    <div>
      <h1>{player.nickname}</h1>
      <p className="subtitle">UID: {data.uid}</p>
      <p>{player.avatarDetailList.length} showcased characters</p>
    </div>
  );
}