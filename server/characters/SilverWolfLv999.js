// Hand-authored KIT definition for Silver Wolf LV.999.
// Replaces both /api/interpret-skill and /api/extract-conditionals for this
// character's own abilities — no Groq calls, no cache lookup. Numbers are
// transcribed directly from the character's actual in-game kit text, not
// carried over from skill-interpretation-cache.json / conditionals-cache.json
// and not copied from Fribbels' hsr-optimizer (their Top Loot Box value,
// 90%, disagreed with the real 113% tooltip text, so treat any future
// cross-referencing against their repo as a structure/shape check only,
// never a source of truth for numbers).
//
// IMPORTANT: this file only contains conditionals that are true of Silver
// Wolf regardless of what she's wearing. Light cone and relic set
// conditionals (Welcome to the Cosmic City, Ever-Glorious Magical Girl,
// Punklorde Stage Zero) live in server/equipment/ instead, keyed by item
// name, and only apply when that gear is actually equipped — see
// server/equipment/*.js. Putting them here would have made them permanent
// facts about Silver Wolf instead of facts about her current loadout.
//
// Matches this app's existing field shapes:
//   - abilities[name] mirrors what /api/interpret-skill used to return
//     (damageType, scalingStat, damageSourceName), plus structural fields
//     this app didn't have before (baseMultiplierPercent, isEnhancedOnly,
//     averagedAcrossEnemies, attachedTriggers).
//   - conditionals is the same array shape as conditionals-cache.json
//     entries, so existing tooltip/rendering logic doesn't need to change.

const characterName = 'Silver Wolf LV.999';

const abilities = {
  'Basic ATK: One Punch!': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Was a fixed 140 (the level-10 value) — now level-aware. Level 6 (max
    // at E0) confirmed as 100% against Alex's own real account tooltip.
    baseMultiplierPercentByLevel: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140],
  },

  'Skill: Trigger Happy': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Was a fixed 200 (the level-15 value) — now level-aware. Level 10
    // (max at E0) is 160%.
    baseMultiplierPercentByLevel: [80, 88, 96, 104, 112, 120, 130, 140, 150, 160, 168, 176, 184, 192, 200],
  },

  // Ultimate itself deals no direct damage — it enters "Godmode Player"
  // and deploys a Zone that enables the enhanced Basic ATK below.
  'Ultimate: God Mode: ON!': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // 100 bounce hits totaling (at max level) 336% ATK as STANDARD damage,
  // split evenly. Separately (not part of that total), every so often the
  // bouncing pauses and triggers "Top Loot Box" — up to 3 times per use.
  // The three differently-named "finisher" abilities (Funky Munch Bean /
  // Kaboom Eggsplosion / Big Flipping Sword) are cosmetic labels for a Top
  // Loot Box trigger and are NOT separate damage sources — their DMG line
  // is identical word-for-word in the real kit text.
  'Basic ATK: Bonus Stage: αWolf Instant': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Was a fixed 336 (the level-10 value) — now level-aware, same level
    // track as One Punch! (both are Basic ATK, governed by the same
    // trace node). Level 6 (max at E0) is 240%.
    baseMultiplierPercentByLevel: [120, 144, 168, 192, 216, 240, 264, 288, 312, 336],
    bounceHitCount: 100,
    isEnhancedOnly: true,
    replacesAbilityName: 'Basic ATK: One Punch!',
    attachedTriggers: [
      {
        name: 'Top Loot Box',
        damageType: 'ELATION',
        // Was a fixed 113 (the level-15 value) — now level-aware. Top Loot
        // Box has its OWN independent level, tracked by the "Elation
        // Skill" trace node — NOT by Basic ATK, even though this
        // particular trigger instance is spawned from a Basic ATK
        // ability. skillMatchName points level resolution at the real
        // ability that actually owns this level track ("Elation Skill:
        // Honkai-DMG Demo") instead of inheriting Bonus Stage's own
        // (unrelated, lower) Basic ATK level. Level 10 (max at E0) is 90%.
        skillMatchName: 'Elation Skill: Honkai-DMG Demo',
        baseMultiplierPercentByLevel: [
          45, 49.5, 54, 58.5, 63, 67.5, 73.12, 78.75, 84.38, 90, 94.5, 99, 103.5, 108, 112.5,
        ],
        averagedAcrossEnemies: true,
        maxTriggersPerUse: 3,
      },
    ],
  },

  // 6 instances of the same Top Loot Box hit, plus resets its trigger
  // chance. Only usable in the enhanced state.
  'Elation Skill: Honkai-DMG Demo': {
    abilityType: 'ELATION_SKILL',
    damageType: 'ELATION',
    scalingStat: null,
    damageSourceName: 'Top Loot Box',
    // Was a fixed 113 (the level-15 value) — now level-aware. Level 10
    // (max at E0) is 90%. Same array as the Top Loot Box trigger above,
    // since this ability IS Top Loot Box's own real level track.
    baseMultiplierPercentByLevel: [45, 49.5, 54, 58.5, 63, 67.5, 73.12, 78.75, 84.38, 90, 94.5, 99, 103.5, 108, 112.5],
    hitCount: 6,
    isEnhancedOnly: true,
    resetsTopLootBoxTrigger: true,
  },
};

