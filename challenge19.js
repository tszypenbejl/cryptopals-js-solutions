"use strict";

const { createCipheriv } = require("crypto");

const inputTexts = `SSBoYXZlIG1ldCB0aGVtIGF0IGNsb3NlIG9mIGRheQ==
Q29taW5nIHdpdGggdml2aWQgZmFjZXM=
RnJvbSBjb3VudGVyIG9yIGRlc2sgYW1vbmcgZ3JleQ==
RWlnaHRlZW50aC1jZW50dXJ5IGhvdXNlcy4=
SSBoYXZlIHBhc3NlZCB3aXRoIGEgbm9kIG9mIHRoZSBoZWFk
T3IgcG9saXRlIG1lYW5pbmdsZXNzIHdvcmRzLA==
T3IgaGF2ZSBsaW5nZXJlZCBhd2hpbGUgYW5kIHNhaWQ=
UG9saXRlIG1lYW5pbmdsZXNzIHdvcmRzLA==
QW5kIHRob3VnaHQgYmVmb3JlIEkgaGFkIGRvbmU=
T2YgYSBtb2NraW5nIHRhbGUgb3IgYSBnaWJl
VG8gcGxlYXNlIGEgY29tcGFuaW9u
QXJvdW5kIHRoZSBmaXJlIGF0IHRoZSBjbHViLA==
QmVpbmcgY2VydGFpbiB0aGF0IHRoZXkgYW5kIEk=
QnV0IGxpdmVkIHdoZXJlIG1vdGxleSBpcyB3b3JuOg==
QWxsIGNoYW5nZWQsIGNoYW5nZWQgdXR0ZXJseTo=
QSB0ZXJyaWJsZSBiZWF1dHkgaXMgYm9ybi4=
VGhhdCB3b21hbidzIGRheXMgd2VyZSBzcGVudA==
SW4gaWdub3JhbnQgZ29vZCB3aWxsLA==
SGVyIG5pZ2h0cyBpbiBhcmd1bWVudA==
VW50aWwgaGVyIHZvaWNlIGdyZXcgc2hyaWxsLg==
V2hhdCB2b2ljZSBtb3JlIHN3ZWV0IHRoYW4gaGVycw==
V2hlbiB5b3VuZyBhbmQgYmVhdXRpZnVsLA==
U2hlIHJvZGUgdG8gaGFycmllcnM/
VGhpcyBtYW4gaGFkIGtlcHQgYSBzY2hvb2w=
QW5kIHJvZGUgb3VyIHdpbmdlZCBob3JzZS4=
VGhpcyBvdGhlciBoaXMgaGVscGVyIGFuZCBmcmllbmQ=
V2FzIGNvbWluZyBpbnRvIGhpcyBmb3JjZTs=
SGUgbWlnaHQgaGF2ZSB3b24gZmFtZSBpbiB0aGUgZW5kLA==
U28gc2Vuc2l0aXZlIGhpcyBuYXR1cmUgc2VlbWVkLA==
U28gZGFyaW5nIGFuZCBzd2VldCBoaXMgdGhvdWdodC4=
VGhpcyBvdGhlciBtYW4gSSBoYWQgZHJlYW1lZA==
QSBkcnVua2VuLCB2YWluLWdsb3Jpb3VzIGxvdXQu
SGUgaGFkIGRvbmUgbW9zdCBiaXR0ZXIgd3Jvbmc=
VG8gc29tZSB3aG8gYXJlIG5lYXIgbXkgaGVhcnQs
WWV0IEkgbnVtYmVyIGhpbSBpbiB0aGUgc29uZzs=
SGUsIHRvbywgaGFzIHJlc2lnbmVkIGhpcyBwYXJ0
SW4gdGhlIGNhc3VhbCBjb21lZHk7
SGUsIHRvbywgaGFzIGJlZW4gY2hhbmdlZCBpbiBoaXMgdHVybiw=
VHJhbnNmb3JtZWQgdXR0ZXJseTo=
QSB0ZXJyaWJsZSBiZWF1dHkgaXMgYm9ybi4=`
  .split("\n")
  .map((line) => Buffer.from(line, "base64"));

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);

const BLOCK_SIZE = 128 / 8;
const PASSWORD = Uint8Array.of(101, 234, 65, 108, 134, 215, 206, 43, 14, 250, 62, 251, 31, 157, 64, 1);
// A fixed PASSWORD, so I get same results every time and can make some manual changes to the algorithm-determined after looking at decryption results

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

const encryptedTexts = inputTexts.map((t) => ctrEncryptOrDecrypt(t));

const guessKeyStream = (encryptedTexts) => {
  const frequentLetterCodes = new Set("etaoinshrdlu ETAOINSHRDLU".split("").map((c) => c.charCodeAt(0)));
  const allExpectedBytes = new Set(range(" ".charCodeAt(0), "~".charCodeAt(0) + 1));
  const keyStreamLengthNeeded = Math.max(...encryptedTexts.map((text) => text.length));
  const keyStream = Buffer.alloc(keyStreamLengthNeeded);
  range(0, keyStreamLengthNeeded).forEach((i) => {
    const encryptedBytes = encryptedTexts.map((text) => text[i]).filter((byte) => byte != undefined);
    const possibleXorMasks = range(0, 256).filter((mask) => encryptedBytes.map((byte) => byte ^ mask).every((maskedByte) => allExpectedBytes.has(maskedByte)));
    if (possibleXorMasks.length === 0) throw new Error("allExpectedBytes needs to include more ascii codes");
    keyStream[i] = possibleXorMasks
      .map((mask) => ({ mask, score: encryptedBytes.map((byte) => byte ^ mask).filter((maskedByte) => frequentLetterCodes.has(maskedByte)).length }))
      .reduce((bestSoFar, current) => (current.score > bestSoFar.score ? current : bestSoFar), { score: -1 }).mask;
  });
  return keyStream;
};

const keyStream = guessKeyStream(encryptedTexts);

// manual adjustments after looking at decryption results
keyStream[7] ^= "s".charCodeAt(0) ^ "r".charCodeAt(0);
keyStream[30] ^= "r".charCodeAt(0) ^ "n".charCodeAt(0);
keyStream[33] ^= " ".charCodeAt(0) ^ "e".charCodeAt(0);
keyStream[34] ^= "u".charCodeAt(0) ^ "a".charCodeAt(0);
keyStream[35] ^= "s".charCodeAt(0) ^ "d".charCodeAt(0);
// Not making further adjustments to correct the sentence "He, too, has been changed in his tur o"
// because I would have never guessed how that sentence should end without looking at the original text

encryptedTexts.forEach((encryptedText, index) => {
  const decryptedText = xorByteArrays(encryptedText, keyStream).toString();
  const originalText = inputTexts[index].toString();
  if (decryptedText.length !== originalText.length) throw new Error("Decrypted text has wrong length"); // not expecting that to happen
  const diffCount = decryptedText.split("").filter((c, i) => c !== originalText[i]).length;
  if (diffCount === 0) console.log(`OK, correctly decrypted "${decryptedText}"`);
  else console.warn(`${diffCount} wrong characters in "${decryptedText}" (should be "${originalText}")`);
});
