// Hand-authored kit for Sparxie, drafted from a terminal ability dump (14
// entries) rather than raw StarRailRes JSON. Two entries in that dump were
// TRUNCATED mid-sentence by whatever printed them, and are flagged below
// rather than guessed at:
//   - Talent "Sleight of Sparx Hand": cuts off mid-description of the
//     Ultimate's Certified Banger bonus damage ("...deals 60% Fire Elation
//     DMG to all ene...").
//   - Light Cone Passive "Dazzled by a Flowery World": cuts off mid-
//     description ("...up to a max increase of 3... If 4 or more S...").
//     This is equipment, not part of Sparxie's own kit — belongs in
//     server/equipment/, NOT written here, same rule as every other
//     character file. Not authored at all yet since the text is incomplete.
//
// The 2pc/4pc Ever-Glorious Magical Girl and 2pc Tengoku@Livestream entries
// in the same dump were cross-checked against this app's existing
// server/equipment/EverGloriousMagicalGirl.js and TengokuLivestream.js —
// both match exactly, no changes needed there.
//
// ALL SCHEMA GAPS RESOLVED. Both Traces are now fully modeled: Frenzy!
// Palette of Truth and Lies via STAT_OVERFLOW_SPLIT (Punchline is a real
// in-battle resource counter, same category as Silver Wolf's Hidden MMR),
// and Sweet! Punchline Signing via the new ELATION_PERCENT_ATK_THRESHOLD
// statType (a live-stat threshold conversion, added specifically since it
// reads Sparxie's own ATK directly rather than a resource-point count).
//
// FIXED: the Ultimate's "(0.6 x Elation% + 60%) of ATK" multiplier now
// scales correctly via the new multiplierPerElationPercent ability field,
// wired through computeScenarioTotalDamage in Profilepage.jsx.

const characterName = 'Sparxie';

const abilities = {
  'Basic ATK: Cat Got Your Flametongue?': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 140,
    // Replaced by the enhanced version below once "Boom! Sparxicle's
    // Poppin'" (Skill) starts the livestream — same isEnhancedOnly /
    // replacesAbilityName pattern as Silver Wolf's Bonus Stage.
  },

  // No direct damage — starts the livestream (enables the enhanced Basic
  // ATK below) and triggers "Engagement Farming" once. Real text notes
  // "using this ability is not considered as using a Skill" — an SP-
  // tracking quirk this app doesn't model (no SP-consumption tracking),
  // noted here only for completeness.
  "Skill: Boom! Sparxicle's Poppin'": {
    abilityType: 'SKILL',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Real text: "Deals Fire DMG equal to (0.6 x Elation + 60.0%) of
  // Sparxie's ATK to all enemies." STANDARD Fire DMG scaling off ATK (not
  // the separate Elation-DMG track) — the multiplier itself grows with her
  // current Elation stat. Now modeled via multiplierPerElationPercent,
  // added by computeScenarioTotalDamage in Profilepage.jsx (reads the same
  // live-fetched Elation value the ELATION_PERCENT_OF_SELF conditional
  // type already uses).
  "Ultimate: Party's Wildin' and Camera's Rollin'": {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 60,
    multiplierPerElationPercent: 0.6,
    hitsAllEnemies: true,
  },

  // No direct damage of its own — a passive condition ("while Sparxie
  // holds Certified Banger") that changes what Enhanced Basic ATK and
  // Ultimate deal. The actual bonus damage is modeled via the
  // "(Certified Banger)" ability variants below + their conditionals,
  // same pattern as Castorice's Ultimate/Talent stubs for a non-damage
  // trigger ability.
  //
  // Values confirmed at max level (level 10, the actual in-game cap) as
  // 40%/20%/20% main/adjacent/per-instance and 48% for the Ultimate
  // bonus. An earlier paste showed 50%/25%/25%/60% at level 15, which
  // isn't reachable in-game — that was this app's own optimizer tool
  // defaulting past the real max, not a genuine kit discrepancy.
  'Talent: Sleight of Sparx Hand': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  "Ultimate: Party's Wildin' and Camera's Rollin' (Certified Banger)": {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 60,
    multiplierPerElationPercent: 0.6,
    hitsAllEnemies: true,
    isEnhancedOnly: true,
    replacesAbilityName: "Ultimate: Party's Wildin' and Camera's Rollin'",
    attachedTriggers: [
      {
        name: 'Sleight of Sparx Hand (Certified Banger Ultimate bonus)',
        damageType: 'ELATION',
        baseMultiplierPercent: 48,
        hitsAllEnemies: true,
      },
    ],
    suspicious: false,
    suspiciousNote: '',
  },

  // Pre-combat, one-time AoE — same treatment as Archer's unconfirmed
  // Technique (real numbers known, left out of the default rotation since
  // it's not a repeatable steady-state damage source). No dedicated
  // TECHNIQUE AbilityType flag exists in damageCalculator.js yet, so
  // 'BASIC' is used as a placeholder, same as Archer's technique entry.
  'Technique: Content Monetization': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 50,
    hitsAllEnemies: true,
    // Also recovers 2 Skill Points for allies — resource effect, not
    // modeled, same rule as every other non-damage side-effect in this app.
  },

  // Enhanced Basic ATK. Blast pattern per real text: 140% main + 70%
  // adjacent. isEnhancedOnly + replacesAbilityName mirror Silver Wolf's
  // Bonus Stage pattern exactly. Note: this exact ability is the one
  // Profilepage.jsx's own conditionalAppliesToSkill comment already
  // anticipates by name (shares type_text "Basic ATK" with the
  // un-enhanced version) — restrictedToAbilityName below is why that
  // field exists.
  'Basic ATK: Bloom! Winner Takes All': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 140,
    blastAdjacentMultiplierPercent: 70,
    isEnhancedOnly: true,
    replacesAbilityName: 'Basic ATK: Cat Got Your Flametongue?',
  },

  // Third-tier enhanced state: same base Fire Standard DMG as plain
  // "Bloom! Winner Takes All" above, PLUS additional Elation DMG from the
  // Talent while "Certified Banger" is held — modeled as attachedTriggers
  // rather than folded into the base entry since it's a genuinely separate
  // damage instance/type, not a modifier on the existing hit (same
  // reasoning as Castorice's Boneclaw main-hit + Netherwing-hit split).
  //
  // State-gating: confirmed this uses the SAME (and only) mechanism every
  // enhanced-state ability in this app has ever used — isEnhancedOnly and
  // replacesAbilityName are documentation-only fields, not read anywhere in
  // Profilepage.jsx. The rotation array is a flat list of ability-name
  // strings looked up directly (result.abilities[entry.abilityName]); there
  // is no runtime concept of "which state is currently active." Silver
  // Wolf's Bonus Stage and Castorice's Boneclaw already rely entirely on
  // you picking the correct ability name for the rotation you're building —
  // this third-tier variant does the same, nothing new or less-proven
  // about it despite the extra nesting.
  'Basic ATK: Bloom! Winner Takes All (Certified Banger)': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 140,
    blastAdjacentMultiplierPercent: 70,
    isEnhancedOnly: true,
    replacesAbilityName: 'Basic ATK: Cat Got Your Flametongue?',
    attachedTriggers: [
      {
        name: 'Sleight of Sparx Hand (Certified Banger main hit)',
        damageType: 'ELATION',
        baseMultiplierPercent: 40,
        averagedAcrossEnemies: false,
      },
      {
        name: 'Sleight of Sparx Hand (Certified Banger adjacent hit)',
        damageType: 'ELATION',
        baseMultiplierPercent: 20,
        averagedAcrossEnemies: false,
        // attachedTriggers has no native "adjacent-target-only" concept
        // (only hitsAllEnemies/averagedAcrossEnemies) — represented as its
        // own single-target-style instance since that's the closest fit,
        // flagged since it doesn't perfectly capture "adjacent targets
        // only, not the main target."
      },
      {
        name: 'Sleight of Sparx Hand (per Engagement Farming instance)',
        damageType: 'ELATION',
        baseMultiplierPercent: 20,
        averagedAcrossEnemies: false,
        // Real text: "for every 1 instance of Engagement Farming
        // triggered, deals 1 extra instance of 20% Elation DMG" — count is
        // VARIABLE (however many Engagement Farming procs are active when
        // this is used), not a fixed number. This single entry represents
        // ONE such instance; you'll need to manually multiply via
        // countPerRotation in the rotation row (or repeat this trigger)
        // to reflect how many procs you're assuming, same style as
        // Archer's Talent needing a manual trigger-count estimate.
      },
    ],
    suspicious: true,
    suspiciousNote:
      'State-gating is resolved (uses the same manual-rotation-selection approach as every other enhanced state in this app). Two smaller open items remain: the adjacent-hit trigger above doesn\'t have a native "adjacent-only" targeting concept, and the per-Engagement-Farming-instance trigger represents one instance, not the variable real count.',
  },

  // No direct damage — the proc source for the DMG_PERCENT stacks that
  // buff "Bloom! Winner Takes All" (see conditionals below). Real text:
  // "using this ability is not considered as using a Skill" — same
  // untracked SP quirk as "Boom! Sparxicle's Poppin'". Also grants random
  // Punchline/Skill Point gifts — resource effect, not modeled.
  'Skill: Engagement Farming': {
    abilityType: 'SKILL',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Real text: main AoE hit (62.5%, true "all enemies" language) + 20
  // additional single-target instances at 31.3% each. Bonus hits baked
  // into one flat total via attachedTriggers, same pattern as Yao Guang's
  // Let Thy Fortune Burst in Flames (25% x 5 there; 31.3% x 20 here).
  "Elation Skill: Signal Overflow: The Great Encore!": {
    abilityType: 'ELATION_SKILL',
    damageType: 'ELATION',
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 62.5,
    hitsAllEnemies: true,
    attachedTriggers: [
      {
        name: 'Signal Overflow: The Great Encore! (bonus hits)',
        damageType: 'ELATION',
        baseMultiplierPercent: 626, // 31.3% x 20 instances, single target
        averagedAcrossEnemies: false,
      },
    ],
    // Also grants 2 "Thrill" points (offsets future SP consumption) —
    // resource effect, not modeled.
  },
};

const conditionals = [
  // Real text: "Causes 'Bloom! Winner Takes All' to increase the DMG
  // multiplier against one designated enemy by 25.0% and the DMG
  // multiplier against adjacent targets by 12.5%." Two DIFFERENT
  // percentages for the main hit vs. the adjacent (blast) hit of the SAME
  // ability — now split into two conditionals using restrictedToBlastPortion
  // ('MAIN'/'ADJACENT'), the mechanism added to computeScenarioTotalDamage
  // in Profilepage.jsx to support exactly this case. A conditional that
  // omits this field (every one authored before this fix) still applies to
  // both portions unchanged.
  {
    name: 'Engagement Farming DMG stacks (main)',
    appliesToAbility: 'BASIC',
    restrictedToAbilityName: 'Bloom! Winner Takes All',
    restrictedToBlastPortion: 'MAIN',
    sourceAbilityName: 'Engagement Farming',
    statType: 'DMG_PERCENT',
    trigger: 'Each "Engagement Farming" trigger increases "Bloom! Winner Takes All" main-target DMG by 25%, up to 20 stacks (the Skill\'s own stated trigger cap)',
    valuesByStack: Array.from({ length: 20 }, (_, i) => 25 * (i + 1)),
    maxStacks: 20,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  {
    name: 'Engagement Farming DMG stacks (adjacent)',
    appliesToAbility: 'BASIC',
    restrictedToAbilityName: 'Bloom! Winner Takes All',
    restrictedToBlastPortion: 'ADJACENT',
    sourceAbilityName: 'Engagement Farming',
    statType: 'DMG_PERCENT',
    trigger: 'Each "Engagement Farming" trigger increases "Bloom! Winner Takes All" adjacent-target DMG by 12.5%, up to 20 stacks (the Skill\'s own stated trigger cap)',
    valuesByStack: Array.from({ length: 20 }, (_, i) => 12.5 * (i + 1)),
    maxStacks: 20,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },

  // Real text: "For every 1 Punchline currently owned, increases all
  // allies' CRIT DMG by 8%, up to a max increase of 80%." Team-wide, but
  // Sparxie is one of her own allies — self-applicable without needing
  // cross-character modeling, same principle as Yao Guang's Zone and
  // Castorice's Memosprite Talent buff. Punchline is a real in-battle
  // resource counter (same category as Silver Wolf's Hidden MMR), so this
  // reasonably fits the existing STAT_OVERFLOW_SPLIT shape with no
  // secondary stat.
  {
    name: 'Frenzy! Palette of Truth and Lies',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Frenzy! Palette of Truth and Lies',
    statType: 'STAT_OVERFLOW_SPLIT',
    trigger: 'Always active while equipped — scales with current Punchline count, self-applicable',
    valuesByStack: [],
    maxStacks: 0,
    overflow: {
      resourceLabel: 'Punchline',
      primaryStat: 'CRIT_DMG',
      primaryRatePerPoint: 8,
      capPercent: 80,
      secondaryStat: null,
      secondaryRatePerPoint: 0,
    },
    suspicious: false,
    suspiciousNote: '',
  },

  // Real text: "For every 100 of Sparxie's ATK that exceeds 2000,
  // increases this unit's Elation by 5.0%, up to a maximum increase of
  // 80.0%." Now modeled via ELATION_PERCENT_ATK_THRESHOLD, a new statType
  // added specifically for this shape — a live-stat threshold conversion,
  // distinct from STAT_OVERFLOW_SPLIT's in-battle resource-counter model.
  // Reads the character's own live ATK stat directly rather than a
  // manually-entered resource value.
  {
    name: 'Sweet! Punchline Signing',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Sweet! Punchline Signing',
    statType: 'ELATION_PERCENT_ATK_THRESHOLD',
    trigger: 'Always active (Trace, not equipment) — for every 100 ATK above 2000, +5% Elation, capped at +80%',
    valuesByStack: [],
    maxStacks: 0,
    overflow: null,
    atkThreshold: {
      baseAtk: 2000,
      atkPerUnit: 100,
      elationPercentPerUnit: 5,
      capPercent: 80,
    },
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort rotation — FLAGGED FOR REVIEW like every other character.
// Not yet including the Certified Banger bonus hits (Talent) since that
// mechanic isn't authored above pending the untruncated text.
const rotation = [
  { abilityName: "Skill: Boom! Sparxicle's Poppin'", countPerRotation: 1 },
  {
    abilityName: 'Skill: Engagement Farming',
    countPerRotation: 1,
    // countPerRotation is functionally inert for this row (it deals no
    // damage of its own — dealsNoDirectDamage: true) — the real "how many
    // times did this trigger" count lives here instead, since that's what
    // actually drives the DMG% bonus on Bloom! Winner Takes All's row.
    stackingTriggers: 3,
  },
  { abilityName: 'Basic ATK: Bloom! Winner Takes All', countPerRotation: 1 },
  { abilityName: "Ultimate: Party's Wildin' and Camera's Rollin'", countPerRotation: 1 },
  { abilityName: "Elation Skill: Signal Overflow: The Great Encore!", countPerRotation: 1 },
  {
    abilityName: 'Signal Overflow: The Great Encore! (bonus hits)',
    countPerRotation: 1,
    isAttachedTrigger: true,
  },
];

export { characterName, abilities, conditionals, rotation };