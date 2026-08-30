const itemName = 'The Hell Where Ideals Burn';

const conditionalsByTier = {
  passive: [
    {
      name: 'The Hell Where Ideals Burn CRIT Rate',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'The Hell Where Ideals Burn (S1)',
      statType: 'CRIT_RATE',
      trigger: 'Always active while equipped',
      valuesByStack: [16],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
    {
      name: 'The Hell Where Ideals Burn SP-limit ATK buff',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'The Hell Where Ideals Burn (S1)',
      statType: 'ATK_PERCENT',
      trigger: "On combat entry, if allies' Skill Point limit is 6 or higher",
      valuesByStack: [40],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
    {
      name: 'The Hell Where Ideals Burn Skill-use ATK stacks',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'The Hell Where Ideals Burn (S1)',
      statType: 'ATK_PERCENT',
      trigger: 'After each use of the wearer\'s Skill, stacking up to 4 times',
      valuesByStack: [10, 20, 30, 40],
      maxStacks: 4,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };