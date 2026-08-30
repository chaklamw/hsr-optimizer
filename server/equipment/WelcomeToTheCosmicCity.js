// Hand-authored equipment conditionals for the light cone "Welcome to the
// Cosmic City". Character-agnostic — applies to whoever has it equipped,
// same as the old equipment-conditionals-cache.json entries did, just
// without the Groq round trip. Superimposition 1 values only for now
// (this app doesn't track superimposition rank in the request yet).

const itemName = 'Welcome to the Cosmic City';

const conditionalsByTier = {
  passive: [
    {
      name: 'Welcome to the Cosmic City DEF ignore',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Welcome to the Cosmic City (S1)',
      statType: 'DEF_PEN',
      trigger: 'Elation DMG dealt ignores 20% of target DEF while equipped',
      valuesByStack: [20],
      maxStacks: 1,
      overflow: null,
      restrictedToDamageType: 'ELATION',
      suspicious: false,
      suspiciousNote: '',
    },
    // Not extracted as a DMG_PERCENT/stat conditional: using Ultimate on
    // self grants 20 Punchline (once, resets after 3 Basic ATKs). This is
    // a resource-gain effect, not a direct damage/stat bonus, so it
    // doesn't fit this app's conditional shape — worth surfacing in a
    // tooltip later, but not as a calculator-affecting entry.
  ],
};

export { itemName, conditionalsByTier };