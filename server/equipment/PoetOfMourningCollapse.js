// Flat +10% Quantum DMG (2pc) NOT included — unconditional, already
// applied via computeFinalStats properties, same rule as every other flat
// set bonus. -8% SPD (4pc) also not included — not a damage/stat
// conditional this app tracks.

const itemName = 'Poet of Mourning Collapse';

const conditionalsByTier = {
  '2pc': [],
  '4pc': [
    {
      name: 'Poet of Mourning Collapse (4pc) SPD threshold CRIT Rate',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Poet of Mourning Collapse (4pc)',
      statType: 'CRIT_RATE',
      trigger:
        "Before combat, if wearer's SPD < 110/95 (checked once, pre-combat, after this set's own -8% SPD): +20%/32% CRIT Rate, also applies to memosprite. Two mutually-exclusive tiers, not additive.",
      valuesByStack: [20, 32],
      maxStacks: 1,
      overflow: null,
      mutuallyExclusiveTiers: true,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };