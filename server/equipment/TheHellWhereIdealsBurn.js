// Flat +16% CRIT Rate NOT included — always-active/unconditional, so it's
// already reflected in the character's live-fetched CRIT Rate stat before
// this app applies any conditionals, same rule as an unconditional relic
// set 2pc bonus (and the same fix applied to Dazzled by a Flowery World's
// CRIT DMG). Only the genuinely conditional entries below are included.

const itemName = 'The Hell Where Ideals Burn';

const conditionalsByTier = {
  passive: [
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