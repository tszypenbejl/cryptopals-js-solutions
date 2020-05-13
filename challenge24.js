"use strict";

// Caveat: MyOptimizedMt19937 is uglier and less universal than MyMt19937 from the previous challenges, but it performs much better.
class MyOptimizedMt19937 {
  static w = 32;
  static n = 624;
  static m = 397;
  static r = 31;
  static a = 0x9908b0df;
  static u = 11;
  static s = 7;
  static b = 0x9d2c5680;
  static t = 15;
  static c = 0xefc60000;
  static l = 18;
  static f = 1812433253n;

  static lowerMask = 0x7fffffff;
  static upperMask = 0x80000000;

  constructor(seed) {
    const class_ = this.constructor;

    this.index = class_.n;
    this.mt = [seed];
    for (let i = 1; i < class_.n; ++i) {
      this.mt[i] = Number(0xffffffffn & (class_.f * BigInt((this.mt[i - 1] ^ (this.mt[i - 1] >>> (class_.w - 2))) >>> 0) + BigInt(i)));
    }
  }

  extractNumber() {
    const class_ = this.constructor;

    if (this.index === class_.n) this.twist();

    let y = this.mt[this.index];
    y = (y ^ (y >>> class_.u)) >>> 0;
    y = (y ^ ((y << class_.s) & class_.b)) >>> 0;
    y = (y ^ ((y << class_.t) & class_.c)) >>> 0;
    y = (y ^ (y >>> class_.l)) >>> 0;

    ++this.index;
    return y;
  }

  twist() {
    const class_ = this.constructor;

    for (let i = 0; i < class_.n; ++i) {
      const x = ((this.mt[i] & class_.upperMask) >>> 0) + (this.mt[(i + 1) % class_.n] & class_.lowerMask);
      const xA = ((x >>> 1) ^ (x % 2 !== 0 ? class_.a : 0)) >>> 0;
      this.mt[i] = (this.mt[(i + class_.m) % class_.n] ^ xA) >>> 0;
    }
    this.index = 0;
  }
}

const encryptOrDecrypt = (input, seed) => {
  function* getBytesForXor() {
    const prng = new MyOptimizedMt19937(seed);
    while (true) {
      const buf = Buffer.allocUnsafe(4);
      buf.writeUInt32LE(prng.extractNumber());
      yield* buf;
    }
  }
  const bytesForXor = getBytesForXor();
  return input.map((byte) => byte ^ bytesForXor.next().value);
};

// verify that encryptOrDecrypt works at all
const testText = "some text to encrypt and decrypt";
const encryptedText = encryptOrDecrypt(Buffer.from(testText), 13002400);
const decryptedText = encryptOrDecrypt(encryptedText, 13002400).toString();
if (decryptedText !== testText) throw "encryptOrDecrypt does not work correctly";

const SECRET_SEED = Math.floor(Math.random() * 2 ** 16);
const randomPrefix = () => Buffer.allocUnsafe(Math.floor(Math.random() * 12));
const prependRandomPrefixAndEncrypt = (input) => encryptOrDecrypt(Buffer.concat([randomPrefix(), input]), SECRET_SEED);

const guessSecretSeed = (encryptFunction) => {
  const knownPlaintext = "A".repeat(14);
  const encryptedData = encryptFunction(Buffer.from(knownPlaintext));
  const randomPrefixLength = encryptedData.length - knownPlaintext.length;
  const ecnryptedDataSansPrefix = encryptedData.slice(randomPrefixLength);
  const inputForCrackingSecretSeed = Buffer.from("A".repeat(randomPrefixLength) + knownPlaintext);
  for (let seed = 0; seed < 2 ** 16; ++seed) {
    if (encryptOrDecrypt(inputForCrackingSecretSeed, seed).slice(randomPrefixLength).compare(ecnryptedDataSansPrefix) === 0) return seed;
  }
  throw new Error("Failed to find the secret seed");
};

console.log("Please wait as cracking the 16-bit seed may take a while.");
const secretSeedRevealed = guessSecretSeed(prependRandomPrefixAndEncrypt);
console.log(`The 16-bit seed is ${secretSeedRevealed}.`);
if (secretSeedRevealed !== SECRET_SEED) throw new Error("Did not really recover the seed/key");

// The instructions were somewhat unclear about that 'password reset token', I hope the below code is roughly what they had in mind.
const passwordResetToken = (() => {
  const prng = new MyOptimizedMt19937(Math.floor(Date.now() / 1000));
  const buf = Buffer.alloc(16);
  buf.writeUInt32LE(prng.extractNumber(), 0);
  buf.writeUInt32LE(prng.extractNumber(), 4);
  buf.writeUInt32LE(prng.extractNumber(), 8);
  buf.writeUInt32LE(prng.extractNumber(), 12);
  return buf;
})();

const checkIfTokenGenenratedFromPrngSeededWithCurrentTime = (token) => {
  const TIME_RANGE_TO_CHECK = 30; // seconds
  const tokenLength = token.length;
  // Note that encryptOrDecrypt function really returns prng's output if the input is a buffer filled with zeros.
  const attackersIdeaAboutTokeGenerator = (seed) => encryptOrDecrypt(Buffer.alloc(tokenLength, 0), seed);
  const currentTime = Math.floor(Date.now() / 1000);
  for (let i = 0; i < TIME_RANGE_TO_CHECK; ++i) {
    if (attackersIdeaAboutTokeGenerator(currentTime - i).compare(passwordResetToken) === 0) return true;
  }
  return false;
};

const isPasswordResetTokenProductOfPrngSeededWithCurrentTime = checkIfTokenGenenratedFromPrngSeededWithCurrentTime(passwordResetToken);
console.log(
  `Password reset token ${isPasswordResetTokenProductOfPrngSeededWithCurrentTime ? "is" : "is not"} a product of an MT19937 PRNG seeded with the current time.`
);
if (!isPasswordResetTokenProductOfPrngSeededWithCurrentTime) throw new Error("My code is actually wrong about that password reset token");
