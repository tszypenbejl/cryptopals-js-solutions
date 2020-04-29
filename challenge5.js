"use strict";

const inputText = `Burning 'em, if you ain't quick and nimble
I go crazy when I hear a cymbal`;
const input = Buffer.from(inputText);
const key = Buffer.from("ICE");
const output = input.map((byte, index) => byte ^ key[index % key.length]);
console.log(output.toString("hex"));
