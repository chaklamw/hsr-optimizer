// Hand-authored equipment conditionals for "When She Decided to See".
// Superimposition 1 values only (matches this app's current lack of
// superimposition tracking, same limitation as Welcome to the Cosmic City).

const itemName = 'When She Decided to See';

const conditionalsByTier = {
  passive: [
    {
      name: 'Great Fortune CRIT Rate buff',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'When She Decided to See (S1)',
      statType: 'CRIT_RATE',
      trigger:
        'While the wearer holds "Great Fortune" (gained on combat entry or using Ult on an ally, 3 turns): all allies +10% CRIT Rate',
      valuesByStack: [10],
      maxStacks: 1,
      overflow: null,
      suspicious: true,
      suspiciousNote:
        'This is a team-wide buff (applies to whoever the wearer is supporting, not necessarily the ' +
        'wearer themselves) — this app currently has no way to model "buff applies to a DIFFERENT ' +
        'character than the one being calculated." Needs a design decision before this is usable, same ' +
        'open question as the Great Boon talent.',
    },
    {
      name: 'Great Fortune CRIT DMG buff',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'When She Decided to See (S1)',
      statType: 'CRIT_DMG',
      trigger:
        'While the wearer holds "Great Fortune" (gained on combat entry or using Ult on an ally, 3 turns): all allies +30% CRIT DMG',
      valuesByStack: [30],
      maxStacks: 1,
      overflow: null,
      suspicious: true,
      suspiciousNote: 'Same team-wide-buff caveat as the CRIT Rate entry above.',
    },
  ],
};

export { itemName, conditionalsByTier };