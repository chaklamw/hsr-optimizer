// Hand-authored kit for Yaoguang — DELIBERATELY SCOPED to just Basic ATK
// and Elation Skill, her only two self-contained damage sources. Her
// Skill/Ultimate/Talent and every piece of her signature equipment buff
// OTHER characters, not herself (see prior conversation) — this app has
// no mechanism yet for "buff applies to a different character than the
// one being calculated," so those are intentionally left out entirely
// rather than half-modeled.
//
// Numbers cross-validated: multiple older/beta sources show 100%/20% or
// 90%/30% or 50%/10% for various multipliers here — those are all stale
// pre-release values. The most recent source found (dated after this
// character's launch) matches the real kit text exactly (125% / 5×25%),
// confirming the real kit text is current, not the older web sources.
// Ability names ("Whistlebolt Sings Joy", "Let Thy Fortune Burst in
// Flames") cross-validated across 3+ independent sources agreeing with
// each other — still NEEDS VERIFICATION against this app's actual
// characterSkills data, same as every character so far.

const characterName = 'Yao Guang';

const abilities = {
  // Real text: "Deals Physical DMG equal to 126% of ATK to one designated
  // enemy and Physical DMG equal to 42% of ATK to targets adjacent to it."
  // Blast pattern — main target takes 126%, up to 2 adjacent targets each
  // take 42%, capped by however many enemies actually exist on the field.
  'Basic ATK: Whistlebolt Sings Joy': {
    abilityType: 'BASIC',
    damageType: 'STANDARD',
    scalingStat: 'ATK',
    damageSourceName: null,
    baseMultiplierPercent: 126,
    blastAdjacentMultiplierPercent: 42,
  },

  // Two real components:
  //  1) "Deals 125% Physical Elation DMG to all enemies" — true AoE, no
  //     "split evenly" language, so hitsAllEnemies multiplies by enemy
  //     count rather than dividing.
  //  2) "Then, deals 5 instance(s) of 25% Physical Elation DMG to one
  //     random enemy" — single-target repeated hits, baked into one flat
  //     total (25 x 5 = 125) the same way Silver Wolf's Elation Skill
  //     baked in its 6 bounces, since the count is fixed and always fires
  //     together with the main hit.
  //
  // Woe's Whisper (the +16% DMG-taken debuff this ability also applies)
  // is modeled as a conditional below, not here — it's an enemy-state
  // effect, not part of this ability's own damage instance.
  'Elation Skill: Let Thy Fortune Burst in Flames': {
    abilityType: 'ELATION_SKILL',
    damageType: 'ELATION',
    scalingStat: null,
    damageSourceName: null,
    baseMultiplierPercent: 125,
    hitsAllEnemies: true,
    attachedTriggers: [
      {
        name: 'Let Thy Fortune Burst in Flames (bonus hits)',
        damageType: 'ELATION',
        baseMultiplierPercent: 125, // 25% x 5 instances, single target
        averagedAcrossEnemies: false,
      },
    ],
  },
};

const conditionals = [
  {
    name: "Woe's Whisper",
    appliesToAbility: 'ALL',
    restrictedToAbilityName: null,
    sourceAbilityName: 'Let Thy Fortune Burst in Flames',
    statType: 'VULNERABILITY',
    trigger: 'Enemy targets under "Woe\'s Whisper" (applied by Elation Skill, 3 turns) take increased DMG',
    valuesByStack: [16],
    maxStacks: 1,
    overflow: null,
    suspicious: false,
    suspiciousNote: '',
  },
];

// Best-effort authored rotation — FLAGGED FOR REVIEW like every other
// character's. Since only 2 of her real abilities are modeled at all, this
// is closer to "how often do you land these two hits" than a full combo.
const rotation = [
  { abilityName: 'Basic ATK: Whistlebolt Sings Joy', countPerRotation: 1 },
  { abilityName: 'Elation Skill: Let Thy Fortune Burst in Flames', countPerRotation: 1 },
  {
    abilityName: 'Let Thy Fortune Burst in Flames (bonus hits)',
    countPerRotation: 1,
    isAttachedTrigger: true,
  },
];

export { characterName, abilities, conditionals, rotation };