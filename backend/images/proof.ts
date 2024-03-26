import { bls12_381 } from "@noble/curves/bls12-381";
import { ProjPointType } from "@noble/curves/abstract/weierstrass";
import { blake2b } from "@noble/hashes/blake2b";
import { desirializeFromHex } from "./obfuscate";
import * as crypto from "crypto";

const fiatShamirChallenge = (
  senderPublicKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  prevEncMsk_Ephemeral: ProjPointType<bigint>,
  prevEncMsk_Ciphertext: ProjPointType<bigint>,
  newEncMsk_Ephemeral: ProjPointType<bigint>,
  newEncMsk_Ciphertext: ProjPointType<bigint>,
  u1: ProjPointType<bigint>,
  u2: ProjPointType<bigint>,
  v: ProjPointType<bigint>
) => {
  const hash = blake2b.create({ dkLen: 32 });
  const toHash = [];
  toHash.push(Array.from(senderPublicKey));
  toHash.push(Array.from(recipientPublicKey));
  toHash.push(Array.from(prevEncMsk_Ephemeral.toRawBytes()));
  toHash.push(Array.from(prevEncMsk_Ciphertext.toRawBytes()));
  toHash.push(Array.from(newEncMsk_Ephemeral.toRawBytes()));
  toHash.push(Array.from(newEncMsk_Ciphertext.toRawBytes()));
  toHash.push(Array.from(u1.toRawBytes()));
  toHash.push(Array.from(u2.toRawBytes()));
  toHash.push(Array.from(v.toRawBytes()));

  hash.update(Uint8Array.from(toHash));
  const digest = hash.digest();
  digest[digest.length - 1] = 0;
  return digest;
};

export const generateProof = (
  prevEncMsk: string,
  newEncMsk: string,
  senderPrivateKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  newEncryptionRandomness: Uint8Array
) => {
  const senderPublicKey = bls12_381.getPublicKey(senderPrivateKey);
  const recipientPublicKey = bls12_381.getPublicKey(recipientPrivateKey);
  const alpha = crypto.randomBytes(8);
  const beta = crypto.randomBytes(8);

  const u1 = bls12_381.G1.ProjectivePoint.BASE.multiply(
    BigInt(`0x${alpha.toString("hex")}`)
  );
  const u2 = bls12_381.G1.ProjectivePoint.BASE.multiply(
    BigInt(`0x${beta.toString("hex")}`)
  );

  const { ephemeral: prevEncMsk_Ephemeral, cipher: prevEncMsk_Ciphertext } =
    desirializeFromHex(prevEncMsk);
  const { ephemeral: newEncMsk_Ephemeral, cipher: newEncMsk_Ciphertext } =
    desirializeFromHex(newEncMsk);

  const v1 = prevEncMsk_Ephemeral.multiply(
    BigInt(`0x${alpha.toString("hex")}`)
  );
  const v2 = bls12_381.G1.ProjectivePoint.fromHex(
    Buffer.from(recipientPublicKey).toString("hex")
  ).multiply(BigInt(`0x${beta.toString("hex")}`));

  const v = v1.subtract(v2);

  const c = fiatShamirChallenge(
    senderPublicKey,
    recipientPublicKey,
    prevEncMsk_Ephemeral,
    prevEncMsk_Ciphertext,
    newEncMsk_Ephemeral,
    newEncMsk_Ciphertext,
    u1,
    u2,
    v
  );

  const s1 =
    BigInt(`0x${alpha.toString("hex")}`) +
    BigInt(`0x${Buffer.from(c).toString("hex")}`) *
      BigInt(`0x${Buffer.from(senderPrivateKey).toString("hex")}`);
  const s2 =
    BigInt(`0x${beta.toString("hex")}`) +
    BigInt(`0x${Buffer.from(c).toString("hex")}`) *
      BigInt(`0x${Buffer.from(newEncryptionRandomness).toString("hex")}`);

  return {
    s1,
    s2,
    u1,
    u2,
    v,
    senderPublicKey,
    recipientPublicKey,
    prevEncMsk_Ephemeral,
    prevEncMsk_Ciphertext,
    newEncMsk_Ephemeral,
    newEncMsk_Ciphertext,
  };
};
