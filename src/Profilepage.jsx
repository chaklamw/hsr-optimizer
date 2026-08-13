import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const CHARACTER_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json';
const LIGHT_CONE_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json';
const RELIC_SETS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/relic_sets.json';
const SKILL_TREES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_skill_trees.json';
const CHARACTER_PROMOTIONS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_promotions.json';
const LIGHT_CONE_RANKS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cone_ranks.json';

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
  CriticalChance: 'CRIT Rate',
  CriticalChanceBase: 'CRIT Rate',
  CriticalDamage: 'CRIT DMG',
  CriticalDamageBase: 'CRIT DMG',
  StatusProbability: 'Effect Hit Rate',
  StatusProbabilityBase: 'Effect Hit Rate',
  StatusResistance: 'Effect RES',
  HealRatio: 'Outgoing Healing',
  HealRatioBase: 'Outgoing Healing',
  SPRatioBase: 'Energy Regen',
  BreakDamageAddedRatio: 'Break Effect',
  BreakDamageAddedRatioBase: 'Break Effect',
  PhysicalAddedRatio: 'Physical DMG',
  FireAddedRatio: 'Fire DMG',
  IceAddedRatio: 'Ice DMG',
  ThunderAddedRatio: 'Lightning DMG',
  WindAddedRatio: 'Wind DMG',
  QuantumAddedRatio: 'Quantum DMG',
  ImaginaryAddedRatio: 'Imaginary DMG',
};

function formatStat(property, value) {
  const label = STAT_LABELS[property] || property;
  if (property.includes('Delta')) {
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
      default:
        genericStats[p.type] = (genericStats[p.type] || 0) + p.value;
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
    spd: Math.round((baseSPD * (1 + pctSPD) + flatSPD) * 10) / 10,
    critRate: (critRate * 100).toFixed(1),
    critDmg: (critDmg * 100).toFixed(1),
    genericStats,
  };
}

function getSetSummary(relicList, relicSets) {
  const counts = {};
  relicList.forEach((relic) => {
    const setID = relic._flat.setID;
    counts[setID] = (counts[setID] || 0) + 1;
  });

  const summary = [];
  Object.entries(counts).forEach(([setID, count]) => {
    const set = relicSets[setID];
    if (!set) return;

    if (count >= 4 && set.desc[1]) {
      summary.push({ name: set.name, piece: '4pc', desc: set.desc[1] });
    } else if (count >= 2 && set.desc[0]) {
      summary.push({ name: set.name, piece: '2pc', desc: set.desc[0] });
    }
  });

  return summary;
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
      fetch(RELIC_SETS_URL).then((res) => res.json()),
      fetch(SKILL_TREES_URL).then((res) => res.json()),
      fetch(CHARACTER_PROMOTIONS_URL).then((res) => res.json()),
      fetch(LIGHT_CONE_RANKS_URL).then((res) => res.json()),
    ])
      .then(([playerJson, namesJson, lightConesJson, relicSetsJson, skillTreesJson, promotionsJson, lightConeRanksJson]) => {
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
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong fetching this profile.');
        setLoading(false);
      });
  }, [uid]);

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (error) return <p className="status warn" style={{ padding: 24 }}>{error}</p>;

  const player = data.detailInfo;
  const characters = player.avatarDetailList || [];
  const activeId = selectedId ?? characters[0]?.avatarId;
  const activeCharacter = characters.find((c) => c.avatarId === activeId);
  const activeInfo = activeCharacter ? characterNames[activeCharacter.avatarId] : null;
  const activeSetSummary = activeCharacter
    ? getSetSummary(activeCharacter.relicList || [], relicSets)
    : [];
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
              {activeStats && (
                <ul className="set-summary">
                  <li>HP: {activeStats.hp}</li>
                  <li>ATK: {activeStats.atk}</li>
                  <li>DEF: {activeStats.def}</li>
                  <li>SPD: {activeStats.spd}</li>
                  <li>CRIT Rate: {activeStats.critRate}%</li>
                  <li>CRIT DMG: {activeStats.critDmg}%</li>
                  {Object.entries(activeStats.genericStats).map(([type, value]) => (
                    <li key={type}>{formatStat(type, value)}</li>
                  ))}
                </ul>
              )}
              {activeSetSummary.length > 0 && (
                <ul className="set-summary">
                  {activeSetSummary.map((set, index) => (
                    <li key={index}>
                      {set.piece} {set.name} — {set.desc}
                    </li>
                  ))}
                </ul>
              )}

              {activeCharacter.relicList && activeCharacter.relicList.length > 0 && (
                <ul className="set-summary">
                  {activeCharacter.relicList.map((relic) => {
                    const [mainStat, ...subStats] = relic._flat.props;
                    return (
                      <li key={relic.type}>
                        <strong>{RELIC_TYPE_LABELS[relic.type]}:</strong> {formatStat(mainStat.type, mainStat.value)}
                        {subStats.length > 0 && (
                          <span className="substats">
                            {' '}— {subStats.map((s) => formatStat(s.type, s.value)).join(', ')}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {activeCharacter.skillTreeList && activeCharacter.skillTreeList.length > 0 && (
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
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}