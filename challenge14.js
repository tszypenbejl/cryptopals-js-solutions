const { createCipheriv } = require("crypto");

const inputText = `Um9sbGluJyBpbiBteSA1LjAKV2l0aCBteSByYWctdG9wIGRvd24gc28gbXkg
aGFpciBjYW4gYmxvdwpUaGUgZ2lybGllcyBvbiBzdGFuZGJ5IHdhdmluZyBq
dXN0IHRvIHNheSBoaQpEaWQgeW91IHN0b3A/IE5vLCBJIGp1c3QgZHJvdmUg
YnkK`;

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));
const splitIntoBlocks = (arr, blockSize, blockCount) => range(0, blockCount).map((i) => arr.slice(i * blockSize, (i + 1) * blockSize));
const getNthBlock = (arr, blockSize, n) => arr.slice(n * blockSize, (n + 1) * blockSize);

function* ascendingIntegers(start = 0) {
  for (let i = start; ; ++i) yield i;
}

const findInIterator = (iter, predicate) => {
  const { value, done } = iter.next();
  if (done) return undefined;
  else return predicate(value) ? value : findInIterator(iter, predicate);
};

const password = randomUint8Array(128 / 8);
const randomPrefix = randomUint8Array(randomIntegerInRange(1, 100));
const secretText = Buffer.from(inputText, "base64");

const encrypt = (input) => {
  const cipher = createCipheriv("aes-128-ecb", password, null);
  return Buffer.concat([cipher.update(Buffer.concat([randomPrefix, input, secretText])), cipher.final()]);
};

const produceAaaInput = (length) => Buffer.from("A".repeat(length));

const determineBlockSize = (encryptFunction) => {
  const encryptedLength = (inputLength) => encryptFunction(produceAaaInput(inputLength)).length;
  const minOutputLen = encryptedLength(0);
  const inputLen1 = findInIterator(ascendingIntegers(1), (inputLength) => encryptedLength(inputLength) > minOutputLen);
  const outputLen1 = encryptedLength(inputLen1);
  const inputLen2 = findInIterator(ascendingIntegers(inputLen1 + 1), (inputLength) => encryptedLength(inputLength) > outputLen1);
  return inputLen2 - inputLen1;
};

const determineInputOffset = (encryptFunction, blockSize) => {
  const encryptedData1 = encryptFunction(Buffer.from(""));
  const encryptedData2 = encryptFunction(Buffer.from("a"));
  const encryptedBlocks1 = splitIntoBlocks(encryptedData1, blockSize, encryptedData1.length);
  const encryptedBlocks2 = splitIntoBlocks(encryptedData2, blockSize, encryptedData2.length);
  const firstDifferentBlockIndex = encryptedBlocks1.findIndex((block1, index) => block1.compare(encryptedBlocks2[index]) !== 0);
  const aaaOnlyEncryptedBlock = getNthBlock(encryptFunction(produceAaaInput(3 * blockSize)), blockSize, firstDifferentBlockIndex + 1);
  const aaaLengthInFirstDifferentBlock =
    range(blockSize, 2 * blockSize + 1).find((aaaLength) => {
      const aaazInput = Buffer.of(...produceAaaInput(aaaLength), "z".charCodeAt(0));
      return getNthBlock(encryptFunction(aaazInput), blockSize, firstDifferentBlockIndex + 1).compare(aaaOnlyEncryptedBlock) == 0;
    }) - blockSize;
  return blockSize * firstDifferentBlockIndex + (blockSize - aaaLengthInFirstDifferentBlock);
};

const revealSecretText = (encryptFunction) => {
  const expectedBytes = range(" ".charCodeAt(0), "~".charCodeAt(0) + 1)
    .reverse()
    .concat("\n\r\t".split("").map((c) => c.charCodeAt(0)));
  const blockSize = determineBlockSize(encryptFunction);
  const inputOffset = determineInputOffset(encryptFunction, blockSize);
  const blocksToSkip = Math.ceil(inputOffset / blockSize);
  const aaaPaddingLength = blockSize * blocksToSkip - inputOffset;
  const aaaPadding = produceAaaInput(aaaPaddingLength);

  const doReveal = (revealedPiece) => {
    const currentBlockIndex = blocksToSkip + Math.floor(revealedPiece.length / blockSize);
    const aaaLength = blockSize - 1 - (revealedPiece.length % blockSize);
    const aaaInput = produceAaaInput(aaaLength);
    const encryptedPaddedAaaInput = encryptFunction(Buffer.concat([aaaPadding, aaaInput]));
    const lastEncryptedBlockIndex = encryptedPaddedAaaInput.length / blockSize - 1;
    if (currentBlockIndex >= lastEncryptedBlockIndex) return revealedPiece;
    const encryptedBlockToMatch = getNthBlock(encryptedPaddedAaaInput, blockSize, currentBlockIndex);
    const blockSizeLessOneInput =
      revealedPiece.length >= blockSize - 1
        ? revealedPiece.slice(revealedPiece.length - (blockSize - 1), revealedPiece.length)
        : Buffer.concat([produceAaaInput(blockSize - 1 - revealedPiece.length), revealedPiece]);
    const nextRevealedByte = expectedBytes.find(
      (byte) =>
        encryptedBlockToMatch.compare(
          getNthBlock(encryptFunction(Buffer.concat([aaaPadding, blockSizeLessOneInput, Buffer.of(byte)])), blockSize, blocksToSkip)
        ) === 0
    );
    if (nextRevealedByte == undefined) throw new Error("expectedBytes in revealSecretText misses something");
    return doReveal(Buffer.of(...revealedPiece, nextRevealedByte));
  };

  return doReveal(Buffer.from(""));
};

const secretTextRevealed = revealSecretText(encrypt);
console.log(secretTextRevealed.toString());

if (secretTextRevealed.compare(secretText) !== 0) throw new Error("Did not really get the secret text");
