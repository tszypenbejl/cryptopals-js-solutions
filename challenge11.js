const { createCipheriv } = require("crypto");

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

const BLOCK_SIZE = 128 / 8; // bytes

const my128CbcEncrypt = (input, password, iv) => {
  const ecbCipher = createCipheriv("aes-128-ecb", password, null).setAutoPadding(false);
  const paddedInput = pkcs7pad(input, BLOCK_SIZE);
  const inputBlocks = splitIntoBlocks(paddedInput, BLOCK_SIZE, paddedInput.length / BLOCK_SIZE);
  const encryptedBlocks = [];
  encryptedBlocks[-1] = iv;
  inputBlocks.forEach((inputBlock, index) => encryptedBlocks.push(ecbCipher.update(xorByteArrays(inputBlock, encryptedBlocks[index - 1]))));
  ecbCipher.final();
  return Buffer.concat(encryptedBlocks);
};

let lastEncryptionMethod = "";

const my128EcbOrCbcEncrypt = (input) => {
  const password = randomUint8Array(BLOCK_SIZE);
  input = Buffer.concat([randomUint8Array(randomIntegerInRange(5, 10)), input, randomUint8Array(randomIntegerInRange(5, 10))]);
  if (Math.random() >= 0.5) {
    lastEncryptionMethod = "ECB";
    const cipher = createCipheriv("aes-128-ecb", password, null);
    return Buffer.concat([cipher.update(input), cipher.final()]);
  } else {
    lastEncryptionMethod = "CBC";
    return my128CbcEncrypt(input, password, randomUint8Array(BLOCK_SIZE));
  }
};

const testInput = Buffer.from("x".repeat(3 * BLOCK_SIZE));

const detectEncryption = (encryptFunction) => {
  const encryptedBlocks = splitIntoBlocks(encryptFunction(testInput), BLOCK_SIZE, 3);
  return encryptedBlocks[1].compare(encryptedBlocks[2]) === 0 ? "ECB" : "CBC";
};

const TEST_COUNT = 1000;
for (let i = 0; i < TEST_COUNT; ++i) {
  const detectedEncryption = detectEncryption(my128EcbOrCbcEncrypt);
  if (detectedEncryption !== lastEncryptionMethod) throw new Error(`Failed to detect encryption after ${i} successful attempts`);
}
console.log(`Successfully detected encryption ${TEST_COUNT} times.`);
