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
// Neither Trace shows per-level scaling in dump-character-kit.js --levels
// output (Traces only ever print a single Lv.1 entry, unlike Skills/
// Ultimate/Talent/Elation Skill) — no per-level conversion needed for
// either, unlike everything else in this file.
//
// REVISION: previously hardcoded every multiplier to its Lv.10/Lv.15
// value (whichever this ability's real in-game cap is), same mistake as
// Yao Guang's kit before its own per-level conversion. Re-pulled via
// dump-character-kit.js --levels and converted to baseMultiplierPercentByLevel
// arrays throughout, so the resolver reads Sparxie's actual invested skill
// levels from skillTreeList instead of assuming max.
//
// Two REAL BUGS found and fixed during this conversion, not just missing
// per-level arrays:
//   1. The "Engagement Farming DMG stacks" conditionals (main + adjacent)
//      were hardcoded to 25%/12.5% PER STACK — the Lv.15 value for that
//      Skill, unreachable without eidolons. The real E0 cap (Lv.10) is
//      20%/10% per stack. Fixed via valuesByStackPerLevel (a 2D array:
//      one per-stack array per Skill level), the same live-level
//      resolution mechanism Yao Guang's Zone Elation Boost conditional
//      uses, extended here to the per-STACK case since maxStacks is 20
//      here rather than 1.
//   2. Signal Overflow's bonus-hit trigger baked a single flat total
//      (626 = 31.3% x 20 instances) with no level awareness at all —
//      the Lv.15 total, not Lv.10's (500 = 25% x 20). Fixed by computing
//      a baseMultiplierPercentByLevel array of PER-LEVEL TOTALS (each
//      level's per-instance % x 20), matching this file's own established
//      convention of baking multi-hit totals into one number rather than
//      a per-instance value + hitCount — the latter field was never
//      confirmed to actually be read by Profilepage.jsx's attachedTrigger
//      resolution (Yao Guang's kit uses a hitCount field on its own bonus-
//      hits trigger that has the same unverified status — worth checking
//      that too, and converting it to this same baked-total convention if
//      hitCount turns out not to be consumed anywhere).
//
// Basic ATK-type abilities (Cat Got Your Flametongue?, Bloom! Winner
// Takes All) use the FULL Lv.1-10 array from the dump, not truncated to
// Lv.6 — Lv.6 is the real E0 investment cap (confirmed for Basic ATK
// generally), but the underlying data genuinely has entries through
// Lv.10, same as every other ability type having entries beyond its own
// E0 cap. The live account's actual invested level will never exceed
// what's really reachable, so storing the full array only future-proofs
// for eidolon investment, the same reasoning already applied to every
// Skill/Ultimate/Talent/Elation-Skill array in this file.
//
// FIXED (pre-existing, unrelated to per-level work): the Ultimate's
// "(0.6 x Elation% + 60%) of ATK" multiplier scales via the
// multiplierPerElationPercent ability field, wired through
// computeScenarioTotalDamage in Profilepage.jsx. The 0.6 coefficient
// itself does not scale by level (the dump's per-level text always reads
// "0.6 x Elation" at every level, only the flat +X% term changes), so it
// stays a single flat value, not an array.
//
// Talent-driven attachedTriggers (the three Certified Banger Basic ATK
// bonus hits + the Certified Banger Ultimate bonus) all read the TALENT's
// own invested level via skillMatchName, not the parent Basic ATK/
// Ultimate ability's level — same pattern as Silver Wolf's Top Loot Box
// trigger pointing at "Elation Skill: Honkai-DMG Demo" instead of
// inheriting Bonus Stage's own Basic ATK level.

const characterName = 'Sparxie';

// Per-level bonus-hit rate the Talent ("Sleight of Sparx Hand") grants
// per Engagement Farming instance — happens to be numerically identical
// to the Talent's own "adjacent target" rate at every level (confirmed by
// cross-checking each level's dump text), so both use this same array.
const talentAdjacentAndPerInstanceRateByLevel = [
  10, 11, 12, 13, 14, 15, 16.3, 17.5, 18.8, 20, 21, 22, 23, 24, 25,
];

// Per-instance rate for Signal Overflow's 20 bonus hits, baked into a
// per-level TOTAL (rate x 20) below rather than exposed as a raw per-
// instance value — see the file-header note on why baked totals are used
// instead of a hitCount field.
const signalOverflowBonusPerInstanceRateByLevel = [
  12.5, 13.8, 15, 16.3, 17.5, 18.8, 20.3, 21.9, 23.4, 25, 26.3, 27.5, 28.7, 30, 31.3,
];

