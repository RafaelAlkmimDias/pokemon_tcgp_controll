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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_is_all_zero() {
        let stats = compute_card_stats(&[]);
        assert_eq!((stats.common_owned, stats.common_total), (0, 0));
        assert_eq!((stats.all_owned, stats.all_total), (0, 0));
    }

    #[test]
    fn counts_owned_only_when_quantity_above_zero() {
        let stats = compute_card_stats(&[(Rarity::C, 0), (Rarity::C, 1), (Rarity::C, 5)]);
        assert_eq!(stats.all_total, 3);
        assert_eq!(stats.all_owned, 2);
    }

    #[test]
    fn common_bucket_excludes_epic_and_legendary_rarities() {
        let cards = [
            (Rarity::C, 1),  // common, owned
            (Rarity::Rr, 0), // common, not owned
            (Rarity::Ar, 1), // not common - excluded from common_* even though owned
            (Rarity::Ssr, 1),
        ];
        let stats = compute_card_stats(&cards);
        assert_eq!(stats.all_total, 4);
        assert_eq!(stats.all_owned, 3);
        assert_eq!(stats.common_total, 2);
        assert_eq!(stats.common_owned, 1);
    }
}
