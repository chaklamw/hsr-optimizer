// Hand-authored kit for Archer. Ability names cross-validated against
// multiple independent wiki/guide sources AND against this app's existing
// conditionals-cache.json entries for him (both "Caladbolg II: Fake Spiral
// Sword" and "Guardian" match verbatim, percentages included) — higher
// confidence than Yaoguang's sources, which contradicted the real kit text
// on at least one value.
//
// Multiplier percentages are level-aware (baseMultiplierPercentByLevel),
// sourced directly from StarRailRes's character_skills.json params arrays
// rather than a single fixed number — the previous version of this file
// used fixed values that all turned out to match level 15 (or level 9,
// Basic ATK's absolute max) rather than the account's actual E0-achievable
// level (Basic ATK 6, Skill/Ultimate/Talent 10). Same underlying issue
// found and fixed on Silver Wolf LV.999; this is the second character in a
// row where every value matched max level instead of live level, so the
// same recheck is worth doing on any other previously-authored character.
//
// Technique's real name is now confirmed as "Clairvoyance" (previously
// authored as "[NAME UNCONFIRMED]").

const characterName = 'Archer';

const abilities = {
  'Basic ATK: Kanshou and Bakuya': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // 9 levels total (this ability's own absolute max, not the usual 10) —
    // level 6 (max at E0) is 100%.
    baseMultiplierPercentByLevel: [50, 60, 70, 80, 90, 100, 110, 120, 130],
  },

  // Base multiplier only — the +100%(Lv15)/scales-by-level Circuit
  // Connection stacking bonus is NOT baked in here. It's a separate
  // conditional below (DMG_PERCENT, SKILL-scoped) so it composes through
  // the normal aiDmgPercent path instead of needing per-stack-per-level
  // multipliers hardcoded into the base value.
  'Skill: Caladbolg II: Fake Spiral Sword': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Level 10 (max at E0) is 360%.
    baseMultiplierPercentByLevel: [
      180, 198, 216, 234, 252, 270, 292.5, 315, 337.5, 360, 378, 396, 414, 432, 450,
    ],
  },

  'Ultimate: Unlimited Blade Works': {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Level 10 (max at E0) is 1000%.
    baseMultiplierPercentByLevel: [
      600, 640, 680, 720, 760, 800, 850, 900, 950, 1000, 1040, 1080, 1120, 1160, 1200,
    ],
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
    // Level 10 (max at E0) is 200%.
    baseMultiplierPercentByLevel: [
      100, 110, 120, 130, 140, 150, 162.5, 175, 187.5, 200, 210, 220, 230, 240, 250,
    ],
  },

  // Name confirmed as "Clairvoyance" — single-tier (Techniques aren't
  // leveled via materials or traces), so no per-level array needed.
  'Technique: Clairvoyance': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 200,
    hitsAllEnemies: true,
    // Also grants 1 Charge on entering combat — not modeled, no
    // damage/stat effect.
  },
};

// Reused directly from conditionals-cache.json, cross-validated against
// real kit/trace text (exact name match on both), but their percentages
// had the same max-level-not-live-level issue as the abilities above —
// corrected to the E0/level-10 value below.
const conditionals = [
  {
    name: 'Skill Damage Increase in Circuit Connection',
    appliesToAbility: 'SKILL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Caladbolg II: Fake Spiral Sword',
    statType: 'DMG_PERCENT',
    trigger: 'while in Circuit Connection state, each use of Skill grants a stack increasing Skill damage',
    // Was [120, 240] (the level-15 value) — level 10 (max at E0) is
    // [100, 200]. NOT level-aware yet (this conditional type doesn't have
    // a per-level array mechanism the way abilities' baseMultiplierPercent
    // now does) — if Skill's level ever changes, this needs updating by
    // hand until that gets built out.
    valuesByStack: [100, 200],
    maxStacks: 2,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  {
    name: 'Guardian',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    // "Trace: " prefix gates this on whether the Guardian trace node is
    // actually unlocked on the account (via character.skillTreeList),
    // same convention introduced for Silver Wolf's False Ending Speedrun
    // — this wasn't gated before, meaning it would have applied even if
    // unallocated.
    sourceAbilityName: 'Trace: Guardian',
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