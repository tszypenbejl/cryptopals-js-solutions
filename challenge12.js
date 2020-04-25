const { createCipheriv } = require("crypto");

const inputText = `Um9sbGluJyBpbiBteSA1LjAKV2l0aCBteSByYWctdG9wIGRvd24gc28gbXkg
aGFpciBjYW4gYmxvdwpUaGUgZ2lybGllcyBvbiBzdGFuZGJ5IHdhdmluZyBq
dXN0IHRvIHNheSBoaQpEaWQgeW91IHN0b3A/IE5vLCBJIGp1c3QgZHJvdmUg
YnkK`;

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));
function* ascendingIntegers(start = 0) {
  for (let i = start; ; ++i) yield i;
}

const findInIterator = (iter, predicate) => {
  const { value, done } = iter.next();
  if (done) return undefined;
  else return predicate(value) ? value : findInIterator(iter, predicate);
};

const password = randomUint8Array(128 / 8);
const secretText = Buffer.from(inputText, "base64");

const encrypt = (input) => {
  const cipher = createCipheriv("aes-128-ecb", password, null);
  return Buffer.concat([cipher.update(Buffer.concat([input, secretText])), cipher.final()]);
};

const produceInput = (length) => Buffer.from("A".repeat(length));

const determineBlockSize = (encryptFunction) => {
  const encryptedLength = (inputLength) => encryptFunction(produceInput(inputLength)).length;
  const minOutputLen = encryptedLength(0);
  const inputLen1 = findInIterator(ascendingIntegers(1), (inputLength) => encryptedLength(inputLength) > minOutputLen);
  const outputLen1 = encryptedLength(inputLen1);
  const inputLen2 = findInIterator(ascendingIntegers(inputLen1 + 1), (inputLength) => encryptedLength(inputLength) > outputLen1);
  return inputLen2 - inputLen1;
};

const revealSecretText = (encryptFunction) => {
  const expectedBytes = range(" ".charCodeAt(0), "~".charCodeAt(0))
    .reverse()
    .concat("\n\r\t".split("").map((c) => c.charCodeAt(0)));
  const blockSize = determineBlockSize(encryptFunction);

  const getNthBlock = (arr, n) => arr.slice(n * blockSize, (n + 1) * blockSize);

  const doReveal = (revealedPiece) => {
    const currentBlockIndex = Math.floor(revealedPiece.length / blockSize);
    const aaaLength = blockSize - 1 - (revealedPiece.length % blockSize);
    const aaaInput = produceInput(aaaLength);
    const encryptedAaaInput = encryptFunction(aaaInput);
    const lastEncryptedBlockIndex = encryptedAaaInput.length / blockSize - 1;
    if (currentBlockIndex >= lastEncryptedBlockIndex) return revealedPiece;
    const encryptedBlockToMatch = getNthBlock(encryptedAaaInput, currentBlockIndex);
    const blockSizeLessOneInput = getNthBlock(Buffer.concat([aaaInput, revealedPiece]), currentBlockIndex).slice(0, blockSize - 1);
    const nextRevealedByte = expectedBytes.find(
      (byte) => getNthBlock(encryptFunction(Buffer.of(...blockSizeLessOneInput, byte)), 0).compare(encryptedBlockToMatch) === 0
    );
    if (nextRevealedByte == undefined) throw new Error("expectedBytes in revealSecretText misses something");
    return doReveal(Buffer.of(...revealedPiece, nextRevealedByte));
  };

  return doReveal(Buffer.from(""));
};

const secretTextRevealed = revealSecretText(encrypt);
console.log(secretTextRevealed.toString());

if (secretTextRevealed.compare(secretText) !== 0) throw new Error("Did not really get the secret text");
