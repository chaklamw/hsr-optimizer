// Flat +30% Max HP NOT included — Max HP is a live-fetched stat, same
// treatment as ATK; a light cone's flat stat contribution is already
// reflected in the character's own fetched stats when actually equipped.

const itemName = 'Make Farewells More Beautiful';

const conditionalsByTier = {
  passive: [
    {
      name: 'Make Farewells More Beautiful Death Flower DEF ignore',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Make Farewells More Beautiful (S1)',
      statType: 'DEF_PEN',
      trigger:
        'When the wearer or their memosprite loses HP during their own turn, gains "Death Flower" (2 turns): ignores 30% DEF',
      valuesByStack: [30],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
    // NOT included: "When the wearer's memosprite disappears, advances
    // the wearer's action by 12%" — action-advance, not a damage/stat
    // conditional this app tracks.
  ],
};

export { itemName, conditionalsByTier };