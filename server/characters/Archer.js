// Hand-authored kit for Archer. Ability names cross-validated against
// multiple independent wiki/guide sources AND against this app's existing
// conditionals-cache.json entries for him (both "Caladbolg II: Fake Spiral
// Sword" and "Guardian" match verbatim, percentages included) — higher
// confidence than Yaoguang's sources, which contradicted the real kit text
// on at least one value. Multiplier percentages come from the real in-game
// text provided directly, not from these sources.

const characterName = 'Archer';

const abilities = {
  'Basic ATK: Kanshou and Bakuya': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 130,
  },

  // Base 450% — the +120%/+240% Circuit Connection stacking bonus is NOT
  // baked in here. It's already a real conditional in conditionals-cache.json
  // ("Skill Damage Increase in Circuit Connection", DMG_PERCENT, SKILL-
  // scoped), reused below, so it composes naturally through the normal
  // aiDmgPercent path instead of needing to be hardcoded into the base
  // multiplier for each stack level.
  'Skill: Caladbolg II: Fake Spiral Sword': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 450,
  },

  'Ultimate: Unlimited Blade Works': {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 1200,
    // Also grants 2 Charge (max 4) — not modeled, no damage/stat effect.
  },

  // Triggered by an ALLY's attack, not Archer's own turn — structurally
  // similar to Yaoguang's Great Boon in WHO triggers it, but unlike Great
  // Boon this deals Archer's own damage (not a buff to someone else), so
  // it fits the existing FUA ability type cleanly. countPerRotation for
  // this row is a manual estimate of how many times allies actually
  // trigger it (bounded by his max 4 Charge) — same pattern already used
  // for Silver Wolf's Top Loot Box.
  "Talent: Mind's Eye (True)": {
    abilityType: 'FUA',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 250,
  },

  // Real numbers confirmed (200% Quantum AoE, on combat entry, +1 Charge),
  // but the actual ability NAME is unconfirmed — couldn't find it in any
  // source. Left out of the default rotation below (one-time, pre-combat,
  // not part of steady-state DPS) but declared here for completeness in
  // case you want to add it manually later once the name is confirmed.
  'Technique: [NAME UNCONFIRMED]': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 200,
    hitsAllEnemies: true,
  },
};

// Reused directly from conditionals-cache.json — both entries independently
// cross-validated against real kit/trace text just now (exact name and
// percentage matches), so treated as trustworthy rather than re-derived.
const conditionals = [
  {
    name: 'Skill Damage Increase in Circuit Connection',
    appliesToAbility: 'SKILL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Caladbolg II: Fake Spiral Sword',
    statType: 'DMG_PERCENT',
    trigger: 'while in Circuit Connection state, each use of Skill grants a stack increasing Skill damage',
    valuesByStack: [120, 240],
    maxStacks: 2,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  {
    name: 'Guardian',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Guardian',
    statType: 'CRIT_DMG',
    trigger: 'After allies gain a Skill Point, if total Skill Points are 4 or more',
    valuesByStack: [120],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort authored rotation, same caveat as Silver Wolf's — FLAGGED
// FOR REVIEW, not verified against real play. Talent's trigger count in
// particular is a guess; it genuinely depends on ally rotation speed,
// which this calculator has no visibility into from Archer's own page.
const rotation = [
  { abilityName: 'Skill: Caladbolg II: Fake Spiral Sword', countPerRotation: 5 },
  { abilityName: 'Basic ATK: Kanshou and Bakuya', countPerRotation: 1 },
  { abilityName: 'Ultimate: Unlimited Blade Works', countPerRotation: 1 },
  { abilityName: "Talent: Mind's Eye (True)", countPerRotation: 2 },
];

export { characterName, abilities, conditionals, rotation };