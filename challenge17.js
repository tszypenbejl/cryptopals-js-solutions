"use strict";

const { createDecipheriv, createCipheriv } = require("crypto");

const inputStrings = [
  "MDAwMDAwTm93IHRoYXQgdGhlIHBhcnR5IGlzIGp1bXBpbmc=",
  "MDAwMDAxV2l0aCB0aGUgYmFzcyBraWNrZWQgaW4gYW5kIHRoZSBWZWdhJ3MgYXJlIHB1bXBpbic=",
  "MDAwMDAyUXVpY2sgdG8gdGhlIHBvaW50LCB0byB0aGUgcG9pbnQsIG5vIGZha2luZw==",
  "MDAwMDAzQ29va2luZyBNQydzIGxpa2UgYSBwb3VuZCBvZiBiYWNvbg==",
  "MDAwMDA0QnVybmluZyAnZW0sIGlmIHlvdSBhaW4ndCBxdWljayBhbmQgbmltYmxl",
  "MDAwMDA1SSBnbyBjcmF6eSB3aGVuIEkgaGVhciBhIGN5bWJhbA==",
  "MDAwMDA2QW5kIGEgaGlnaCBoYXQgd2l0aCBhIHNvdXBlZCB1cCB0ZW1wbw==",
  "MDAwMDA3SSdtIG9uIGEgcm9sbCwgaXQncyB0aW1lIHRvIGdvIHNvbG8=",
  "MDAwMDA4b2xsaW4nIGluIG15IGZpdmUgcG9pbnQgb2g=",
  "MDAwMDA5aXRoIG15IHJhZy10b3AgZG93biBzbyBteSBoYWlyIGNhbiBibG93",
];

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));
const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));
const cloneBuffer = (origBuffer) => Buffer.from(origBuffer);

const pkcs7pad = (data, blockLength) => {
  const trailingBytesCount = data.length % blockLength;
  const padding = trailingBytesCount === 0 ? blockLength : blockLength - trailingBytesCount;
  return Buffer.concat([data, Uint8Array.from(Array(padding), () => padding)]);
};

const pkcs7unpad = (data) => {
  if (data.length === 0) throw new Error("Invalid padding");
  const paddingByte = data[data.length - 1];
  if (paddingByte == 0) throw new Error("Invalid padding");
  if (data.length < paddingByte || data.slice(data.length - paddingByte).some((byte) => byte !== paddingByte)) throw new Error("Invalid padding");
  return data.slice(0, data.length - paddingByte);
};

const BLOCK_SIZE = 128 / 8; // bytes
const PASSWORD = randomUint8Array(BLOCK_SIZE);
const IV = randomUint8Array(BLOCK_SIZE);

const my128CbcEncrypt = (input, iv) => {
  const ecbCipher = createCipheriv("aes-128-ecb", PASSWORD, null).setAutoPadding(false);
  const paddedInput = pkcs7pad(input, BLOCK_SIZE);
  const inputBlocks = splitIntoBlocks(paddedInput, BLOCK_SIZE, paddedInput.length / BLOCK_SIZE);
  const encryptedBlocks = [];
  encryptedBlocks[-1] = iv;
  inputBlocks.forEach((inputBlock, index) => encryptedBlocks.push(ecbCipher.update(xorByteArrays(inputBlock, encryptedBlocks[index - 1]))));
  ecbCipher.final();
  return Buffer.concat(encryptedBlocks);
};

const my128CbcDecrypt = (input, iv) => {
  const ecbDecipher = createDecipheriv("aes-128-ecb", PASSWORD, null).setAutoPadding(false);
  const inputBlocks = splitIntoBlocks(input, BLOCK_SIZE, input.length / BLOCK_SIZE);
  inputBlocks[-1] = iv;
  const decryptedBlocks = inputBlocks.map((block, index) => xorByteArrays(ecbDecipher.update(block), inputBlocks[index - 1]));
  ecbDecipher.final();
  return pkcs7unpad(Buffer.concat(decryptedBlocks));
};

const encryptedSecretText = my128CbcEncrypt(Buffer.from(inputStrings[randomIntegerInRange(0, inputStrings.length - 1)], "base64"), IV);

const isPaddingOk = (encryptedText, iv) => {
  try {
    my128CbcDecrypt(encryptedText, iv);
    return true;
  } catch (e) {
    if (e.message === "Invalid padding") return false;
    else throw e;
  }
};

const revealText = (encryptedText, iv, paddingOracleFunction) => {
  const blockCount = encryptedText.length / BLOCK_SIZE;
  const encryptedBlocks = splitIntoBlocks(encryptedText, BLOCK_SIZE, blockCount);
  encryptedBlocks[-1] = iv;

  const lastBlockPadding = range(1, BLOCK_SIZE + 1)
    .reverse()
    .find((paddingLength) => {
      const previousBlock = cloneBuffer(encryptedBlocks[blockCount - 2]);
      previousBlock[BLOCK_SIZE - paddingLength] ^= 1;
      return !paddingOracleFunction(encryptedBlocks[blockCount - 1], previousBlock);
    });

  const decryptedBytes = [];

  const decryptRestOfTheBlock = (blockToDecrypt, craftedPreviousBlock, currentPadding) => {
    const newPadding = currentPadding + 1;
    if (newPadding > BLOCK_SIZE) return;
    const transformingMaskForPaddingBytes = currentPadding ^ newPadding;
    range(BLOCK_SIZE - currentPadding, BLOCK_SIZE).forEach((index) => (craftedPreviousBlock[index] ^= transformingMaskForPaddingBytes));
    const maskForTheLastByteBeforePadding = range(0, 256).find((mask) => {
      const previousBlock = cloneBuffer(craftedPreviousBlock);
      previousBlock[BLOCK_SIZE - newPadding] ^= mask;
      return paddingOracleFunction(blockToDecrypt, previousBlock);
    });
    const decryptedByte = newPadding ^ maskForTheLastByteBeforePadding;
    decryptedBytes.unshift(decryptedByte);
    craftedPreviousBlock[BLOCK_SIZE - newPadding] ^= maskForTheLastByteBeforePadding;
    decryptRestOfTheBlock(blockToDecrypt, craftedPreviousBlock, newPadding);
  };

  // decrypt non-padding bytes from last block
  decryptRestOfTheBlock(encryptedBlocks[blockCount - 1], cloneBuffer(encryptedBlocks[blockCount - 2]), lastBlockPadding);

  for (let blockIndex = blockCount - 2; blockIndex >= 0; --blockIndex) {
    const blockToDecrypt = encryptedBlocks[blockIndex];
    const craftedPreviousBlock = cloneBuffer(encryptedBlocks[blockIndex - 1]);
    const padding1Mask = range(0, 256).find((mask) => {
      const previousBlock = cloneBuffer(craftedPreviousBlock);
      previousBlock[BLOCK_SIZE - 1] ^= mask;
      return (
        paddingOracleFunction(blockToDecrypt, previousBlock) &&
        ((previousBlock[BLOCK_SIZE - 2] ^= 1), true) && // make sure we found [1] padding, not [2, 2] or something even longer
        paddingOracleFunction(blockToDecrypt, previousBlock)
      );
    });
    const lastByteInBlockToDecryptDecrypted = padding1Mask ^ 1;
    decryptedBytes.unshift(lastByteInBlockToDecryptDecrypted);
    craftedPreviousBlock[BLOCK_SIZE - 1] ^= padding1Mask;
    decryptRestOfTheBlock(blockToDecrypt, craftedPreviousBlock, 1);
  }

  return Buffer.from(decryptedBytes).toString();
};

console.log(revealText(encryptedSecretText, IV, isPaddingOk));
