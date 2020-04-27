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
  const encryptedData = encryptFunction(produceAaaInput(3 * blockSize));
  const encryptedBlocks = splitIntoBlocks(encryptedData, blockSize, encryptedData.length / blockSize);
  const indexOfFirstBlockContainingOnlyAaa = encryptedBlocks.findIndex(
    (block, index) => index < encryptedBlocks.length - 1 && block.compare(encryptedBlocks[index + 1]) == 0
  );
  if (indexOfFirstBlockContainingOnlyAaa === 0) return 0;
  const aaaOnlyEncryptedBlock = encryptedBlocks[indexOfFirstBlockContainingOnlyAaa];
  const previousBlockIndex = indexOfFirstBlockContainingOnlyAaa - 1;
  const aaaLengthInPreviousBlock =
    range(blockSize, 2 * blockSize).find((aaaLength) => {
      const aaazInput = Buffer.of(...produceAaaInput(aaaLength), "z".charCodeAt(0));
      return getNthBlock(encryptFunction(aaazInput), blockSize, indexOfFirstBlockContainingOnlyAaa).compare(aaaOnlyEncryptedBlock) == 0;
    }) - blockSize;
  return blockSize * previousBlockIndex + (blockSize - aaaLengthInPreviousBlock);
};

const revealSecretText = (encryptFunction) => {
  const expectedBytes = range(" ".charCodeAt(0), "~".charCodeAt(0) + 1)
    .reverse()
    .concat("\n\r\t".split("").map((c) => c.charCodeAt(0)));
  const blockSize = determineBlockSize(encryptFunction);
  const inputOffset = determineInputOffset(encryptFunction, blockSize);
  const blocksToSkip = Math.ceil(inputOffset / blockSize);
  const aaaPaddingLength = blockSize * blocksToSkip - inputOffset;

  const doReveal = (revealedPiece) => {
    const currentBlockIndex = blocksToSkip + Math.floor(revealedPiece.length / blockSize);
    const aaaLength = aaaPaddingLength + blockSize - 1 - (revealedPiece.length % blockSize);
    const aaaInput = produceAaaInput(aaaLength);
    const encryptedAaaInput = encryptFunction(aaaInput);
    const lastEncryptedBlockIndex = encryptedAaaInput.length / blockSize - 1;
    if (currentBlockIndex >= lastEncryptedBlockIndex) return revealedPiece;
    const encryptedBlockToMatch = getNthBlock(encryptedAaaInput, blockSize, currentBlockIndex);
    const paddedBlockSizeLessOneInput = Buffer.concat([aaaInput, revealedPiece]).slice(
      aaaLength + revealedPiece.length - aaaPaddingLength - blockSize + 1,
      aaaLength + revealedPiece.length // I am not proud of this piece of code here, perhaps will find a way to simplify it later
    );
    const nextRevealedByte = expectedBytes.find(
      (byte) => getNthBlock(encryptFunction(Buffer.of(...paddedBlockSizeLessOneInput, byte)), blockSize, blocksToSkip).compare(encryptedBlockToMatch) === 0
    );
    if (nextRevealedByte == undefined) throw new Error("expectedBytes in revealSecretText misses something");
    return doReveal(Buffer.of(...revealedPiece, nextRevealedByte));
  };

  return doReveal(Buffer.from(""));
};

const secretTextRevealed = revealSecretText(encrypt);
console.log(secretTextRevealed.toString());

if (secretTextRevealed.compare(secretText) !== 0) throw new Error("Did not really get the secret text");
