import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// HSR never puts more than 5 enemies on the field at once, regardless of
// character or ability — used to cap the "Enemies hit" input so AoE
// ("hits all enemies") abilities can't be scaled past what's actually
// possible in game.
const MAX_BATTLEFIELD_ENEMIES = 5;

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
      // flat HP) — matches how the comparison form's manual entry works,
      // not the fraction units relic._flat uses internally.
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
    const isEscalatingMultiplierContext = /progressively|respectively/.test(before);
    const mentionsDmg = /dmg/.test(before);

    if (mentionsDmg && !isHealOrShieldContext && !isInstanceContext && !isEscalatingMultiplierContext)
      indices.push(idx);
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

// Some characters' main/adjacent (Blast) hits get boosted by a *separate*
// ability elsewhere in their kit (e.g. Sparxie's "Engagement Farming"
// boosting her "Bloom! Winner Takes All" hit), rather than the attack's
// own text. Scans across every ability's resolved text (not just the
// one selected) for a "DMG multiplier against one designated enemy by
// X% ... adjacent targets by Y%" pattern, and returns the per-trigger
// bonus for each side plus which ability it came from, so the UI can
// label the input meaningfully without hardcoding a character name.
const PER_HIT_TARGET_STACKING_PATTERN =
  /multiplier against one designated enemy by ([\d.]+)%(?:[^%]*?multiplier against adjacent targets by ([\d.]+)%)?/i;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Player's actual current level for a given ability, found by scanning
// skillTreeList for whichever trace node's own level_up_skills list
// includes this ability's id — that's the StarRailRes-documented mapping
// from an ability id to the trace node that actually controls its level.
// There's no reliable numeric relationship between ability ids (e.g.
// "150101") and trace node pointIds (e.g. "1501001") to exploit instead —
// confirmed by checking real data, where a single trace node's level can
// cover multiple ability ids at once (e.g. an ordinary Basic ATK and its
// enhanced/finale variant sharing one node). skillTrees is needed
// alongside skillTreeList since level_up_skills lives on the trace node's
// own metadata (in skillTrees), not on the skillTreeList entry itself.
// Returns null (not a fallback) when the ability isn't found in any
// node's level_up_skills — e.g. abilities without their own tracked
// level — so callers can fall back to max_level themselves.
function getActualSkillLevel(character, skillId, skillTrees) {
  for (const point of character?.skillTreeList || []) {
    const treeInfo = skillTrees[point.pointId];
    if (treeInfo?.level_up_skills?.some((s) => String(s.id) === String(skillId))) {
      return point.level;
    }
  }
  return null;
}

// Same current-level resolution as getActualSkillLevel above, but returns
// the ability's own desc text formatted at that level instead of the
// level number itself. Falls back to max_level when the ability isn't
// tracked in any trace node (e.g. it isn't player-levelable at all).
// Used anywhere kit text is gathered for damage math or AI extraction
// input, so a partially-invested ability (like a trace-linked "Skill"
// entry capped below its own max_level) doesn't get treated as maxed
// just because that's simpler to assume — generalizes to any character's
// abilities, not just ones with a known name.
function getSkillDescAtActualLevel(character, skill, skillTrees) {
  const level = getActualSkillLevel(character, skill.id, skillTrees) || skill.max_level || skill.params.length;
  const clampedIndex = Math.min(Math.max(level, 1), skill.params.length) - 1;
  return formatLightConeDesc(skill.desc, skill.params[clampedIndex]) || skill.desc || '';
}

