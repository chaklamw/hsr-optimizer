const itemName = 'Diviner of Distant Reach';

const conditionalsByTier = {
  '4pc': [
    {
      name: 'Diviner of Distant Reach SPD threshold CRIT Rate',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Diviner of Distant Reach (4pc)',
      statType: 'CRIT_RATE',
      trigger:
        "Before combat, if wearer's SPD >= 120/160 (checked once, pre-combat): +10%/18% CRIT Rate. " +
        'Two mutually-exclusive tiers, not additive.',
      valuesByStack: [10, 18],
      maxStacks: 1,
      overflow: null,
      mutuallyExclusiveTiers: true,
      suspicious: false,
      suspiciousNote: '',
    },
    // NOT included: "When the wearer uses Elation Skill for the first time
    // in each battle, increases all allies' Elation by 10%." Same
    // team-wide-buff problem flagged in WhenSheDecidedToSee.js — this
    // buffs OTHER characters, not the wearer's own damage. Left out
    // pending a decision on how this app should model that.
  ],
};

export { itemName, conditionalsByTier };