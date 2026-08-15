import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const CHARACTER_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json';
const LIGHT_CONE_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json';
const RELIC_SETS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/relic_sets.json';
const SKILL_TREES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_skill_trees.json';
const CHARACTER_PROMOTIONS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_promotions.json';
const LIGHT_CONE_RANKS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cone_ranks.json';
const PATHS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/paths.json';

const ANCHOR_LABELS = {
  Point01: 'Basic ATK',
  Point02: 'Skill',
  Point03: 'Ultimate',
  Point04: 'Talent',
  Point05: 'Technique',
};

const STAT_LABELS = {
  HPDelta: 'HP',
  HPAddedRatio: 'HP%',
  AttackDelta: 'ATK',
  AttackAddedRatio: 'ATK%',
  DefenceDelta: 'DEF',
  DefenceAddedRatio: 'DEF%',
  SpeedDelta: 'SPD',
  SpeedAddedRatio: 'SPD',
  CriticalChance: 'CRIT Rate',
  CriticalChanceBase: 'CRIT Rate',
  CriticalDamage: 'CRIT DMG',
  CriticalDamageBase: 'CRIT DMG',
  StatusProbability: 'Effect Hit Rate',
  StatusProbabilityBase: 'Effect Hit Rate',
  StatusResistance: 'Effect RES',
  StatusResistanceBase: 'Effect RES',
  HealRatio: 'Outgoing Healing',
  HealRatioBase: 'Outgoing Healing',
  HealTakenRatio: 'Incoming Healing',
  SPRatio: 'Energy Regen',
  SPRatioBase: 'Energy Regen',
  MaxSP: 'Max Energy',
  BreakDamageAddedRatio: 'Break Effect',
  BreakDamageAddedRatioBase: 'Break Effect',
  AllDamageTypeAddedRatio: 'DMG Boost',
  PhysicalAddedRatio: 'Physical DMG',
  FireAddedRatio: 'Fire DMG',
  IceAddedRatio: 'Ice DMG',
  ThunderAddedRatio: 'Lightning DMG',
  WindAddedRatio: 'Wind DMG',
  QuantumAddedRatio: 'Quantum DMG',
  ImaginaryAddedRatio: 'Imaginary DMG',
  ElationDamageAddedRatio: 'Elation',
  ElationDamageAddedRatioBase: 'Elation',
  PhysicalResistance: 'Physical RES',
  PhysicalResistanceDelta: 'Physical RES',
  FireResistance: 'Fire RES',
  FireResistanceDelta: 'Fire RES',
  IceResistance: 'Ice RES',
  IceResistanceDelta: 'Ice RES',
  ThunderResistance: 'Lightning RES',
  ThunderResistanceDelta: 'Lightning RES',
  WindResistance: 'Wind RES',
  WindResistanceDelta: 'Wind RES',
  QuantumResistance: 'Quantum RES',
  QuantumResistanceDelta: 'Quantum RES',
  ImaginaryResistance: 'Imaginary RES',
  ImaginaryResistanceDelta: 'Imaginary RES',
};

// Only these represent genuinely flat point values (e.g. "+42" HP).
// Every other property that reaches genericStats is a percentage,
// even ones with "Delta" in the name (e.g. PhysicalResistanceDelta).
const FLAT_STAT_TYPES = new Set(['HPDelta', 'AttackDelta', 'DefenceDelta', 'SpeedDelta']);

