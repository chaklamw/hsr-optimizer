// Hand-authored kit for Castorice. Her most mechanically involved kit so
// far — HP-scaling damage, a semi-independent memosprite (Netherwing) with
// its own attacks, an ability that swaps identity when Netherwing is out
// (Skill -> "Boneclaw, Doomdrake's Embrace"), and an ability whose own
// multiplier escalates across repeated casts within one attack.
//
// ASSUMPTION (not confirmed with you this round): Netherwing's own attacks
// are included as rows in Castorice's own rotation, producing one combined
// "Castorice + Netherwing" total — matching how community build guides and
// Fribbels' own optimizer treat memosprite characters. If you wanted
// Netherwing tracked as a fully separate unit instead, this needs revising.
//
// NAMES STILL UNCONFIRMED: Basic ATK, base Skill (pre-Boneclaw), Ultimate,
// and Talent have no unique proper names in any source checked (unlike
// Silver Wolf/Archer/Yaoguang) — every guide just calls them "Basic ATK"/
// "Skill"/etc. generically. Used as bare placeholders below; if your real
// characterSkills data has actual names for these, the ability keys need
// updating to match exactly, same issue hit (and fixed) for every
// character so far.

const characterName = 'Castorice';

const abilities = {
  'Basic ATK': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 70,
  },

  // Base form — consumes 30% all allies' current HP (resource cost, not
  // modeled). Gets replaced by "Boneclaw, Doomdrake's Embrace" below once
  // Netherwing is on the battlefield, per the real kit text.
  Skill: {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 63,
    blastAdjacentMultiplierPercent: 38,
  },

  // Enhanced form. Real text: "Castorice and Netherwing launch Joint ATK
  // ... 37.5% and 62.5% of Castorice's Max HP to all enemies" — one
  // trigger, two simultaneous AoE components (both hit every enemy, no
  // "split evenly" language). Modeled as Castorice's own 37.5% hit with
  // Netherwing's 62.5% hit attached, same pattern as Silver Wolf's Bonus
  // Stage + Top Loot Box.
  "Skill: Boneclaw, Doomdrake's Embrace": {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 37.5,
    hitsAllEnemies: true,
    isEnhancedOnly: true,
    replacesAbilityName: 'Skill',
    attachedTriggers: [
      {
        name: "Boneclaw, Doomdrake's Embrace (Netherwing's hit)",
        abilityType: 'SKILL',
        damageType: 'STANDARD',
        scalingStat: 'HP',
        baseMultiplierPercent: 62.5,
        hitsAllEnemies: true,
      },
    ],
  },

  // No direct damage — summons Netherwing, deploys Lost Netherland
  // (modeled as a conditional below, not here).
  Ultimate: {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // No direct damage — Newbud resource mechanic + the DMG-boost conditional
  // below. Not a cast action in the normal sense (passive), included here
  // only so a row can exist if you want to explicitly note it in a
  // rotation; not part of the default rotation.
  Talent: {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Netherwing's plain attack. Real text: "Deals 56.0% Max HP to all
  // enemies" — true AoE, no split-evenly language.
  'Memosprite Skill: Claw Splits the Veil': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 56.0,
    hitsAllEnemies: true,
  },

  // Real text: multiplier escalates across successive casts WITHIN one
  // attack sequence — 33.6% -> 39.2% -> 47.6%, capped at 47.6%. This is
  // the ability's own intrinsic per-cast scaling (not a conditional buff —
  // same category the old extraction rules explicitly excluded from
  // conditional extraction), so it's modeled as 3 separate tiered entries
  // rather than one flat number. The Trace bonus ("Where the West Wind
  // Dwells," +30%/stack up to 6) is a SEPARATE, additional conditional
  // layered on top of whichever tier is active — see conditionals below.
  //
  // All 3 tiers correspond to ONE real characterSkills entry (this app
  // already has dedicated escalating-multiplier machinery for exactly
  // this ability — findBreathLinkedGroup — for the non-authored path,
  // which is a strong signal there's a single real skill here, not three).
  // skillMatchName points all three at that one real name for
  // matching/level-lookup purposes, while each keeps its own distinct
  // dictionary key/label/multiplier for rotation purposes.
  'Memosprite Skill: Breath Scorches the Shadow (1st use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 33.6,
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },
  'Memosprite Skill: Breath Scorches the Shadow (2nd use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 39.2,
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },
  'Memosprite Skill: Breath Scorches the Shadow (3rd+ use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 47.6,
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },

  // Real text (Memosprite Talent, well-formed): "When Netherwing
  // disappears, deals 6 instances of 56.0% Max HP to one random enemy."
  // Baked into one flat total like Silver Wolf's Elation Skill (56 x 6).
  //
  // NOTE: a separate entry in the raw extraction — "[Memosprite Skill]
  // ...enhanced up to 3 times... when HP is #5[i]% or lower, actively
  // triggers... Wings Sweep the Ruins" — is very likely THE SAME event
  // described from a different angle (its own damage/heal numbers are
  // IDENTICAL to this entry), but its source text has a broken, unresolved
  // template placeholder ("#5[i]%") for its own multiplier/threshold. NOT
  // modeled as a separate ability to avoid double-counting what may be the
  // same nuke twice — but if Wings Sweep the Ruins is actually a distinct,
  // separately-repeatable damage source from this disappear-trigger, this
  // needs correcting once you can confirm from real tooltip text.
  // Key matches the real "type_text: name" display format used everywhere
  // else in this app — no "(on disappear)" suffix, since that was only a
  // clarifying note for this file, not part of her actual ability name,
  // and broke exact matching against characterSkills (same class of bug
  // Silver Wolf's file originally hit).
  'Memosprite Talent: Wings Sweep the Ruins': {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    baseMultiplierPercent: 336, // 56 x 6, single target repeated
  },
};

const conditionals = [
  // Confirmed exact match against real text (25%).
  {
    name: 'Lost Netherland RES Reduction',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Lost Netherland',
    statType: 'RES_PEN',
    trigger: 'Always active while Lost Netherland territory is deployed (from Ultimate)',
    valuesByStack: [25],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Real text confirms the 25% first-tier value and "stacks up to 3
  // times" — the 50/75 progression for tiers 2-3 is an assumption
  // (standard linear HSR stacking pattern) carried over from the old
  // cache, not independently re-confirmed this round.
  {
    name: 'Allies lose HP DMG boost',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Talent',
    statType: 'DMG_PERCENT',
    trigger: 'When allies lose HP, stacking up to 3 times, lasting 3 turns',
    valuesByStack: [25, 50, 75],
    maxStacks: 3,
    overflow: null,
    suspicious: true,
    suspiciousNote: 'Only the 25% first-tier value is confirmed against real text this round — 50/75 for tiers 2-3 assumed linear, not independently re-verified.',
  },
  // "All allies" — she's one of her own allies, same principle as
  // Yaoguang's Zone. Self-applicable, no cross-character modeling needed.
  {
    name: 'Memosprite Talent (Netherwing summon DMG boost)',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Memosprite Talent',
    statType: 'DMG_PERCENT',
    trigger: 'When Netherwing is summoned, lasting 3 turns',
    valuesByStack: [10],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Confirmed exact match against real Trace text (30/60/.../180, stack 6).
  {
    name: 'DMG increase per Breath Scorches the Shadow use',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Where the West Wind Dwells',
    statType: 'DMG_PERCENT',
    trigger: 'Each time Netherwing uses "Breath Scorches the Shadow," stacking up to 6 times, lasts until end of turn',
    valuesByStack: [30, 60, 90, 120, 150, 180],
    maxStacks: 6,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort authored rotation — FLAGGED FOR REVIEW, same caveat as every
// character so far. Basic ATK excluded by default per community consensus
// ("should generally be avoided, doesn't contribute to Newbud or notable
// damage") rather than oversight.
const rotation = [
  { abilityName: "Skill: Boneclaw, Doomdrake's Embrace", countPerRotation: 2 },
  {
    abilityName: "Boneclaw, Doomdrake's Embrace (Netherwing's hit)",
    countPerRotation: 2,
    isAttachedTrigger: true,
  },
  { abilityName: 'Memosprite Skill: Claw Splits the Veil', countPerRotation: 1 },
  { abilityName: 'Memosprite Skill: Breath Scorches the Shadow (1st use)', countPerRotation: 1 },
  { abilityName: 'Memosprite Skill: Breath Scorches the Shadow (2nd use)', countPerRotation: 1 },
  { abilityName: 'Memosprite Skill: Breath Scorches the Shadow (3rd+ use)', countPerRotation: 1 },
  { abilityName: 'Memosprite Talent: Wings Sweep the Ruins', countPerRotation: 1 },
];

export { characterName, abilities, conditionals, rotation };