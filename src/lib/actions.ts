"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function adjustOwnedQuantity(cardId: string, delta: number) {
  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId } });
  await prisma.card.update({
    where: { id: cardId },
    data: { ownedQuantity: Math.max(0, card.ownedQuantity + delta) },
  });
  revalidatePath("/", "layout");
}

export async function incrementOwnedQuantity(cardId: string) {
  await adjustOwnedQuantity(cardId, 1);
}

export async function decrementOwnedQuantity(cardId: string) {
  await adjustOwnedQuantity(cardId, -1);
}