// Some stats are exposed under two different property IDs depending on
// their source (e.g. a trace node vs. a relic substat) but represent the
// same displayed total. Redirect the alternate ID to a single canonical
// one so they get summed together instead of showing as duplicate rows.
const CANONICAL_STAT_TYPE = {
  StatusProbabilityBase: 'StatusProbability',
  StatusResistanceBase: 'StatusResistance',
  HealRatioBase: 'HealRatio',
  BreakDamageAddedRatioBase: 'BreakDamageAddedRatio',
  SPRatioBase: 'SPRatio',
  ElationDamageAddedRatioBase: 'ElationDamageAddedRatio',
  PhysicalResistanceDelta: 'PhysicalResistance',
  FireResistanceDelta: 'FireResistance',
  IceResistanceDelta: 'IceResistance',
  ThunderResistanceDelta: 'ThunderResistance',
  WindResistanceDelta: 'WindResistance',
  QuantumResistanceDelta: 'QuantumResistance',
  ImaginaryResistanceDelta: 'ImaginaryResistance',
};

function formatStat(property, value) {
  const label = STAT_LABELS[property] || property;
  if (FLAT_STAT_TYPES.has(property)) {
    return `${label} +${Math.round(value * 10) / 10}`;
  }
  return `${label} +${(value * 100).toFixed(1)}%`;
}

const RELIC_TYPE_LABELS = {
  1: 'Head',
  2: 'Hands',
  3: 'Body',
  4: 'Feet',
  5: 'Planar Sphere',
  6: 'Link Rope',
};

function getRelicIconUrl(relic) {
  const setID = relic._flat.setID;
  // Cavern relic pieces (Head/Hands/Body/Feet) are indexed 0-3.
  // Planar ornament pieces (Sphere/Rope) reset back to 0-1.
  const suffix = relic.type <= 4 ? relic.type - 1 : relic.type - 5;
  return `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/relic/${setID}_${suffix}.png`;
}

function formatLightConeDesc(desc, params) {
  if (!desc || !params) return desc;
  return desc.replace(/#(\d+)\[(i|f1|f2)\](%?)/g, (match, idx, fmt, pct) => {
    const raw = params[Number(idx) - 1];
    if (raw === undefined) return match;
    const value = pct === '%' ? raw * 100 : raw;
    if (fmt === 'i') return Math.round(value) + pct;
    if (fmt === 'f1') return value.toFixed(1) + pct;
    return value.toFixed(2) + pct;
  });
}

const TOTAL_REQUESTS = 8;

