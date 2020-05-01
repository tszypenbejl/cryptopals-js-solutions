"use strict";

const { createCipheriv } = require("crypto");

const input = Buffer.from("L77na/nrFsKvynd6HzOoG7GHTLXsTVu9qvY/2syLXzhPweyyMTJULu/6/kXX0KSvoOLSFQ==", "base64");

const xorByteArrays = (array1, array2) => array1.map((byte1, index) => byte1 ^ array2[index % array2.length]);

const BLOCK_SIZE = 128 / 8;

const aesEncryptBlock = (block) => {
  const cipher = createCipheriv("aes-128-ecb", "YELLOW SUBMARINE", null);
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

console.log(Buffer.from(ctrEncryptOrDecrypt(input)).toString());