// Per-stack DMG_PERCENT rate Engagement Farming grants to "Bloom! Winner
// Takes All", per Skill level — see file-header bug note #1. Turned into
// the full 20-stack arrays (per level) via valuesByStackPerLevel below.
const engagementFarmingMainRateByLevel = [
  10, 11, 12, 13, 14, 15, 16.3, 17.5, 18.8, 20, 21, 22, 23, 24, 25,
];
const engagementFarmingAdjacentRateByLevel = [
  5, 5.5, 6, 6.5, 7, 7.5, 8.1, 8.8, 9.4, 10, 10.5, 11, 11.5, 12, 12.5,
];

const abilities = {
  'Basic ATK: Cat Got Your Flametongue?': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Lv.1-10. Was a fixed 140 (the Lv.10 value) — now level-aware. Real
    // E0 investment cap for Basic ATK is Lv.6 (90%... wait, 100% at Lv.6
    // for THIS ability specifically — see per-level array), levels 7-10
    // kept for future eidolon support, matching every other ability's
    // array in this file.
    baseMultiplierPercentByLevel: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140],
    // Replaced by the enhanced version below once "Boom! Sparxicle's
    // Poppin'" (Skill) starts the livestream — same isEnhancedOnly /
    // replacesAbilityName pattern as Silver Wolf's Bonus Stage.
  },

  // No direct damage — starts the livestream (enables the enhanced Basic
  // ATK below) and triggers "Engagement Farming" once. Real text notes
  // "using this ability is not considered as using a Skill" — an SP-
  // tracking quirk this app doesn't model (no SP-consumption tracking),
  // noted here only for completeness. Text is identical at every level
  // (no numeric values to convert).
  "Skill: Boom! Sparxicle's Poppin'": {
    abilityType: 'SKILL',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Real text: "Deals Fire DMG equal to (0.6 x Elation + X%) of Sparxie's
  // ATK to all enemies." STANDARD Fire DMG scaling off ATK (not the
  // separate Elation-DMG track) — the flat term grows with level, the 0.6
  // Elation coefficient does not (confirmed identical across all 15
  // levels in the dump).
  "Ultimate: Party's Wildin' and Camera's Rollin'": {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Lv.1-15. Was a fixed 60 (the Lv.15 value) — now level-aware, max at
    // E0 is 50% (Lv.10).
    baseMultiplierPercentByLevel: [30, 32, 34, 36, 38, 40, 42.5, 45, 47.5, 50, 52, 54, 56, 58, 60],
    multiplierPerElationPercent: 0.6,
    hitsAllEnemies: true,
  },

  // No direct damage of its own — a passive condition ("while Sparxie
  // holds Certified Banger") that changes what Enhanced Basic ATK and
  // Ultimate deal. The actual bonus damage is modeled via the
  // "(Certified Banger)" ability variants below + their conditionals,
  // same pattern as Castorice's Ultimate/Talent stubs for a non-damage
  // trigger ability.
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
    // The "(Certified Banger)" suffix is this app's own naming, not a
    // real distinct skill in StarRailRes data — same Ultimate, just
    // different tooltip text while the state is active. Without this,
    // the rotation-row lookup in Profilepage.jsx tries to match the
    // literal string "...(Certified Banger)" against characterSkills and
    // fails, surfacing as "No matching entry found" once this ability
    // actually gets used as a row's abilityName (via the Certified Banger
    // toggle's auto-swap) rather than just sitting unused in this file.
    skillMatchName: "Ultimate: Party's Wildin' and Camera's Rollin'",
    baseMultiplierPercentByLevel: [30, 32, 34, 36, 38, 40, 42.5, 45, 47.5, 50, 52, 54, 56, 58, 60],
    multiplierPerElationPercent: 0.6,
    hitsAllEnemies: true,
    isEnhancedOnly: true,
    replacesAbilityName: "Ultimate: Party's Wildin' and Camera's Rollin'",
    attachedTriggers: [
      {
        name: 'Sleight of Sparx Hand (Certified Banger Ultimate bonus)',
        damageType: 'ELATION',
        // Lv.1-15, read off the TALENT's own level (this bonus comes from
        // the Talent, not the Ultimate itself) — was a fixed 48 (Lv.10,
        // ironically NOT even this ability's own E0 cap since Talent
        // caps at Lv.10 same as Ultimate, so 48 was actually already
        // correct at E0, just not level-aware for anyone below Lv.10 or
        // any future eidolon investment past it).
        baseMultiplierPercentByLevel: [24, 26, 29, 31, 34, 36, 39, 42, 45, 48, 50, 53, 55, 58, 60],
        skillMatchName: 'Talent: Sleight of Sparx Hand',
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
  // Only has 1 level of data in the dump (Technique abilities don't
  // level up) — no array needed.
  'Technique: Content Monetization': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 50,
    hitsAllEnemies: true,
    // Also recovers 2 Skill Points for allies — resource effect, not
    // modeled.
  },

  // Enhanced Basic ATK. Blast pattern per real text: main + adjacent, both
  // level-scaled. isEnhancedOnly + replacesAbilityName mirror Silver
  // Wolf's Bonus Stage pattern exactly. Note: this exact ability is the
  // one Profilepage.jsx's own conditionalAppliesToSkill comment already
  // anticipates by name (shares type_text "Basic ATK" with the
  // un-enhanced version) — restrictedToAbilityName below is why that
  // field exists. Same Lv.1-10 track as the un-enhanced Basic ATK above
  // (both share type_text "Basic ATK" in the dump, same investment level).
  'Basic ATK: Bloom! Winner Takes All': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercentByLevel: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140],
    blastAdjacentMultiplierPercentByLevel: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
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
    // Same "(Certified Banger)" naming caveat as the Ultimate variant
    // above — not a real distinct skill, needs to match against the real
    // "Basic ATK: Bloom! Winner Takes All" skill entry instead of its own
    // literal (invented) name.
    skillMatchName: 'Basic ATK: Bloom! Winner Takes All',
    baseMultiplierPercentByLevel: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140],
    blastAdjacentMultiplierPercentByLevel: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    isEnhancedOnly: true,
    // Points at the livestream-enhanced tier ("Bloom! Winner Takes All"),
    // NOT the original un-enhanced Basic ATK — this is a THIRD tier
    // (plain -> livestream-enhanced -> livestream+Certified-Banger), and
    // Certified Banger can only ever be active on top of an already-
    // active livestream, so the chain has to point at its immediate
    // predecessor for a generic "find my enhanced sibling" lookup (see
    // Profilepage.jsx's buildEffectiveRotation) to actually walk from a
    // rotation row currently sitting at the livestream tier up to this
    // one. Previously pointed at 'Basic ATK: Cat Got Your Flametongue?'
    // (skipping the middle tier entirely) — harmless before nothing read
    // this field at runtime, but would have silently broken the very
    // first automated state-swap feature built against it.
    replacesAbilityName: 'Basic ATK: Bloom! Winner Takes All',
    attachedTriggers: [
      {
        name: 'Sleight of Sparx Hand (Certified Banger main hit)',
        damageType: 'ELATION',
        // Lv.1-15, Talent's own level track via skillMatchName.
        baseMultiplierPercentByLevel: [20, 22, 24, 26, 28, 30, 33, 35, 38, 40, 42, 44, 46, 48, 50],
        skillMatchName: 'Talent: Sleight of Sparx Hand',
        averagedAcrossEnemies: false,
      },
      {
        name: 'Sleight of Sparx Hand (Certified Banger adjacent hit)',
        damageType: 'ELATION',
        baseMultiplierPercentByLevel: talentAdjacentAndPerInstanceRateByLevel,
        skillMatchName: 'Talent: Sleight of Sparx Hand',
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
        baseMultiplierPercentByLevel: talentAdjacentAndPerInstanceRateByLevel,
        skillMatchName: 'Talent: Sleight of Sparx Hand',
        averagedAcrossEnemies: false,
        // Real text: "for every 1 instance of Engagement Farming
        // triggered, deals 1 extra instance of X% Elation DMG" — count is
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
  // Punchline/Skill Point gifts — resource effect, not modeled. Ability
  // text itself has no scaling numbers (the scaling lives entirely in the
  // conditionals below); only its OWN level matters, for resolving those
  // conditionals' valuesByStackPerLevel.
  'Skill: Engagement Farming': {
    abilityType: 'SKILL',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Real text: main AoE hit (true "all enemies" language, no "split
  // evenly") + 20 additional single-target instances. Bonus hits baked
  // into one flat PER-LEVEL total via attachedTriggers (rate x 20 at each
  // level), same pattern as Yao Guang's Let Thy Fortune Burst in Flames —
  // except now genuinely level-aware per-level, not a single flat number
  // frozen at Lv.15 (see file-header bug note #2).
  "Elation Skill: Signal Overflow: The Great Encore!": {
    abilityType: 'ELATION_SKILL',
    damageType: 'ELATION',
    scalingStat: null,
    damageSourceName: null,
    // Lv.1-15. Was a fixed 62.5 (the Lv.15 value) — now level-aware, max
    // at E0 is 50% (Lv.10).
    baseMultiplierPercentByLevel: [25, 27.5, 30, 32.5, 35, 37.5, 40.6, 43.8, 46.9, 50, 52.5, 55, 57.5, 60, 62.5],
    hitsAllEnemies: true,
    attachedTriggers: [
      {
        name: 'Signal Overflow: The Great Encore! (bonus hits)',
        damageType: 'ELATION',
        // Per-level TOTAL (per-instance rate x 20 instances), not a raw
        // per-instance value — was a fixed 626 (20 x 31.3, the Lv.15
        // total). Max at E0 is 500 (20 x 25%, Lv.10).
        baseMultiplierPercentByLevel: signalOverflowBonusPerInstanceRateByLevel.map((rate) => rate * 20),
        averagedAcrossEnemies: false,
      },
    ],
    // Also grants 2 "Thrill" points (offsets future SP consumption) —
    // resource effect, not modeled.
  },
};

const conditionals = [
  // Real text: "Causes 'Bloom! Winner Takes All' to increase the DMG
  // multiplier against one designated enemy by X% and the DMG multiplier
  // against adjacent targets by Y%." Two DIFFERENT percentages for the
  // main hit vs. the adjacent (blast) hit of the SAME ability — split
  // into two conditionals using restrictedToBlastPortion ('MAIN'/
  // 'ADJACENT'). BUG FIX: the per-stack rate itself is level-scaled
  // (Engagement Farming's own Skill level) — was hardcoded to 25%/12.5%
  // per stack, the Lv.15 rate, unreachable without eidolons. Real E0 cap
  // (Lv.10) is 20%/10% per stack. Fixed via valuesByStackPerLevel, a 2D
  // array (one full 20-stack array per Skill level) resolved the same
  // way Yao Guang's Zone Elation Boost conditional resolves its own
  // level — except that one has maxStacks: 1 (a single on/off value per
  // level), while this one still needs the full per-stack multiplication
  // at whichever level is actually invested.
  {
    name: 'Engagement Farming DMG stacks (main)',
    appliesToAbility: 'BASIC',
    restrictedToAbilityName: 'Bloom! Winner Takes All',
    restrictedToBlastPortion: 'MAIN',
    sourceAbilityName: 'Engagement Farming',
    skillMatchName: 'Skill: Engagement Farming',
    statType: 'DMG_PERCENT',
    trigger: 'Each "Engagement Farming" trigger increases "Bloom! Winner Takes All" main-target DMG by a Skill-level-scaled amount, up to 20 stacks (the Skill\'s own stated trigger cap)',
    valuesByStackPerLevel: engagementFarmingMainRateByLevel.map((rate) =>
      Array.from({ length: 20 }, (_, i) => rate * (i + 1))
    ),
    valuesByStack: Array.from({ length: 20 }, (_, i) => engagementFarmingMainRateByLevel[9] * (i + 1)), // Lv.10 E0-cap fallback
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
    skillMatchName: 'Skill: Engagement Farming',
    statType: 'DMG_PERCENT',
    trigger: 'Each "Engagement Farming" trigger increases "Bloom! Winner Takes All" adjacent-target DMG by a Skill-level-scaled amount, up to 20 stacks (the Skill\'s own stated trigger cap)',
    valuesByStackPerLevel: engagementFarmingAdjacentRateByLevel.map((rate) =>
      Array.from({ length: 20 }, (_, i) => rate * (i + 1))
    ),
    valuesByStack: Array.from({ length: 20 }, (_, i) => engagementFarmingAdjacentRateByLevel[9] * (i + 1)), // Lv.10 E0-cap fallback
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
  // secondary stat. Trace — dump-character-kit.js shows only Lv.1 for
  // Traces (they don't level up), so no per-level conversion applies here.
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
  // manually-entered resource value. Trace — same "Lv.1 only" note as
  // above, no per-level conversion applies here either.
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
// Deliberately does NOT list the Certified Banger ability variants or
// their bonus-hit triggers here — Profilepage.jsx's "Using Certified
// Banger state" checkbox now auto-swaps these rows and auto-injects
// those triggers at runtime (see buildEffectiveRotation), driven by the
// replacesAbilityName metadata already on the abilities above. Listing
// them here too would just be redundant with what the toggle already
// does, and would need to be kept in sync by hand every time the
// enhanced-state kit data changes.
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