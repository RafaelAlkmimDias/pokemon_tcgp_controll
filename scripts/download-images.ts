import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PACKS_WITH_ART, PROMO_SLUGS } from "@/lib/images";

const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public", "images");
const CONCURRENCY = 16;

function cardRemoteUrl(collectionCode: string, number: number) {
  const slug = PROMO_SLUGS[collectionCode] ?? collectionCode.toLowerCase();
  const padded = String(number).padStart(3, "0");
  return `https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-cards/main/images/webp/cards/${slug}/${padded}.webp`;
}

function packRemoteUrl(packName: string) {
  return `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/images/packs/${encodeURIComponent(packName)}.webp`;
}

function collectionLogoRemoteUrl(collectionCode: string) {
  return `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/images/sets/LOGO_expansion_${collectionCode}_en_US.webp`;
}

type Task = { url: string; dest: string };
type Outcome = "downloaded" | "skipped" | "failed";

async function downloadFile({ url, dest }: Task): Promise<Outcome> {
  try {
    await fs.access(dest);
    return "skipped";
  } catch {
    // doesn't exist yet, fall through to download
  }

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAILED ${url}: ${res.status} ${res.statusText}`);
    return "failed";
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmpDest = `${dest}.tmp`;
  await fs.writeFile(tmpDest, buffer);
  await fs.rename(tmpDest, dest);
  return "downloaded";
}

async function runWithConcurrency(tasks: Task[], limit: number) {
  const counts: Record<Outcome, number> = { downloaded: 0, skipped: 0, failed: 0 };
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex++];
      const outcome = await downloadFile(task);
      counts[outcome]++;
      const done = counts.downloaded + counts.skipped + counts.failed;
      if (done % 200 === 0 || done === tasks.length) {
        console.log(`${done}/${tasks.length} (baixadas=${counts.downloaded} puladas=${counts.skipped} falhas=${counts.failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return counts;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const collections = await prisma.collection.findMany();
  const cards = await prisma.card.findMany({ select: { collectionId: true, number: true } });
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  const cardTasks: Task[] = cards.map((card) => {
    const collection = collectionById.get(card.collectionId)!;
    const slug = PROMO_SLUGS[collection.code] ?? collection.code.toLowerCase();
    const padded = String(card.number).padStart(3, "0");
    return {
      url: cardRemoteUrl(collection.code, card.number),
      dest: path.join(PUBLIC_IMAGES_DIR, "cards", slug, `${padded}.webp`),
    };
  });

  const packTasks: Task[] = [...PACKS_WITH_ART].map((name) => ({
    url: packRemoteUrl(name),
    dest: path.join(PUBLIC_IMAGES_DIR, "packs", `${name}.webp`),
  }));

  const setTasks: Task[] = collections.map((collection) => ({
    url: collectionLogoRemoteUrl(collection.code),
    dest: path.join(PUBLIC_IMAGES_DIR, "sets", `${collection.code}.webp`),
  }));

  const tasks = [...cardTasks, ...packTasks, ...setTasks];
  console.log(`Baixando ${tasks.length} imagens (cartas=${cardTasks.length}, pacotes=${packTasks.length}, logos=${setTasks.length})...`);

  const counts = await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`Concluído. baixadas=${counts.downloaded} puladas=${counts.skipped} falhas=${counts.failed}`);

  await prisma.$disconnect();
  if (counts.failed > 0) process.exitCode = 1;
}

main();
