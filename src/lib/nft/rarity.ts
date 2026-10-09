// Styling only. Per-identity rarity is returned after an onchain reveal check.
export const rarityKey = (name:string):string => name.toLowerCase().replaceAll(' ','-');
