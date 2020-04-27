const { createCipheriv, createDecipheriv } = require("crypto");

const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUint8Array = (size) => Uint8Array.from(Array(size), () => randomIntegerInRange(0, 255));

const cookieTextToObject = (cookieText) => Object.fromEntries(cookieText.split("&").map((kv) => kv.split("=")));

const profileFor = (email) => `email=${email.replace(/[&=]/g, "")}&uid=10&role=user`;

const password = randomUint8Array(128 / 8);

const encryptProfileFor = (email) => {
  const cipher = createCipheriv("aes-128-ecb", password, null);
  return Buffer.concat([cipher.update(profileFor(email)), cipher.final()]);
};

const decryptAndParseProfile = (encryptedProfile) => {
  const decipher = createDecipheriv("aes-128-ecb", password, null);
  return cookieTextToObject(Buffer.concat([decipher.update(encryptedProfile), decipher.final()]).toString());
};

const produceAdminCiphertext = (emailToCiphertextFunction) => {
  const blockSize = 16; // this could also be easily determined using determineBlockSize() from challenge 12
  const textBeforeEmail = "email=";
  const textBetweenEmailAndRole = "&uid=10&role=";
  // I guess it is fair to assume attacker knows the format of the serialized data being encrypted because the technique
  // from challenge 12 allows attacker to obtain textBetweenEmailAndRole, and then textBeforeEmail can be guessed.
  const adminPadding = blockSize - "admin".length;
  const fakeEmailToObtainAdminBlock = "a".repeat(blockSize - textBeforeEmail.length) + "admin" + String.fromCharCode(adminPadding).repeat(adminPadding);
  const adminBlock = emailToCiphertextFunction(fakeEmailToObtainAdminBlock).slice(blockSize, 2 * blockSize);
  const attackersDomain = "@fakemail.pl";
  let adminEmailLength = 2 * blockSize - textBeforeEmail.length - textBetweenEmailAndRole.length;
  while (adminEmailLength < attackersDomain.length + 5) adminEmailLength += blockSize;
  const attackersEmail = "z".repeat(adminEmailLength - attackersDomain.length) + attackersDomain;
  const ordinaryUserCiphertext = emailToCiphertextFunction(attackersEmail);
  const adminUserCipertext = Buffer.concat([ordinaryUserCiphertext.slice(0, ordinaryUserCiphertext.length - blockSize), adminBlock]);
  return adminUserCipertext;
};

const attackResult = decryptAndParseProfile(produceAdminCiphertext(encryptProfileFor));
console.log(attackResult);
if (attackResult.role !== "admin") throw new Error("Failed to produce admin user ciphertext");
