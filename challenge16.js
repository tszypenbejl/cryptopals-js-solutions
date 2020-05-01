"use strict";

const { createDecipheriv, createCipheriv } = require("crypto");

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));
const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));

const pkcs7pad = (data, blockLength) => {
  const trailingBytesCount = data.length % blockLength;
  const padding = trailingBytesCount === 0 ? blockLength : blockLength - trailingBytesCount;
  return Buffer.concat([data, Uint8Array.from(Array(padding), () => padding)]);
};

const pkcs7unpad = (data) => {
  if (data.length === 0) throw new Error("Invalid padding");
  const paddingByte = data[data.length - 1];
  if (paddingByte == 0 || data.length < paddingByte || data.slice(data.length - paddingByte).some((byte) => byte !== paddingByte))
    throw new Error("Invalid padding");
  return data.slice(0, data.length - paddingByte);
};

const BLOCK_SIZE = 128 / 8; // bytes
const PASSWORD = randomUint8Array(BLOCK_SIZE);
const IV = randomUint8Array(BLOCK_SIZE);

const my128CbcEncrypt = (input) => {
  const ecbCipher = createCipheriv("aes-128-ecb", PASSWORD, null).setAutoPadding(false);
  const paddedInput = pkcs7pad(input, BLOCK_SIZE);
  const inputBlocks = splitIntoBlocks(paddedInput, BLOCK_SIZE, paddedInput.length / BLOCK_SIZE);
  const encryptedBlocks = [];
  encryptedBlocks[-1] = IV;
  inputBlocks.forEach((inputBlock, index) => encryptedBlocks.push(ecbCipher.update(xorByteArrays(inputBlock, encryptedBlocks[index - 1]))));
  ecbCipher.final();
  return Buffer.concat(encryptedBlocks);
};

const my128CbcDecrypt = (input) => {
  const ecbDecipher = createDecipheriv("aes-128-ecb", PASSWORD, null).setAutoPadding(false);
  const inputBlocks = splitIntoBlocks(input, BLOCK_SIZE, input.length / BLOCK_SIZE);
  inputBlocks[-1] = IV;
  const decryptedBlocks = inputBlocks.map((block, index) => xorByteArrays(ecbDecipher.update(block), inputBlocks[index - 1]));
  ecbDecipher.final();
  return pkcs7unpad(Buffer.concat(decryptedBlocks));
};

const escapeSensitiveChars = (input) => input.replace(/=/g, "%3d").replace(/;/g, "3b");
const encrypt = (input) =>
  my128CbcEncrypt(Buffer.from("comment1=cooking%20MCs;userdata=" + escapeSensitiveChars(input) + ";comment2=%20like%20a%20pound%20of%20bacon"));
const isAdmin = (encryptedInput) => my128CbcDecrypt(encryptedInput).toString().includes(";admin=true;");

const makeAdmin = () => {
  // assuming the attacker knows where userdata starts in the data undergoing encryption
  const prependedStringLength = "comment1=cooking%20MCs;userdata=".length;
  const userDataBlockIndex = Math.floor(prependedStringLength / BLOCK_SIZE);
  const userDataBlockOffset = prependedStringLength % BLOCK_SIZE;
  const adminString = ";admin=true";
  const [adminBlockIndex, fillLength] =
    userDataBlockOffset + adminString.length > BLOCK_SIZE
      ? [userDataBlockIndex + 1, 2 * BLOCK_SIZE - userDataBlockOffset - adminString.length]
      : [userDataBlockIndex, BLOCK_SIZE - userDataBlockOffset - adminString.length];
  const xoredEquals = String.fromCharCode("=".charCodeAt(0) ^ 1);
  const xoredSemicolon = String.fromCharCode(";".charCodeAt(0) ^ 1);
  const craftedInput = "a".repeat(fillLength) + xoredSemicolon + "admin" + xoredEquals + "true";
  const encryptedCraftedInput = encrypt(craftedInput);
  const equalsByteOffsetInBlock = BLOCK_SIZE - "=true".length;
  const semicolonByteOffsetInBlock = equalsByteOffsetInBlock - ";admin".length;
  encryptedCraftedInput[BLOCK_SIZE * (adminBlockIndex - 1) + equalsByteOffsetInBlock] ^= 1;
  encryptedCraftedInput[BLOCK_SIZE * (adminBlockIndex - 1) + semicolonByteOffsetInBlock] ^= 1;
  return encryptedCraftedInput;
};

const encryptedAdminData = makeAdmin();
if (isAdmin(encryptedAdminData)) {
  console.log("Success");
  console.log(JSON.stringify(encryptedAdminData));
} else {
  console.error("Failed to produce admin block");
}
