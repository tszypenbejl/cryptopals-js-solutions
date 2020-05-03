"use strict";

const { promisify } = require("util");
const { createCipheriv } = require("crypto");
const readFileAsync = promisify(require("fs").readFile);

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));

const BLOCK_SIZE = 128 / 8;
const PASSWORD = randomUint8Array(BLOCK_SIZE);

const aesEncryptBlock = (block) => {
  const cipher = createCipheriv("aes-128-ecb", PASSWORD, null);
  return Buffer.concat([cipher.update(block), cipher.final()]);
};

const ctrEncryptOrDecrypt = (input) => {
  const keyStreamLength = BLOCK_SIZE * Math.ceil(input.length / BLOCK_SIZE);
  const keyStream = Buffer.alloc(keyStreamLength);

  const produceKeyStream = (counter, offset) => {
    if (offset === keyStreamLength) return;
    const counterBlock = Buffer.alloc(BLOCK_SIZE);
    counterBlock.writeBigUInt64LE(counter, BLOCK_SIZE - 64 / 8);
    aesEncryptBlock(counterBlock).copy(keyStream, offset);
    produceKeyStream(counter + 1n, offset + BLOCK_SIZE);
  };

  produceKeyStream(0n, 0);
  return xorByteArrays(input, keyStream);
};

const guessKeyStream = (encryptedTexts) => {
  const frequentLetterCodes = new Set("etaoinshrdlu ETAOINSHRDLU".split("").map((c) => c.charCodeAt(0)));
  const lowercaseLetterCodes = new Set(range("a".charCodeAt(0), "z".charCodeAt(0) + 1));
  const uppercaseLetterCodes = new Set(range("A".charCodeAt(0), "Z".charCodeAt(0) + 1));
  const unlikelyCodes = new Set("^@#+".split(0).map((c) => c.charCodeAt(0)));

  const scoreXorMask = (xorMask, encryptedBytes) => {
    const decryptedBytes = encryptedBytes.map((byte) => byte ^ xorMask);
    const awardScore = (multiplier, codeSet) => multiplier * decryptedBytes.filter((byte) => codeSet.has(byte)).length;
    return awardScore(8, frequentLetterCodes) + awardScore(4, lowercaseLetterCodes) + awardScore(1, uppercaseLetterCodes) + awardScore(-12, unlikelyCodes);
  };

  const allExpectedBytes = new Set(range(" ".charCodeAt(0), "~".charCodeAt(0) + 1));
  const keyStreamLengthNeeded = Math.max(...encryptedTexts.map((text) => text.length));
  const keyStream = Buffer.alloc(keyStreamLengthNeeded);
  range(0, keyStreamLengthNeeded).forEach((i) => {
    const encryptedBytes = encryptedTexts.map((text) => text[i]).filter((byte) => byte != undefined);
    const possibleXorMasks = range(0, 256).filter((mask) => encryptedBytes.map((byte) => byte ^ mask).every((maskedByte) => allExpectedBytes.has(maskedByte)));
    if (possibleXorMasks.length === 0) throw new Error("allExpectedBytes needs to include more ascii codes");
    keyStream[i] = possibleXorMasks
      .map((mask) => ({ mask, score: scoreXorMask(mask, encryptedBytes) }))
      .reduce((bestSoFar, current) => (current.score > bestSoFar.score ? current : bestSoFar), { score: -1 }).mask;
  });
  return keyStream;
};

(async () => {
  const inputTexts = (await readFileAsync("20.txt", "ascii"))
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => Buffer.from(line, "base64"));

  const encryptedTexts = inputTexts.map((t) => ctrEncryptOrDecrypt(t));

  const keyStream = guessKeyStream(encryptedTexts);

  encryptedTexts.forEach((encryptedText, index) => {
    const decryptedText = xorByteArrays(encryptedText, keyStream).toString();
    const originalText = inputTexts[index].toString();
    if (decryptedText.length !== originalText.length) throw new Error("Decrypted text has wrong length"); // not expecting that to happen
    const diffCount = decryptedText.split("").filter((c, i) => c !== originalText[i]).length;
    if (diffCount === 0) console.log(`OK, correctly decrypted "${decryptedText}"`);
    else console.warn(`${diffCount} wrong characters in "${decryptedText}" (should be "${originalText}")`);
  });
})();
