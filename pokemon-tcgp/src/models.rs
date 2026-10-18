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
