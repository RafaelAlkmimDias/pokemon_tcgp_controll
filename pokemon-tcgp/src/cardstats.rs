// Mirrors src/lib/cardStats.ts.

use crate::models::Rarity;

pub struct CardStats {
    pub common_owned: u32,
    pub common_total: u32,
    pub all_owned: u32,
    pub all_total: u32,
}

pub fn compute_card_stats(cards: &[(Rarity, i64)]) -> CardStats {
    let mut stats = CardStats {
        common_owned: 0,
        common_total: 0,
        all_owned: 0,
        all_total: 0,
    };

    for &(rarity, owned_quantity) in cards {
        stats.all_total += 1;
        let owned = owned_quantity > 0;
        if owned {
            stats.all_owned += 1;
        }

        if rarity.is_common() {
            stats.common_total += 1;
            if owned {
                stats.common_owned += 1;
            }
        }
    }

    stats
}
