// Currently supports two damage archetypes, standard being dealt universally and Elation damage
// being dealt exclusively by Elation characters. Future support will include break / super break
// damage, damage over time (e.g Kafka, Black Swan, etc,.), and true damage.
export const DamageType = {
  STANDARD: 'STANDARD',
  ELATION: 'ELATION',
};

// Standard HSR damage formula, taken from https://honkai-star-rail.fandom.com/wiki/Damage
// Capped crit rate, any crit rate above 100% is not being factored unless for special cases 
// such as Silver Wolf LV.999's crit rate conversion to crit damage, but that's not factored in here.
// This means that users can still functionally go above 100% crit rate and it will be displayed
// on the profile, but it will not mean an increase in damage as functionally, going above 100%
// crit rate does not influence damage.
export function computeDamage({
  scalingStatValue,
  skillMultiplierPercent,
  characterLevel,
  enemyLevel,
  enemyResPercent,
  defShredPercent,
  elementalDmgPercent,
  critRatePercent,
  critDmgPercent,
  vulnerabilityPercent = 0,
  brokenMultiplier = 1,
}) {
  const baseDmg = scalingStatValue * (skillMultiplierPercent / 100);

  const levelMultiplier = characterLevel * 10 + 200;
  const enemyDefense = (enemyLevel * 10 + 200) * (1 - defShredPercent / 100);
  const defMultiplier = levelMultiplier / (levelMultiplier + enemyDefense);

  const resMultiplier = 1 - enemyResPercent / 100;
  const dmgBonusMultiplier = 1 + elementalDmgPercent / 100;
  const clampedCritRatePercent = Math.min(critRatePercent, 100);
  const critMultiplier = 1 + (clampedCritRatePercent / 100) * (critDmgPercent / 100);
  const vulnerabilityMultiplier = 1 + vulnerabilityPercent / 100;

  return (
    baseDmg *
    defMultiplier *
    resMultiplier *
    dmgBonusMultiplier *
    critMultiplier *
    vulnerabilityMultiplier *
    brokenMultiplier
  );
}

// Elation DMG is calculated on a different formula than that of standard damage.
// Taken from https://honkai-star-rail.fandom.com/wiki/Elation_DMG
// It scales off of a character's Elation stat, their level, and punchline / certified banger / 
// merrymake multipliers rather than the standard ATK/DEF/HP scaling. Likewise, it means that 
// Elation DMG does not get influenced by generic buffs such as DMG % bonus. 
// Below is the Elation level multipliers taken from the HSR wiki. 
// Keep in mind arrays are 0-indexed, meaning that index 0 is actually lvl 1, so to access any
// specific level, need to do it with level - 1.
const ELATION_LEVEL_MULTIPLIER = [
  108.0, 116.0, 124.0, 135.05276, 141.0188, 147.04564, 153.1321, 159.27693, 165.47893, 171.73688,
  182.98882, 194.13596, 205.17833, 216.11589, 226.94867, 237.67665, 248.29984, 258.81824, 269.23184, 279.54068,
  298.66458, 317.60223, 336.35364, 354.9188, 373.2977, 391.49036, 409.49677, 427.31693, 444.9508, 462.39847,
  492.85513, 522.36194, 550.94666, 578.6358, 605.45496, 631.4288, 656.58093, 680.93427, 704.51074, 727.3316,
  816.248, 903.5766, 989.35956, 1073.6376, 1156.4498, 1237.8344, 1317.8276, 1396.4651, 1473.781, 1549.8082,
  1742.1199, 1929.7411, 2112.8413, 2291.582, 2466.117, 2636.593, 2803.1501, 2965.9216, 3125.0356, 3280.6135,
  3504.643, 3723.8022, 3938.2483, 4148.132, 4353.5967, 4554.781, 4751.817, 4944.832, 5133.9478, 5319.2812,
  5560.609, 5797.2046, 6029.206, 6256.746, 6479.9517, 6698.9463, 6913.847, 7124.7686, 7331.82, 7535.107,
];

export function getElationBaseDmg(characterLevel) {
  const clampedLevel = Math.min(80, Math.max(1, Math.round(characterLevel)));
  return ELATION_LEVEL_MULTIPLIER[clampedLevel - 1];
}

function computePunchlineMultiplier(punchlineOrBangerValue) {
  return 1 + (punchlineOrBangerValue * 5) / (punchlineOrBangerValue + 240);
}

export function computeElationDamage({
  abilityMultiplierPercent,
  characterLevel,
  enemyLevel,
  elationPercent = 0,
  merrymakePercent = 0,
  punchlineValue = 0,
  critRatePercent = 0,
  critDmgPercent = 0,
  defBonusPercent = 0,
  defReductionPercent = 0,
  defIgnorePercent = 0,
  enemyResPercent,
  resPenPercent = 0,
  vulnerabilityPercent = 0,
  dmgMitigationPercents = [],
  brokenMultiplier = 1,
  baseDmgOverride = null,
}) {
  const baseDmg = baseDmgOverride ?? getElationBaseDmg(characterLevel);
  const abilityMultiplier = abilityMultiplierPercent / 100;
  // Likewise with earlier, Elation DMG does have some crit scaling in it, and functionally any crit
  // rate above 100% does not influence the damage.  
  const clampedCritRatePercent = Math.min(critRatePercent, 100);
  const critMultiplier = 1 + (clampedCritRatePercent / 100) * (critDmgPercent / 100);
  const elationMultiplier = 1 + elationPercent / 100;
  const merrymakeMultiplier = 1 + merrymakePercent / 100;
  const punchlineMultiplier = computePunchlineMultiplier(punchlineValue);

  const defDenominator =
    (enemyLevel + 20) *
      Math.max(0, 1 + defBonusPercent / 100 - defReductionPercent / 100 - defIgnorePercent / 100) +
    (characterLevel + 20);
  const defMultiplier = (characterLevel + 20) / defDenominator;

  const resMultiplier = 1 - (enemyResPercent / 100 - resPenPercent / 100);
  const vulnerabilityMultiplier = 1 + vulnerabilityPercent / 100;
  const dmgMitigationMultiplier = dmgMitigationPercents.reduce(
    (acc, m) => acc * (1 - m / 100),
    1
  );

  return (
    baseDmg *
    abilityMultiplier *
    critMultiplier *
    elationMultiplier *
    merrymakeMultiplier *
    punchlineMultiplier *
    defMultiplier *
    resMultiplier *
    vulnerabilityMultiplier *
    dmgMitigationMultiplier *
    brokenMultiplier
  );
}