// Hand-authored kit for Cyrene. Source: your pasted dump-character-kit
// output for Cyrene (id 1415), matching the format used for every other
// kit file. Two real mechanics in this kit have NO home in the current
// engine and are deliberately NOT modeled below rather than guessed at —
// see the two "ENGINE GAP" notes further down. Everything else (core
// rotation: Basic ATK, Skill, Ultimate, Talent, the enhanced Basic ATK
// during "Ripples of Past Reverie," and Demiurge's own Minuet nuke) is
// modeled and should be usable now.
//
// SCOPE DECISION (flagged, not yet confirmed with you): this file only
// covers Cyrene's OWN kit. It does NOT include the 14 "Ode to X"
// Memosprite Skills (Ode to Romance/Passage/Strife/Life and Death/
// Reason/Sky/Trickery/Worldbearing/Ocean/Law/Time/Earth/Ego, plus "Ode to
// Genesis" for Trailblazer-Remembrance) — those are one-time buffs Cyrene
// grants to a SPECIFIC named teammate (Aglaea, Tribbie, Mydei, Castorice,
// Anaxa, Hyacine, Cipher, Khaslana, Hysilens, Cerydra, Evernight, Dan
// Heng-PT, Trailblazer-Remembrance) and don't affect Cyrene's own damage
// number at all — they belong in THAT character's kit file as an
// external/manual conditional, not here. Let me know if you want any of
// those added to a specific teammate's file.
//
// ENGINE GAP #1 — Skill's Zone (True DMG echo): "Bloom, Elysium of
// Beyond" deploys a Zone that, for every instance of DMG any ally deals,
// adds one MORE instance of True DMG equal to 24% (at Lv.10, the E0 cap)
// of the original hit. This is a genuinely different shape of effect than
// anything the current statType list supports (DMG_PERCENT, RES_PEN,
// DEF_PEN, CRIT_RATE, CRIT_DMG, ATK_PERCENT, VULNERABILITY, the ELATION_*
// variants, STAT_OVERFLOW_SPLIT) — it's not a multiplier on Cyrene's own
// hits, it's a brand new damage INSTANCE keyed off every hit landed by
// the whole team. Modeling it correctly would need a new statType (or a
// dedicated field) that the damage calculator/Profilepage conditional
// resolver is taught to consume — I didn't invent one. Per-level text for
// reference if/when you want to wire this up: Lv.1-15 = 12, 13, 14, 16,
// 17, 18, 20, 21, 23, 24, 25, 26, 28, 29, 30 (Lv.10 = 24%, the E0 cap).
//
// ENGINE GAP #2 — Memosprite Talent "Waiting, In Every Past": while
// Demiurge is on the field (i.e. any time after Ultimate is used), it
// increases BOTH Cyrene's and Demiurge's Max HP by 34% (Lv.10, E0 cap).
// Since Cyrene's own multipliers scale off Max HP, this isn't cosmetic —
// it would meaningfully raise every HP-scaling hit for the rest of the
// fight. But there's no HP_PERCENT statType in the current conditional
// list either (same list as Gap #1 above), so it can't be wired up
// without adding one. Per-level text for reference: Lv.1-10 = 12, 14, 17,
// 19, 22, 24, 26, 29, 31, 34 (Lv.10 = 34%, the E0 cap).
//
// Demiurge's own Max HP: per the Ultimate's real text ("Demiurge's
// initial Max HP equals to 100% of Cyrene's Max HP") Demiurge's Max HP is
// explicitly set equal to Cyrene's own, and Gap #2 above buffs both
// equally — so using Cyrene's own live HP stat (from Enka) as the
// scaling value for Demiurge's "Minuet of Blooms and Plumes" below is a
// correct read of the mechanic, not a workaround, PROVIDED Gap #2 stays
// unresolved (once it's wired up it'll correctly apply to both anyway
// since they're both fed from the same HP stat here).
//
// "Hello, World" (Memosprite Talent — dispels CC debuffs on summon) has
// no damage component and isn't included as a row; it doesn't affect any
// number in this calculator.

const characterName = 'Cyrene';

