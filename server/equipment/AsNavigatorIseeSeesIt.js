// Flat +12% ATK (2pc) NOT included — unconditional, already applied via
// computeFinalStats properties, same rule as every other flat set bonus.

const itemName = 'As Navigator Isee Sees It';

const conditionalsByTier = {
  '2pc': [],
  '4pc': [
    {
      name: 'As Navigator Isee Sees It (4pc) Skill/Ult DMG stacks',
      // NOTE: this buff genuinely applies to BOTH Skill and Ultimate per
      // the real kit text, but this app's conditional schema only
      // supports one appliesToAbility value per entry (strict equality
      // match, not a bitwise OR despite AbilityType being defined as bit
      // flags elsewhere in damageCalculator.js). Scoped to SKILL only for
      // now since that's Archer's primary damage source — Ultimate does
      // NOT currently receive this bonus in the calculator even though it
      // should per the real text. Flagging rather than silently guessing
      // a workaround; worth fixing in conditionalAppliesToSkill if this
      // pattern comes up again for another character.
      appliesToAbility: 'SKILL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'As Navigator Isee Sees It (4pc)',
      statType: 'DMG_PERCENT',
      trigger:
        'On combat entry or using Skill, stacking up to 3 times (decays 1 stack per turn start or after Ultimate) — also applies to Ultimate DMG per the real text, not currently modeled here',
      valuesByStack: [18, 36, 54],
      maxStacks: 3,
      overflow: null,
      suspicious: true,
      suspiciousNote: 'Ultimate-side application of this buff is not modeled — see comment above.',
    },
  ],
};

export { itemName, conditionalsByTier };