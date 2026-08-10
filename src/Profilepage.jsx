import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const CHARACTER_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json';
const LIGHT_CONE_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json';

export default function ProfilePage() {
  const { uid } = useParams();
  const [data, setData] = useState(null);
  const [characterNames, setCharacterNames] = useState({});
  const [lightConeNames, setLightConeNames] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`http://localhost:3001/api/hsr/${uid}`).then((res) => res.json()),
      fetch(CHARACTER_NAMES_URL).then((res) => res.json()),
      fetch(LIGHT_CONE_NAMES_URL).then((res) => res.json()),
    ])
      .then(([playerJson, namesJson, lightConesJson]) => {
        if (playerJson.error) {
          setError(playerJson.error);
        } else {
          setData(playerJson);
          setCharacterNames(namesJson);
          setLightConeNames(lightConesJson);
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
  const characters = player.avatarDetailList || [];
  const activeId = selectedId ?? characters[0]?.avatarId;
  const activeCharacter = characters.find((c) => c.avatarId === activeId);
  const activeInfo = activeCharacter ? characterNames[activeCharacter.avatarId] : null;

  return (
    <div>
      <Link className="back-btn" to="/">&larr; Home</Link>
      <h1>{player.nickname}</h1>
      <p className="subtitle">UID: {data.uid}</p>

      {characters.length === 0 ? (
        <p className="status warn">
          This player hasn't enabled their character showcase, so there's nothing to display.
        </p>
      ) : (
        <>
          {activeCharacter && (
            <div className="detail-panel">
              <h2>
                {activeInfo?.name === '{NICKNAME}' ? player.nickname : activeInfo?.name || 'Unknown'}
              </h2>
              <p className="subtitle">
                Level {activeCharacter.level} · {activeInfo?.path} · {activeInfo?.element}
              </p>
              <p className="subtitle">
                Eidolon {activeCharacter.rank || 0} · {activeCharacter.relicList?.length || 0}/6 relics equipped
              </p>
              {activeCharacter.equipment && (
                <p className="subtitle">
                  {lightConeNames[activeCharacter.equipment.tid]?.name || 'Unknown Light Cone'} · Superimposition {activeCharacter.equipment.rank}
                </p>
              )}
            </div>
          )}

          <p>{characters.length} showcased characters</p>
          <div className="character-grid">
            {characters.map((character) => {
              const info = characterNames[character.avatarId];
              const rawName = info ? info.name : `Unknown (${character.avatarId})`;
              const name = rawName === '{NICKNAME}' ? player.nickname : rawName;
              const iconUrl = info
                ? `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${info.icon}`
                : null;
              const isSelected = character.avatarId === activeId;

              return (
                <div
                  className={`character-card${isSelected ? ' selected' : ''}`}
                  key={character.avatarId}
                  onClick={() => setSelectedId(character.avatarId)}
                >
                  {iconUrl && <img className="character-icon" src={iconUrl} alt={name} />}
                  <p className="character-name">{name}</p>
                  <p className="character-level">Level {character.level}</p>
                  {info && (
                    <span className={`element-badge element-${info.element}`}>
                      {info.element}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}