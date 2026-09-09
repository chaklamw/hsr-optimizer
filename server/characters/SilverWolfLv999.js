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
//
// REVISION: previously assumed 100% Certified Banger uptime — Top Loot
// Box (both the attachedTrigger version proc'd off Bonus Stage, and its
// standalone "Elation Skill: Honkai-DMG Demo" version) was counted
// unconditionally whenever Bonus Stage/the enhanced state was in use.
// The real kit text gates Top Loot Box on BOTH Bonus Stage AND holding
// Certified Banger — the two aren't the same condition. Fixed via a new
// requiresCertifiedBanger field (generic, not Silver-Wolf-specific),
// which Profilepage.jsx's computeScenarioTotalDamage now checks against
// the existing "Using Certified Banger state" toggle, zeroing out a
// row's damage when the ability/trigger requires it but the toggle is
// off, rather than always counting it.
//
// CORRECTION (superseding the paragraph above): the "100% Certified
// Banger uptime" framing was itself wrong, based on an imprecise chat
// description rather than the real kit text. There are actually TWO
// separate Top Loot Box trigger sources:
//   1. Bonus Stage's own text ("the bouncing pauses and the Top Loot Box
//      triggers 1 time... up to 3 times") — UNCONDITIONAL, no Certified
//      Banger requirement. This is what both the attachedTrigger and
//      "Elation Skill: Honkai-DMG Demo" below represent, and neither
//      should carry requiresCertifiedBanger (removed).
//   2. The Ultimate's text ("While holding Certified Banger, for every 1
//      Skill Point consumed by an ALLY target within the Zone, there is
//      a chance to trigger 1 instance of Top Loot Box") — a SEPARATE,
//      genuinely Certified-Banger-gated source, driven by teammates'
//      Skill Point spending rather than Silver Wolf's own actions. NOT
//      YET MODELED — would need its own row/mechanic (a manually-tracked
//      "ally Skill Points spent" count, similar to Sparxie's Engagement
//      Farming stacking) plus its own correctly-gated attachedTrigger,
//      rather than reusing/regating the existing one. Left unmodeled
//      pending a decision on how to represent that count.
//
// The Talent's "While holding Certified Banger, using Basic ATK or Skill
// deals X% Imaginary Elation DMG..." clause IS modeled (confirmed via
// dump-character-kit.js --levels). Real per-level progression is
// 20/22/24/26/28/30/33/35/38/40/42/44/46/48/50 (Lv.1-15, Talent "I Carry,
// We Win" — an earlier "20%-44%" range mentioned in chat was a paraphrase
// of roughly Lv.1 to Lv.12, not the full range). Modeled as:
//   - "using Basic ATK or Skill deals X% Elation DMG" -> attachedTriggers
//     on BOTH 'Basic ATK: One Punch!' and 'Skill: Trigger Happy', gated
//     by requiresCertifiedBanger, level-tracked via the Talent (not
//     either ability's own level) using skillMatchName. One Punch!'s
//     version is included for completeness/future-proofing even though
//     this rotation currently never selects it as a row (Bonus Stage
//     replaces it entirely) — it'll matter if a future rotation variant
//     ever uses plain, non-enhanced Basic ATK.
//   - "Enhanced Basic ATK's DMG changes to Elation DMG at the same
//     multiplier" -> a NEW ability, 'Basic ATK: Bonus Stage: αWolf
//     Instant (Certified Banger)', identical multiplier arrays to the
//     STANDARD version but damageType: 'ELATION', wired as an
//     isEnhancedOnly/replacesAbilityName sibling of the existing Bonus
//     Stage entry — reuses the SAME generic auto-swap mechanism built for
//     Sparxie's Certified Banger variants (buildEffectiveRotation in
//     Profilepage.jsx), rather than needing new engine work. This is a
//     TYPE CONVERSION of Bonus Stage's existing damage, not an
//     additional bonus hit on top of it — the real kit text says
//     "changes to," not "additionally deals."
//
// The "Hidden MMR to Crit conversion" conditional's per-point rates are
// now level-aware too (primaryRatePerPointByLevel /
// secondaryRatePerPointByLevel on its overflow object), resolved via a
// new resolveOverflowRates function in Profilepage.jsx that extends
// withResolvedValuesByStack the same way valuesByStackPerLevel already
// worked — was previously hardcoded to the Lv.15 rate (0.50%/1.00% per
// point), the real E0-reachable rate (Talent Lv.10) is 0.40%/0.80%.

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
    attachedTriggers: [
      {
        name: 'One Punch! (Certified Banger Elation bonus)',
        damageType: 'ELATION',
        // Lv.1-15, read off the TALENT's own level ("I Carry, We Win"),
        // not Basic ATK's — same skillMatchName pattern as Bonus Stage's
        // Top Loot Box trigger below. Not currently reachable via this
        // rotation's default rows (Bonus Stage replaces One Punch!
        // entirely here), included for completeness/future rotations.
        skillMatchName: 'Talent: I Carry, We Win',
        baseMultiplierPercentByLevel: [20, 22, 24, 26, 28, 30, 33, 35, 38, 40, 42, 44, 46, 48, 50],
        requiresCertifiedBanger: true,
        averagedAcrossEnemies: false,
      },
    ],
  },

  'Skill: Trigger Happy': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    // Was a fixed 200 (the level-15 value) — now level-aware. Level 10
    // (max at E0) is 160%.
    baseMultiplierPercentByLevel: [80, 88, 96, 104, 112, 120, 130, 140, 150, 160, 168, 176, 184, 192, 200],
    attachedTriggers: [
      {
        name: 'Trigger Happy (Certified Banger Elation bonus)',
        damageType: 'ELATION',
        // Same Talent-level track and gating as One Punch!'s version
        // above — the only difference is hitsAllEnemies, matching
        // Trigger Happy's own AoE targeting ("to all enemies"), since
        // the real text says this bonus hits whatever the parent ability
        // itself hit ("the attacked enemy targets").
        skillMatchName: 'Talent: I Carry, We Win',
        baseMultiplierPercentByLevel: [20, 22, 24, 26, 28, 30, 33, 35, 38, 40, 42, 44, 46, 48, 50],
        requiresCertifiedBanger: true,
        hitsAllEnemies: true,
      },
    ],
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
        // CORRECTION: this was previously gated behind requiresCertified
        // Banger, based on an imprecise chat description ("Top Loot Box
        // only enabled during Certified Banger and Ultimate"). Re-reading
        // the real kit text: Bonus Stage's OWN text ("the bouncing pauses
        // and the Top Loot Box triggers 1 time... up to 3 times") has NO
        // Certified Banger requirement — it's unconditional whenever
        // Bonus Stage is used. There's a SEPARATE, genuinely-gated Top
        // Loot Box source described on the Ultimate ("While holding
        // Certified Banger, for every 1 Skill Point consumed by an ALLY
        // target within the Zone...") — but that's an additional proc
        // from teammates' actions, not this one, and isn't modeled here
        // yet (see file-header note).
      },
    ],
  },

  // "And the Enhanced Basic ATK's ability DMG changes to Elation DMG at
  // the same multiplier" (Talent, "I Carry, We Win"). This is a TYPE
  // CONVERSION of Bonus Stage's existing damage while Certified Banger is
  // active — not a new additional hit — so it's modeled as a sibling
  // ability with identical multiplier arrays but damageType: 'ELATION'
  // instead of 'STANDARD', wired via isEnhancedOnly/replacesAbilityName
  // to reuse the SAME generic Certified-Banger auto-swap mechanism built
  // for Sparxie (buildEffectiveRotation in Profilepage.jsx) rather than
  // needing new engine work. skillMatchName is required since "(Certified
  // Banger)" isn't a real distinct skill name in StarRailRes data — same
  // caveat as Sparxie's two Certified Banger variants.
  //
  // Does NOT repeat the Top Loot Box attachedTrigger from the STANDARD
  // version above — Top Loot Box (the Bonus-Stage-proc'd version) is
  // unconditional and already its own explicit row in the rotation, so
  // it's unaffected by which Bonus Stage variant is currently active and
  // doesn't need duplicating here.
  'Basic ATK: Bonus Stage: αWolf Instant (Certified Banger)': {
    abilityType: 'BASIC',
    damageType: 'ELATION',
    scalingStat: 'ATK',
    damageSourceName: null,
    skillMatchName: 'Basic ATK: Bonus Stage: αWolf Instant',
    baseMultiplierPercentByLevel: [120, 144, 168, 192, 216, 240, 264, 288, 312, 336],
    bounceHitCount: 100,
    isEnhancedOnly: true,
    replacesAbilityName: 'Basic ATK: Bonus Stage: αWolf Instant',
    requiresCertifiedBanger: true,
  },

  // 6 instances of the same Top Loot Box hit, plus resets its trigger
  // chance. Only usable in the enhanced state — NOT specifically gated by
  // Certified Banger (correction: previously had requiresCertifiedBanger
  // here too, same imprecise-summary mistake as the attachedTrigger
  // above). This manual cast is available whenever in Godmode Player
  // state, same as the rest of the enhanced kit.
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
    // Bare 'Talent' doesn't match characterSkills' displayName format
    // ("Talent: I Carry, We Win") — same gap as every other skillMatchName
    // fix in this file. Needed now that this conditional is level-aware;
    // without it, getConditionalLiveLevel can't find a level and the
    // per-level arrays below would silently fall back to their flat
    // default every time.
    skillMatchName: 'Talent: I Carry, We Win',
    statType: 'STAT_OVERFLOW_SPLIT',
    trigger:
      "Each point of Hidden MMR increases CRIT Rate by the Talent's own per-level rate until CRIT Rate reaches 100%, then each additional point increases CRIT DMG at that level's secondary rate",
    valuesByStack: [],
    maxStacks: 0,
    overflow: {
      resourceLabel: 'Hidden MMR',
      primaryStat: 'CRIT_RATE',
      // Lv.1-15. Was a fixed 0.5 (the Lv.15 value) — now level-aware via
      // primaryRatePerPointByLevel, resolved by resolveOverflowRates in
      // Profilepage.jsx the same way valuesByStackPerLevel resolves
      // ordinary conditionals. Max at E0 is 0.40 (Lv.10). Flat fallback
      // kept at the E0-cap value (not the old buggy Lv.15 value) in case
      // level resolution ever fails to find a level.
      primaryRatePerPoint: 0.4,
      primaryRatePerPointByLevel: [0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.33, 0.35, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5],
      capPercent: 100,
      secondaryStat: 'CRIT_DMG',
      // Lv.1-15. Was a fixed 1 (the Lv.15 value) — now level-aware. Max
      // at E0 is 0.80 (Lv.10). Same fallback-choice reasoning as above.
      secondaryRatePerPoint: 0.8,
      secondaryRatePerPointByLevel: [0.4, 0.44, 0.48, 0.52, 0.56, 0.6, 0.65, 0.7, 0.75, 0.8, 0.84, 0.88, 0.92, 0.96, 1.0],
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

  // CORRECTION: previously marked "deliberately dropped" here on the
  // assumption it didn't appear anywhere in the real kit text. It does —
  // it's on Bonus Stage: αWolf Instant's OWN ability text (not the
  // Talent, which is why the earlier pull missed it): "For every 60
  // points of 'Hidden MMR' held, increases DMG dealt during Enhanced
  // Basic ATK by 15% of the original DMG, stacking up to 2 time(s)." The
  // wording is identical at every level Lv.1-10, so this is flat (not
  // level-scaled) — 15%/30%, matching the old cache's numbers exactly.
  // Only affects the enhanced Basic ATK, not Silver Wolf's whole kit, so
  // it's restricted via appliesToAbility: 'BASIC' rather than 'ALL'.
  // UPDATE: now auto-derived rather than a manual toggle, via a new
  // resourceStackThreshold field on the conditional (generic, not
  // Silver-Wolf-specific — resolveConditionalStacks in Profilepage.jsx
  // now checks it as a 4th stack-resolution source, ahead of the manual
  // dropdown fallback). Reads the SAME "Punchline / Certified Banger
  // value" input field already on screen for the Hidden-MMR-to-Crit
  // overflow conditional above (Punchline = Hidden MMR 1:1 per the Talent
  // text) — floor(value / 60), capped at maxStacks — so the person enters
  // their Hidden MMR count once and both conditionals read it
  // consistently, rather than needing a second manual toggle that could
  // drift out of sync with the number they typed for the other one.
  {
    name: 'Hidden MMR DMG Boost (Enhanced Basic ATK)',
    appliesToAbility: 'BASIC',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Basic ATK: Bonus Stage: αWolf Instant',
    statType: 'DMG_PERCENT',
    trigger: 'For every 60 points of "Hidden MMR" held, +15% DMG during Enhanced Basic ATK, stacking up to 2 times (max 30% at 120+ Hidden MMR). Auto-derived from the Punchline/Hidden MMR value field.',
    valuesByStack: [15, 30],
    maxStacks: 2,
    resourceStackThreshold: { pointsPerStack: 60 },
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
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
  {
    abilityName: 'Trigger Happy (Certified Banger Elation bonus)',
    countPerRotation: 3,
    isAttachedTrigger: true,
  },
  { abilityName: 'Basic ATK: Bonus Stage: αWolf Instant', countPerRotation: 1 },
  { abilityName: 'Top Loot Box', countPerRotation: 3, isAttachedTrigger: true },
  { abilityName: 'Elation Skill: Honkai-DMG Demo', countPerRotation: 2 },
];

export { characterName, abilities, cosmeticAbilityAliases, conditionals, rotation };