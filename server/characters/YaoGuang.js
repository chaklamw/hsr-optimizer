// Hand-authored kit for Yaoguang — DELIBERATELY SCOPED to just Basic ATK
// and Elation Skill, her only two self-contained damage sources. Her
// Skill/Ultimate/Talent and every piece of her signature equipment buff
// OTHER characters, not herself (see prior conversation) — this app has
// no mechanism yet for "buff applies to a different character than the
// one being calculated," so those are intentionally left out entirely
// rather than half-modeled.
//
// REVISION: previously hardcoded to E0-max-level values (126%/42% Basic
// ATK, 125%/5x25% Elation Skill). Those numbers turned out to be real —
// but for higher levels than E0 investment actually reaches (Basic ATK
// Lv.10, Elation Skill Lv.15), not the E0 caps (Lv.6 and Lv.10
// respectively, which are 90%/30% and 100%/5x20%). Re-pulled via
// `dump-character-kit.js --levels` against live StarRailRes data and
// converted to baseMultiplierPercentByLevel arrays, same pattern as
// Silver Wolf LV.999's kit, so the resolver reads Yao Guang's actual
// invested skill levels from skillTreeList instead of assuming max.
//
// Basic ATK's array intentionally stops at 6 — that's not just a display
// cap, the source data itself (skill.params) only has 6 entries, so E0's
// cap of 6 appears to be the character's true ceiling for that ability
// (no further growth to model even if eidolons are added later). Elation
// Skill's array goes to 15 — the full range beyond the Lv.10 E0 cap
// exists in the data, presumably reachable via eidolon investment, so
// it's captured in full now even though this app has no eidolon UI yet.
//
// Zone Elation Boost (in conditionals below) is also now level-resolved
// via valuesByStackPerLevel rather than hardcoded to a single level's
// value — confirmed against Profilepage.jsx's existing
// getConditionalLiveLevel/resolveConditionalValuesByStack mechanism,
// which already supports exactly this case.

const characterName = 'Yao Guang';

const abilities = {
  // Real text: "Deals Physical DMG equal to X% of ATK to one designated
  // enemy and Physical DMG equal to Y% of ATK to targets adjacent to it."
  // Blast pattern — main target takes the higher %, up to 2 adjacent
  // targets each take the lower %, capped by however many enemies
  // actually exist on the field.
  'Basic ATK: Whistlebolt Sings Joy': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Lv.1–6 (E0 cap, confirmed as the true ceiling — source data has no
    // further entries). Was a fixed 126 (the Lv.10 value, unreachable at
    // E0) — now level-aware, max at E0 is 90% (Lv.6).
    baseMultiplierPercentByLevel: [45, 54, 63, 72, 81, 90],
    blastAdjacentMultiplierPercentByLevel: [15, 18, 21, 24, 27, 30],
  },

  // Two real components:
  //  1) "Deals X% Physical Elation DMG to all enemies" — true AoE, no
  //     "split evenly" language, so hitsAllEnemies multiplies by enemy
  //     count rather than dividing.
  //  2) "Then, deals 5 instance(s) of Y% Physical Elation DMG to one
  //     random enemy" — single-target repeated hits, same fixed count
  //     (5) at every level, so only the per-instance % scales.
  //
  // Woe's Whisper (the +16% DMG-taken debuff this ability also applies)
  // is modeled as a conditional below, not here — it's an enemy-state
  // effect, not part of this ability's own damage instance, and its 16%
  // value is flat across all 15 levels in the source data (unlike the
  // damage multipliers), so no per-level array needed for it.
  'Elation Skill: Let Thy Fortune Burst in Flames': {
    abilityType: 'ELATION_SKILL',
    damageType: 'ELATION',
    scalingStat: null,
    damageSourceName: null,
    // Lv.1–15. Was a fixed 125 (the Lv.15 value) — now level-aware, max
    // at E0 is 100% (Lv.10).
    baseMultiplierPercentByLevel: [50, 55, 60, 65, 70, 75, 81, 88, 94, 100, 105, 110, 115, 120, 125],
    hitsAllEnemies: true,
    attachedTriggers: [
      {
        name: 'Let Thy Fortune Burst in Flames (bonus hits)',
        damageType: 'ELATION',
        // Lv.1–15, per-instance value (5 instances fired at every
        // level). Was a fixed 125 total (25 x 5, the Lv.15 value) — now
        // level-aware, max at E0 is 20% per instance (100% total, Lv.10).
        baseMultiplierPercentByLevel: [10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25],
        hitCount: 5,
        averagedAcrossEnemies: false,
      },
    ],
  },
};

const conditionals = [
  {
    name: "Woe's Whisper",
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Let Thy Fortune Burst in Flames',
    statType: 'VULNERABILITY',
    trigger: 'Enemy targets under "Woe\'s Whisper" (applied by Elation Skill, 3 turns) take increased DMG',
    valuesByStack: [16],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Real text (Skill, "Decalight Unveils All" — not itself modeled as a
  // damage row, only used as the source here): "While the Zone is
  // active, increases all allies' Elation by an amount equal to X% of
  // Yao Guang's Elation." She's a member of her own ally list, so this
  // DOES apply to her own Elation Skill damage.
  //
  // Level-scaled (10% at Skill Lv.1 up to 25% at Lv.15, 20% at the Lv.10
  // E0 cap) — resolved live via valuesByStackPerLevel, reading her actual
  // invested Skill level off skillTreeList (Profilepage.jsx's
  // getConditionalLiveLevel / resolveConditionalValuesByStack), same
  // mechanism abilities use via baseMultiplierPercentByLevel. Index 0 =
  // Skill Lv.1. skillMatchName is required here because sourceAbilityName
  // is the bare kit name ("Decalight Unveils All"), while the live-level
  // lookup matches against characterSkills' displayName format
  // ("Skill: Decalight Unveils All").
  {
    name: 'Zone Elation Boost',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Decalight Unveils All',
    skillMatchName: 'Skill: Decalight Unveils All',
    statType: 'ELATION_PERCENT_OF_SELF',
    trigger: "While her own Zone is active (from Skill), increases her Elation by an amount equal to her Skill level's Zone Elation Boost % of her current Elation",
    valuesByStackPerLevel: [
      [10], [11], [12], [13], [14], [15], [16], [18], [19], [20], [21], [22], [23], [24], [25],
    ],
    valuesByStack: [20], // fallback / Lv.10 E0-cap value if per-level resolution can't find a level
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort authored rotation — FLAGGED FOR REVIEW like every other
// character's. Since only 2 of her real abilities are modeled at all, this
// is closer to "how often do you land these two hits" than a full combo.
const rotation = [
  { abilityName: 'Basic ATK: Whistlebolt Sings Joy', countPerRotation: 1 },
  { abilityName: 'Elation Skill: Let Thy Fortune Burst in Flames', countPerRotation: 1 },
  {
    abilityName: 'Let Thy Fortune Burst in Flames (bonus hits)',
    countPerRotation: 1,
    isAttachedTrigger: true,
  },
];

export { characterName, abilities, conditionals, rotation };