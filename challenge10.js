const { createDecipheriv, createCipheriv } = require("crypto");
const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));
const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);

const pkcs7pad = (data, blockLength) => {
  const trailingBytesCount = data.length % blockLength;
  const padding = trailingBytesCount === 0 ? blockLength : blockLength - trailingBytesCount;
  return Buffer.concat([data, Uint8Array.from(Array(padding), () => padding)]);
};

const pkcs7unpad = (data) => data.slice(0, data.length - data[data.length - 1]);

const BLOCK_SIZE = 128 / 8; // bytes
const PASSWORD = "YELLOW SUBMARINE";

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

const testIv = Buffer.from(Uint8Array.from(Array(16).keys()));
for (const testString of ["yellow submarine", "", "whatever", "something longer than one block", "Привет, мир!"]) {
  const testData = Buffer.from(testString);
  if (my128CbcDecrypt(my128CbcEncrypt(testData, testIv), testIv).compare(testData) !== 0) throw new Error(`Test failed for '${testString}'`);
}

(async () => {
  const iv = Buffer.from(Uint8Array.from(Array(16), () => 0));
  const input = Buffer.from(await readFileAsync("10.txt", "ascii"), "base64");
  const decryptedFileContents = my128CbcDecrypt(input, iv);
  process.stdout.write(decryptedFileContents);
})();
