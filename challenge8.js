"use strict";

const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));

const BLOCK_SIZE = 16; // bytes
const HEX_BLOCK_SIZE = 2 * BLOCK_SIZE;

(async () => {
  const inputs = (await readFileAsync("8.txt", "ascii")).split("\n");
  const { lineIndex, blockDuplicateCount } = inputs
    .map((input, lineIndex) => {
      const blocks = splitIntoBlocks(input, HEX_BLOCK_SIZE, Math.floor(input.length / HEX_BLOCK_SIZE));
      const blockDuplicateCount = blocks.length - new Set(blocks).size;
      return { lineIndex, blockDuplicateCount };
    })
    .filter((lineStats) => lineStats.blockDuplicateCount > 0)
    .sort((a, b) => -(a.blockDuplicateCount - b.blockDuplicateCount))[0];
  console.log(`Line ${lineIndex + 1} is likely encrypted with ECB as it contains ${blockDuplicateCount} repeated blocks.`);
})();
