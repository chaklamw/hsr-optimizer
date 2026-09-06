const itemName = 'Diviner of Distant Reach';

const conditionalsByTier = {
  '4pc': [
    {
      name: 'Diviner of Distant Reach SPD threshold CRIT Rate',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Diviner of Distant Reach (4pc)',
      statType: 'CRIT_RATE',
      trigger:
        "Before combat, if wearer's SPD >= 120/160 (checked once, pre-combat): +10%/18% CRIT Rate. " +
        'Two mutually-exclusive tiers, not additive.',
      // BUG FIX: maxStacks was 1, which caps the stack dropdown at 0/1 —
      // stack=1 resolves valuesByStack[0] (10), but valuesByStack[1] (18)
      // was completely unreachable, since nothing in the app ever
      // resolves a stack count above maxStacks. mutuallyExclusiveTiers
      // (below) isn't actually read anywhere in Profilepage.jsx — it's
      // documentation-only, same as several other flags found unused
      // elsewhere in this project (bounceHitCount, and isEnhancedOnly/
      // replacesAbilityName before those got wired up). Since there's no
      // separate "pick one of two tiers" UI actually implemented, the
      // correct way to expose both tiers through the existing generic
      // stack dropdown is to treat this as 3 selectable options (0/1/2),
      // not 2 — maxStacks: 2 makes stack=1 -> +10% (SPD>=120) and
      // stack=2 -> +18% (SPD>=160) both reachable. Not "additive stacks"
      // in the usual sense (this bonus was never meant to combine to
      // 10+18=28%), just reusing the same mechanism to pick one of three
      // states, which is exactly what mutuallyExclusiveTiers describes.
      valuesByStack: [10, 18],
      maxStacks: 2,
      overflow: null,
      mutuallyExclusiveTiers: true,
      suspicious: false,
      suspiciousNote: '',
    },
    // Real text: "When the wearer uses Elation Skill for the first time
    // in each battle, increases all allies' Elation by 10%." Previously
    // excluded here as a "team-wide buff problem" (same framing as
    // WhenSheDecidedToSee.js) — that reasoning was too conservative for
    // THIS specific case. The wearer IS one of their own allies, so this
    // self-applies exactly like Yao Guang's Zone Elation Boost and
    // Sparxie's Frenzy! Palette of Truth and Lies already do — it only
    // becomes a genuine cross-character problem for buffs that
    // exclusively target teammates OTHER than the wearer. This is a flat
    // additive Elation-stat increase (not a "% of current Elation"
    // self-referential multiplier like Yao Guang's mechanic — the real
    // text just says "by 10%", not "by 10% of their own Elation"), which
    // already has dedicated infrastructure: ELATION_PERCENT_FLAT_ADD,
    // summed via sumConditionalStat and folded directly into
    // effectiveElationPercent in Profilepage.jsx. No per-level scaling —
    // relic set bonuses don't level up.
    //
    // Modeled as a manual on/off toggle (maxStacks: 1) rather than
    // anything automatic, since this app doesn't track per-battle cast
    // history — toggle it on once you're assuming the wearer has already
    // cast their Elation Skill this battle.
    {
      name: 'Diviner of Distant Reach first Elation Skill cast',
      appliesToAbility: 'ALL',
      restrictedToAbilityName: null,
      sourceAbilityName: 'Diviner of Distant Reach (4pc)',
      statType: 'ELATION_PERCENT_FLAT_ADD',
      trigger:
        "After the wearer uses Elation Skill for the first time in the battle, increases all allies' Elation by 10% (self-applicable — the wearer is one of their own allies)",
      valuesByStack: [10],
      maxStacks: 1,
      overflow: null,
      suspicious: false,
      suspiciousNote: '',
    },
  ],
};

export { itemName, conditionalsByTier };