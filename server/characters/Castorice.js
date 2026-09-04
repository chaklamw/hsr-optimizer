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
// All previously-unconfirmed ability names are now confirmed against
// StarRailRes's own character_skills.json: Basic ATK is "Lament,
// Nethersea's Ripple", base Skill is "Silence, Wraithfly's Caress",
// Ultimate is "Doomshriek, Dawn's Chime", Talent is "Desolation Across
// Palms".
//
// Multiplier percentages are level-aware (baseMultiplierPercentByLevel),
// same fix already applied to Silver Wolf LV.999 and Archer. This one had
// an extra wrinkle: Netherwing's own abilities (everything under
// "Memosprite Skill"/"Memosprite Talent") are governed by a SEPARATE trace
// node (Point19/Point20, StarRailRes ids 1407301/1407302) that caps at
// level 6 at E0 — not level 10/15 like Castorice's own core abilities.
// The previous version of this file had Breath Scorches the Shadow's
// tiers (33.6/39.2/47.6%) and Claw Splits the Veil (56%) already matching
// real tooltip text, but at level 10 — one tier above what's actually
// achievable at E0 for a Memosprite ability specifically. Same root cause
// as every character so far (values captured at max level rather than
// live level), just a level-10-vs-level-6 version of it instead of the
// usual level-15-vs-level-10.

const characterName = 'Castorice';

const abilities = {
  "Basic ATK: Lament, Nethersea's Ripple": {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 50%.
    baseMultiplierPercentByLevel: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  },

  // Base form — consumes 30% all allies' current HP (resource cost, not
  // modeled). Gets replaced by "Boneclaw, Doomdrake's Embrace" below once
  // Netherwing is on the battlefield, per the real kit text.
  "Skill: Silence, Wraithfly's Caress": {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 10 (max at E0) is 50% main / 30% adjacent.
    baseMultiplierPercentByLevel: [
      25, 27.5, 30, 32.5, 35, 37.5, 40.62, 43.75, 46.88, 50, 52.5, 55, 57.5, 60, 62.5,
    ],
    blastAdjacentMultiplierPercentByLevel: [
      15, 16.5, 18, 19.5, 21, 22.5, 24.37, 26.25, 28.12, 30, 31.5, 33, 34.5, 36, 37.5,
    ],
  },

  // Enhanced form. Governed by the SAME trace node as the base Skill above
  // (StarRailRes level_up_skills confirms both 140702 and 140709 share
  // Point02), so it levels in lockstep with it — no separate cap. Real
  // text: two simultaneous AoE components, both hit every enemy, no
  // "split evenly" language. Modeled as Castorice's own hit with
  // Netherwing's hit attached, same pattern as Silver Wolf's Bonus Stage +
  // Top Loot Box.
  "Skill: Boneclaw, Doomdrake's Embrace": {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 10 (max at E0) is 30%.
    baseMultiplierPercentByLevel: [
      15, 16.5, 18, 19.5, 21, 22.5, 24.37, 26.25, 28.12, 30, 31.5, 33, 34.5, 36, 37.5,
    ],
    hitsAllEnemies: true,
    isEnhancedOnly: true,
    replacesAbilityName: "Skill: Silence, Wraithfly's Caress",
    attachedTriggers: [
      {
        name: "Boneclaw, Doomdrake's Embrace (Netherwing's hit)",
        abilityType: 'SKILL',
        damageType: 'STANDARD',
        scalingStat: 'HP',
        // Same trace/level track as the parent — no skillMatchName
        // override needed since inheriting the parent's level is correct
        // here (unlike Silver Wolf's Top Loot Box, which needed its own).
        // Level 10 (max at E0) is 50%.
        baseMultiplierPercentByLevel: [
          25, 27.5, 30, 32.5, 35, 37.5, 40.62, 43.75, 46.88, 50, 52.5, 55, 57.5, 60, 62.5,
        ],
        hitsAllEnemies: true,
      },
    ],
  },

  // No direct damage — summons Netherwing, deploys Lost Netherland
  // (modeled as a conditional below, not here).
  "Ultimate: Doomshriek, Dawn's Chime": {
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
  'Talent: Desolation Across Palms': {
    abilityType: 'ULT',
    damageType: null,
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 0,
    dealsNoDirectDamage: true,
  },

  // Netherwing's plain attack. Real text: "Deals X% Max HP to all
  // enemies" — true AoE, no split-evenly language. Governed by the
  // Memosprite trace (Point19), capped at level 6 at E0.
  'Memosprite Skill: Claw Splits the Veil': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 40% — was a fixed 56.0 (the level-10 value)
    // before this existed.
    baseMultiplierPercentByLevel: [20, 24, 28, 32, 36, 40, 44, 48, 52, 56],
    hitsAllEnemies: true,
  },

  // Real text: multiplier escalates across successive casts WITHIN one
  // attack sequence, capped after the 3rd tier. This is the ability's own
  // intrinsic per-cast scaling (not a conditional buff — same category the
  // old extraction rules explicitly excluded from conditional extraction),
  // so it's modeled as 3 separate tiered entries rather than one flat
  // number, same pattern used for Archer's Circuit Connection. The Trace
  // bonus ("Where the West Wind Dwells," +30%/stack up to 6) is a
  // SEPARATE, additional conditional layered on top of whichever tier is
  // active — see conditionals below.
  //
  // All 3 tiers correspond to ONE real characterSkills entry (id 1140702 —
  // there are two OTHER entries also named "Breath Scorches the Shadow",
  // ids 1140710/1140711, but those have broken/unresolved template
  // placeholders and no escalation data; 1140702 is the real one, the only
  // one whose params actually contain the 3-tier progression). Governed by
  // the Memosprite trace (Point20), capped at level 6 at E0 — same as
  // Claw Splits the Veil, NOT the level 10 the previous version of this
  // file assumed.
  //
  // skillMatchName points all three at that one real name for
  // matching/level-lookup purposes, while each keeps its own distinct
  // dictionary key/label/multiplier for rotation purposes.
  'Memosprite Skill: Breath Scorches the Shadow (1st use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 24% — was a fixed 33.6 (the level-10 value).
    baseMultiplierPercentByLevel: [12, 14.4, 16.8, 19.2, 21.6, 24, 26.4, 28.8, 31.2, 33.6],
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },
  'Memosprite Skill: Breath Scorches the Shadow (2nd use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 28% — was a fixed 39.2 (the level-10 value).
    baseMultiplierPercentByLevel: [14, 16.8, 19.6, 22.4, 25.2, 28, 30.8, 33.6, 36.4, 39.2],
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },
  'Memosprite Skill: Breath Scorches the Shadow (3rd+ use)': {
    abilityType: 'SKILL',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Level 6 (max at E0) is 34% — was a fixed 47.6 (the level-10 value).
    baseMultiplierPercentByLevel: [17, 20.4, 23.8, 27.2, 30.6, 34, 37.4, 40.8, 44.2, 47.6],
    hitsAllEnemies: true,
    skillMatchName: 'Memosprite Skill: Breath Scorches the Shadow',
  },

  // Real text (Memosprite Talent, well-formed): "When Netherwing
  // disappears, deals 6 instances of X% Max HP to one random enemy."
  // Baked into one flat-per-level total like Silver Wolf's Elation Skill
  // (per-hit x 6), rather than a separate hitCount field, since this app's
  // existing pattern already does that for Silver Wolf. Governed by the
  // Memosprite trace (Point20), capped at level 6 at E0 — same as the
  // other Memosprite abilities.
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
  'Memosprite Talent: Wings Sweep the Ruins': {
    abilityType: 'ULT',
    damageType: 'STANDARD',
    scalingStat: 'HP',
    damageSourceName: null,
    // Per-hit x 6, combined into one total per level. Level 6 (max at E0)
    // is 240 (40% x 6) — was a fixed 336 (56% x 6, the level-10 value).
    baseMultiplierPercentByLevel: [120, 144, 168, 192, 216, 240, 264, 288, 312, 336],
  },
};

