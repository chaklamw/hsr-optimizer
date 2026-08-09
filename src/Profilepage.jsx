import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const CHARACTER_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json';

export default function ProfilePage() {
  const { uid } = useParams();
  const [data, setData] = useState(null);
  const [characterNames, setCharacterNames] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`http://localhost:3001/api/hsr/${uid}`).then((res) => res.json()),
      fetch(CHARACTER_NAMES_URL).then((res) => res.json()),
    ])
      .then(([playerJson, namesJson]) => {
        if (playerJson.error) {
          setError(playerJson.error);
        } else {
          setData(playerJson);
          setCharacterNames(namesJson);
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
  const characters = player.avatarDetailList;

  return (
    <div>
      <h1>{player.nickname}</h1>
      <p className="subtitle">UID: {data.uid}</p>
      <p>{characters.length} showcased characters</p>

      <ul>
        {characters.map((character) => {
          const info = characterNames[character.avatarId];
          const name = info ? info.name : `Unknown (${character.avatarId})`;
          return (
            <li key={character.avatarId}>
              {name} — Level {character.level}
            </li>
          );
        })}
      </ul>
    </div>
  );
}