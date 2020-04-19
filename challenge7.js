const { Readable } = require("stream");
const { promisify } = require("util");
const { createDecipheriv } = require("crypto");
const readFileAsync = promisify(require("fs").readFile);

const buffer2stream = (buf) => {
  const stream = new Readable();
  stream._read = () => {};
  stream.push(buf);
  stream.push(null);
  return stream;
};

(async () => {
  const input = Buffer.from(await readFileAsync("7.txt", "ascii"), "base64");
  const inputStream = buffer2stream(input);
  const decipher = createDecipheriv("aes-128-ecb", "YELLOW SUBMARINE", null);
  decipher.pipe(process.stdout);
  inputStream.pipe(decipher);
})();
