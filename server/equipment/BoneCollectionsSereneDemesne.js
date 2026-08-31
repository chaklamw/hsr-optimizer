// Flat +12% Max HP NOT included — Max HP is a live-fetched stat, same
// treatment as ATK, same rule as every other flat set bonus.

const itemName = "Bone Collection's Serene Demesne";

const conditionalsByTier = {
  '2pc': [
    {
      name: "Bone Collection's Serene Demesne Max HP threshold CRIT DMG",
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: "Bone Collection's Serene Demesne (2pc)",
      statType: 'CRIT_DMG',
      trigger: "When wearer's Max HP is 5000 or higher: +28% CRIT DMG, also applies to memosprite",
      valuesByStack: [28],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };