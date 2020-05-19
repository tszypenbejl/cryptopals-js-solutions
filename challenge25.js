"use strict";

const { createCipheriv, createDecipheriv } = require("crypto");
const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));

const BLOCK_SIZE = 128 / 8;

const INPUT_FILE_KEY = Buffer.from("YELLOW SUBMARINE");
const RANDOM_KEY = randomUint8Array(BLOCK_SIZE);

const ecbDecrypt = (input, key) => {
  const decipher = createDecipheriv("aes-128-ecb", key, null);
  return Buffer.concat([decipher.update(input), decipher.final()]);
};

const aesEncryptBlock = (block, key) => {
  const cipher = createCipheriv("aes-128-ecb", key, null);
  return Buffer.concat([cipher.update(block), cipher.final()]);
};

const ctrEncryptOrDecrypt = (input, key) => {
  const keyStreamLength = BLOCK_SIZE * Math.ceil(input.length / BLOCK_SIZE);
  const keyStream = Buffer.alloc(keyStreamLength);

  const produceKeyStream = (counter, offset) => {
    if (offset === keyStreamLength) return;
    const counterBlock = Buffer.alloc(BLOCK_SIZE);
    counterBlock.writeBigUInt64LE(counter, BLOCK_SIZE - 64 / 8);
    aesEncryptBlock(counterBlock, key).copy(keyStream, offset);
    produceKeyStream(counter + 1n, offset + BLOCK_SIZE);
  };

  produceKeyStream(0n, 0);
  return xorByteArrays(input, keyStream);
};

const editCiphertext = (ciphertext, offset, newText) => {
  // ciphertext and newText are, of course, Buffers
  const editedCiphertextLength = Math.max(ciphertext.length, offset + newText.length);
  // pass all-zero input to ctrEncryptOrDecrypt to get actual keyStream
  const keyStream = ctrEncryptOrDecrypt(Buffer.alloc(editedCiphertextLength, 0), RANDOM_KEY);
  const newTextEncrypted = xorByteArrays(newText, keyStream.slice(offset));
  return Buffer.concat([ciphertext.slice(0, offset), newTextEncrypted, ciphertext.slice(offset + newText.length)]);
};

(async () => {
  const input = ecbDecrypt(Buffer.from(await readFileAsync("25.txt", "ascii"), "base64"), INPUT_FILE_KEY);
  const encryptedInput = ctrEncryptOrDecrypt(input, RANDOM_KEY);
  const editInputToRevealKeystream = Buffer.from("A".repeat(encryptedInput.length));
  const keyStream = xorByteArrays(editCiphertext(encryptedInput, 0, editInputToRevealKeystream), editInputToRevealKeystream);
  const inputRevealed = xorByteArrays(encryptedInput, keyStream);
  console.log(inputRevealed.toString());
  if (inputRevealed.compare(input) !== 0) throw new Error("Failed to decrypt input correctly");
})();
