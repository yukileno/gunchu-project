export const UNLOCKS = Object.freeze([
  { level: 1, icon: '🔴', label: '赤こうら', item: 'red_shell' },
  { level: 2, icon: '🍌', label: 'バナナ ×2', item: 'banana', count: 2 },
  { level: 3, icon: '🟢', label: '緑こうら ×2', item: 'green_shell', count: 2 },
  { level: 4, icon: '🔴', label: '赤こうら ×2', item: 'red_shell', count: 2 },
  { level: 5, icon: '🏁', label: '100cc' },
  { level: 6, icon: '🔵', label: '青こうら', item: 'blue_shell' },
  { level: 7, icon: '🍄', label: 'キノコ', item: 'mushroom' },
  { level: 8, icon: '🍄', label: 'トリプルキノコ', item: 'triple_mushroom', count: 3 },
  { level: 9, icon: '⚡', label: 'サンダー', item: 'lightning' },
  { level: 10, icon: '⭐', label: 'スター', item: 'star' },
  { level: 11, icon: '🏆', label: '150cc' },
]);

export function itemPool(masterCount) {
  const pool = new Map([['banana', 1], ['green_shell', 1]]);
  for (const reward of UNLOCKS) {
    if (reward.item && reward.level <= masterCount) pool.set(reward.item, reward.count ?? 1);
  }
  return pool;
}
