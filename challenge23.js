"use strict";

const range = (start, end) => [...Array(end - start).keys()].map((n) => n + start);

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

const invertMt19937Transformation = (randomNumber) => {
  let y = BigInt(randomNumber);
  y = y ^ (y >> MyMt19937.l);
  y = y ^ ((y << MyMt19937.t) & MyMt19937.c);
  // MyMt19937.b mask leaves 7 least significant bits intact after xor, and MyMt19937.s also happens to be 7
  const y1 = y & 0x7fn; // lowest 7 bits
  const y2 = (y ^ ((y1 << MyMt19937.s) & MyMt19937.b)) & 0x00003f80n; // next 7 bits
  const y3 = (y ^ ((y2 << MyMt19937.s) & MyMt19937.b)) & 0x001fc000n; // next 7 bits
  const y4 = (y ^ ((y3 << MyMt19937.s) & MyMt19937.b)) & 0x0fe00000n; // next 7 bits
  const y5 = (y ^ ((y4 << MyMt19937.s) & MyMt19937.b)) & 0xf0000000n; // 4 most significant bits
  y = y1 | y2 | y3 | y4 | y5;
  // MyMt19937.u is 11, while the bitwise AND with MyMt19937.d is no-op
  const y6 = y & 0xffe00000n; // most significant 11 bits preserved intact
  const y7 = (y ^ (y6 >> MyMt19937.u)) & 0x001ffc00n; // next 11 bits
  const y8 = (y ^ (y7 >> MyMt19937.u)) & 0x000003ffn; // 10 least significant bits
  y = y6 | y7 | y8;
  return y;
};

const mt = new MyMt19937(Math.floor(new Date().getTime() / 1000));

const randomNumbers = range(0, Number(MyMt19937.n)).map(() => mt.extractNumber());

const mtClone = new MyMt19937(0);
mtClone.mt = randomNumbers.map(invertMt19937Transformation);

range(0, 10).forEach(() => console.log(mt.extractNumber(), mtClone.extractNumber()));
