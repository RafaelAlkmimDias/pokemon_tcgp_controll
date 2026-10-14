"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function adjustOwnedQuantity(printId: string, delta: number) {
  const print = await prisma.print.findUniqueOrThrow({ where: { id: printId } });
  await prisma.print.update({
    where: { id: printId },
    data: { ownedQuantity: Math.max(0, print.ownedQuantity + delta) },
  });
  revalidatePath("/", "layout");
}

export async function incrementOwnedQuantity(printId: string) {
  await adjustOwnedQuantity(printId, 1);
}

export async function decrementOwnedQuantity(printId: string) {
  await adjustOwnedQuantity(printId, -1);
}