// The trigger cap itself (Sparxie: "up to 20 time(s)") isn't stated in the
// same ability's text as the DMG-multiplier bonus — it's in whichever
// ability actually triggers the named source ability repeatedly (for
// Sparxie, that's her Skill, not "Engagement Farming"'s own entry). Scans
// every ability's text for the source ability's own name in quotes
// followed by "up to N time(s)" within the same sentence, so this
// generalizes to any character with the same phrasing pattern instead of
// assuming a fixed cap.
function findMaxTriggerCount(abilities, sourceName) {
  if (!sourceName) return null;
  const pattern = new RegExp(`${escapeRegExp(sourceName)}[^.]*?up to (\\d+) time`, 'i');
  for (const a of abilities) {
    const match = a.desc.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function getPerHitTargetStackingBonus(abilities) {
  for (const a of abilities) {
    const match = a.desc.match(PER_HIT_TARGET_STACKING_PATTERN);
    if (match) {
      const sourceName = a.name;
      return {
        sourceName,
        mainPerStack: Number(match[1]) / 100,
        adjacentPerStack: match[2] ? Number(match[2]) / 100 : 0,
        maxTriggers: findMaxTriggerCount(abilities, sourceName),
      };
    }
  }
  return null;
}

// The AI-extracted conditionals matching perHitStackingBonus's source
// ability were themselves extracted from max-level kit text (kept stable
// for the shared extraction cache — see hashConditionalsInput in
// server.js), so their cached valuesByStack doesn't reflect the player's
// actual current level the way perHitStackingBonus now does. Rather than
// show a number that can silently disagree with what's actually being
// calculated, this re-derives the live percentage from
// perHitStackingBonus directly, distinguishing "main target" vs
// "adjacent target" by checking the conditional's own trigger text —
// reading the AI's own generated description rather than any
// character-specific check, so it holds for any character with this
// same main/adjacent split.
function getLivePerHitStackingPercent(conditional, perHitStackingBonus) {
  if (!perHitStackingBonus) return null;
  const isAdjacent = /adjacent/i.test(conditional.trigger || '');
  const fraction = isAdjacent ? perHitStackingBonus.adjacentPerStack : perHitStackingBonus.mainPerStack;
  return Math.round(fraction * 10000) / 100;
}

// An AI-extracted (or manual) conditional restricted to a specific ability
// (via restrictedToAbilityName) duplicates what the dedicated
// "{ability} triggers" input above already covers whenever that target
// ability is BOTH one of this character's own multi-hit-target attacks
// AND already has a per-hit-target-stacking source found for it — in that
// case, the conditional is virtually certainly describing the exact same
// mechanic getPerHitTargetStackingBonus already extracted structurally
// from the raw kit text, just expressed as prose. Deliberately does NOT
// pattern-match the conditional's own trigger text against
// PER_HIT_TARGET_STACKING_PATTERN — extraction paraphrases trigger
// descriptions rather than preserving the source ability's exact wording,
// so that comparison isn't reliable; restrictedToAbilityName is a
// structured field and holds up instead.
function isDuplicatePerHitTargetConditional(conditional, multiHitAbilityNames, perHitStackingBonus) {
  if (!perHitStackingBonus || !conditional) return false;
  // sourceAbilityName is stamped server-side from plain code (which ability's
  // text this conditional was extracted from), not inferred by the model —
  // so it's a reliable match against perHitStackingBonus's own sourceName
  // (found the same deterministic way, via regex on raw kit text) even on
  // runs where the model's restrictedToAbilityName came back null or
  // reworded. Checked first since it doesn't depend on AI output at all.
  if (conditional.sourceAbilityName && conditional.sourceAbilityName === perHitStackingBonus.sourceName) {
    return true;
  }
  // Fallback for older cached entries extracted before sourceAbilityName
  // existed — still useful when the model happened to get
  // restrictedToAbilityName right.
  return !!conditional.restrictedToAbilityName && multiHitAbilityNames.has(conditional.restrictedToAbilityName);
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
  return { damageType: data.damageType, scalingStat: data.scalingStat, damageSourceName: data.damageSourceName ?? null };
}

async function extractConditionals(characterName, abilities, forceRefresh = false) {
  const res = await fetch('http://localhost:3001/api/extract-conditionals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterName, abilities, forceRefresh }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
  return { conditionals: data.conditionals, cached: !!data.cached, extractedAt: data.extractedAt };
}

// Maps the ability type text StarRailRes uses to the same enum the
// extraction endpoint returns, so an AI-extracted conditional can be
// matched against whichever skill is currently selected in the calculator.
const TYPE_TEXT_TO_ABILITY = {
  'Basic ATK': 'BASIC',
  Skill: 'SKILL',
  Ultimate: 'ULT',
  Talent: 'FUA',
  // Memosprite Skill (e.g. Castorice's Netherwing) and Elation Skill
  // (Path of Elation characters) are both skill-type actions as far as the
  // extraction endpoint's VALID_ABILITY_TARGETS enum is concerned — the AI
  // extractor never returns anything more specific than 'SKILL' for them,
  // so a conditional scoped to 'SKILL' should still match these.
  'Memosprite Skill': 'SKILL',
  'Elation Skill': 'SKILL',
};

function conditionalAppliesToSkill(conditional, skillTypeText, skillName) {
  // A conditional whose bonus is scoped to one specific named ability
  // variant (e.g. Sparxie's "Bloom! Winner Takes All", an enhanced Basic
  // ATK that shares type_text "Basic ATK" with her ordinary Basic ATK)
  // must match that exact ability, not just its broad type — otherwise a
  // bonus meant only for the enhanced attack silently also applies to the
  // un-enhanced one. This check runs before the ALL/type-text checks below
  // since it's strictly narrower than either of them.
  if (conditional.restrictedToAbilityName) {
    return conditional.restrictedToAbilityName === skillName;
  }
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

const STAT_TYPE_DESCRIPTIONS = {
  DMG_PERCENT: 'Increases DMG dealt',
  RES_PEN: "Reduces the enemy's elemental RES",
  DEF_PEN: "Reduces the enemy's effective DEF",
  CRIT_RATE: 'Increases CRIT Rate',
  CRIT_DMG: 'Increases CRIT DMG',
  ATK_PERCENT: 'Increases ATK (only matters if the skill scales off ATK)',
  VULNERABILITY: 'Increases DMG the target takes from all sources',
  OTHER: "Doesn't map to a stat this calculator currently applies to damage",
};

// Compact names for STAT_OVERFLOW_SPLIT display (checkbox label, live
// preview) — STAT_TYPE_DESCRIPTIONS above is too verbose ("Increases CRIT
// Rate") for an inline "X% -> Y%" readout.
const STAT_TYPE_SHORT_LABELS = {
  DMG_PERCENT: 'DMG%',
  CRIT_RATE: 'CRIT Rate',
  CRIT_DMG: 'CRIT DMG',
  ATK_PERCENT: 'ATK%',
};

// The tooltip used to be an absolutely-positioned child of the "?" icon.
// That's fine on its own, but when the icon sits inside a scrollable
// container (the damage calculator's conditional bonuses list), an
// absolutely-positioned descendant that pokes past the container's right
// edge expands that container's scrollable content area — so the whole
// menu picked up an unwanted horizontal scrollbar just because one tooltip
// happened to render near the edge.
//
// Rendering the tooltip through a portal into document.body sidesteps that
// entirely: it's laid out relative to the viewport, not the scrolling
// menu, so it can never affect the menu's scroll dimensions. We measure
// the icon's position on hover/focus and clamp the tooltip's horizontal
// position so it always stays fully within the viewport.
const TOOLTIP_WIDTH = 280;
const TOOLTIP_VIEWPORT_MARGIN = 12;

function ConditionalHelpTooltip({ c }) {
  const iconRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const updatePosition = () => {
    const el = iconRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - TOOLTIP_VIEWPORT_MARGIN * 2);
    const idealLeft = rect.left + rect.width / 2 - width / 2;
    const clampedLeft = Math.min(
      Math.max(idealLeft, TOOLTIP_VIEWPORT_MARGIN),
      window.innerWidth - width - TOOLTIP_VIEWPORT_MARGIN
    );
    setTooltipPos({
      left: clampedLeft,
      bottom: window.innerHeight - rect.top + 8,
      width,
    });
  };

  const showTooltip = () => updatePosition();
  const hideTooltip = () => setTooltipPos(null);

  return (
    <span
      className="conditional-help-wrap"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <span ref={iconRef} className="conditional-help-icon" tabIndex={0}>
        ?
      </span>
      {tooltipPos &&
        createPortal(
          <div
            className="conditional-tooltip conditional-tooltip-portal"
            style={{
              left: tooltipPos.left,
              bottom: tooltipPos.bottom,
              width: tooltipPos.width,
            }}
          >
            <p className="conditional-tooltip-trigger">{c.trigger || '(no description provided)'}</p>
            <p className="conditional-tooltip-effect">
              <strong>Effect:</strong> {STAT_TYPE_DESCRIPTIONS[c.statType] || c.statType}
            </p>
            <p className="conditional-tooltip-applies">
              <strong>Applies to:</strong>{' '}
              {c.restrictedToAbilityName
                ? `"${c.restrictedToAbilityName}" only`
                : c.appliesToAbility === 'ALL'
                ? "all of this character's abilities"
                : c.appliesToAbility}
            </p>
            {c.valuesByStack.length > 1 ? (
              <ul className="conditional-tooltip-stacks">
                {c.valuesByStack.map((v, i) => (
                  <li key={i}>
                    Stack {i + 1}: +{v}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="conditional-tooltip-value">
                <strong>Value:</strong> +{c.valuesByStack[0] ?? 0}%
              </p>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

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
// Broader than a literal "DMG" check — a stat-boosting effect might only
// mention CRIT Rate, RES, DEF, or ATK without ever using the word "DMG"
// itself (e.g. "gains CRIT Rate when SPD is below 95"), and those are just
// as damage-relevant as anything with "DMG" in it. Used everywhere ability
// text gets filtered before being sent for conditional extraction.
function isDamageRelevantText(text) {
  if (!text) return false;
  return /\b(dmg|crit|res|def|atk)\b|vulnerab/i.test(text);
}

function mentionsDamage(skill) {
  if (!skill) return false;
  const firstLevelParams = Array.isArray(skill.params) ? skill.params[0] : null;
  const resolvedDesc =
    (Array.isArray(firstLevelParams) && firstLevelParams.length > 0
      ? formatLightConeDesc(skill.desc, firstLevelParams)
      : null) || skill.desc || '';
  if (!resolvedDesc) return false;
  return isDamageRelevantText(resolvedDesc);
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

// Groups a character's selectable abilities by name+type_text (the same
// grouping rule used for the Cast dropdown), then finds whichever group's
// own text describes an escalating per-cast DMG multiplier (e.g.
// Castorice's Breath Scorches the Shadow), plus flags it as a "family"
// shared with any other ability of the same type_text (e.g. Claw Splits
// the Veil, Wings Sweep the Ruins) that can follow it within the same
// turn. Not specific to any one character by name — this is detected
// purely from whichever ability's text matches getEscalatingMultipliers.
function findBreathLinkedGroup(characterSkills, skillIds) {
  const groups = {};
  (skillIds || []).forEach((id) => {
    const s = characterSkills[id];
    if (!s || !isSelectableAttack(s)) return;
    const key = `${s.name}__${s.type_text}`;
    (groups[key] = groups[key] || []).push(id);
  });
  let found = null;
  Object.values(groups).forEach((ids) => {
    if (found) return;
    const s = characterSkills[ids[0]];
    const resolvedDesc = formatLightConeDesc(s.desc, s.params[s.params.length - 1]) || s.desc || '';
    const escalating = getEscalatingMultipliers(resolvedDesc);
    if (escalating) found = { skillId: ids[0], typeText: s.type_text, name: s.name, escalatingLength: escalating.length };
  });
  return found;
}

// The AI-extracted (or manual) conditional that should sync to the
// escalating ability's own turn-position selector instead of staying an
// independently-selected stack count — identified generically by its
// trigger text referencing the escalating ability by name, rather than
// hardcoded to one character's specific trace/conditional name.
function findLinkedTraceConditional(conditionals, breathAbilityName) {
  if (!breathAbilityName) return null;
  const needle = breathAbilityName.toLowerCase();
  return (
    conditionals.find((c) => c.statType === 'DMG_PERCENT' && (c.trigger || '').toLowerCase().includes(needle)) ||
    null
  );
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

// Builds a fake relic object shaped like the real relics in
// character.relicList (i.e. matching the `_flat.props` shape
// computeFinalStats reads), out of the relic-compare form's main stat +
// substats. Those form values are stored in human-readable display units
// (e.g. 10.7 for "10.7%"), so percent stat types need /100 to become the
// fraction units _flat.props uses internally — flat stat types (HP/ATK/
// DEF/SPD Delta) are used as-is.
//
// Assumes the new relic keeps the same set as the piece it's replacing,
// since the compare form has no way to specify a different set — swapping
// sets isn't something this handles yet.
function buildSyntheticRelic(slotType, setID, mainStat, substats) {
  const props = [];

  if (mainStat.type && mainStat.value !== '') {
    const value = Number(mainStat.value);
    props.push({
      type: mainStat.type,
      value: FLAT_STAT_TYPES.has(mainStat.type) ? value : value / 100,
    });
  }

  substats.forEach((s) => {
    if (!s.type || s.value === '') return;
    const value = Number(s.value);
    props.push({
      type: s.type,
      value: FLAT_STAT_TYPES.has(s.type) ? value : value / 100,
    });
  });

  return {
    type: slotType,
    _flat: { setID, props },
  };
}

// Silver Wolf LV.999's "Hidden MMR" talent: on gaining Punchline, she gains
// an equal amount of "Hidden MMR" — each point adds 0.4% CRIT Rate, until
// CRIT Rate reaches 100%, after which remaining points switch to adding
// 0.8% CRIT DMG instead. The split point depends on her CRIT Rate *before*
// Hidden MMR is applied (gear + other conditionals), which isn't something
// the AI kit-extraction prompt can know, so this is computed directly here
// instead of going through the generic conditional-stacking schema.
// Generic resource-to-stat overflow split: a per-point resource fills
// `primaryStat` at `primaryRatePerPoint` per point until it reaches
// `capPercent`, then remaining points fill `secondaryStat` at
// `secondaryRatePerPoint` instead. The split point depends on the
// character's own current value of the primary stat (from gear + other
// conditionals), which isn't knowable from kit text alone, so this is
// computed here rather than through the generic valuesByStack stacking
// path. Driven entirely by an AI-extracted STAT_OVERFLOW_SPLIT
// conditional (see server.js) instead of any character-specific
// hardcoding — works for any character whose kit describes a mechanic
// shaped like this, not just Silver Wolf LV.999.
function computeStatOverflowSplit(basePrimaryStatPercent, resourcePoints, overflow) {
  const points = Math.max(0, resourcePoints);
  const pointsNeededToCap = Math.max(0, (overflow.capPercent - basePrimaryStatPercent) / overflow.primaryRatePerPoint);
  const pointsToPrimary = Math.min(points, pointsNeededToCap);
  const pointsToSecondary = Math.max(0, points - pointsToPrimary);
  return {
    primaryBonus: pointsToPrimary * overflow.primaryRatePerPoint,
    secondaryBonus: pointsToSecondary * overflow.secondaryRatePerPoint,
  };
}

// Recomputes total ability damage for a given stats block (as returned by
// computeFinalStats), using whatever ability/enemy/conditional
// configuration is currently set in the Damage Calculator. This mirrors
// the calculation embedded in the showDamageCalc render block below, but
// is parameterized on `stats` instead of closing over activeStats, so the
// relic-compare panel can call it twice — once for the equipped relic's
// stats, once for the hypothetical "new relic" stats — and diff the
// result. Kept as a separate pure function rather than sharing code with
// the render block to avoid touching that already-working JSX; worth
// unifying later if the duplication becomes a maintenance problem.
function computeScenarioTotalDamage(stats, scenario) {
  const {
    activeCharacter,
    characterSkills,
    skillIds,
    skillTrees,
    calcSkillId,
    calcSkillLevel,
    calcActivationIndex,
    calcParamIndex,
    calcEnemyLevel,
    calcEnemyRes,
    calcDefShred,
    calcEnemyCount,
    calcEnemyBroken,
    calcDamageType,
    calcMerrymakePercent,
    calcPunchlineValue,
    calcUsingCertifiedBanger,
    calcUsingOverflowSplit,
    calcScalingStat,
    calcNonStatValue,
    calcStackingTriggers,
    aiConditionals,
    manualConditionals,
    aiConditionalStacks,
    elementDmgType,
  } = scenario;

  if (!stats || !calcSkillId) return null;
  const skill = characterSkills[calcSkillId];
  if (!skill) return null;

  const levelParams = skill.params[calcSkillLevel - 1] || [];
  const resolvedSkillDesc = formatLightConeDesc(skill.desc, levelParams);
  const nonStatScalingLabel = getNonStatScalingLabel(resolvedSkillDesc);
  const scalingKey = calcScalingStat ? calcScalingStat.toLowerCase() : '';
  const scalingValue = nonStatScalingLabel ? calcNonStatValue : scalingKey ? stats[scalingKey] : null;

  const elementalDmgPercent =
    elementDmgType && stats.genericStats[elementDmgType] ? stats.genericStats[elementDmgType] * 100 : 0;
  const allDmgPercent = stats.genericStats.AllDamageTypeAddedRatio
    ? stats.genericStats.AllDamageTypeAddedRatio * 100
    : 0;
  const isElation = calcDamageType === DamageType.ELATION;
  const elationPercent = stats.genericStats.ElationDamageAddedRatio
    ? stats.genericStats.ElationDamageAddedRatio * 100
    : 0;

  // Moved ahead of matchedAll below (rather than staying inline with the
  // rest of the hit-index/multiplier logic further down) because excluding
  // duplicate per-hit-target conditionals needs to know whether THIS
  // ability has a dedicated stacking bonus before matchedAll is built.
  const damagePercentIndices = getDamagePercentParamIndices(skill.desc);
  const hitIndices = damagePercentIndices.length > 0 ? damagePercentIndices : [0];
  const hasMultipleHitValues = hitIndices.length > 1;
  const allAbilities = (skillIds || [])
    .map((id) => characterSkills[id])
    .filter(Boolean)
    .map((s) => ({
      name: s.name,
      desc: getSkillDescAtActualLevel(activeCharacter, s, skillTrees),
    }))
    .filter((a) => a.desc);
  const perHitStackingBonus = hasMultipleHitValues ? getPerHitTargetStackingBonus(allAbilities) : null;

  const breathLinkedGroup = findBreathLinkedGroup(characterSkills, skillIds);
  const linkedTraceConditional = findLinkedTraceConditional(
    [...aiConditionals, ...manualConditionals],
    breathLinkedGroup?.name
  );

  // Only this ability's own name is relevant here (not a roster-wide set,
  // unlike the global toggle-list version of this check further down) —
  // hasMultipleHitValues already confirms skill.name IS a multi-hit-target
  // attack, so a conditional restricted to some OTHER ability could never
  // match perHitStackingBonus's coverage of this one anyway.
  const multiHitAbilityNamesForThisSkill = hasMultipleHitValues ? new Set([skill.name]) : new Set();

  const matchedAll = [
    ...aiConditionals.filter(
      (c) =>
        conditionalAppliesToSkill(c, skill.type_text, skill.name) &&
        c !== linkedTraceConditional &&
        !isDuplicatePerHitTargetConditional(c, multiHitAbilityNamesForThisSkill, perHitStackingBonus)
    ),
    ...manualConditionals.filter(
      (c) =>
        conditionalAppliesToSkill(c, skill.type_text, skill.name) &&
        c !== linkedTraceConditional &&
        !isDuplicatePerHitTargetConditional(c, multiHitAbilityNamesForThisSkill, perHitStackingBonus)
    ),
  ];
  const sumConditionalStat = (statType) =>
    matchedAll.reduce((sum, c) => {
      if (c.statType !== statType) return sum;
      const stacks = aiConditionalStacks[c.name] || 0;
      return sum + (c.valuesByStack[stacks - 1] || 0);
    }, 0);

  // The escalating ability's own row treats calcActivationIndex as a
  // 0-indexed cast number (cast N -> stack N), while a sibling ability
  // (one that can follow it within the same turn but doesn't escalate its
  // own multiplier) treats it as a literal preceding-breath count, which
  // can legitimately be 0.
  const isBreathAbility = !!breathLinkedGroup && calcSkillId === breathLinkedGroup.skillId;
  const isBreathSibling =
    !!breathLinkedGroup && !isBreathAbility && skill.type_text === breathLinkedGroup.typeText;
  const linkedTraceStackCount = isBreathAbility
    ? calcActivationIndex + 1
    : isBreathSibling
    ? calcActivationIndex
    : 0;
  const linkedTraceBonus =
    linkedTraceConditional && linkedTraceStackCount > 0
      ? linkedTraceConditional.valuesByStack[
          Math.min(linkedTraceStackCount, linkedTraceConditional.maxStacks) - 1
        ] || 0
      : 0;

  let aiDmgPercent = sumConditionalStat('DMG_PERCENT') + linkedTraceBonus;
  const aiResPenPercent = sumConditionalStat('RES_PEN');
  const aiDefPenPercent = sumConditionalStat('DEF_PEN');
  const aiVulnerabilityPercent = sumConditionalStat('VULNERABILITY');
  const aiCritRateBonus = sumConditionalStat('CRIT_RATE');
  const aiCritDmgBonus = sumConditionalStat('CRIT_DMG');
  let aiAtkPercentBonus = sumConditionalStat('ATK_PERCENT');

  const effectiveEnemyRes = calcEnemyRes - aiResPenPercent;
  const effectiveDefShred = calcDefShred + aiDefPenPercent;
  const baseCritRatePercent = parseFloat(stats.critRate) + aiCritRateBonus;
  const baseCritDmgPercent = parseFloat(stats.critDmg) + aiCritDmgBonus;

  // STAT_OVERFLOW_SPLIT conditionals (see server.js) are AI-extracted from
  // this specific character's kit, so this only fires for characters whose
  // kit actually describes a mechanic shaped like this — no
  // character-name checks involved. The resource point count is read from
  // the Punchline field since that's the only free-standing numeric
  // "stack" input the Elation calculator currently exposes; a character
  // whose overflow resource isn't Punchline-driven would need a dedicated
  // input, which isn't built yet.
  const overflowConditional = matchedAll.find((c) => c.statType === 'STAT_OVERFLOW_SPLIT' && c.overflow);
  let overflowCritRateBonus = 0;
  let overflowCritDmgBonus = 0;
  if (calcUsingOverflowSplit && overflowConditional) {
    const { overflow } = overflowConditional;
    const baseValueByStat = {
      CRIT_RATE: baseCritRatePercent,
      CRIT_DMG: baseCritDmgPercent,
      DMG_PERCENT: aiDmgPercent,
      ATK_PERCENT: aiAtkPercentBonus,
    };
    const split = computeStatOverflowSplit(baseValueByStat[overflow.primaryStat] ?? 0, calcPunchlineValue, overflow);
    const applyBonus = (statKey, bonus) => {
      if (statKey === 'CRIT_RATE') overflowCritRateBonus += bonus;
      else if (statKey === 'CRIT_DMG') overflowCritDmgBonus += bonus;
      else if (statKey === 'DMG_PERCENT') aiDmgPercent += bonus;
      else if (statKey === 'ATK_PERCENT') aiAtkPercentBonus += bonus;
    };
    applyBonus(overflow.primaryStat, split.primaryBonus);
    applyBonus(overflow.secondaryStat, split.secondaryBonus);
  }

  const effectiveCritRatePercent = baseCritRatePercent + overflowCritRateBonus;
  const effectiveCritDmgPercent = baseCritDmgPercent + overflowCritDmgBonus;
  const effectiveScalingValue =
    scalingKey === 'atk' && typeof scalingValue === 'number'
      ? scalingValue * (1 + aiAtkPercentBonus / 100)
      : scalingValue;

  const selectedHitIndex = hitIndices.includes(calcParamIndex) ? calcParamIndex : hitIndices[0];

  const baseMultiplier = levelParams[selectedHitIndex];
  const escalatingMultipliers = getEscalatingMultipliers(resolvedSkillDesc);
  const activationMultipliers = escalatingMultipliers ? [baseMultiplier, ...escalatingMultipliers] : null;
  const selectedActivationMultiplier = activationMultipliers
    ? activationMultipliers[Math.min(calcActivationIndex, activationMultipliers.length - 1)]
    : baseMultiplier;

  const getStackingDmgPercent = (hitIdx) => {
    if (!perHitStackingBonus) return 0;
    const perStack = hitIdx === hitIndices[0] ? perHitStackingBonus.mainPerStack : perHitStackingBonus.adjacentPerStack;
    return perStack * calcStackingTriggers * 100;
  };

  const computeHitDamage = (multiplierFraction, extraDmgPercent = 0) => {
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
  if (damage == null) return null;

  const instancedHitInfo = getInstancedHitInfo(resolvedSkillDesc);
  const instancedHitDamage = instancedHitInfo ? computeHitDamage(instancedHitInfo.perInstancePercent) : null;
  const instancedHitTotal = instancedHitDamage != null ? instancedHitDamage * instancedHitInfo.instanceCount : null;

  // Blast-pattern abilities (main target + adjacent targets) only ever
  // hit the main target plus up to 2 enemies adjacent to it — 3 targets
  // total — no matter how many enemies are actually on the field, since
  // "adjacent" is a fixed positional relationship, not a count that
  // scales with battlefield size. Enemies hit beyond that never take the
  // adjacent-hit damage, so this caps the adjacent multiplier separately
  // from the overall battlefield cap (MAX_BATTLEFIELD_ENEMIES) below,
  // which still governs "hits all enemies" abilities.
  const MAX_BLAST_ADJACENT_ENEMIES = 2;
  const baseTotalDamage = hasMultipleHitValues
    ? (computeHitDamage(levelParams[hitIndices[0]], getStackingDmgPercent(hitIndices[0])) || 0) +
      (computeHitDamage(levelParams[hitIndices[1]], getStackingDmgPercent(hitIndices[1])) || 0) *
        Math.max(0, Math.min(MAX_BLAST_ADJACENT_ENEMIES, calcEnemyCount - 1))
    : damage * calcEnemyCount;

  return instancedHitTotal != null ? baseTotalDamage + instancedHitTotal : baseTotalDamage;
}

// Sums damage across a full rotation: each row supplies its own ability
// selection (skillId/skillLevel/paramIndex/activationIndex) plus its
// classification (damageType/scalingStat/nonStatValue) from that row's own
// AI detection, while everything else (enemy config, Elation-wide fields,
// AI/manual conditionals) is shared across the whole rotation via
// `globalScenario`. Reuses computeScenarioTotalDamage as the per-row engine
// rather than duplicating its math — a rotation is just that function
// called once per row, multiplied by how many times that row occurs in one
// rotation cycle, summed.
function computeRotationTotalDamage(stats, rows, globalScenario) {
  const perRow = rows.map((row) => {
    const rowScenario = {
      ...globalScenario,
      calcSkillId: row.skillId,
      calcSkillLevel: row.skillLevel,
      calcActivationIndex: row.activationIndex,
      calcParamIndex: row.paramIndex,
      calcDamageType: row.damageType,
      calcScalingStat: row.scalingStat,
      calcNonStatValue: row.nonStatValue,
      // Per-row rather than shared via globalScenario — two rows both using
      // "Bloom! Winner Takes All" (or any other per-hit-target-stacking
      // ability) should be able to represent different trigger counts, not
      // mirror the same number.
      calcStackingTriggers: row.stackingTriggers ?? 0,
    };
    const perHit = computeScenarioTotalDamage(stats, rowScenario);
    const rowTotal = perHit != null ? perHit * Math.max(0, row.countPerRotation) : null;
    return { id: row.id, label: row.label, perHit, count: row.countPerRotation, rowTotal };
  });

  const validRows = perRow.filter((r) => r.rowTotal != null);
  const total = validRows.length > 0 ? validRows.reduce((sum, r) => sum + r.rowTotal, 0) : null;

  return { total, perRow };
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
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [showDamageCalc, setShowDamageCalc] = useState(false);
  const [rotationRows, setRotationRows] = useState([]);
  const [calcEnemyLevel, setCalcEnemyLevel] = useState(95);
  const [calcEnemyRes, setCalcEnemyRes] = useState(0);
  const [calcDefShred, setCalcDefShred] = useState(0);
  const [calcPunchlineValue, setCalcPunchlineValue] = useState(0);
  const [calcUsingCertifiedBanger, setCalcUsingCertifiedBanger] = useState(false);
  const [calcUsingOverflowSplit, setCalcUsingOverflowSplit] = useState(false);
  const [calcMerrymakePercent, setCalcMerrymakePercent] = useState(0);
  const [calcEnemyCount, setCalcEnemyCount] = useState(1);
  const [calcEnemyBroken, setCalcEnemyBroken] = useState(true);
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
  const [aiConditionalCached, setAiConditionalCached] = useState(false);
  // Tracks which character's avatarId the AI conditional detector has
  // already been run for (successfully or not), so opening the calculator
  // can auto-trigger detection once per character instead of leaving it as
  // an always-manual click, while still not re-firing on every re-open or
  // re-render for a character it's already checked.
  const [aiConditionalCharacterId, setAiConditionalCharacterId] = useState(null);
  const cardRefs = useRef({});
  const trackRef = useRef(null);

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

  async function handleDetectAiConditionals(forceRefresh = false) {
    const characterName = characterNames[activeCharacter.avatarId]?.name || 'Unknown';
    const skillIds = characterNames[activeCharacter.avatarId]?.skills || [];
    // Marked as soon as detection is kicked off (not just on success) so
    // the auto-detect effect below doesn't loop retrying a character whose
    // extraction failed — the user can still force a retry via the
    // "Detect" / "Re-detect" buttons, which call this function directly.
    setAiConditionalCharacterId(activeCharacter.avatarId);

    const seenDescriptions = new Set();
    const abilities = skillIds
      .map((id) => characterSkills[id])
      .filter(mentionsDamage)
      .map((s) => ({
        type: s.type_text || 'Ability',
        description: formatLightConeDesc(s.desc, s.params[s.params.length - 1]) || s.desc,
        name: s.name,
      }))
      .filter((a) => a.description)
      // Characters with multiple skill IDs sharing a name (e.g. Castorice's
      // escalating-multiplier variants, already handled separately by
      // getEscalatingMultipliers() for the multiplier selector) otherwise
      // send byte-identical description text multiple times, wasting
      // prompt budget on redundant content instead of leaving that room
      // for effects that are actually distinct.
      .filter((a) => {
        if (seenDescriptions.has(a.description)) return false;
        seenDescriptions.add(a.description);
        return true;
      });

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
      if (lcDesc && isDamageRelevantText(lcDesc)) {
        abilities.push({
          type: 'Light Cone Passive',
          description: `${lcName} (Superimposition ${equipment.rank}): ${lcDesc}`,
          name: lcName,
        });
      }
    }

    // Any tier of a relic/ornament set's text can bundle a genuinely
    // conditional effect, not just the 4pc tier — e.g. Pioneer Diver of
    // Dead Waters' 2pc is "Increases DMG dealt to enemies with debuff by
    // 12%," which is conditional on the ENEMY's state and has no numeric
    // stat anywhere in fetched player data for it to already be captured
    // by. Trying to pre-filter which tiers are "safe" to skip (2pc vs
    // 4pc, body set vs ornament set) turned out to be guessing rather
    // than a reliable rule, so every tier's text is sent through
    // extraction instead — the prompt already knows how to separate a
    // flat baseline (already applied via properties[0] in
    // computeFinalStats) from a bundled conditional bonus, so it's the
    // right place for that filtering to happen, not here.
    const setCounts = {};
    (activeCharacter.relicList || []).forEach((relic) => {
      const setID = relic._flat?.setID;
      if (setID != null) setCounts[setID] = (setCounts[setID] || 0) + 1;
    });
    Object.entries(setCounts).forEach(([setID, count]) => {
      const set = relicSets[setID];
      if (!set) return;
      if (count >= 2 && set.desc[0] && isDamageRelevantText(set.desc[0])) {
        abilities.push({
          type: 'Relic Set (2pc)',
          description: `${set.name} (2pc): ${set.desc[0]}`,
          name: set.name,
        });
      }
      if (count >= 4 && set.desc[1] && isDamageRelevantText(set.desc[1])) {
        abilities.push({
          type: 'Relic Set (4pc)',
          description: `${set.name} (4pc): ${set.desc[1]}`,
          name: set.name,
        });
      }
    });

    // Trace nodes (Bonus Abilities) can carry the same kind of conditional
    // damage bonus as a kit ability or relic set — e.g. Castorice's "Where
    // the West Wind Dwells" (+30% DMG per Breath Scorches the Shadow cast,
    // stacking up to 6, lasting until end of turn) — but live in a
    // separate data source (character_skill_trees.json) that isn't part of
    // characterSkills. Only nodes the player has actually unlocked/leveled
    // are sent, mirroring how only equipped relic set tiers are sent above.
    (activeCharacter.skillTreeList || []).forEach((point) => {
      const treeInfo = skillTrees[point.pointId];
      if (!treeInfo || !treeInfo.desc) return;
      const levelParams = treeInfo.params?.[point.level - 1] || treeInfo.params?.[treeInfo.params.length - 1];
      const desc = formatLightConeDesc(treeInfo.desc, levelParams) || treeInfo.desc;
      if (desc && isDamageRelevantText(desc) && !seenDescriptions.has(desc)) {
        seenDescriptions.add(desc);
        abilities.push({
          type: 'Trace',
          description: `${treeInfo.name || 'Trace'}: ${desc}`,
          name: treeInfo.name || 'Trace',
        });
      }
    });

    if (abilities.length === 0) {
      setAiConditionalStatus('error');
      setAiConditionalError('No resolved ability descriptions found for this character.');
      return;
    }

    setAiConditionalStatus('loading');
    setAiConditionalError('');
    try {
      const { conditionals, cached } = await extractConditionals(characterName, abilities, forceRefresh);
      setAiConditionals(conditionals);
      setAiConditionalStacks({});
      setAiConditionalCached(cached);
      setAiConditionalStatus(conditionals.length === 0 ? 'empty' : 'done');
    } catch (err) {
      console.error('AI conditional detection failed:', err);
      setAiConditionalStatus('error');
      setAiConditionalError(err.message || 'Failed to reach the extraction service.');
    }
  }

  function makeRotationRowId() {
    return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function updateRotationRow(id, patch) {
    setRotationRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Runs the same per-ability classification used by the old single-ability
  // calculator (damageType/scalingStat, plus damageSourceName for abilities
  // whose own action doesn't deal the damage — e.g. a Zone-deploy Ultimate
  // whose actual DMG comes from a separately-named, separately-triggered
  // effect like "Top Loot Box"). Runs per row rather than once globally,
  // since a rotation can mix abilities with different damage types.
  async function detectRowScaling(id, skillId, level) {
    const skill = characterSkills[skillId];
    if (!skill) return;

    const resolvedDesc = formatLightConeDesc(skill.desc, skill.params[level - 1]);
    if (!resolvedDesc) return;

    if (getNonStatScalingLabel(resolvedDesc)) {
      updateRotationRow(id, { scalingStatus: 'idle' });
      return;
    }

    updateRotationRow(id, { scalingStatus: 'loading', scalingError: '' });
    try {
      const { damageType, scalingStat, damageSourceName } = await interpretSkill(resolvedDesc);
      setRotationRows((rows) =>
        rows.map((r) =>
          r.id === id
            ? {
                ...r,
                damageType: damageType === 'ELATION' ? DamageType.ELATION : DamageType.STANDARD,
                scalingStat: scalingStat === 'NONE' ? '' : scalingStat,
                damageSourceName: damageSourceName || null,
                // Adopt the detected source name as the row's display label
                // (e.g. "Ultimate" -> "Top Loot Box") unless the person has
                // already typed their own label for this row.
                label: !r.labelIsCustom && damageSourceName ? damageSourceName : r.label,
                scalingStatus: 'done',
              }
            : r
        )
      );
    } catch (err) {
      console.error('Skill scaling detection failed:', err);
      updateRotationRow(id, { scalingStatus: 'error', scalingError: err.message || 'Failed to reach the detection service.' });
    }
  }

  function addRotationRow(skillId) {
    const skill = characterSkills[skillId];
    const id = makeRotationRowId();
    const level = getActualSkillLevel(activeCharacter, skillId, skillTrees) || skill?.max_level || 1;
    const newRow = {
      id,
      skillId,
      skillLevel: level,
      paramIndex: 0,
      activationIndex: 0,
      countPerRotation: 1,
      label: skill?.name || '',
      labelIsCustom: false,
      damageType: DamageType.STANDARD,
      scalingStat: '',
      scalingStatus: 'idle',
      scalingError: '',
      nonStatValue: 0,
      damageSourceName: null,
      stackingTriggers: 0,
    };
    setRotationRows((rows) => [...rows, newRow]);
    detectRowScaling(id, skillId, level);
  }

  function removeRotationRow(id) {
    setRotationRows((rows) => rows.filter((r) => r.id !== id));
  }

  function handleRotationRowSkillChange(id, skillId) {
    const skill = characterSkills[skillId];
    const level = getActualSkillLevel(activeCharacter, skillId, skillTrees) || skill?.max_level || 1;
    updateRotationRow(id, {
      skillId,
      skillLevel: level,
      paramIndex: 0,
      activationIndex: 0,
      label: skill?.name || '',
      labelIsCustom: false,
      damageType: DamageType.STANDARD,
      scalingStat: '',
      scalingStatus: 'idle',
      nonStatValue: 0,
      damageSourceName: null,
      // Reset rather than carried over — a stale trigger count from
      // whatever ability this row used to be doesn't make sense once it's
      // pointed at a different ability, even if the new one happens to
      // have the same kind of stacking mechanic.
      stackingTriggers: 0,
    });
    detectRowScaling(id, skillId, level);
  }

  function handleRotationRowLevelChange(id, level) {
    // Level only changes the skill's numeric param values, never its
    // scaling stat or damage type — no need to re-run detection against
    // Groq for something level-invariant.
    updateRotationRow(id, { skillLevel: level });
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

  // Auto-run AI conditional detection when the Damage Calculator opens,
  // instead of leaving it as a mandatory extra click every time. The
  // "Detect conditional bonuses" / "Re-detect" buttons still exist for the
  // rare case of a kit rework (novaflare) — forceRefresh stays false here,
  // so this is just a fast cache hit through the backend for the vast
  // majority of characters whose kit text hasn't changed, not a fresh AI
  // call on every open. Keyed on avatarId so it fires once per character
  // rather than re-fetching every time the modal is reopened.
  useEffect(() => {
    if (!showDamageCalc || !data) return;
    const characters = data.detailInfo?.avatarDetailList || [];
    const currentId = selectedId ?? characters[0]?.avatarId;
    if (currentId == null) return;
    if (aiConditionalCharacterId === currentId) return;
    if (aiConditionalStatus === 'loading') return;
    handleDetectAiConditionals(false);
  }, [showDamageCalc, selectedId, data]);

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
                      onClick={() => setShowDamageCalc(true)}
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

                // Damage-impact preview: recompute the character's full stat
                // block with the new relic's stats swapped in for the
                // equipped one at this slot, then re-run the whole rotation
                // (every row in rotationRows) against both stat blocks and
                // diff the totals. rotationRows/enemy/conditional config all
                // live in component state, so they persist even if the
                // Damage Calculator modal itself is closed.
                const newRelicFormComplete =
                  compareMainStat.type &&
                  compareMainStat.value !== '' &&
                  compareSubstats.every((s) => (s.type && s.value !== '') || (!s.type && s.value === ''));

                let damageDelta = null;
                if (rotationRows.length > 0 && newRelicFormComplete) {
                  const syntheticRelic = buildSyntheticRelic(
                    compareSlot,
                    equippedRelic._flat.setID,
                    compareMainStat,
                    compareSubstats
                  );
                  const swappedRelicList = activeCharacter.relicList.map((r) =>
                    r.type === compareSlot ? syntheticRelic : r
                  );
                  const newStats = computeFinalStats(
                    { ...activeCharacter, relicList: swappedRelicList },
                    characterPromotions,
                    relicSets,
                    skillTrees,
                    lightConeRanks
                  );

                  const globalScenario = {
                    activeCharacter,
                    characterSkills,
                    skillIds: activeInfo?.skills || [],
                    skillTrees,
                    calcEnemyLevel,
                    calcEnemyRes,
                    calcDefShred,
                    calcEnemyCount,
                    calcEnemyBroken,
                    calcMerrymakePercent,
                    calcPunchlineValue,
                    calcUsingCertifiedBanger,
                    calcUsingOverflowSplit,
                    aiConditionals,
                    manualConditionals,
                    aiConditionalStacks,
                    elementDmgType: ELEMENT_DMG_TYPE[activeInfo?.element],
                  };

                  const { total: equippedDamage } = computeRotationTotalDamage(activeStats, rotationRows, globalScenario);
                  const { total: newDamage } = newStats
                    ? computeRotationTotalDamage(newStats, rotationRows, globalScenario)
                    : { total: null };

                  if (equippedDamage != null && newDamage != null) {
                    damageDelta = {
                      equippedDamage,
                      newDamage,
                      diff: newDamage - equippedDamage,
                      pct: equippedDamage !== 0 ? ((newDamage - equippedDamage) / equippedDamage) * 100 : 0,
                    };
                  }
                }

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

                        </div>
                      </div>

                      {damageDelta ? (
                        <p
                          className={`compare-verdict ${
                            damageDelta.diff >= 0 ? 'compare-verdict-win' : 'compare-verdict-lose'
                          }`}
                        >
                          {Math.round(damageDelta.equippedDamage).toLocaleString()} →{' '}
                          {Math.round(damageDelta.newDamage).toLocaleString()} DMG (
                          {damageDelta.diff >= 0 ? '+' : ''}
                          {Math.round(damageDelta.diff).toLocaleString()}, {damageDelta.diff >= 0 ? '+' : ''}
                          {damageDelta.pct.toFixed(1)}%)
                        </p>
                      ) : (
                        <p className="compare-ocr-note">
                          {rotationRows.length > 0
                            ? 'Fill in the new relic\u2019s main stat and all substats to see its damage impact.'
                            : 'Open the Damage Calculator and add a rotation to see this relic\u2019s damage impact.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {showDamageCalc && (() => {
                const skillIds = characterNames[activeCharacter.avatarId]?.skills || [];
                const selectableIds = skillIds.filter((id) => isSelectableAttack(characterSkills[id]));

                // Some skills (e.g. Castorice's Memosprite Skill, castable
                // up to 3 times with an escalating multiplier each time)
                // are listed as multiple separate skill IDs sharing the
                // same name and type_text — one per activation count,
                // rather than one skill with a toggle. Group those
                // together so the dropdown shows one entry, with a
                // separate "Activation" selector on the row for which
                // cast to view.
                const activationGroups = {};
                selectableIds.forEach((id) => {
                  const s = characterSkills[id];
                  const key = `${s.name}__${s.type_text}`;
                  (activationGroups[key] = activationGroups[key] || []).push(id);
                });
                const dedupedSelectableIds = [];
                const seenGroupKeys = new Set();
                selectableIds.forEach((id) => {
                  const s = characterSkills[id];
                  const key = `${s.name}__${s.type_text}`;
                  if (seenGroupKeys.has(key)) return;
                  seenGroupKeys.add(key);
                  dedupedSelectableIds.push(id);
                });

                const elementDmgType = ELEMENT_DMG_TYPE[activeInfo?.element];

                // Character-wide (not per-row) detection of a cross-hit
                // stacking mechanic — e.g. a Blast skill whose main/adjacent
                // hits both get stronger with repeated triggers of some
                // other ability. Independent of which rows are in the
                // rotation right now.
                const allAbilities = skillIds
                  .map((id) => characterSkills[id])
                  .filter(Boolean)
                  .map((s) => ({
                    name: s.name,
                    desc: getSkillDescAtActualLevel(activeCharacter, s, skillTrees),
                  }))
                  .filter((a) => a.desc);
                const perHitStackingBonus = getPerHitTargetStackingBonus(allAbilities);
                // Character-wide set of ability names that have their own
                // multiple hit-target values (main + adjacent, etc.) — used
                // to decide whether a restrictedToAbilityName conditional
                // duplicates perHitStackingBonus's coverage, same signal as
                // the per-row check above but scoped to the whole roster
                // since this list isn't tied to one selected row.
                const multiHitAbilityNames = new Set(
                  skillIds
                    .map((id) => characterSkills[id])
                    .filter(Boolean)
                    .filter((s) => getDamagePercentParamIndices(s.desc).length > 1)
                    .map((s) => s.name)
                );

                const allConditionals = [...aiConditionals, ...manualConditionals];
                const overflowConditional = allConditionals.find(
                  (c) => c.statType === 'STAT_OVERFLOW_SPLIT' && c.overflow
                );
                const hasElationRow = rotationRows.some((r) => r.damageType === DamageType.ELATION);

                // Some abilities' own DMG multiplier escalates per cast
                // within one turn (e.g. Castorice's Breath Scorches the
                // Shadow), and a sibling ability of the same type_text can
                // follow it in that same turn (e.g. Claw Splits the Veil,
                // Wings Sweep the Ruins) inheriting whatever per-turn
                // conditional bonus the escalating one has been stacking
                // (e.g. a Trace like Where the West Wind Dwells). All of
                // that family shares one "how far into this turn" selector
                // rather than each row picking its own independently —
                // sized to whichever is larger, the ability's own number of
                // escalation stages or the linked conditional's max stacks.
                const breathLinkedGroup = findBreathLinkedGroup(characterSkills, skillIds);
                const linkedTraceConditional = findLinkedTraceConditional(
                  allConditionals,
                  breathLinkedGroup?.name
                );
                let breathMaxCasts = breathLinkedGroup ? breathLinkedGroup.escalatingLength + 1 : 1;
                if (linkedTraceConditional) breathMaxCasts = Math.max(breathMaxCasts, linkedTraceConditional.maxStacks);

                // Display-only estimate of effective enemy RES/DEF-shred —
                // sums RES_PEN/DEF_PEN across every currently-added
                // conditional regardless of which row(s) it actually
                // applies to, since that per-row filtering already happens
                // correctly inside computeScenarioTotalDamage itself.
                const aiResPenPercent = allConditionals.reduce((sum, c) => {
                  if (c.statType !== 'RES_PEN') return sum;
                  const stacks = aiConditionalStacks[c.name] || 0;
                  return sum + (c.valuesByStack[stacks - 1] || 0);
                }, 0);
                const aiDefPenPercent = allConditionals.reduce((sum, c) => {
                  if (c.statType !== 'DEF_PEN') return sum;
                  const stacks = aiConditionalStacks[c.name] || 0;
                  return sum + (c.valuesByStack[stacks - 1] || 0);
                }, 0);
                const effectiveEnemyRes = calcEnemyRes - aiResPenPercent;
                const effectiveDefShred = calcDefShred + aiDefPenPercent;

                // Per-row derived info (which skill it resolves to, its
                // level-resolved description, which damage-percent hit
                // indices it has, whether it has escalating-cast
                // variants) — mirrors what the old single-ability
                // calculator computed once globally, scoped per row here
                // since each row can be a different ability.
                function getRowMeta(row) {
                  const selectedSkillKey = characterSkills[row.skillId]
                    ? `${characterSkills[row.skillId].name}__${characterSkills[row.skillId].type_text}`
                    : null;
                  const activationVariantIds = selectedSkillKey
                    ? activationGroups[selectedSkillKey] || [row.skillId]
                    : [row.skillId];
                  const skill = characterSkills[activationVariantIds[0]];
                  const resolvedDesc = skill ? formatLightConeDesc(skill.desc, skill.params[row.skillLevel - 1]) : '';
                  const nonStatScalingLabel = getNonStatScalingLabel(resolvedDesc);
                  const damagePercentIndices = skill ? getDamagePercentParamIndices(skill.desc) : [];
                  const hitIndices = damagePercentIndices.length > 0 ? damagePercentIndices : [0];
                  const hasMultipleHitValues = hitIndices.length > 1;
                  const selectedHitIndex = hitIndices.includes(row.paramIndex) ? row.paramIndex : hitIndices[0];
                  const levelParams = skill ? skill.params[row.skillLevel - 1] || [] : [];
                  const baseMultiplier = levelParams[selectedHitIndex];
                  const escalatingMultipliers = getEscalatingMultipliers(resolvedDesc);
                  const activationMultipliers = escalatingMultipliers
                    ? [baseMultiplier, ...escalatingMultipliers]
                    : null;
                  const hasMultipleActivations = activationVariantIds.length > 1 && !!activationMultipliers;

                  const isBreathAbility = !!breathLinkedGroup && activationVariantIds[0] === breathLinkedGroup.skillId;
                  const isBreathSibling =
                    !!breathLinkedGroup && !isBreathAbility && skill?.type_text === breathLinkedGroup.typeText;
                  const hasTurnPositionSelector = isBreathAbility || isBreathSibling;

                  // hasMultipleHitValues (above) already confirms THIS row's
                  // own skill is the multi-hit-target ability — combined
                  // with perHitStackingBonus being non-null (character has
                  // a stacking source for it somewhere in kit), that's
                  // sufficient to know this specific row should show the
                  // input, without re-deriving it from multiHitAbilityNames.
                  const hasPerHitStackingInput = hasMultipleHitValues && !!perHitStackingBonus;
                  const perHitStackingConditionals = hasPerHitStackingInput
                    ? allConditionals.filter((c) =>
                        isDuplicatePerHitTargetConditional(c, multiHitAbilityNames, perHitStackingBonus)
                      )
                    : [];

                  return {
                    skill,
                    resolvedDesc,
                    nonStatScalingLabel,
                    hasMultipleHitValues,
                    activationMultipliers,
                    hasMultipleActivations,
                    isBreathAbility,
                    isBreathSibling,
                    hasTurnPositionSelector,
                    hasPerHitStackingInput,
                    perHitStackingConditionals,
                  };
                }

                const globalScenario = {
                  activeCharacter,
                  characterSkills,
                  skillIds,
                  skillTrees,
                  calcEnemyLevel,
                  calcEnemyRes,
                  calcDefShred,
                  calcEnemyCount,
                  calcEnemyBroken,
                  calcMerrymakePercent,
                  calcPunchlineValue,
                  calcUsingCertifiedBanger,
                  calcUsingOverflowSplit,
                  aiConditionals,
                  manualConditionals,
                  aiConditionalStacks,
                  elementDmgType,
                };

                const { total: totalRotationDamage, perRow } = activeStats
                  ? computeRotationTotalDamage(activeStats, rotationRows, globalScenario)
                  : { total: null, perRow: [] };

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
                        {aiConditionalStatus === 'loading' && (
                          <p className="compare-ocr-note">Detecting conditional bonuses...</p>
                        )}
                        {aiConditionalStatus === 'idle' && (
                          <button
                            type="button"
                            className="compare-weights-toggle"
                            onClick={() => handleDetectAiConditionals(false)}
                          >
                            Detect conditional bonuses (AI)
                          </button>
                        )}
                        {aiConditionalStatus === 'error' && (
                          <button
                            type="button"
                            className="compare-weights-toggle"
                            onClick={() => handleDetectAiConditionals(false)}
                          >
                            Retry detection
                          </button>
                        )}
                        {(aiConditionalStatus === 'done' || aiConditionalStatus === 'empty') && (
                          <button
                            type="button"
                            className="compare-weights-toggle"
                            onClick={() => handleDetectAiConditionals(true)}
                            title="Bypass the cache and re-run extraction — use this if a character was recently reworked"
                          >
                            Re-detect (skip cache)
                          </button>
                        )}
                      </div>

                      {aiConditionalStatus === 'done' && (
                        <p className="compare-ocr-note ai-disclaimer">
                          ⚠️ These bonuses were extracted by AI from ability text and haven't been manually
                          verified. Double-check against current in-game tooltips before trusting the numbers.
                          {aiConditionalCached && ' (Loaded from a previous extraction — click "Re-detect" if this kit was recently reworked.)'}
                        </p>
                      )}

                      {aiConditionalStatus === 'error' && (
                        <p className="compare-ocr-note compare-ocr-note-warn">{aiConditionalError}</p>
                      )}
                      {aiConditionalStatus === 'empty' && (
                        <p className="compare-ocr-note">No conditional bonuses detected in this character's ability text.</p>
                      )}

                      {hasElationRow && (
                        <>
                          <p className="compare-ocr-note ai-disclaimer">
                            ⚠️ Elation DMG detected on at least one rotation row — these live-combat values apply
                            to every Elation row in the rotation.
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
                          {overflowConditional && (
                            <div className="compare-form-row">
                              <label className="calc-inline-label">
                                <input
                                  type="checkbox"
                                  checked={calcUsingOverflowSplit}
                                  onChange={(e) => setCalcUsingOverflowSplit(e.target.checked)}
                                />
                                {' '}Convert Punchline value above into "{overflowConditional.overflow.resourceLabel || overflowConditional.name}": +
                                {overflowConditional.overflow.primaryRatePerPoint}%{' '}
                                {STAT_TYPE_SHORT_LABELS[overflowConditional.overflow.primaryStat] || overflowConditional.overflow.primaryStat}{' '}
                                per point until it hits {overflowConditional.overflow.capPercent}%, then +
                                {overflowConditional.overflow.secondaryRatePerPoint}%{' '}
                                {STAT_TYPE_SHORT_LABELS[overflowConditional.overflow.secondaryStat] || overflowConditional.overflow.secondaryStat}{' '}
                                per remaining point
                                {overflowConditional.suspicious && ' — ⚠️ AI-extracted values look off, verify manually'}
                              </label>
                            </div>
                          )}
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
                      )}

                      {allConditionals.length > 0 && (
                        <div className="compare-form-row">
                          <span className="calc-inline-label">Conditional bonuses (apply across the whole rotation)</span>
                        </div>
                      )}

                      {aiConditionals
                        .filter((c) => c.statType !== 'STAT_OVERFLOW_SPLIT' && c !== linkedTraceConditional && !isDuplicatePerHitTargetConditional(c, multiHitAbilityNames, perHitStackingBonus))
                        .map((c) => (
                          <div key={c.name} className="compare-form-row ai-conditional-row">
                            <div>
                              <span className="calc-inline-label">
                                {c.name} <ConditionalHelpTooltip c={c} />{' '}
                                <span className="conditional-stat-type-tag">{c.statType}</span>
                              </span>
                              <p className="compare-ocr-note ai-disclaimer">
                                ⚠️ AI-extracted — {c.trigger} — verify against current patch
                              </p>
                              {c.suspicious && (
                                <p className="compare-ocr-note compare-ocr-note-warn">
                                  ⚠️ Sanitizer flagged as suspicious: {c.suspiciousNote}
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

                      {manualConditionals
                        .filter((c) => c.statType !== 'STAT_OVERFLOW_SPLIT' && c !== linkedTraceConditional && !isDuplicatePerHitTargetConditional(c, multiHitAbilityNames, perHitStackingBonus))
                        .map((c) => (
                          <div key={c.name} className="compare-form-row ai-conditional-row">
                            <div>
                              <span className="calc-inline-label">
                                {c.name} <ConditionalHelpTooltip c={c} />
                              </span>
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
                        <div className="compare-weight-row">
                          <span>Enemies hit</span>
                          <input
                            type="number"
                            min="1"
                            max={MAX_BATTLEFIELD_ENEMIES}
                            value={calcEnemyCount}
                            onChange={(e) =>
                              setCalcEnemyCount(Math.min(MAX_BATTLEFIELD_ENEMIES, Math.max(1, Number(e.target.value) || 1)))
                            }
                          />
                        </div>
                      </div>

                      <div className="compare-form-row">
                        <span className="calc-inline-label">Rotation</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) addRotationRow(e.target.value);
                          }}
                        >
                          <option value="">+ Add ability to rotation...</option>
                          {dedupedSelectableIds.map((id) => {
                            const s = characterSkills[id];
                            return (
                              <option key={id} value={id}>
                                {s.type_text ? `${s.type_text}: ` : ''}
                                {s.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {rotationRows.length === 0 && (
                        <p className="compare-ocr-note">
                          Add abilities above to build a rotation. Total damage is the sum of every row, each
                          counted the number of times it actually happens in one rotation — not necessarily
                          once per cast (e.g. a proc effect gated behind an ally's action, like Silver Wolf
                          LV.999's "Top Loot Box", should have its own row with your expected trigger count,
                          separate from her Ultimate).
                        </p>
                      )}

                      {rotationRows.map((row) => {
                        const meta = getRowMeta(row);
                        const rowResult = perRow.find((r) => r.id === row.id);

                        return (
                          <div key={row.id} className="rotation-row">
                            <div className="compare-form-row">
                              <select
                                value={row.skillId}
                                onChange={(e) => handleRotationRowSkillChange(row.id, e.target.value)}
                              >
                                {dedupedSelectableIds.map((id) => {
                                  const s = characterSkills[id];
                                  return (
                                    <option key={id} value={id}>
                                      {s.type_text ? `${s.type_text}: ` : ''}
                                      {s.name}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                type="button"
                                className="compare-remove-btn"
                                onClick={() => removeRotationRow(row.id)}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="compare-form-row">
                              <label className="calc-inline-label">
                                Label
                                <input
                                  type="text"
                                  value={row.label}
                                  onChange={(e) => updateRotationRow(row.id, { label: e.target.value, labelIsCustom: true })}
                                />
                              </label>
                              <label className="calc-inline-label">
                                ×/rotation
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.countPerRotation}
                                  onChange={(e) =>
                                    updateRotationRow(row.id, { countPerRotation: Math.max(0, Number(e.target.value) || 0) })
                                  }
                                />
                              </label>
                            </div>

                            {meta.hasTurnPositionSelector && (
                              <div className="compare-form-row">
                                <span className="calc-inline-label">
                                  {meta.isBreathAbility ? 'Cast' : 'Breaths cast this turn'}
                                  {linkedTraceConditional && <ConditionalHelpTooltip c={linkedTraceConditional} />}
                                </span>
                                <select
                                  value={row.activationIndex}
                                  onChange={(e) => updateRotationRow(row.id, { activationIndex: Number(e.target.value) })}
                                >
                                  {Array.from(
                                    { length: meta.isBreathAbility ? breathMaxCasts : breathMaxCasts + 1 },
                                    (_, i) => (
                                      <option key={i} value={i}>
                                        {meta.isBreathAbility ? `Cast ${i + 1}` : i}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}

                            {meta.hasPerHitStackingInput && (
                              <div className="compare-form-row">
                                <span className="calc-inline-label">
                                  {perHitStackingBonus.sourceName} triggers
                                  {meta.perHitStackingConditionals.map((c) => {
                                    const liveValue = getLivePerHitStackingPercent(c, perHitStackingBonus);
                                    const displayConditional =
                                      liveValue != null ? { ...c, valuesByStack: [liveValue] } : c;
                                    return <ConditionalHelpTooltip key={c.name} c={displayConditional} />;
                                  })}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max={perHitStackingBonus.maxTriggers ?? undefined}
                                  value={row.stackingTriggers ?? 0}
                                  onChange={(e) => {
                                    const raw = Math.max(0, Number(e.target.value) || 0);
                                    // Derived from kit text (findMaxTriggerCount)
                                    // rather than a fixed number, so this holds
                                    // up for any future character with the same
                                    // "X can be triggered repeatedly, up to N
                                    // time(s)" phrasing, even if N isn't 20.
                                    // Falls back to unbounded if the cap
                                    // couldn't be found in kit text at all.
                                    const clamped =
                                      perHitStackingBonus.maxTriggers != null
                                        ? Math.min(perHitStackingBonus.maxTriggers, raw)
                                        : raw;
                                    updateRotationRow(row.id, { stackingTriggers: clamped });
                                  }}
                                />
                              </div>
                            )}

                            {meta.skill && (
                              <>
                                <div className="compare-form-row">
                                  <label className="calc-inline-label">
                                    Skill Level
                                    <input
                                      type="number"
                                      min="1"
                                      max={meta.skill.max_level}
                                      value={row.skillLevel}
                                      onChange={(e) => handleRotationRowLevelChange(row.id, Number(e.target.value))}
                                    />
                                  </label>
                                </div>

                                <p className="compare-ocr-note">{meta.resolvedDesc}</p>

                                {row.damageSourceName && (
                                  <p className="compare-ocr-note ai-disclaimer">
                                    ℹ️ This ability's own action doesn't deal damage directly — the DMG shown
                                    belongs to a separately-triggered effect, "{row.damageSourceName}". Set
                                    ×/rotation to how many times you expect it to actually trigger, not how many
                                    times you cast this ability.
                                  </p>
                                )}

                                {meta.nonStatScalingLabel ? (
                                  <div className="compare-form-row">
                                    <label className="calc-inline-label">
                                      {meta.nonStatScalingLabel}
                                      <input
                                        type="number"
                                        min="0"
                                        value={row.nonStatValue}
                                        onChange={(e) => updateRotationRow(row.id, { nonStatValue: Number(e.target.value) || 0 })}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <>
                                    {row.scalingStatus === 'loading' && (
                                      <p className="compare-ocr-note">Detecting damage type...</p>
                                    )}
                                    {row.scalingStatus === 'error' && (
                                      <p className="compare-ocr-note compare-ocr-note-warn">
                                        {row.scalingError || "Couldn't reach the detection service"} — pick the
                                        scaling stat manually (defaults to standard damage).
                                      </p>
                                    )}
                                    {row.damageType === DamageType.ELATION ? (
                                      <p className="compare-ocr-note ai-disclaimer">
                                        ⚠️ Elation DMG detected — uses the shared Punchline/Merrymake values
                                        above instead of a scaling stat.
                                      </p>
                                    ) : (
                                      <div className="compare-form-row">
                                        <span className="calc-inline-label">Scaling stat</span>
                                        <select
                                          value={row.scalingStat}
                                          onChange={(e) => updateRotationRow(row.id, { scalingStat: e.target.value })}
                                        >
                                          <option value="">None detected</option>
                                          <option value="ATK">ATK</option>
                                          <option value="DEF">DEF</option>
                                          <option value="HP">HP</option>
                                        </select>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}

                            {rowResult && rowResult.perHit != null && (
                              <p className="damage-calc-result">
                                {row.countPerRotation === 1 ? (
                                  <>≈ <strong>{Math.round(rowResult.perHit).toLocaleString()}</strong> DMG</>
                                ) : (
                                  <>
                                    ≈ <strong>{Math.round(rowResult.perHit).toLocaleString()}</strong> ×{' '}
                                    {row.countPerRotation} = <strong>{Math.round(rowResult.rowTotal).toLocaleString()}</strong> DMG
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {totalRotationDamage != null && rotationRows.length > 0 && (
                        <p className="damage-calc-result damage-calc-total">
                          Total rotation DMG: <strong>{Math.round(totalRotationDamage).toLocaleString()}</strong>
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