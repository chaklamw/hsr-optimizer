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

  // Authored as 3 separate cast tiers (0/1/2 Circuit Connection stacks)
  // rather than one entry + a generic DMG_PERCENT stacking conditional —
  // same pattern already used for Castorice's escalating-multiplier
  // ability. The generic conditional-stacking path resolves a self-
  // referential conditional's stack count from the ability's TOTAL trigger
  // count for the whole rotation (rowDrivenCount in resolveConditionalStacks),
  // capped at maxStacks — meaning every one of the 5 Skill casts in a
  // rotation would get treated as already at the 2-stack cap, including
  // the very first cast, which should have 0. Baking each tier's stacking
  // bonus directly into its own baseMultiplierPercentByLevel sidesteps
  // that entirely: each tier is its own row with its own count, so 1 cast
  // at 0 stacks + 1 at 1 stack + 3 at the capped 2 stacks models the real
  // 5-cast escalation instead of guessing an aggregate.
  'Skill: Caladbolg II: Fake Spiral Sword': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // 0 stacks (first cast in Circuit Connection). Level 10 (max at E0) is
    // 360% — same as the ability's own base value, unmodified.
    baseMultiplierPercentByLevel: [
      180, 198, 216, 234, 252, 270, 292.5, 315, 337.5, 360, 378, 396, 414, 432, 450,
    ],
  },

  'Skill: Caladbolg II: Fake Spiral Sword (1 Stack)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Points level resolution at the real ability, since this dictionary
    // key doesn't match characterSkills' own name.
    skillMatchName: 'Skill: Caladbolg II: Fake Spiral Sword',
    // Base multiplier x (1 + per-stack bonus), both level-dependent. Level
    // 10 (max at E0) is 720% (360% base x 2).
    baseMultiplierPercentByLevel: [
      288, 324.72, 362.88, 402.48, 443.52, 486, 541.125, 598.5, 658.125, 720, 771.12, 823.68, 877.68, 933.12, 990,
    ],
  },

  'Skill: Caladbolg II: Fake Spiral Sword (2 Stacks)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    skillMatchName: 'Skill: Caladbolg II: Fake Spiral Sword',
    // Base multiplier x (1 + 2x per-stack bonus), capped here since Circuit
    // Connection stacks no higher than 2. Level 10 (max at E0) is 1080%
    // (360% base x 3).
    baseMultiplierPercentByLevel: [
      396, 451.44, 509.76, 570.96, 635.04, 702, 789.75, 882, 978.75, 1080, 1164.24, 1251.36, 1341.36, 1434.24, 1530,
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
// real kit/trace text (exact name match).
//
// The Circuit Connection stacking conditional that used to live here is
// gone — it's now baked directly into the 3 tiered Skill entries above
// instead (see the comment there for why).
const conditionals = [
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
//
// The 5 Circuit Connection Skill casts are split across the 3 stack tiers
// (1 at 0 stacks, 1 at 1 stack, 3 at the capped 2 stacks) to model the
// real escalation instead of one row with a flat count — see the tiered
// ability entries above.
const rotation = [
  { abilityName: 'Skill: Caladbolg II: Fake Spiral Sword', countPerRotation: 1 },
  { abilityName: 'Skill: Caladbolg II: Fake Spiral Sword (1 Stack)', countPerRotation: 1 },
  { abilityName: 'Skill: Caladbolg II: Fake Spiral Sword (2 Stacks)', countPerRotation: 3 },
  { abilityName: 'Basic ATK: Kanshou and Bakuya', countPerRotation: 1 },
  { abilityName: 'Ultimate: Unlimited Blade Works', countPerRotation: 1 },
  { abilityName: "Talent: Mind's Eye (True)", countPerRotation: 2 },
];

export { characterName, abilities, conditionals, rotation };