function computeFinalStats(character, promotions, relicSets, skillTrees, lightConeRanks) {
  const promoData = promotions[character.avatarId]?.values?.[character.promotion];
  if (!promoData) return null;

  const level = character.level;
  const baseHP = promoData.hp.base + promoData.hp.step * (level - 1);
  const baseATK = promoData.atk.base + promoData.atk.step * (level - 1);
  const baseDEF = promoData.def.base + promoData.def.step * (level - 1);
  const baseSPD = promoData.spd.base + promoData.spd.step * (level - 1);

  let flatHP = 0, flatATK = 0, flatDEF = 0, flatSPD = 0;
  let lcBaseHP = 0, lcBaseATK = 0, lcBaseDEF = 0;
  let pctHP = 0, pctATK = 0, pctDEF = 0, pctSPD = 0;
  let critRate = promoData.crit_rate.base;
  let critDmg = promoData.crit_dmg.base;

  if (character.equipment) {
    character.equipment._flat.props.forEach((p) => {
      if (p.type === 'BaseHP') lcBaseHP += p.value;
      if (p.type === 'BaseAttack') lcBaseATK += p.value;
      if (p.type === 'BaseDefence') lcBaseDEF += p.value;
    });
  }

  const genericStats = {};

  function applyProp(p) {
    switch (p.type) {
      case 'HPDelta': flatHP += p.value; break;
      case 'AttackDelta': flatATK += p.value; break;
      case 'DefenceDelta': flatDEF += p.value; break;
      case 'SpeedDelta': flatSPD += p.value; break;
      case 'HPAddedRatio': pctHP += p.value; break;
      case 'AttackAddedRatio': pctATK += p.value; break;
      case 'DefenceAddedRatio': pctDEF += p.value; break;
      case 'SpeedAddedRatio': pctSPD += p.value; break;
      case 'CriticalChance': case 'CriticalChanceBase': critRate += p.value; break;
      case 'CriticalDamage': case 'CriticalDamageBase': critDmg += p.value; break;
      default: {
        const key = CANONICAL_STAT_TYPE[p.type] || p.type;
        genericStats[key] = (genericStats[key] || 0) + p.value;
      }
    }
  }

  (character.relicList || []).forEach((relic) => {
    relic._flat.props.forEach((p) => applyProp(p));
  });

  if (character.equipment) {
    const rankData = lightConeRanks[character.equipment.tid];
    const rankProps = rankData?.properties?.[character.equipment.rank - 1];
    if (rankProps) {
      rankProps.forEach((p) => applyProp(p));
    }
  }

  const setCounts = {};
  (character.relicList || []).forEach((relic) => {
    const setID = relic._flat.setID;
    setCounts[setID] = (setCounts[setID] || 0) + 1;
  });

  Object.entries(setCounts).forEach(([setID, count]) => {
    const set = relicSets[setID];
    if (!set || !set.properties) return;
    if (count >= 2 && set.properties[0]) set.properties[0].forEach((p) => applyProp(p));
    if (count >= 4 && set.properties[1]) set.properties[1].forEach((p) => applyProp(p));
  });

  (character.skillTreeList || []).forEach((point) => {
    const node = skillTrees[point.pointId];
    if (!node || !node.levels) return;
    const levelData = node.levels[point.level - 1];
    if (levelData && levelData.properties) {
      levelData.properties.forEach((p) => applyProp(p));
    }
  });

  return {
    hp: Math.round((baseHP + lcBaseHP) * (1 + pctHP) + flatHP),
    atk: Math.round((baseATK + lcBaseATK) * (1 + pctATK) + flatATK),
    def: Math.round((baseDEF + lcBaseDEF) * (1 + pctDEF) + flatDEF),
    spd: Math.round(baseSPD * (1 + pctSPD) + flatSPD),
    critRate: (critRate * 100).toFixed(1),
    critDmg: (critDmg * 100).toFixed(1),
    genericStats,
  };
}

