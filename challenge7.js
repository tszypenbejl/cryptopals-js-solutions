"use strict";

const { promisify } = require("util");
const { createDecipheriv } = require("crypto");
const readFileAsync = promisify(require("fs").readFile);

(async () => {
  const input = Buffer.from(await readFileAsync("7.txt", "ascii"), "base64");
  const decipher = createDecipheriv("aes-128-ecb", "YELLOW SUBMARINE", null);
  decipher.pipe(process.stdout);
  decipher.end(input);
})();
