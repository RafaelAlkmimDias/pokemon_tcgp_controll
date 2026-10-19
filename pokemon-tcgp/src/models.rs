// Mirrors the `Rarity` and `CardType` enums in ../prisma/schema.prisma.
// Stored in SQLite as TEXT (see migrations/0001_init.sql); sqlx's derive
// uses the Display/FromStr impls from strum to convert at the boundary.

use strum::{Display, EnumString};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Display, EnumString, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "UPPERCASE")]
pub enum Rarity {
    C,
    U,
    R,
    #[strum(serialize = "RR")]
    Rr,
    #[strum(serialize = "AR")]
    Ar,
    #[strum(serialize = "SR")]
    Sr,
    #[strum(serialize = "SAR")]
    Sar,
    #[strum(serialize = "IM")]
    Im,
    #[strum(serialize = "UR")]
    Ur,
    S,
    #[strum(serialize = "SSR")]
    Ssr,
    Unknown,
}

impl Rarity {
    // Mirrors isCommonRarity in src/lib/cardStats.ts.
    pub fn is_common(self) -> bool {
        !matches!(
            self,
            Rarity::Ar | Rarity::Sr | Rarity::Sar | Rarity::Im | Rarity::Ur | Rarity::S | Rarity::Ssr
        )
    }

    // Mirrors RARITY_CLASS in src/lib/display.ts (CSS class per rarity tier).
    pub fn css_class(self) -> &'static str {
        match self {
            Rarity::Ar | Rarity::Sr | Rarity::Sar => "rarity-epic",
            Rarity::Im | Rarity::Ur | Rarity::S | Rarity::Ssr => "rarity-legendary",
            _ => "rarity-common",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Display, EnumString, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "UPPERCASE")]
pub enum CardType {
    Pokemon,
    Supporter,
    Item,
    Fossil,
    Tool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_common_excludes_only_epic_and_legendary_tiers() {
        for common in [
            Rarity::C,
            Rarity::U,
            Rarity::R,
            Rarity::Rr,
            Rarity::Unknown,
        ] {
            assert!(common.is_common(), "{common:?} should be common");
        }
        for not_common in [
            Rarity::Ar,
            Rarity::Sr,
            Rarity::Sar,
            Rarity::Im,
            Rarity::Ur,
            Rarity::S,
            Rarity::Ssr,
        ] {
            assert!(!not_common.is_common(), "{not_common:?} should not be common");
        }
    }

    #[test]
    fn css_class_matches_the_three_visual_tiers() {
        assert_eq!(Rarity::C.css_class(), "rarity-common");
        assert_eq!(Rarity::Ar.css_class(), "rarity-epic");
        assert_eq!(Rarity::Ssr.css_class(), "rarity-legendary");
    }

    #[test]
    fn rarity_round_trips_through_its_text_representation() {
        use std::str::FromStr;
        // This is the exact conversion sqlx applies at the TEXT <-> enum
        // boundary (see the `sqlx::Type` derive above) - a label that
        // doesn't round-trip would corrupt every row read back from SQLite.
        for (text, rarity) in [("RR", Rarity::Rr), ("SSR", Rarity::Ssr), ("C", Rarity::C)] {
            assert_eq!(Rarity::from_str(text).unwrap(), rarity);
            assert_eq!(rarity.to_string(), text);
        }
    }
}
