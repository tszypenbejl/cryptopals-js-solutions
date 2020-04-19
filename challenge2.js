const input = Buffer.from("1c0111001f010100061a024b53535009181c", "hex");
const key = Buffer.from("686974207468652062756c6c277320657965", "hex");
const output = input.map((byte, index) => byte ^ key[index]);
console.log(output.toString("hex"));
