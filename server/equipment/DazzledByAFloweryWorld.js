// Hand-authored equipment conditionals for "Dazzled by a Flowery World".
// Superimposition 1 values only, same limitation as When She Decided to
// See / Welcome to the Cosmic City (this app doesn't track superimposition
// rank in the request yet). Full S1-S5 text was provided; S2-S5 values
// (56/64/72/80% CRIT DMG, 6/7/8/9% DEF ignore, 24/28/32/36% Elation) are
// available if superimposition tracking gets added later.
//
// Flat +48% CRIT DMG NOT included — always-active/unconditional, so it's
// already reflected in the character's live-fetched CRIT DMG stat before
// this app applies any conditionals, same rule as an unconditional relic
// set 2pc bonus. Adding it here would double-count it. Only the genuinely
// conditional DEF-ignore stacking below is included.

const itemName = 'Dazzled by a Flowery World';

const conditionalsByTier = {
  passive: [
    {
      name: 'Dazzled by a Flowery World SP-consumption DEF ignore',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Dazzled by a Flowery World (S1)',
      statType: 'DEF_PEN',
      trigger: 'For every 1 Skill Point the wearer consumes, stacking up to 4 times',
      valuesByStack: [5, 10, 15, 20],
      maxStacks: 4,
      overflow: null,
      restrictedToDamageType: 'ELATION',
      suspicious: false,
      suspiciousNote: '',
    },
    // "Stream Promo" (4+ SP consumed in one turn -> +20% all allies'
    // Elation): team-wide, but "all allies" plausibly includes the wearer
    // themselves (same self-inclusive category as Yao Guang's Zone /
    // Castorice's Memosprite Talent buff, not the excluded "buffs a
    // DIFFERENT character" category). Now modeled via
    // ELATION_PERCENT_FLAT_ADD, the new statType added alongside
    // multiplierPerElationPercent — a plain additive Elation-stat bonus,
    // distinct from Yao Guang's multiplicative ELATION_PERCENT_OF_SELF.
    // Applied in computeScenarioTotalDamage BEFORE any %-of-current-Elation
    // multiplier, so a character also running a self-scaling Elation
    // conditional would correctly read this flat bonus as part of their
    // "current" Elation.
    {
      name: 'Dazzled by a Flowery World Stream Promo',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Dazzled by a Flowery World (S1)',
      statType: 'ELATION_PERCENT_FLAT_ADD',
      trigger: 'If 4 or more Skill Points are consumed in the same turn: all allies (including the wearer) +20% Elation',
      valuesByStack: [20],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },

    // Still NOT included (not damage/stat conditionals this app tracks):
    // - Skill Point upper limit +1 per Elation ally in team, up to +3 —
    //   resource-limit effect.
    // - "Light Cone effects of the same type cannot stack" — anti-stacking
    //   rule versus OTHER light cones; this app has no concept of
    //   light-cone-vs-light-cone exclusivity to check against.
  ],
};

export { itemName, conditionalsByTier };