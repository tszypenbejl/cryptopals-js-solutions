const input = Buffer.from("1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736", "hex");
const frequentLetterCodes = new Set("etaoinshrdlu ETAOINSHRDLU".split("").map((c) => c.charCodeAt(0)));
const keyCandidates = [...Array(256).keys()];
const bestKey = keyCandidates
  .map((key) => ({
    key,
    score: input.reduce((score, byte) => score + frequentLetterCodes.has(byte ^ key), 0),
  }))
  .reduce((bestSoFar, next) => (next.score > bestSoFar.score ? next : bestSoFar), { key: -1, score: -1 }).key;
const output = String.fromCharCode(...input.map((byte) => byte ^ bestKey));
console.log(bestKey);
console.log(output);
