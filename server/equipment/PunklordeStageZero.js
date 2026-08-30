// Hand-authored equipment conditionals for the "Punklorde Stage Zero"
// relic set (2pc only — no 4pc tier exists for this set).
// The flat +8% Elation (2pc) is NOT included — unconditional, already
// applied via computeFinalStats properties.

const itemName = 'Punklorde Stage Zero';

const conditionalsByTier = {
  '2pc': [
    {
      name: 'Punklorde Stage Zero (2pc) CRIT DMG tiers',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Punklorde Stage Zero (2pc)',
      statType: 'CRIT_DMG',
      trigger:
        'When Elation first reaches 40%/80% in combat — mutually-exclusive tier, 80% supersedes 40%, not additive',
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