import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { computeDamage, computeElationDamage, DamageType } from './damageCalculator';

const CHARACTER_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json';
const LIGHT_CONE_NAMES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json';
const RELIC_SETS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/relic_sets.json';
const SKILL_TREES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_skill_trees.json';
const CHARACTER_PROMOTIONS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_promotions.json';
const LIGHT_CONE_RANKS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cone_ranks.json';
const PATHS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/paths.json';
const RELIC_MAIN_AFFIXES_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/relic_main_affixes.json';
const CHARACTER_SKILLS_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/character_skills.json';

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

// The 12 possible relic substat types — fixed since the relic system's
// inception, unlike Paths/Elements which are actual game content that
// gets added to over time, so this is safe to keep as a fixed list
// rather than fetching it.
const SUBSTAT_TYPES = [
  'HPDelta',
  'AttackDelta',
  'DefenceDelta',
  'SpeedDelta',
  'HPAddedRatio',
  'AttackAddedRatio',
  'DefenceAddedRatio',
  'CriticalChanceBase',
  'CriticalDamageBase',
  'StatusProbabilityBase',
  'StatusResistanceBase',
  'BreakDamageAddedRatioBase',
];

// For OCR parsing: each substat's in-game label is ambiguous between its
// flat and percent variant (both just say "HP", "ATK", "DEF") — the only
// way to tell them apart from raw text is whether a "%" follows the
// number. Ordered longest-label-first so e.g. "CRIT DMG" is tried before
// a shorter label that might accidentally match part of it.
const SUBSTAT_OCR_PATTERNS = [
  { label: 'Effect Hit Rate', type: 'StatusProbabilityBase' },
  { label: 'Effect RES', type: 'StatusResistanceBase' },
  { label: 'Break Effect', type: 'BreakDamageAddedRatioBase' },
  { label: 'CRIT Rate', type: 'CriticalChanceBase' },
  { label: 'CRIT DMG', type: 'CriticalDamageBase' },
  { label: 'SPD', type: 'SpeedDelta' },
  { label: 'HP', percentType: 'HPAddedRatio', flatType: 'HPDelta' },
  { label: 'ATK', percentType: 'AttackAddedRatio', flatType: 'AttackDelta' },
  { label: 'DEF', percentType: 'DefenceAddedRatio', flatType: 'DefenceDelta' },
];

// Generous upper bounds a single relic substat could ever plausibly reach
// (well above any realistic max-roll total), used only to catch OCR
// clearly picking up an unrelated number from elsewhere in a busy
// screenshot — not meant to be a precise in-game formula.
const SUBSTAT_SANITY_MAX = {
  HPDelta: 300,
  AttackDelta: 150,
  DefenceDelta: 150,
  SpeedDelta: 25,
  HPAddedRatio: 100,
  AttackAddedRatio: 100,
  DefenceAddedRatio: 100,
  CriticalChanceBase: 100,
  CriticalDamageBase: 100,
  StatusProbabilityBase: 100,
  StatusResistanceBase: 100,
  BreakDamageAddedRatioBase: 100,
};

function parseSubstatsFromText(rawText) {
  const text = rawText.replace(/\s+/g, ' ');
  const found = [];
  const usedTypes = new Set();

  SUBSTAT_OCR_PATTERNS.forEach(({ label, type, percentType, flatType }) => {
    // OCR sometimes drops spaces between words ("CRIT DMG" -> "CRITDMG"),
    // so match on flexible whitespace rather than a literal space.
    const flexibleLabel = label.replace(/\s+/g, '\\s*');
    const pattern = new RegExp(`${flexibleLabel}[^0-9+\\-]{0,6}([+\\-]?\\d+\\.?\\d*)(\\s*%)?`, 'gi');
    const matches = [...text.matchAll(pattern)];
    if (matches.length === 0) return;

    // A label like "ATK" can appear twice — once for the main stat, once
    // for the substat. The main stat mention comes first in reading
    // order, so scan from the last match backward for the first one that
    // survives sanity checks (most likely the real substat).
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const value = parseFloat(match[1]);
      if (Number.isNaN(value) || value <= 0) continue;

      const hasPercent = Boolean(match[2]);
      const resolvedType = type || (hasPercent ? percentType : flatType);
      if (value > (SUBSTAT_SANITY_MAX[resolvedType] ?? Infinity)) continue;
      if (usedTypes.has(resolvedType)) continue;

      usedTypes.add(resolvedType);
      // Stored in human-readable display units (e.g. 4.3 for "4.3%", 42 for
      // flat HP) — matches how the comparison form's manual entry works and
      // is scored via scoreFormStatLine, not the fraction units relic._flat
      // uses internally.
      found.push({ type: resolvedType, value: String(value) });
      break;
    }
  });

  return found.slice(0, 4);
}

function parseMainStatFromText(rawText, mainOptions) {
  const text = rawText.replace(/\s+/g, ' ');
  let best = null;

  mainOptions.forEach((statType) => {
    // STAT_LABELS has entries like 'HP%' with the % baked into the label
    // text, but OCR renders the % separately after the number (not
    // glued to the label) — strip it so the search term matches reality.
    const cleanLabel = (STAT_LABELS[statType] || statType).replace(/%$/, '').trim();
    const flexibleLabel = cleanLabel.replace(/\s+/g, '\\s*');
    const pattern = new RegExp(`${flexibleLabel}[^0-9+\\-]{0,6}([+\\-]?\\d+\\.?\\d*)(\\s*%)?`, 'i');
    const match = text.match(pattern);
    if (!match) return;

    const value = parseFloat(match[1]);
    if (Number.isNaN(value) || value <= 0) return;

    // The main stat is always the first stat line in the panel, so among
    // all candidate labels that matched something, prefer whichever one
    // starts earliest in the text.
    if (best === null || match.index < best.index) {
      best = { type: statType, value: String(value), index: match.index };
    }
  });

  return best ? { type: best.type, value: best.value } : null;
}

// Starting points for the relic comparison tool's weighting, expressed as
// "value per 1 percentage point" for percent stats and "value per 1 point"
// for flat stats. CRIT Rate/CRIT DMG follow the community-standard 2:1
// Crit Value ratio. Everything else is a rough, adjustable starting
// guess — there's no universal "correct" weight for stats like SPD or
// ATK% since their real value depends on the specific character/build.
const DEFAULT_WEIGHTS = {
  HPDelta: 0.05,
  AttackDelta: 0.05,
  DefenceDelta: 0.05,
  SpeedDelta: 2.5,
  HPAddedRatio: 0.5,
  AttackAddedRatio: 0.5,
  DefenceAddedRatio: 0.5,
  CriticalChanceBase: 2,
  CriticalDamageBase: 1,
  StatusProbabilityBase: 0.4,
  StatusResistanceBase: 0.4,
  BreakDamageAddedRatioBase: 0.3,
};

const WEIGHTS_STORAGE_KEY = 'hsr-showcase-relic-weights';

function scoreStatLine(type, value, weights) {
  const weight = weights[type] ?? 0;
  if (FLAT_STAT_TYPES.has(type)) return value * weight;
  return value * 100 * weight;
}

// Used for the relic comparison form (manual typing or OCR output), where
// values are entered/extracted in human-readable display units (e.g. 10.7
// for "10.7%", 42 for flat HP) — unlike relic._flat.props, which stores
// percent stats as fractions (0.107). No *100 conversion needed here.
function scoreFormStatLine(type, value, weights) {
  return value * (weights[type] ?? 0);
}

function getMainStatOptions(relicMainAffixes, type) {
  const props = new Set();
  Object.entries(relicMainAffixes).forEach(([id, group]) => {
    if (id.length !== 2) return; // skip a handful of anomalous non-standard entries in the data
    if (Number(id[1]) !== type) return;
    Object.values(group.affixes).forEach((a) => props.add(a.property));
  });
  return Array.from(props);
}

function formatStat(property, value) {
  const label = STAT_LABELS[property] || property;
  if (FLAT_STAT_TYPES.has(property)) {
    return `${label} +${Math.round(value)}`;
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

// A skill's params array can mix genuinely different kinds of values —
// a damage %, a flat heal amount, an instance count, a heal % — not just
// "different hit percentages." The #N[fmt]% placeholder syntax in desc
// tells us which indices are percentages at all (no trailing % means a
// raw number, like an instance count or flat heal bonus). Among the
// percentage ones, only those immediately preceded by "DMG" wording are
// treated as real damage hits — this excludes heal/shield percentages
// that happen to also be formatted as %.
function getDamagePercentParamIndices(desc) {
  if (!desc) return [];
  const regex = /#(\d+)\[(i|f1|f2)\](%?)/g;
  const indices = [];
  let match;
  while ((match = regex.exec(desc)) !== null) {
    const idx = Number(match[1]) - 1;
    const isPercent = match[3] === '%';
    if (!isPercent) continue;

    const before = desc.slice(Math.max(0, match.index - 60), match.index).toLowerCase();
    const after = desc.slice(match.index, Math.min(desc.length, match.index + 40)).toLowerCase();
    const isHealOrShieldContext = /heal|restore|shield|regenerat/.test(before);
    // Skills like "deals N instance(s) of DMG, each instance dealing X%"
    // are handled separately by getInstancedHitInfo — excluding them
    // here avoids showing the same value twice, once as a generic Hit
    // and once as an instanced hit.
    const isInstanceContext = /instance/.test(before) || /instance/.test(after);
    const mentionsDmg = /dmg/.test(before);

    if (mentionsDmg && !isHealOrShieldContext && !isInstanceContext) indices.push(idx);
  }
  return [...new Set(indices)];
}

// Skills that fire a fixed number of extra damage instances (e.g.
// Sparxie's Elation Skill: a base AoE hit, plus 20 fixed instances at a
// separate % each to a random enemy) don't fit the main/adjacent Hit
// model — the instance count is a stated number, not tied to how many
// enemies are on the field. Parsed as its own pattern so its total can
// be added on top of the base hit rather than confused with it.
function getInstancedHitInfo(desc) {
  if (!desc) return null;
  const match = desc.match(
    /(\d+)\s*(?:additional\s+)?instance\(s\) of DMG[\s\S]{0,60}?each instance deal(?:s|ing)[\s\S]{0,60}?([\d.]+)%/i
  );
  if (!match) return null;
  return { instanceCount: Number(match[1]), perInstancePercent: Number(match[2]) / 100 };
}

// After finding which param indices are real damage values, this pulls
// a human-readable target description from the text immediately
// following each one — "to one designated enemy", "to adjacent
// targets", "to all enemies", etc. — so the Hit selector can say what
// each value actually means instead of a bare "Hit 1 / Hit 2".
const TARGET_PHRASE_PATTERNS = [
  { pattern: /to one (designated |target(ed)? )?enem(y|ies)/i, label: 'main target' },
  { pattern: /adjacent (to (it|the target)|enem(y|ies)|targets)/i, label: 'adjacent targets' },
  { pattern: /to all enem(y|ies)/i, label: 'all enemies' },
  { pattern: /(to a |a )?random enem(y|ies)/i, label: 'random enemy' },
  { pattern: /to the target/i, label: 'target' },
];

function getHitTargetLabel(desc, paramIndex) {
  if (!desc) return null;
  const regex = /#(\d+)\[(i|f1|f2)\](%?)/g;
  let match;
  while ((match = regex.exec(desc)) !== null) {
    if (Number(match[1]) - 1 !== paramIndex) continue;
    const context = desc.slice(match.index, Math.min(desc.length, match.index + 150));
    const found = TARGET_PHRASE_PATTERNS.find(({ pattern }) => pattern.test(context));
    return found ? found.label : null;
  }
  return null;
}

// Some characters' main/adjacent (Blast) hits get boosted by a *separate*
// ability elsewhere in their kit (e.g. Sparxie's "Engagement Farming"
// boosting her "Bloom! Winner Takes All" hit), rather than the attack's
// own text. Scans across every ability's resolved text (not just the
// one selected) for a "DMG multiplier against one designated enemy by
// X% ... adjacent targets by Y%" pattern, and returns the per-trigger
// bonus for each side plus which ability it came from, so the UI can
// label the input meaningfully without hardcoding a character name.
function getPerHitTargetStackingBonus(abilities) {
  for (const a of abilities) {
    const match = a.desc.match(
      /multiplier against one designated enemy by ([\d.]+)%(?:[^%]*?multiplier against adjacent targets by ([\d.]+)%)?/i
    );
    if (match) {
      return {
        sourceName: a.name,
        mainPerStack: Number(match[1]) / 100,
        adjacentPerStack: match[2] ? Number(match[2]) / 100 : 0,
      };
    }
  }
  return null;
}

const ELEMENT_DMG_TYPE = {
  Physical: 'PhysicalAddedRatio',
  Fire: 'FireAddedRatio',
  Ice: 'IceAddedRatio',
  Lightning: 'ThunderAddedRatio',
  Wind: 'WindAddedRatio',
  Quantum: 'QuantumAddedRatio',
  Imaginary: 'ImaginaryAddedRatio',
};

async function interpretSkill(description) {
  const res = await fetch('http://localhost:3001/api/interpret-skill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
  return { damageType: data.damageType, scalingStat: data.scalingStat };
}

async function extractConditionals(characterName, abilities) {
  const res = await fetch('http://localhost:3001/api/extract-conditionals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterName, abilities }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
  return data.conditionals;
}

// Maps the ability type text StarRailRes uses to the same enum the
// extraction endpoint returns, so an AI-extracted conditional can be
// matched against whichever skill is currently selected in the calculator.
const TYPE_TEXT_TO_ABILITY = {
  'Basic ATK': 'BASIC',
  Skill: 'SKILL',
  Ultimate: 'ULT',
  Talent: 'FUA',
};

function conditionalAppliesToSkill(conditional, skillTypeText) {
  if (conditional.appliesToAbility === 'ALL') return true;
  return conditional.appliesToAbility === TYPE_TEXT_TO_ABILITY[skillTypeText];
}

const CONDITIONAL_STAT_TYPES = [
  'DMG_PERCENT',
  'RES_PEN',
  'DEF_PEN',
  'CRIT_RATE',
  'CRIT_DMG',
  'ATK_PERCENT',
  'VULNERABILITY',
  'OTHER',
];
const CONDITIONAL_ABILITY_TARGETS = ['ALL', 'BASIC', 'SKILL', 'ULT', 'FUA', 'DOT'];

// StarRailRes lists some non-damage entries alongside real attacks — e.g.
// Archer's "Skill: End", a state-exit toggle with no scaling values, but
// also heal/shield/buff/summon skills that DO carry nonzero params (heal
// amount, shield value, buff %) despite not dealing damage. This check is
// deliberately loose — it also matches text that only mentions DMG in
// passing (e.g. "increases DMG dealt by X%", "DMG Boost effect") — which
// is exactly what's wanted when gathering ability text for the AI
// conditional detector, since that's where such buffs get read from.
//
// Some conditional buffs (e.g. Castorice's Talent: "+20% DMG per stack")
// are flat, non-level-scaled numbers baked directly into the description
// with no #1[i]%-style placeholder, so they carry no numeric params at
// all — resolving via params first, falling back to the raw desc, keeps
// those from being excluded just for lacking scaling values.
function mentionsDamage(skill) {
  if (!skill) return false;
  const firstLevelParams = Array.isArray(skill.params) ? skill.params[0] : null;
  const resolvedDesc =
    (Array.isArray(firstLevelParams) && firstLevelParams.length > 0
      ? formatLightConeDesc(skill.desc, firstLevelParams)
      : null) || skill.desc || '';
  if (!resolvedDesc) return false;
  return /dmg/i.test(resolvedDesc);
}

// Stricter than mentionsDamage: requires an active "deal(s) ... DMG"
// phrase, which is how HSR consistently words abilities that actually
// deal damage when used. This correctly excludes things like Castorice's
// Ultimate ("Summons the memosprite... If Castorice has the DMG Boost
// effect...") which mentions DMG without an attack happening, while
// still matching real attacks ("Deals Quantum DMG equal to...").
function dealsDirectDamage(skill) {
  if (!mentionsDamage(skill)) return false;
  const resolvedDesc = formatLightConeDesc(skill.desc, skill.params[0]) || skill.desc || '';
  return /\bdeal(s)?\b[^.]{0,100}\bdmg\b/i.test(resolvedDesc);
}

// Talents and Techniques often mention "DMG" while describing a
// conditional buff to something else (e.g. a memosprite's damage on
// healing) rather than being a direct attack themselves — exactly the
// kind of thing the AI conditional detector should read, but not
// something the player can select and calculate a hit for. The
// calculator's own skill picker is restricted to actual player-cast
// attacks.
const DIRECT_ATTACK_TYPES = new Set(['Basic ATK', 'Skill', 'Ultimate', 'Memosprite Skill', 'Elation Skill']);

// A handful of skills (e.g. Little Ica's) don't scale off ATK/DEF/HP at
// all — their base damage comes from some other tracked value, like a
// running tally of healing done in the battle. Detected generically from
// the resolved description text rather than hardcoded to one character,
// so it keeps working if a future character shares the mechanic.
function getNonStatScalingLabel(resolvedDesc) {
  if (!resolvedDesc) return null;
  if (/tally of healing/i.test(resolvedDesc)) return 'Healing tally this battle';
  return null;
}

// Some repeated-cast skills (e.g. Castorice's memosprite "Breath Scorches
// the Shadow") show up as multiple skill IDs in the data, one per cast —
// but only the FIRST entry's own description text actually states every
// cast's multiplier ("...DMG multiplier increased progressively to
// 39.2% / 47.6%..."); the later entries are generic flavor text with no
// restated number. So later casts are modeled by parsing this pattern
// out of the first entry's text rather than trusting the other skill
// IDs to carry their own correct value.
function getEscalatingMultipliers(resolvedDesc) {
  if (!resolvedDesc) return null;
  const match = resolvedDesc.match(/increas\w*\s+(?:progressively|respectively)\s+to\s+([\d.]+)%\s*\/\s*([\d.]+)%/i);
  if (!match) return null;
  return [Number(match[1]) / 100, Number(match[2]) / 100];
}

function isSelectableAttack(skill) {
  return dealsDirectDamage(skill) && DIRECT_ATTACK_TYPES.has(skill.type_text);
}

const TOTAL_REQUESTS = 10;

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
  const [relicMainAffixes, setRelicMainAffixes] = useState({});
  const [characterSkills, setCharacterSkills] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [compareSlot, setCompareSlot] = useState(null);
  const [compareMainStat, setCompareMainStat] = useState({ type: '', value: '' });
  const [compareSubstats, setCompareSubstats] = useState([
    { type: '', value: '' },
    { type: '', value: '' },
    { type: '', value: '' },
    { type: '', value: '' },
  ]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [showDamageCalc, setShowDamageCalc] = useState(false);
  const [calcSkillId, setCalcSkillId] = useState('');
  const [calcSkillLevel, setCalcSkillLevel] = useState(1);
  const [calcEnemyLevel, setCalcEnemyLevel] = useState(95);
  const [calcEnemyRes, setCalcEnemyRes] = useState(0);
  const [calcDefShred, setCalcDefShred] = useState(0);
  const [calcScalingStat, setCalcScalingStat] = useState('');
  const [calcScalingStatus, setCalcScalingStatus] = useState('idle');
  const [calcNonStatValue, setCalcNonStatValue] = useState(0);
  const [calcDamageType, setCalcDamageType] = useState(DamageType.STANDARD);
  const [calcPunchlineValue, setCalcPunchlineValue] = useState(0);
  const [calcUsingCertifiedBanger, setCalcUsingCertifiedBanger] = useState(false);
  const [calcMerrymakePercent, setCalcMerrymakePercent] = useState(0);
  const [calcParamIndex, setCalcParamIndex] = useState(0);
  const [calcEnemyCount, setCalcEnemyCount] = useState(1);
  const [calcEnemyBroken, setCalcEnemyBroken] = useState(true);
  const [calcActivationIndex, setCalcActivationIndex] = useState(0);
  const [calcStackingTriggers, setCalcStackingTriggers] = useState(0);
  const [aiConditionals, setAiConditionals] = useState([]);
  const [manualConditionals, setManualConditionals] = useState([]);
  const [manualConditionalForm, setManualConditionalForm] = useState({
    name: '',
    appliesToAbility: 'ALL',
    statType: 'RES_PEN',
    value: 0,
  });
  const [aiConditionalStatus, setAiConditionalStatus] = useState('idle');
  const [aiConditionalError, setAiConditionalError] = useState('');
  const [aiConditionalStacks, setAiConditionalStacks] = useState({});
  const cardRefs = useRef({});
  const trackRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WEIGHTS_STORAGE_KEY);
      if (saved) setWeights({ ...DEFAULT_WEIGHTS, ...JSON.parse(saved) });
    } catch {
      // ignore corrupt/missing localStorage data, defaults already in state
    }
  }, []);

  function updateWeight(type, value) {
    const next = { ...weights, [type]: value };
    setWeights(next);
    try {
      localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors (e.g. private browsing quota)
    }
  }

  useEffect(() => {
    if (compareSlot == null) return;

    function handlePaste(e) {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      handleRelicImageUpload(item.getAsFile());
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [compareSlot]);

  async function handleRelicImageUpload(file) {
    if (!file) return;
    setOcrPreviewUrl(URL.createObjectURL(file));
    setOcrStatus('scanning');
    try {
      // Loaded on demand so the OCR library (WASM, a few MB) doesn't
      // bloat the initial page load for people who never use this.
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const mainOptions = getMainStatOptions(relicMainAffixes, compareSlot);
      const mainMatch = parseMainStatFromText(text, mainOptions);
      if (mainMatch) {
        setCompareMainStat({ type: mainMatch.type, value: mainMatch.value });
      }

      const parsed = parseSubstatsFromText(text);
      const padded = [...parsed];
      while (padded.length < 4) padded.push({ type: '', value: '' });
      setCompareSubstats(padded);
      setOcrStatus(parsed.length > 0 || mainMatch ? 'done' : 'no-match');
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrStatus('error');
    }
  }

  async function handleDetectAiConditionals() {
    const characterName = characterNames[activeCharacter.avatarId]?.name || 'Unknown';
    const skillIds = characterNames[activeCharacter.avatarId]?.skills || [];

    const abilities = skillIds
      .map((id) => characterSkills[id])
      .filter(mentionsDamage)
      .map((s) => ({
        type: s.type_text || 'Ability',
        description: formatLightConeDesc(s.desc, s.params[s.params.length - 1]) || s.desc,
      }))
      .filter((a) => a.description);

    // Light cone passives (e.g. a signature LC's DEF Ignore or DMG Boost)
    // are just as damage-relevant as the character's own kit but live in a
    // completely separate data source (lightConeRanks, resolved at the
    // equipped superimposition rank) — include it so effects like these
    // don't require manually re-entering for every character/LC pairing.
    const equipment = activeCharacter.equipment;
    if (equipment) {
      const rankData = lightConeRanks[equipment.tid];
      const lcName = lightConeNames[equipment.tid]?.name || 'Light Cone';
      const lcDesc = rankData
        ? formatLightConeDesc(rankData.desc, rankData.params?.[equipment.rank - 1]) || rankData.desc || ''
        : '';
      if (lcDesc && /dmg/i.test(lcDesc)) {
        abilities.push({
          type: 'Light Cone Passive',
          description: `${lcName} (Superimposition ${equipment.rank}): ${lcDesc}`,
        });
      }
    }

    if (abilities.length === 0) {
      setAiConditionalStatus('error');
      setAiConditionalError('No resolved ability descriptions found for this character.');
      return;
    }

    setAiConditionalStatus('loading');
    setAiConditionalError('');
    try {
      const conditionals = await extractConditionals(characterName, abilities);
      setAiConditionals(conditionals);
      setAiConditionalStacks({});
      setAiConditionalStatus(conditionals.length === 0 ? 'empty' : 'done');
    } catch (err) {
      console.error('AI conditional detection failed:', err);
      setAiConditionalStatus('error');
      setAiConditionalError(err.message || 'Failed to reach the extraction service.');
    }
  }

  async function handleCalcSkillChange(skillId, level) {
    setCalcSkillId(skillId);
    setCalcSkillLevel(level);
    setCalcScalingStat('');
    setCalcDamageType(DamageType.STANDARD);
    setCalcNonStatValue(0);
    setCalcParamIndex(0);
    setCalcEnemyCount(1);
    setCalcActivationIndex(0);
    setCalcStackingTriggers(0);
    setCalcPunchlineValue(0);
    setCalcUsingCertifiedBanger(false);
    setCalcMerrymakePercent(0);
    setAiConditionalStacks({});

    const skill = characterSkills[skillId];
    if (!skill) return;

    const resolvedDesc = formatLightConeDesc(skill.desc, skill.params[level - 1]);
    if (!resolvedDesc) return;

    if (getNonStatScalingLabel(resolvedDesc)) {
      setCalcScalingStatus('idle');
      return;
    }

    setCalcScalingStatus('loading');
    try {
      const { damageType, scalingStat } = await interpretSkill(resolvedDesc);
      setCalcDamageType(damageType === 'ELATION' ? DamageType.ELATION : DamageType.STANDARD);
      setCalcScalingStat(scalingStat === 'NONE' ? '' : scalingStat);
      setCalcScalingStatus('done');
    } catch (err) {
      console.error('Skill scaling detection failed:', err);
      setCalcScalingStatus('error');
    }
  }

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
      trackedFetch(RELIC_MAIN_AFFIXES_URL),
      trackedFetch(CHARACTER_SKILLS_URL),
    ])
      .then(([playerJson, namesJson, lightConesJson, relicSetsJson, skillTreesJson, promotionsJson, lightConeRanksJson, pathsJson, mainAffixesJson, characterSkillsJson]) => {
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
          setRelicMainAffixes(mainAffixesJson);
          setCharacterSkills(characterSkillsJson);
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
                            {FLAT_STAT_TYPES.has(type) ? `+${Math.round(value)}` : `+${(value * 100).toFixed(1)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="damage-calc-btn"
                      onClick={() => {
                        setShowDamageCalc(true);
                        setCalcSkillId('');
                        setCalcScalingStat('');
                        setCalcScalingStatus('idle');
                      }}
                    >
                      Damage Calculator
                    </button>
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
                            <button
                              type="button"
                              className="relic-icon-btn"
                              onClick={() => {
                                const options = getMainStatOptions(relicMainAffixes, relic.type);
                                setCompareSlot(relic.type);
                                setCompareMainStat({
                                  type: options.length === 1 ? options[0] : '',
                                  value: '',
                                });
                                setCompareSubstats([
                                  { type: '', value: '' },
                                  { type: '', value: '' },
                                  { type: '', value: '' },
                                  { type: '', value: '' },
                                ]);
                                setOcrStatus('idle');
                                setOcrPreviewUrl(null);
                              }}
                            >
                              <img
                                className="relic-icon"
                                src={getRelicIconUrl(relic)}
                                alt={RELIC_TYPE_LABELS[relic.type]}
                              />
                            </button>
                            <div className="relic-tooltip">
                              <strong>{RELIC_TYPE_LABELS[relic.type]}</strong>
                              <p className="relic-mainstat">{formatStat(mainStat.type, mainStat.value)}</p>
                              {subStats.length > 0 && (
                                <ul className="relic-substats">
                                  {subStats.map((s, i) => {
                                    const rolls = (relic.subAffixList?.[i]?.cnt ?? 1) - 1;
                                    return (
                                      <li key={s.type}>
                                        {formatStat(s.type, s.value)}
                                        {rolls > 0 && ` (${rolls})`}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              {set && (
                                <div className="relic-set-info">
                                  <strong>{set.name}</strong> ({setCount} equipped)
                                  {setCount >= 2 && set.desc[0] && <p>2pc: {set.desc[0]}</p>}
                                  {setCount >= 4 && set.desc[1] && <p>4pc: {set.desc[1]}</p>}
                                </div>
                              )}
                              <p className="relic-tooltip-hint">Click icon to compare</p>
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

              {compareSlot != null && (() => {
                const equippedRelic = activeCharacter.relicList.find((r) => r.type === compareSlot);
                const [eqMain, ...eqSubs] = equippedRelic._flat.props;
                const mainOptions = getMainStatOptions(relicMainAffixes, compareSlot);
                const usedTypes = new Set(
                  [compareMainStat.type, ...compareSubstats.map((s) => s.type)].filter(Boolean)
                );

                const equippedScore =
                  scoreStatLine(eqMain.type, eqMain.value, weights) +
                  eqSubs.reduce((sum, s) => sum + scoreStatLine(s.type, s.value, weights), 0);

                const newScore =
                  (compareMainStat.type && compareMainStat.value !== ''
                    ? scoreFormStatLine(compareMainStat.type, Number(compareMainStat.value), weights)
                    : 0) +
                  compareSubstats.reduce((sum, s) => {
                    if (!s.type || s.value === '') return sum;
                    return sum + scoreFormStatLine(s.type, Number(s.value), weights);
                  }, 0);

                function updateSubstat(index, field, value) {
                  setCompareSubstats((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
                  );
                }

                return (
                  <div className="compare-overlay" onClick={() => setCompareSlot(null)}>
                    <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="compare-modal-header">
                        <h3>Compare {RELIC_TYPE_LABELS[compareSlot]}</h3>
                        <button
                          type="button"
                          className="compare-close-btn"
                          onClick={() => setCompareSlot(null)}
                        >
                          ×
                        </button>
                      </div>

                      <div className="compare-columns">
                        <div className="compare-column">
                          <h4>Equipped</h4>
                          <p className="relic-mainstat">{formatStat(eqMain.type, eqMain.value)}</p>
                          <ul className="relic-substats">
                            {eqSubs.map((s) => (
                              <li key={s.type}>{formatStat(s.type, s.value)}</li>
                            ))}
                          </ul>
                          <p className="compare-score">
                            Score: <strong>{equippedScore.toFixed(1)}</strong>
                          </p>
                        </div>

                        <div className="compare-column">
                          <h4>New Relic</h4>

                          <label
                            className={`compare-upload-btn${isDraggingImage ? ' compare-upload-btn-dragging' : ''}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingImage(true);
                            }}
                            onDragLeave={() => setIsDraggingImage(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingImage(false);
                              handleRelicImageUpload(e.dataTransfer.files?.[0]);
                            }}
                          >
                            {ocrStatus === 'scanning'
                              ? 'Reading image...'
                              : 'Upload, drag & drop, or paste (Ctrl+V) a screenshot'}
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => handleRelicImageUpload(e.target.files?.[0])}
                            />
                          </label>

                          <p className="compare-upload-hint">
                            Best results with a cropped screenshot of just the stat panel — not the full inventory grid.
                          </p>

                          {ocrPreviewUrl && (
                            <img className="compare-ocr-preview" src={ocrPreviewUrl} alt="Uploaded relic" />
                          )}

                          {ocrStatus === 'done' && (
                            <p className="compare-ocr-note">
                              Auto-filled from image — double check the values below.
                            </p>
                          )}
                          {ocrStatus === 'no-match' && (
                            <p className="compare-ocr-note compare-ocr-note-warn">
                              Couldn't read any substats from that image — fill them in manually below.
                            </p>
                          )}
                          {ocrStatus === 'error' && (
                            <p className="compare-ocr-note compare-ocr-note-warn">
                              Something went wrong reading that image — fill in manually below.
                            </p>
                          )}

                          <div className="compare-form-row">
                            {mainOptions.length === 1 ? (
                              <span className="compare-fixed-mainstat">
                                {STAT_LABELS[mainOptions[0]] || mainOptions[0]}
                              </span>
                            ) : (
                              <select
                                value={compareMainStat.type}
                                onChange={(e) =>
                                  setCompareMainStat({ ...compareMainStat, type: e.target.value })
                                }
                              >
                                <option value="">Main stat...</option>
                                {mainOptions.map((type) => (
                                  <option key={type} value={type}>
                                    {STAT_LABELS[type] || type}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="number"
                              placeholder="e.g. 10.7"
                              value={compareMainStat.value}
                              onChange={(e) =>
                                setCompareMainStat({ ...compareMainStat, value: e.target.value })
                              }
                            />
                          </div>

                          {compareSubstats.map((s, i) => (
                            <div className="compare-form-row" key={i}>
                              <select
                                value={s.type}
                                onChange={(e) => updateSubstat(i, 'type', e.target.value)}
                              >
                                <option value="">Substat...</option>
                                {SUBSTAT_TYPES.map((type) => (
                                  <option
                                    key={type}
                                    value={type}
                                    disabled={usedTypes.has(type) && type !== s.type}
                                  >
                                    {STAT_LABELS[type] || type}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                placeholder="e.g. 10.7"
                                value={s.value}
                                onChange={(e) => updateSubstat(i, 'value', e.target.value)}
                              />
                            </div>
                          ))}

                          <p className="compare-score">
                            Score: <strong>{newScore.toFixed(1)}</strong>
                          </p>
                        </div>
                      </div>

                      <p
                        className={`compare-verdict ${
                          newScore > equippedScore ? 'compare-verdict-win' : 'compare-verdict-lose'
                        }`}
                      >
                        {newScore > equippedScore
                          ? `New relic is better by ${(newScore - equippedScore).toFixed(1)}`
                          : `Equipped relic is better by ${(equippedScore - newScore).toFixed(1)}`}
                      </p>

                      <button
                        type="button"
                        className="compare-weights-toggle"
                        onClick={() => setShowWeights((v) => !v)}
                      >
                        {showWeights ? 'Hide' : 'Adjust'} stat weights
                      </button>

                      {showWeights && (
                        <div className="compare-weights">
                          {SUBSTAT_TYPES.map((type) => (
                            <div className="compare-weight-row" key={type}>
                              <span>{STAT_LABELS[type] || type}</span>
                              <input
                                type="number"
                                step="0.1"
                                value={weights[type] ?? 0}
                                onChange={(e) => updateWeight(type, Number(e.target.value))}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {showDamageCalc && (() => {
                const skillIds = characterNames[activeCharacter.avatarId]?.skills || [];

                // Some skills (e.g. Castorice's Memosprite Skill, castable
                // up to 3 times with an escalating multiplier each time)
                // are listed as multiple separate skill IDs sharing the
                // same name and type_text — one per activation count,
                // rather than one skill with a toggle. Group those
                // together so the dropdown shows one entry, with a
                // separate "Activation" selector for which cast to view.
                const selectableIds = skillIds.filter((id) => isSelectableAttack(characterSkills[id]));
                const activationGroups = {};
                selectableIds.forEach((id) => {
                  const s = characterSkills[id];
                  const key = `${s.name}__${s.type_text}`;
                  (activationGroups[key] = activationGroups[key] || []).push(id);
                });
                const selectedSkillKey = characterSkills[calcSkillId]
                  ? `${characterSkills[calcSkillId].name}__${characterSkills[calcSkillId].type_text}`
                  : null;
                const activationVariantIds = selectedSkillKey ? activationGroups[selectedSkillKey] || [calcSkillId] : [calcSkillId];

                // Always read from the first-listed variant — it's the
                // one that carries real data (later entries are often
                // just generic flavor text, as with Castorice's repeated
                // memosprite casts). The count of variant IDs is still
                // used as a signal that this skill has multiple casts.
                const skill = characterSkills[activationVariantIds[0]];
                const resolvedSkillDesc = skill ? formatLightConeDesc(skill.desc, skill.params[calcSkillLevel - 1]) : '';
                const nonStatScalingLabel = getNonStatScalingLabel(resolvedSkillDesc);

                const scalingKey = calcScalingStat ? calcScalingStat.toLowerCase() : '';
                const scalingValue = nonStatScalingLabel
                  ? calcNonStatValue
                  : scalingKey && activeStats
                    ? activeStats[scalingKey]
                    : null;

                const elementDmgType = ELEMENT_DMG_TYPE[activeInfo?.element];
                const elementalDmgPercent =
                  elementDmgType && activeStats?.genericStats[elementDmgType]
                    ? activeStats.genericStats[elementDmgType] * 100
                    : 0;
                const allDmgPercent = activeStats?.genericStats.AllDamageTypeAddedRatio
                  ? activeStats.genericStats.AllDamageTypeAddedRatio * 100
                  : 0;
                const isElation = calcDamageType === DamageType.ELATION;
                const elationPercent = activeStats?.genericStats.ElationDamageAddedRatio
                  ? activeStats.genericStats.ElationDamageAddedRatio * 100
                  : 0;

                const matchedAiConditionals = skill
                  ? aiConditionals.filter((c) => conditionalAppliesToSkill(c, skill.type_text))
                  : [];
                const matchedManualConditionals = skill
                  ? manualConditionals.filter((c) => conditionalAppliesToSkill(c, skill.type_text))
                  : [];
                const matchedAllConditionals = [...matchedAiConditionals, ...matchedManualConditionals];
                const sumConditionalStat = (statType) =>
                  matchedAllConditionals.reduce((sum, c) => {
                    if (c.statType !== statType) return sum;
                    const stacks = aiConditionalStacks[c.name] || 0;
                    return sum + (c.valuesByStack[stacks - 1] || 0);
                  }, 0);

                const aiDmgPercent = sumConditionalStat('DMG_PERCENT');
                const aiResPenPercent = sumConditionalStat('RES_PEN');
                const aiDefPenPercent = sumConditionalStat('DEF_PEN');
                const aiVulnerabilityPercent = sumConditionalStat('VULNERABILITY');
                const aiCritRateBonus = sumConditionalStat('CRIT_RATE');
                const aiCritDmgBonus = sumConditionalStat('CRIT_DMG');
                const aiAtkPercentBonus = sumConditionalStat('ATK_PERCENT');
                const effectiveEnemyRes = calcEnemyRes - aiResPenPercent;
                const effectiveDefShred = calcDefShred + aiDefPenPercent;
                const effectiveCritRatePercent = parseFloat(activeStats.critRate) + aiCritRateBonus;
                const effectiveCritDmgPercent = parseFloat(activeStats.critDmg) + aiCritDmgBonus;
                // ATK_PERCENT conditionals only matter when the skill actually
                // scales off ATK — applied on top of the already-computed total
                // ATK (base + all other bonuses), which slightly overstates a
                // buff meant to apply to base ATK only, but is a reasonable
                // approximation consistent with how elementalDmgPercent etc.
                // are already handled as flat additive percents in this calc.
                const effectiveScalingValue =
                  scalingKey === 'atk' && typeof scalingValue === 'number'
                    ? scalingValue * (1 + aiAtkPercentBonus / 100)
                    : scalingValue;

                const levelParams = skill ? skill.params[calcSkillLevel - 1] || [] : [];
                const damagePercentIndices = skill ? getDamagePercentParamIndices(skill.desc) : [];
                // Fall back to just index 0 if the desc-parsing heuristic
                // couldn't identify anything (better a single sane value
                // than an empty selector).
                const hitIndices = damagePercentIndices.length > 0 ? damagePercentIndices : [0];
                const hasMultipleHitValues = hitIndices.length > 1;
                const selectedHitIndex = hitIndices.includes(calcParamIndex) ? calcParamIndex : hitIndices[0];
                const selectedHitTargetLabel =
                  skill && (getHitTargetLabel(skill.desc, selectedHitIndex) || (selectedHitIndex === hitIndices[0] ? 'main target' : null));

                const baseMultiplier = levelParams[selectedHitIndex];
                const escalatingMultipliers = getEscalatingMultipliers(resolvedSkillDesc);
                const activationMultipliers = escalatingMultipliers
                  ? [baseMultiplier, ...escalatingMultipliers]
                  : null;
                const hasMultipleActivations = activationVariantIds.length > 1 && !!activationMultipliers;
                const selectedActivationMultiplier = activationMultipliers
                  ? activationMultipliers[calcActivationIndex] ?? activationMultipliers[0]
                  : baseMultiplier;

                // Cross-referenced per-hit stacking bonus (e.g. Sparxie's
                // "Engagement Farming" boosting her main/adjacent hits by
                // different amounts) — only relevant for Blast-style
                // skills with distinct main/adjacent values.
                const allAbilities = skillIds
                  .map((id) => characterSkills[id])
                  .filter(Boolean)
                  .map((s) => ({
                    name: s.name,
                    desc: formatLightConeDesc(s.desc, s.params[s.params.length - 1]) || s.desc || '',
                  }))
                  .filter((a) => a.desc);
                const perHitStackingBonus = hasMultipleHitValues ? getPerHitTargetStackingBonus(allAbilities) : null;
                const getStackingDmgPercent = (hitIdx) => {
                  if (!perHitStackingBonus) return 0;
                  const perStack = hitIdx === hitIndices[0] ? perHitStackingBonus.mainPerStack : perHitStackingBonus.adjacentPerStack;
                  return perStack * calcStackingTriggers * 100;
                };

                const computeHitDamage = (multiplierFraction, extraDmgPercent = 0) => {
                  if (!skill) return null;

                  const brokenMultiplier = calcEnemyBroken ? 1.0 : 0.9;

                  if (isElation) {
                    return computeElationDamage({
                      abilityMultiplierPercent: (multiplierFraction || 0) * 100,
                      characterLevel: activeCharacter.level,
                      enemyLevel: calcEnemyLevel,
                      elationPercent,
                      merrymakePercent: calcMerrymakePercent,
                      punchlineValue: calcPunchlineValue,
                      usingCertifiedBanger: calcUsingCertifiedBanger,
                      critRatePercent: effectiveCritRatePercent,
                      critDmgPercent: effectiveCritDmgPercent,
                      enemyResPercent: effectiveEnemyRes,
                      defReductionPercent: effectiveDefShred,
                      vulnerabilityPercent: aiVulnerabilityPercent,
                      brokenMultiplier,
                    });
                  }

                  return effectiveScalingValue != null
                    ? computeDamage({
                        scalingStatValue: effectiveScalingValue,
                        skillMultiplierPercent: (multiplierFraction || 0) * 100,
                        characterLevel: activeCharacter.level,
                        enemyLevel: calcEnemyLevel,
                        enemyResPercent: effectiveEnemyRes,
                        defShredPercent: effectiveDefShred,
                        elementalDmgPercent: elementalDmgPercent + allDmgPercent + aiDmgPercent + extraDmgPercent,
                        critRatePercent: effectiveCritRatePercent,
                        critDmgPercent: effectiveCritDmgPercent,
                        vulnerabilityPercent: aiVulnerabilityPercent,
                        brokenMultiplier,
                      })
                    : null;
                };

                const damage = computeHitDamage(selectedActivationMultiplier, getStackingDmgPercent(selectedHitIndex));

                const instancedHitInfo = getInstancedHitInfo(resolvedSkillDesc);
                const instancedHitDamage = instancedHitInfo ? computeHitDamage(instancedHitInfo.perInstancePercent) : null;
                const instancedHitTotal =
                  instancedHitDamage != null ? instancedHitDamage * instancedHitInfo.instanceCount : null;

                // Blast-style skills (main + adjacent) carry two different
                // per-hit values, so the total across N enemies sums the
                // main hit once plus the adjacent hit for the rest. Skills
                // with just one qualifying damage value (including
                // repeated-cast skills, which hit "all enemies" uniformly)
                // multiply straight across the enemy count instead. Any
                // instanced-hit component (a fixed number of extra
                // instances stated in the text, independent of enemy
                // count) is added on top either way.
                const baseTotalDamage =
                  damage == null
                    ? null
                    : hasMultipleHitValues
                      ? (computeHitDamage(levelParams[hitIndices[0]], getStackingDmgPercent(hitIndices[0])) || 0) +
                        (computeHitDamage(levelParams[hitIndices[1]], getStackingDmgPercent(hitIndices[1])) || 0) * Math.max(0, calcEnemyCount - 1)
                      : damage * calcEnemyCount;

                const totalDamage =
                  baseTotalDamage != null && instancedHitTotal != null
                    ? baseTotalDamage + instancedHitTotal
                    : baseTotalDamage;

                return (
                  <div className="compare-overlay" onClick={() => setShowDamageCalc(false)}>
                    <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="compare-modal-header">
                        <h3>Damage Calculator</h3>
                        <button
                          type="button"
                          className="compare-close-btn"
                          onClick={() => setShowDamageCalc(false)}
                        >
                          ×
                        </button>
                      </div>

                      <div className="compare-form-row">
                        <button
                          type="button"
                          className="compare-weights-toggle"
                          onClick={handleDetectAiConditionals}
                        >
                          {aiConditionalStatus === 'loading' ? 'Detecting...' : 'Detect conditional bonuses (AI)'}
                        </button>
                      </div>

                      {aiConditionalStatus === 'done' && (
                        <p className="compare-ocr-note ai-disclaimer">
                          ⚠️ These bonuses were extracted by AI from ability text and haven't been manually
                          verified. Double-check against current in-game tooltips before trusting the numbers.
                        </p>
                      )}

                      {aiConditionalStatus === 'error' && (
                        <p className="compare-ocr-note compare-ocr-note-warn">{aiConditionalError}</p>
                      )}
                      {aiConditionalStatus === 'empty' && (
                        <p className="compare-ocr-note">No conditional bonuses detected in this character's ability text.</p>
                      )}

                      <div className="compare-form-row">
                        <select
                          value={calcSkillId}
                          onChange={(e) => {
                            const id = e.target.value;
                            const newSkill = characterSkills[id];
                            handleCalcSkillChange(id, newSkill?.max_level || 1);
                          }}
                        >
                          <option value="">Select a skill...</option>
                          {(() => {
                            const seenGroupKeys = new Set();
                            return skillIds.map((id) => {
                              const s = characterSkills[id];
                              if (!isSelectableAttack(s)) return null;
                              const key = `${s.name}__${s.type_text}`;
                              if (seenGroupKeys.has(key)) return null;
                              seenGroupKeys.add(key);
                              return (
                                <option key={id} value={id}>
                                  {s.type_text ? `${s.type_text}: ` : ''}
                                  {s.name}
                                </option>
                              );
                            });
                          })()}
                        </select>
                      </div>

                      {hasMultipleActivations && (
                        <div className="compare-form-row">
                          <span className="calc-inline-label">Activation</span>
                          <select
                            value={calcActivationIndex}
                            onChange={(e) => setCalcActivationIndex(Number(e.target.value))}
                          >
                            {activationMultipliers.map((_, i) => (
                              <option key={i} value={i}>
                                Cast {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {skill && (
                        <>
                          <div className="compare-form-row">
                            <label className="calc-inline-label">
                              Skill Level
                              <input
                                type="number"
                                min="1"
                                max={skill.max_level}
                                value={calcSkillLevel}
                                onChange={(e) => handleCalcSkillChange(calcSkillId, Number(e.target.value))}
                              />
                            </label>
                          </div>

                          <p className="compare-ocr-note">{resolvedSkillDesc}</p>

                          {nonStatScalingLabel ? (
                            <div className="compare-form-row">
                              <label className="calc-inline-label">
                                {nonStatScalingLabel}
                                <input
                                  type="number"
                                  min="0"
                                  value={calcNonStatValue}
                                  onChange={(e) => setCalcNonStatValue(Number(e.target.value) || 0)}
                                />
                              </label>
                            </div>
                          ) : (
                            <>
                              {calcScalingStatus === 'loading' && (
                                <p className="compare-ocr-note">Detecting damage type...</p>
                              )}
                              {calcScalingStatus === 'error' && (
                                <p className="compare-ocr-note compare-ocr-note-warn">
                                  Couldn't reach the detection service — pick the scaling stat manually
                                  (defaults to standard damage).
                                </p>
                              )}

                              {isElation ? (
                                <>
                                  <p className="compare-ocr-note ai-disclaimer">
                                    ⚠️ Elation DMG detected — this uses a different formula (no ATK/DEF/HP
                                    scaling, no DMG Boost). Live combat values like Punchline and Merrymake
                                    still need to be entered manually below.
                                  </p>
                                  <div className="compare-form-row">
                                    <label className="calc-inline-label">
                                      Punchline / Certified Banger value
                                      <input
                                        type="number"
                                        min="0"
                                        value={calcPunchlineValue}
                                        onChange={(e) => setCalcPunchlineValue(Number(e.target.value) || 0)}
                                      />
                                    </label>
                                  </div>
                                  <div className="compare-form-row">
                                    <label className="calc-inline-label">
                                      <input
                                        type="checkbox"
                                        checked={calcUsingCertifiedBanger}
                                        onChange={(e) => setCalcUsingCertifiedBanger(e.target.checked)}
                                      />
                                      {' '}Using Certified Banger state (value above is Certified Banger, not live Punchline)
                                    </label>
                                  </div>
                                  <div className="compare-form-row">
                                    <label className="calc-inline-label">
                                      Merrymake %
                                      <input
                                        type="number"
                                        min="0"
                                        value={calcMerrymakePercent}
                                        onChange={(e) => setCalcMerrymakePercent(Number(e.target.value) || 0)}
                                      />
                                    </label>
                                  </div>
                                </>
                              ) : (
                                <div className="compare-form-row">
                                  <span className="calc-inline-label">Scaling stat</span>
                                  <select value={calcScalingStat} onChange={(e) => setCalcScalingStat(e.target.value)}>
                                    <option value="">None detected</option>
                                    <option value="ATK">ATK</option>
                                    <option value="DEF">DEF</option>
                                    <option value="HP">HP</option>
                                  </select>
                                </div>
                              )}
                            </>
                          )}

                          {matchedAiConditionals.map((c) => (
                            <div key={c.name} className="compare-form-row ai-conditional-row">
                              <div>
                                <span className="calc-inline-label">
                                  {c.name} <span className="conditional-stat-type-tag">{c.statType}</span>
                                </span>
                                <p className="compare-ocr-note ai-disclaimer">
                                  ⚠️ AI-extracted — {c.trigger} — verify against current patch
                                </p>
                                {c.suspicious && (
                                  <p className="compare-ocr-note compare-ocr-note-warn">
                                    ⚠️ {c.suspiciousNote || 'Something about this looked off'} — check the
                                    wiki and consider adding this as a manual effect instead if it's wrong.
                                  </p>
                                )}
                              </div>
                              <select
                                value={aiConditionalStacks[c.name] || 0}
                                onChange={(e) =>
                                  setAiConditionalStacks((prev) => ({
                                    ...prev,
                                    [c.name]: Number(e.target.value),
                                  }))
                                }
                              >
                                {Array.from({ length: c.maxStacks + 1 }, (_, n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}

                          {matchedManualConditionals.map((c) => (
                            <div key={c.name} className="compare-form-row ai-conditional-row">
                              <div>
                                <span className="calc-inline-label">{c.name}</span>
                                <p className="compare-ocr-note">
                                  Manually added — {c.statType} — {c.appliesToAbility}
                                </p>
                              </div>
                              <select
                                value={aiConditionalStacks[c.name] || 0}
                                onChange={(e) =>
                                  setAiConditionalStacks((prev) => ({
                                    ...prev,
                                    [c.name]: Number(e.target.value),
                                  }))
                                }
                              >
                                {Array.from({ length: c.maxStacks + 1 }, (_, n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="compare-remove-btn"
                                onClick={() =>
                                  setManualConditionals((prev) => prev.filter((m) => m.name !== c.name))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          <div className="compare-form-row ai-conditional-row">
                            <div className="manual-conditional-form">
                              <input
                                type="text"
                                placeholder="Effect name (e.g. Netherwing RES Reduction)"
                                value={manualConditionalForm.name}
                                onChange={(e) =>
                                  setManualConditionalForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                              />
                              <select
                                value={manualConditionalForm.appliesToAbility}
                                onChange={(e) =>
                                  setManualConditionalForm((prev) => ({
                                    ...prev,
                                    appliesToAbility: e.target.value,
                                  }))
                                }
                              >
                                {CONDITIONAL_ABILITY_TARGETS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={manualConditionalForm.statType}
                                onChange={(e) =>
                                  setManualConditionalForm((prev) => ({ ...prev, statType: e.target.value }))
                                }
                              >
                                {CONDITIONAL_STAT_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                placeholder="Value %"
                                value={manualConditionalForm.value}
                                onChange={(e) =>
                                  setManualConditionalForm((prev) => ({
                                    ...prev,
                                    value: Number(e.target.value) || 0,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const name = manualConditionalForm.name.trim();
                                  if (!name) return;
                                  const nameTaken =
                                    aiConditionals.some((c) => c.name === name) ||
                                    manualConditionals.some((c) => c.name === name);
                                  if (nameTaken) return;
                                  setManualConditionals((prev) => [
                                    ...prev,
                                    {
                                      name,
                                      appliesToAbility: manualConditionalForm.appliesToAbility,
                                      statType: manualConditionalForm.statType,
                                      valuesByStack: [manualConditionalForm.value],
                                      maxStacks: 1,
                                    },
                                  ]);
                                  setManualConditionalForm({
                                    name: '',
                                    appliesToAbility: 'ALL',
                                    statType: 'RES_PEN',
                                    value: 0,
                                  });
                                }}
                              >
                                Add effect
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="compare-weights">
                        <div className="compare-weight-row">
                          <span>Enemy Level</span>
                          <input
                            type="number"
                            value={calcEnemyLevel}
                            onChange={(e) => setCalcEnemyLevel(Number(e.target.value))}
                          />
                        </div>
                        <div className="compare-weight-row">
                          <span>
                            Enemy RES %
                            {aiResPenPercent > 0 && ` (${effectiveEnemyRes}% effective, -${aiResPenPercent}% detected)`}
                          </span>
                          <input
                            type="number"
                            value={calcEnemyRes}
                            onChange={(e) => setCalcEnemyRes(Number(e.target.value))}
                          />
                        </div>
                        <div className="compare-weight-row">
                          <span>
                            DEF Shred %
                            {aiDefPenPercent > 0 && ` (${effectiveDefShred}% effective, +${aiDefPenPercent}% detected)`}
                          </span>
                          <input
                            type="number"
                            value={calcDefShred}
                            onChange={(e) => setCalcDefShred(Number(e.target.value))}
                          />
                        </div>
                        <div className="compare-weight-row">
                          <label className="calc-inline-label">
                            <input
                              type="checkbox"
                              checked={calcEnemyBroken}
                              onChange={(e) => setCalcEnemyBroken(e.target.checked)}
                            />
                            {' '}Enemy is Toughness Broken
                          </label>
                        </div>
                        {hasMultipleHitValues && (
                          <div className="compare-weight-row">
                            <span>Hit shown below</span>
                            <select
                              value={selectedHitIndex}
                              onChange={(e) => setCalcParamIndex(Number(e.target.value))}
                            >
                              {hitIndices.map((paramIdx, i) => {
                                const targetLabel = getHitTargetLabel(skill.desc, paramIdx);
                                const fallback = i === 0 ? 'main target' : null;
                                const shown = targetLabel || fallback;
                                return (
                                  <option key={paramIdx} value={paramIdx}>
                                    Hit {i + 1}{shown ? ` (${shown})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                        {perHitStackingBonus && (
                          <div className="compare-weight-row">
                            <span>{perHitStackingBonus.sourceName} triggers</span>
                            <input
                              type="number"
                              min="0"
                              value={calcStackingTriggers}
                              onChange={(e) => setCalcStackingTriggers(Math.max(0, Number(e.target.value) || 0))}
                            />
                          </div>
                        )}
                        <div className="compare-weight-row">
                          <span>Enemies hit</span>
                          <input
                            type="number"
                            min="1"
                            value={calcEnemyCount}
                            onChange={(e) => setCalcEnemyCount(Math.max(1, Number(e.target.value) || 1))}
                          />
                        </div>
                      </div>

                      {damage != null && (
                        <p className="damage-calc-result">
                          Estimated DMG
                          {hasMultipleActivations ? ` (Cast ${calcActivationIndex + 1})` : ''}
                          {hasMultipleHitValues ? ` (Hit ${hitIndices.indexOf(selectedHitIndex) + 1}${selectedHitTargetLabel ? `: ${selectedHitTargetLabel}` : ''})` : ''}:{' '}
                          <strong>{Math.round(damage).toLocaleString()}</strong>
                        </p>
                      )}
                      {instancedHitDamage != null && (
                        <p className="damage-calc-result">
                          Each instance ({(instancedHitInfo.perInstancePercent * 100).toFixed(1)}%):{' '}
                          <strong>{Math.round(instancedHitDamage).toLocaleString()}</strong> × {instancedHitInfo.instanceCount} ={' '}
                          <strong>{Math.round(instancedHitTotal).toLocaleString()}</strong>
                        </p>
                      )}
                      {totalDamage != null && (calcEnemyCount > 1 || instancedHitTotal != null) && (
                        <p className="damage-calc-result">
                          Total DMG ({calcEnemyCount} enem{calcEnemyCount === 1 ? 'y' : 'ies'}
                          {instancedHitTotal != null ? ' + instances' : ''}): <strong>{Math.round(totalDamage).toLocaleString()}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}