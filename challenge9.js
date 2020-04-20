const pkcs7pad = (data, blockLength) => {
  const trailingBytesCount = data.length % blockLength;
  const padding = trailingBytesCount === 0 ? blockLength : blockLength - trailingBytesCount;
  return Buffer.concat([data, Uint8Array.from(Array(padding), () => padding)]);
};

const input = Buffer.from("YELLOW SUBMARINE");
const output = pkcs7pad(input, 5);
console.log(output);
console.log(JSON.stringify(output.toString("ascii")));
