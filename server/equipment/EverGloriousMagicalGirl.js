// Hand-authored equipment conditionals for the "Ever-Glorious Magical Girl"
// relic set. Character-agnostic — applies to whoever has 2pc/4pc equipped.
// The flat +16% CRIT DMG (2pc) is NOT included here — that's an
// unconditional stat boost already applied via relicSets[setID].properties
// in computeFinalStats, and re-adding it here would double-count it (same
// rule the old Groq extraction prompt followed).

const itemName = 'Ever-Glorious Magical Girl';

const conditionalsByTier = {
  '2pc': [
    // Flat +16% CRIT DMG — unconditional, already applied via
    // computeFinalStats properties. Intentionally no entry here.
  ],
  '4pc': [
    {
      name: 'Ever-Glorious Magical Girl (4pc) DEF ignore',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Ever-Glorious Magical Girl (4pc)',
      statType: 'DEF_PEN',
      trigger:
        'Elation DMG dealt by the wearer (and memosprites) ignores 10% DEF, +1% per 5 accumulated Punchline, stacking up to 10 times',
      valuesByStack: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      maxStacks: 10,
      overflow: null,
      restrictedToDamageType: 'ELATION',
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };