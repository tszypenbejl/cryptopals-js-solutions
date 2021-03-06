"use strict";

const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

const HOW_MANY_BLOCK_PAIRS_TO_COMPARE_FOR_NORMALIZED_DISTANCE = 8;
const HOW_MANY_KEY_SIZES_TO_TRY = 3;

const sum = (a, b) => a + b;
const countBits = (bytes) => bytes.map((byte) => byte.toString(2).replace(/0/g, "").length).reduce(sum);
const hammingDistance = (bytes1, bytes2) => countBits(bytes1.map((byte1, index) => byte1 ^ bytes2[index]));
const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));

const frequentLetterCodes = new Set("etaoinshrdlu ETAOINSHRDLU".split("").map((c) => c.charCodeAt(0)));
const keyCandidates = range(0, 256);
const findXorKey = (input) =>
  keyCandidates
    .map((key) => ({
      key,
      score: input.reduce((score, byte) => score + frequentLetterCodes.has(byte ^ key)),
    }))
    .reduce((bestSoFar, next) => (next.score >= bestSoFar.score ? next : bestSoFar), { score: -1 });

(async () => {
  const input = Buffer.from(await readFileAsync("6.txt", "ascii"), "base64");
  const keySizes = range(2, 41);
  const keySizeCandites = keySizes
    .map((keySize) => {
      const samples = splitIntoBlocks(input, keySize, HOW_MANY_BLOCK_PAIRS_TO_COMPARE_FOR_NORMALIZED_DISTANCE);
      const sampleDistances = samples.map((sample1, index) => hammingDistance(sample1, samples[(index + 1) % samples.length]));
      const normalizedSampleDistance = sampleDistances.reduce(sum) / keySize;
      return { keySize, normalizedSampleDistance };
    })
    .sort((a, b) => a.normalizedSampleDistance - b.normalizedSampleDistance);
  const theKey = keySizeCandites
    .slice(0, HOW_MANY_KEY_SIZES_TO_TRY)
    .map((keySizeCandidate) => keySizeCandidate.keySize)
    .map((keySize) => {
      const inputBlocks = splitIntoBlocks(input, keySize, Math.floor(input.length / keySize));
      const transposedBlocks = range(0, keySize).map((i) => inputBlocks.map((block) => block[i]));
      const keyComponents = transposedBlocks.map((block) => findXorKey(block));
      return { key: keyComponents.map((k) => k.key), score: keyComponents.map((k) => k.score).reduce(sum) };
    })
    .sort((a, b) => -(a.score - b.score))[0].key;

  const output = input.map((byte, index) => byte ^ theKey[index % theKey.length]).toString();
  console.log(theKey);
  console.log(output);
})();
