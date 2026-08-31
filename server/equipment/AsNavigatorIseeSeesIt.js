// Flat +12% ATK (2pc) NOT included — unconditional, already applied via
// computeFinalStats properties, same rule as every other flat set bonus.

const itemName = 'As Navigator Isee Sees It';

const conditionalsByTier = {
  '2pc': [],
  '4pc': [
    {
      name: 'As Navigator Isee Sees It (4pc) Skill/Ult DMG stacks',
      // Applies to both Skill and Ultimate DMG per the real kit text.
      // conditionalAppliesToSkill (Profilepage.jsx) now accepts an array
      // here instead of forcing a single ability-type string, so both are
      // covered without the SKILL-only workaround this entry used to need.
      appliesToAbility: ['SKILL', 'ULT'],
      restrictedToAbilityName: null,
      sourceAbilityName: 'As Navigator Isee Sees It (4pc)',
      statType: 'DMG_PERCENT',
      trigger:
        'On combat entry or using Skill, stacking up to 3 times (decays 1 stack per turn start or after Ultimate)',
      valuesByStack: [18, 36, 54],
      maxStacks: 3,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };