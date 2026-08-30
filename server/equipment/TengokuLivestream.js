// Flat +16% CRIT DMG (2pc) NOT included — unconditional, already applied
// via computeFinalStats properties, same rule as every other flat set
// bonus. Only the genuinely conditional part is included below.

const itemName = 'Tengoku@Livestream';

const conditionalsByTier = {
  '2pc': [
    {
      name: 'Tengoku@Livestream SP-consumption CRIT DMG',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Tengoku@Livestream (2pc)',
      statType: 'CRIT_DMG',
      trigger: 'If 3 or more Skill Points are consumed in the same turn, lasting 3 turns',
      valuesByStack: [32],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };