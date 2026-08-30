const itemName = 'Lushaka, the Sunken Seas';

// Neither of this set's 2pc effects apply to the wearer's own damage:
// +5% Energy Regen isn't a damage-affecting stat this app models as a
// conditional, and the +12% ATK effect explicitly buffs "the first
// character in the team lineup" — a different character than whoever is
// wearing this set. No entries to add until team-wide/other-character
// buffs are supported.
const conditionalsByTier = {
  '2pc': [],
};

export { itemName, conditionalsByTier };