const conditionals = [
  {
    name: 'Lost Netherland RES Reduction',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Lost Netherland',
    statType: 'RES_PEN',
    trigger: 'Always active while Lost Netherland territory is deployed (from Ultimate)',
    // Level 10 (max at E0) is 20% — was a fixed 25 (the level-15 value).
    valuesByStack: [20],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Tier-1 (20%) confirmed against real text at level 10 (max at E0). The
  // 40/60 progression for tiers 2-3 is still an assumption (standard
  // linear HSR stacking pattern, i.e. tier1 x2 / x3) — not independently
  // re-confirmed this round, same caveat as before, just against the
  // corrected tier-1 baseline (was 25/50/75, the level-15 numbers).
  {
    name: 'Allies lose HP DMG boost',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Talent: Desolation Across Palms',
    statType: 'DMG_PERCENT',
    trigger: 'When allies lose HP, stacking up to 3 times, lasting 3 turns',
    valuesByStack: [20, 40, 60],
    maxStacks: 3,
    overflow: null,
    suspicious: true,
    suspiciousNote: 'Only the 20% first-tier value is confirmed against real text this round — 40/60 for tiers 2-3 assumed linear, not independently re-verified.',
  },
  // "All allies" — she's one of her own allies, same principle as
  // Yaoguang's Zone. Self-applicable, no cross-character modeling needed.
  // Flat 10% at every level (no scaling) per real data — no per-level
  // array needed.
  {
    name: 'Memosprite Talent (Netherwing summon DMG boost)',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Memosprite Talent: Roar Rumbles the Realm',
    statType: 'DMG_PERCENT',
    trigger: 'When Netherwing is summoned, lasting 3 turns',
    valuesByStack: [10],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
  // Confirmed exact match against real Trace text (30/60/.../180, stack
  // 6) — single-tier trace (no per-level progression in the source data),
  // so no valuesByStackPerLevel needed here, unlike the ability
  // multipliers above.
  {
    name: 'DMG increase per Breath Scorches the Shadow use',
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    // "Trace: " prefix gates this on whether the trace node is actually
    // unlocked on the account — wasn't gated before, same fix already
    // applied to Silver Wolf/Archer's trace-sourced conditionals.
    sourceAbilityName: 'Trace: Where the West Wind Dwells',
    // sourceAbilityName above has to be the TRACE's own name for the
    // unlock-gating check, but the trace's stacks are actually driven by
    // a DIFFERENT ability being cast (Breath Scorches the Shadow) — those
    // are two different strings, so a separate field points stack-count
    // resolution at the right one. Without this, the stack count had no
    // rotation-driven source at all and silently fell back to a manual
    // dropdown defaulting to 0 — meaning this bonus (and by extension its
    // appliesToAbility: 'ALL' reach into Wings Sweep the Ruins) never
    // actually applied unless someone noticed and set it by hand. Matches
    // Memosprite Skill: Breath Scorches the Shadow's real ability name —
    // calcAbilityCastCounts sums countPerRotation across all 3 tiered rows
    // sharing that name, so 3 casts in the rotation now correctly resolve
    // to 3 stacks (capped at 6) automatically.
    stackSourceAbilityName: 'Memosprite Skill: Breath Scorches the Shadow',
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