export default function ProfilePage() {
  const { uid } = useParams();
  const [data, setData] = useState(null);
  const [characterNames, setCharacterNames] = useState({});
  const [lightConeNames, setLightConeNames] = useState({});
  const [relicSets, setRelicSets] = useState({});
  const [skillTrees, setSkillTrees] = useState({});
  const [characterPromotions, setCharacterPromotions] = useState({});
  const [lightConeRanks, setLightConeRanks] = useState({});
  const [paths, setPaths] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const cardRefs = useRef({});
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoadedCount(0);

    function trackedFetch(url) {
      return fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setLoadedCount((count) => count + 1);
          return data;
        });
    }

    Promise.all([
      trackedFetch(`http://localhost:3001/api/hsr/${uid}`),
      trackedFetch(CHARACTER_NAMES_URL),
      trackedFetch(LIGHT_CONE_NAMES_URL),
      trackedFetch(RELIC_SETS_URL),
      trackedFetch(SKILL_TREES_URL),
      trackedFetch(CHARACTER_PROMOTIONS_URL),
      trackedFetch(LIGHT_CONE_RANKS_URL),
      trackedFetch(PATHS_URL),
    ])
      .then(([playerJson, namesJson, lightConesJson, relicSetsJson, skillTreesJson, promotionsJson, lightConeRanksJson, pathsJson]) => {
        if (cancelled) return;
        if (playerJson.error) {
          setError(playerJson.error);
        } else {
          setData(playerJson);
          setCharacterNames(namesJson);
          setLightConeNames(lightConesJson);
          setRelicSets(relicSetsJson);
          setSkillTrees(skillTreesJson);
          setCharacterPromotions(promotionsJson);
          setLightConeRanks(lightConeRanksJson);
          setPaths(pathsJson);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Something went wrong fetching this profile.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleWheel(event) {
      if (event.deltaY !== 0) {
        event.preventDefault();
        track.scrollBy({ left: event.deltaY, behavior: 'smooth' });
      }
    }

    track.addEventListener('wheel', handleWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleWheel);
  }, [data]);

  useEffect(() => {
    if (selectedId != null) {
      cardRefs.current[selectedId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedId]);

  useEffect(() => {
    if (data && selectedId == null) {
      const firstId = data.detailInfo?.avatarDetailList?.[0]?.avatarId;
      if (firstId != null) setSelectedId(firstId);
    }
  }, [data]);

  if (loading) {
    const percent = Math.round((loadedCount / TOTAL_REQUESTS) * 100);
    return (
      <div className="loading-wrap">
        <p className="subtitle">Loading profile... {loadedCount}/{TOTAL_REQUESTS}</p>
        <div className="loading-track">
          <div className="loading-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }
  if (error) return <p className="status warn" style={{ padding: 24 }}>{error}</p>;

  const player = data.detailInfo;
  const characters = player.avatarDetailList || [];
  const activeId = selectedId ?? characters[0]?.avatarId;
  const activeCharacter = characters.find((c) => c.avatarId === activeId);
  const activeInfo = activeCharacter ? characterNames[activeCharacter.avatarId] : null;

  const displayCharacters = characters;

  const activeStats = activeCharacter
    ? computeFinalStats(activeCharacter, characterPromotions, relicSets, skillTrees, lightConeRanks)
    : null;

  return (
    <div className="profile-page">
      <div className="profile-nav">
        <Link className="back-btn" to="/">&larr; Home</Link>
      </div>

      <div className="profile-content">
        <h1>{player.nickname}</h1>
        <p className="subtitle">UID: {data.uid}</p>

      {characters.length === 0 ? (
        <p className="status warn">
          This player hasn't enabled their character showcase, so there's nothing to display.
        </p>
      ) : (
        <>
          <p>{characters.length} showcased characters</p>
          <div className="character-grid" ref={trackRef}>
            {displayCharacters.map((character) => {
              const info = characterNames[character.avatarId];
              const rawName = info ? info.name : `Unknown (${character.avatarId})`;
              const name = rawName === '{NICKNAME}' ? player.nickname : rawName;
              const iconUrl = info
                ? `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${info.icon}`
                : null;
              const isSelected = character.avatarId === activeId;

              return (
                <div
                  ref={(el) => (cardRefs.current[character.avatarId] = el)}
                  className={`character-card${isSelected ? ' selected' : ''}${info ? ` rarity-${info.rarity}` : ''}`}
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

          {activeCharacter && (
            <div className="detail-panel">
              <div className="detail-header">
                {activeInfo?.portrait && (
                  <img
                    className="character-portrait"
                    src={`https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${activeInfo.portrait}`}
                    alt={activeInfo?.name === '{NICKNAME}' ? player.nickname : activeInfo?.name}
                  />
                )}
                <div className="detail-header-info">
                  <h2>
                    {activeInfo?.name === '{NICKNAME}' ? player.nickname : activeInfo?.name || 'Unknown'}
                  </h2>
                  <p className="subtitle">
                    Level {activeCharacter.level} · {paths[activeInfo?.path]?.name || activeInfo?.path} · {activeInfo?.element}
                  </p>
                  <p className="subtitle">
                    Eidolon {activeCharacter.rank || 0} · {activeCharacter.relicList?.length || 0}/6 relics equipped
                  </p>
                  {activeCharacter.equipment && (
                    <div className="lightcone-info">
                      {lightConeNames[activeCharacter.equipment.tid]?.portrait && (
                        <div className="lightcone-badge">
                          <img
                            className="lightcone-icon"
                            src={`https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${lightConeNames[activeCharacter.equipment.tid].portrait}`}
                            alt={lightConeNames[activeCharacter.equipment.tid]?.name}
                          />
                          <div className="lightcone-tooltip">
                            <strong>
                              {lightConeRanks[activeCharacter.equipment.tid]?.skill || lightConeNames[activeCharacter.equipment.tid]?.name}
                            </strong>
                            <p>
                              {formatLightConeDesc(
                                lightConeRanks[activeCharacter.equipment.tid]?.desc,
                                lightConeRanks[activeCharacter.equipment.tid]?.params?.[activeCharacter.equipment.rank - 1]
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="subtitle lightcone-text">
                        {lightConeNames[activeCharacter.equipment.tid]?.name || 'Unknown Light Cone'} · Superimposition {activeCharacter.equipment.rank}
                      </p>
                    </div>
                  )}

                </div>

                {activeStats && (
                  <div className="detail-stats">
                    <h3>Total Stats</h3>
                    <ul className="stat-list">
                      <li><span className="stat-label">HP</span><span className="stat-value">{activeStats.hp}</span></li>
                      <li><span className="stat-label">ATK</span><span className="stat-value">{activeStats.atk}</span></li>
                      <li><span className="stat-label">DEF</span><span className="stat-value">{activeStats.def}</span></li>
                      <li><span className="stat-label">SPD</span><span className="stat-value">{activeStats.spd}</span></li>
                      <li><span className="stat-label">CRIT Rate</span><span className="stat-value">{activeStats.critRate}%</span></li>
                      <li><span className="stat-label">CRIT DMG</span><span className="stat-value">{activeStats.critDmg}%</span></li>
                      {Object.entries(activeStats.genericStats).map(([type, value]) => (
                        <li key={type}>
                          <span className="stat-label">{STAT_LABELS[type] || type}</span>
                          <span className="stat-value">
                            {FLAT_STAT_TYPES.has(type) ? `+${Math.round(value * 10) / 10}` : `+${(value * 100).toFixed(1)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeCharacter.relicList && activeCharacter.relicList.length > 0 && (
                  <div className="detail-relics">
                    <h3>Relics</h3>
                    <ul className="relic-list">
                      {activeCharacter.relicList.map((relic) => {
                        const [mainStat, ...subStats] = relic._flat.props;
                        const setID = relic._flat.setID;
                        const set = relicSets[setID];
                        const setCount = activeCharacter.relicList.filter(
                          (r) => r._flat.setID === setID
                        ).length;
                        return (
                          <li className="relic-item" key={relic.type}>
                            <img
                              className="relic-icon"
                              src={getRelicIconUrl(relic)}
                              alt={RELIC_TYPE_LABELS[relic.type]}
                            />
                            <div className="relic-tooltip">
                              <strong>{RELIC_TYPE_LABELS[relic.type]}:</strong> {formatStat(mainStat.type, mainStat.value)}
                              {subStats.length > 0 && (
                                <span className="substats">
                                  {' '}— {subStats.map((s) => formatStat(s.type, s.value)).join(', ')}
                                </span>
                              )}
                              {set && (
                                <div className="relic-set-info">
                                  <strong>{set.name}</strong> ({setCount} equipped)
                                  {setCount >= 2 && set.desc[0] && <p>2pc: {set.desc[0]}</p>}
                                  {setCount >= 4 && set.desc[1] && <p>4pc: {set.desc[1]}</p>}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {activeCharacter.skillTreeList && activeCharacter.skillTreeList.length > 0 && (
                <div className="detail-section">
                  <h3>Trace Nodes</h3>
                  <ul className="set-summary">
                    {activeCharacter.skillTreeList.map((point) => {
                      const treeInfo = skillTrees[point.pointId];
                      const label = treeInfo?.name || ANCHOR_LABELS[treeInfo?.anchor] || `Point ${point.pointId}`;
                      return (
                        <li key={point.pointId}>
                          {label} (Lv.{point.level}{treeInfo?.max_level ? `/${treeInfo.max_level}` : ''})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}