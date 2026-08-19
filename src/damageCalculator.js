// Bit flags identifying which attack a set of buffs applies to. A buff that
// only boosts Skill DMG shouldn't affect a Basic ATK calculation, and this
// lets a single buff list be filtered by the relevant flag rather than
// hardcoding per-ability special cases everywhere.
export const AbilityType = {
  BASIC: 1 << 0,
  SKILL: 1 << 1,
  ULT: 1 << 2,
  FUA: 1 << 3,
  DOT: 1 << 4,
};

// Standard HSR damage estimate: scaling stat x skill multiplier, modified by
// DEF mitigation, enemy RES, elemental DMG bonus, and expected CRIT value.
// Enemy assumptions (level, RES%, DEF shred%) are estimates you provide,
// not simulated combat — there's no real enemy to reference.
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
  abilityType = AbilityType.SKILL,
  vulnerabilityPercent = 0,
  brokenMultiplier = 1,
}) {
  const baseDmg = scalingStatValue * (skillMultiplierPercent / 100);

  const levelMultiplier = characterLevel * 10 + 200;
  const enemyDefense = (enemyLevel * 10 + 200) * (1 - defShredPercent / 100);
  const defMultiplier = levelMultiplier / (levelMultiplier + enemyDefense);

  const resMultiplier = 1 - enemyResPercent / 100;
  const dmgBonusMultiplier = 1 + elementalDmgPercent / 100;
  const critMultiplier = 1 + (critRatePercent / 100) * (critDmgPercent / 100);
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

  // abilityType isn't used in the formula yet — it's here so callers can
  // start tagging calculations now. Once character-specific conditional
  // buffs are added, each buff will declare which AbilityType flag(s) it
  // applies to, and only matching buffs will feed into dmgBonusMultiplier
  // for a given call.
}