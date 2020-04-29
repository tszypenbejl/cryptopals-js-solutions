"use strict";

const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

const frequentLetterCodes = new Set("etaoinshrdlu ETAOINSHRDLU".split("").map((c) => c.charCodeAt(0)));
const keyCandidates = [...Array(256).keys()];

const findXorKey = (input) =>
  keyCandidates
    .map((key) => ({
      key,
      score: input.reduce((score, byte) => score + frequentLetterCodes.has(byte ^ key), 0),
    }))
    .reduce((bestSoFar, next) => (next.score > bestSoFar.score ? next : bestSoFar), { score: -1 });

(async () => {
  const encryptedInputs = (await readFileAsync("4.txt", "ascii")).split("\n").map((line) => Buffer.from(line, "hex"));
  const { input, lineIndex, key } = encryptedInputs
    .map((input, lineIndex) => ({ input, lineIndex, ...findXorKey(input) }))
    .reduce((bestSoFar, next) => (next.score > bestSoFar.score ? next : bestSoFar), { score: -1 });
  const output = input.map((byte) => byte ^ key).toString();
  console.log(`Line ${lineIndex + 1} can be decrypted with key ${key}: ${JSON.stringify(output)}`);
})();