const abilities = {
  "Basic ATK: Lo, Hope Takes Flight!": {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 50%.
    baseMultiplierPercentByLevel: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  },

  // No direct damage — deploys the Zone (True DMG echo, see ENGINE GAP #1
  // above) and grants 3 Recollection points (resource, not modeled).
  'Skill: Bloom, Elysium of Beyond': {
    abilityType: 'SKILL',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // No direct damage — summons Demiurge, buffs CRIT Rate (modeled as a
  // conditional below), swaps Basic ATK to the enhanced version, and
  // extends the Zone indefinitely. Once per battle.
  'Ultimate: Verse ◦ Vow ∞': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // No direct damage — Recollection point-economy mechanic + the team
  // DMG% buff modeled as a conditional below. Not a cast action in the
  // normal sense; included only so a row can exist, not part of the
  // default rotation.
  'Talent: Hearts Gather as One': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Enhanced form, active during "Ripples of Past Reverie" (after
  // Ultimate). Real text is two components: a hit on one designated
  // enemy, THEN a separate hit on all enemies — same pattern as
  // Castorice's Boneclaw (main hit + attached AoE trigger), rather than a
  // single split-damage instance. Governed by the same trace/level track
  // as the base Basic ATK (both show Lv.6 as current/E0-cap in the dump),
  // so no separate level array needed for the attached trigger either.
  "Basic ATK: To Love and Tomorrow ♪": {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 30% (single-target component).
    baseMultiplierPercentByLevel: [15, 18, 21, 24, 27, 30, 33, 36, 39, 42],
    isEnhancedOnly: true,
    replacesAbilityName: "Basic ATK: Lo, Hope Takes Flight!",
    attachedTriggers: [
      {
        name: 'To Love and Tomorrow ♪ (all-enemies component)',
        abilityType: 'BASIC',
        damageType: 'STANDARD',
        scalingStat: 'HP',
        // Same 30% at Lv.6 (E0 cap) — real text gives both components
        // the identical multiplier.
        baseMultiplierPercentByLevel: [15, 18, 21, 24, 27, 30, 33, 36, 39, 42],
        hitsAllEnemies: true,
      },
    ],
  },

  // Enhanced Ultimate during "Ripples of Past Reverie" — no direct
  // damage, just enables Demiurge's extra turn. Replaces the base
  // Ultimate once she's in that state.
  'Ultimate: Reunion at First Sight': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
    isEnhancedOnly: true,
    replacesAbilityName: 'Ultimate: Verse ◦ Vow ∞',
  },

  // Demiurge's plain attack — real text: "Deals Ice DMG to all enemies
  // equal to X% of Demiurge's Max HP," true AoE. Demiurge's Max HP is set
  // equal to Cyrene's own at summon (see file header) so scalingStat:
  // 'HP' correctly reads Cyrene's live HP stat here, same as every other
  // ability in this file.
  'Memosprite Skill: Minuet of Blooms and Plumes': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 10 (max at E0 — the dump shows Lv.10 as current for this
    // ability, NOT capped at Lv.6 the way Castorice's Netherwing
    // abilities were; flagging since it's a different pattern from the
    // last memosprite kit) is 84%.
    baseMultiplierPercentByLevel: [30, 36, 42, 48, 54, 60, 66, 72, 78, 84],
    hitsAllEnemies: true,
  },
};

const conditionals = [
  // Confirmed against real text at Lv.10 (E0 cap) = 50%. Only benefits
  // Cyrene's and Demiurge's own hits (not the whole team), which is
  // exactly what appliesToAbility: 'ALL' means in this single-character
  // calculator (all of CYRENE's own ability types) — same convention
  // Castorice's file uses.
  {
    name: "Ripples of Past Reverie CRIT Rate boost",
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Ultimate: Verse ◦ Vow ∞',
    statType: 'CRIT_RATE',
    trigger: 'Once per battle: after Ultimate is used, for the rest of "Ripples of Past Reverie."',
    valuesByStackPerLevel: [
      [25], [28], [30], [33], [35], [38], [41], [44], [47], [50], [53], [55], [57], [60], [63],
    ],
    valuesByStack: [50],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Confirmed against real text at Lv.10 (E0 cap) = 20.0%. Flat while on
  // field, no stacking — single-tier per-level array, same shape as
  // Castorice's Netherwing-summon DMG boost but level-aware since this
  // one visibly scales per Talent level in the source text (10% at Lv.1
  // up to 20% at Lv.10) rather than being a flat single number.
  {
    name: 'Hearts Gather as One (on-field team DMG boost)',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Talent: Hearts Gather as One',
    statType: 'DMG_PERCENT',
    trigger: 'While Cyrene is on the field.',
    valuesByStackPerLevel: [
      [10], [11], [12], [13], [14], [15], [16.3], [17.5], [18.8], [20],
      [21], [22], [23], [24], [25],
    ],
    valuesByStack: [20],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort authored rotation — FLAGGED FOR REVIEW, same caveat as every
// character so far. Assumes the standard "snapshot into Ultimate, spam
// enhanced Basic ATK, let Demiurge nuke on its extra turns" pattern; pre-
// Ultimate Basic ATK casts are excluded since community consensus treats
// the pre-Ult phase as setup rather than the modeled damage window (same
// reasoning Castorice's file uses for her plain Basic ATK).
const rotation = [
  { abilityName: "Basic ATK: To Love and Tomorrow ♪", countPerRotation: 3 },
  {
    abilityName: 'To Love and Tomorrow ♪ (all-enemies component)',
    countPerRotation: 3,
    isAttachedTrigger: true,
  },
  { abilityName: 'Memosprite Skill: Minuet of Blooms and Plumes', countPerRotation: 1 },
];

export { characterName, abilities, conditionals, rotation };