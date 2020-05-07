"use strict";

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

const mt = new MyMt19937(123);
for (let i = 0; i < 10; ++i) console.log(mt.extractNumber());
