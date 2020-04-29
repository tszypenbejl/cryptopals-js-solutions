"use strict";

const pkcs7unpad = (data) => {
  if (data.length === 0) throw new Error("Invalid padding");
  const paddingByte = data[data.length - 1];
  if (data.length < paddingByte || data.slice(data.length - paddingByte).some((byte) => byte !== paddingByte)) throw new Error("Invalid padding");
  return data.slice(0, data.length - paddingByte);
};

const validPaddingString = "ICE ICE BABY\x04\x04\x04\x04";
console.log(`OK Removed padding from ${JSON.stringify(validPaddingString)} and got ${JSON.stringify(pkcs7unpad(Buffer.from(validPaddingString)).toString())}`);

for (const invalidPaddingString of ["ICE ICE BABY\x05\x05\x05\x05", "ICE ICE BABY\x01\x02\x03\x04"]) {
  try {
    pkcs7unpad(Buffer.from(invalidPaddingString));
    console.error(`FAIL Failed to discover invalid padding in ${JSON.stringify(invalidPaddingString)}`);
  } catch (e) {
    console.log(`OK Detected invalid padding in ${JSON.stringify(invalidPaddingString)}`);
  }
}
