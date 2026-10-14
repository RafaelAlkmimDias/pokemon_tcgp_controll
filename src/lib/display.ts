import type { CardType, Rarity } from "@prisma/client";

export const RARITY_LABEL: Record<Rarity, string> = {
  C: "Comum",
  U: "Incomum",
  R: "Rara",
  RR: "Dupla Rara",
  AR: "Arte Rara",
  SR: "Rara Especial",
  SAR: "Arte Rara Especial",
  IM: "Rara Imersiva",
  UR: "Ultra Rara",
  S: "Shiny",
  SSR: "Super Rara Especial",
  UNKNOWN: "Desconhecida",
};

export const RARITY_CLASS: Record<Rarity, string> = {
  C: "rarity-common",
  U: "rarity-common",
  R: "rarity-rare",
  RR: "rarity-rare",
  AR: "rarity-epic",
  SR: "rarity-epic",
  SAR: "rarity-epic",
  IM: "rarity-legendary",
  UR: "rarity-legendary",
  S: "rarity-legendary",
  SSR: "rarity-legendary",
  UNKNOWN: "rarity-common",
};

export const TYPE_LABEL: Record<CardType, string> = {
  POKEMON: "Pokémon",
  SUPPORTER: "Suporte",
  ITEM: "Item",
  TOOL: "Ferramenta",
  FOSSIL: "Fóssil",
};

export function formatDate(date: Date | null) {
  if (!date) return "Data desconhecida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
