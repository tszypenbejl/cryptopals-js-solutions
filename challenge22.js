"use strict";

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);
const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

class MyMt19937 {
  static w = 32n;
  static n = 624n;
  static m = 397n;
  static r = 31n;
  static a = 0x9908b0dfn;
  static u = 11n;
  static d = 0xffffffffn;
  static s = 7n;
  static b = 0x9d2c5680n;
  static t = 15n;
  static c = 0xefc60000n;
  static l = 18n;
  static f = 1812433253n;

  static lowestWBits = (1n << this.w) - 1n;
  static lowerMask = (1n << this.r) - 1n;
  static upperMask = this.lowestWBits & ~this.lowerMask;

  constructor(seed) {
    const class_ = this.constructor;

    this.index = class_.n;
    this.mt = [BigInt(seed)];
    for (let i = 1n; i < class_.n; ++i) {
      this.mt[i] = class_.lowestWBits & (class_.f * (this.mt[i - 1n] ^ (this.mt[i - 1n] >> (class_.w - 2n))) + i);
    }
  }

  extractNumber() {
    const class_ = this.constructor;

    if (this.index === class_.n) this.twist();

    let y = this.mt[this.index];
    y = y ^ ((y >> class_.u) & class_.d);
    y = y ^ ((y << class_.s) & class_.b);
    y = y ^ ((y << class_.t) & class_.c);
    y = y ^ (y >> class_.l);

    ++this.index;
    return Number(class_.lowestWBits & y);
  }

  twist() {
    const class_ = this.constructor;

    for (let i = 0n; i < class_.n; ++i) {
      const x = (this.mt[i] & class_.upperMask) + (this.mt[(i + 1n) % class_.n] & class_.lowerMask);
      const xA = (x >> 1n) ^ (x % 2n !== 0n ? class_.a : 0n);
      this.mt[i] = this.mt[(i + class_.m) % class_.n] ^ xA;
    }
    this.index = 0n;
  }
}

class TimePassageSimulator {
  constructor() {
    this.timeNow = Math.floor(new Date().getTime() / 1000);
  }

  getTimeNow() {
    return this.timeNow;
  }

  fastForward(seconds) {
    this.timeNow += seconds;
  }
}

const timePassageSimulator = new TimePassageSimulator();
timePassageSimulator.fastForward(randomIntegerInRange(40, 1000));

const prngInitTime = timePassageSimulator.getTimeNow();
const mt = new MyMt19937(prngInitTime);

timePassageSimulator.fastForward(randomIntegerInRange(40, 1000));
const randomNumber = mt.extractNumber();

const guessedSeed = range(timePassageSimulator.getTimeNow() - 1000, timePassageSimulator.getTimeNow() - 40 + 1).filter(
  (seed) => new MyMt19937(seed).extractNumber() === randomNumber
)[0];
console.log(`The seed was ${guessedSeed}.`);
if (guessedSeed !== prngInitTime) throw new Error("Failed to really guess the seed");