// Structural note (not a selectable ability): the 3 finisher labels below
// map onto the single "Top Loot Box" trigger above. Kept here so the
// rotation-row ability selector can fold them into one entry instead of
// listing them as independent Basic ATKs.
const cosmeticAbilityAliases = [
  'Basic ATK: Funky Munch Bean',
  'Basic ATK: Kaboom Eggsplosion',
  'Basic ATK: Big Flipping Sword',
].map((name) => ({ name, resolvesTo: 'Top Loot Box' }));

const conditionals = [
  {
    name: 'Hidden MMR to Crit conversion',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Talent',
    statType: 'STAT_OVERFLOW_SPLIT',
    trigger:
      'Each point of Hidden MMR increases CRIT Rate by 0.50% until CRIT Rate reaches 100%, then each additional point increases CRIT DMG by 1.00%',
    valuesByStack: [],
    maxStacks: 0,
    overflow: {
      resourceLabel: 'Hidden MMR',
      primaryStat: 'CRIT_RATE',
      primaryRatePerPoint: 0.5,
      capPercent: 100,
      secondaryStat: 'CRIT_DMG',
      secondaryRatePerPoint: 1,
    },
    suspicious: false,
    suspiciousNote: '',
  },

  {
    name: 'False Ending Speedrun (SPD → Elation)',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Trace: False Ending Speedrun',
    statType: 'ELATION_PERCENT_SPD_THRESHOLD',
    trigger:
      'When SPD is 160 or higher, increases Elation by 50%. For every 1 SPD exceeded, increases Elation by 2%, up to a max of 100 excess SPD taken into account.',
    valuesByStack: [],
    maxStacks: 0,
    spdThreshold: {
      baseSpd: 160,
      basePercent: 50,
      spdPerUnit: 1,
      elationPercentPerUnit: 2,
      maxExcessSpd: 100,
    },
    suspicious: false,
    suspiciousNote: '',
  },

  // Deliberately dropped: the old cache's "Hidden MMR DMG Boost"
  // (15%/30% per 60 Hidden MMR) doesn't appear anywhere in the real kit,
  // relic, or light cone text pulled for this character. Likely a Groq
  // misattribution from the old extraction pipeline — omitted rather than
  // carried forward without a source to verify it against.
];

// Best-effort authored rotation, NOT copied from Fribbels' comboTurnAbilities
// (their turn-by-turn notation depends on their own combat-simulation engine
// internals I don't have visibility into, and per the earlier Top Loot Box
// value mismatch, their numbers aren't automatically trustworthy anyway).
// Built instead from what the real kit text actually states:
//   - Trigger Happy x3: generates Punchline/Hidden MMR to reach and sustain
//     the 60-point Ult threshold
//   - Bonus Stage x1: one full enhanced-state activation (336% ATK bounce)
//   - Top Loot Box x3: its own stated cap ("can trigger up to 3 times") per
//     Bonus Stage use
//   - Elation Skill x2: placeholder count — needs real validation
// FLAGGED FOR REVIEW: this is a guess at relative frequency, not a verified
// combo. Please correct countPerRotation values against actual play before
// trusting totals from this.
const rotation = [
  { abilityName: 'Skill: Trigger Happy', countPerRotation: 3 },
  { abilityName: 'Basic ATK: Bonus Stage: αWolf Instant', countPerRotation: 1 },
  { abilityName: 'Top Loot Box', countPerRotation: 3, isAttachedTrigger: true },
  { abilityName: 'Elation Skill: Honkai-DMG Demo', countPerRotation: 2 },
];

export { characterName, abilities, cosmeticAbilityAliases, conditionals, rotation };