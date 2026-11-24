import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRIEFING_FILE = "entry.png";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from("0000000049454e44ae426082", "hex");
const MAX_BYTES = 1024 * 1024;
const MAX_EDGE = 1024;

function programDirectory(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function outputDirectory(): string {
  const requested = process.env.MAKEFUN_OUTPUT_DIR;
  if (typeof requested === "string" && requested.length > 0) {
    return requested;
  }
  return "/output";
}

function assertWithinLimits(briefing: Buffer): void {
  if (briefing.length < 1 || briefing.length > MAX_BYTES) {
    throw new Error(`briefing is ${briefing.length} bytes; the limit is ${MAX_BYTES}`);
  }
  if (briefing.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    assertPng(briefing);
    return;
  }
  if (briefing[0] === 0xff && briefing[1] === 0xd8 && briefing[2] === 0xff) {
    if (briefing[briefing.length - 2] !== 0xff || briefing[briefing.length - 1] !== 0xd9) {
      throw new Error("JPEG does not end with the EOI marker");
    }
    return;
  }
  throw new Error("briefing must be a PNG or a JPEG");
}

function assertPng(briefing: Buffer): void {
  if (briefing.length < 24 || briefing.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("PNG is missing its IHDR chunk");
  }
  const width = briefing.readUInt32BE(16);
  const height = briefing.readUInt32BE(20);
  if (width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE) {
    throw new Error(`PNG is ${width} by ${height}; the limit is ${MAX_EDGE} by ${MAX_EDGE}`);
  }
  if (!briefing.subarray(briefing.length - PNG_IEND.length).equals(PNG_IEND)) {
    throw new Error("PNG does not end with an IEND chunk");
  }
}

function publishBriefing(): void {
  const briefing = readFileSync(join(programDirectory(), BRIEFING_FILE));
  assertWithinLimits(briefing);
  const destination = outputDirectory();
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, BRIEFING_FILE), briefing);
}

publishBriefing();
