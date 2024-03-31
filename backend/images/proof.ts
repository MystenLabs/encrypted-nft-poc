import { bls12_381 } from "@noble/curves/bls12-381";
import { ProjPointType } from "@noble/curves/abstract/weierstrass";
import { blake2b } from "@noble/hashes/blake2b";
import { generatePrivateKey } from "./obfuscate";
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
  let toHash: number[] = [];
  toHash = toHash.concat(Array.from(senderPublicKey));
  toHash = toHash.concat(Array.from(recipientPublicKey));
  toHash = toHash.concat(Array.from(prevEncMsk_Ephemeral.toRawBytes()));
  toHash = toHash.concat(Array.from(prevEncMsk_Ciphertext.toRawBytes()));
  toHash = toHash.concat(Array.from(newEncMsk_Ephemeral.toRawBytes()));
  toHash = toHash.concat(Array.from(newEncMsk_Ciphertext.toRawBytes()));
  toHash = toHash.concat(Array.from(u1.toRawBytes()));
  toHash = toHash.concat(Array.from(u2.toRawBytes()));
  toHash = toHash.concat(Array.from(v.toRawBytes()));

  hash.update(Uint8Array.from(toHash));
  const digest = hash.digest();
  digest[0] = 0;
  return digest;
};

export const generateProof = (
  prevEphemeral: ProjPointType<bigint>,
  prevCiphertext: ProjPointType<bigint>,
  newEphemeral: ProjPointType<bigint>,
  newCiphertext: ProjPointType<bigint>,
  senderPrivateKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  newEncryptionRandomness: Uint8Array
) => {
  const senderPublicKey = bls12_381.getPublicKey(senderPrivateKey);
  const recipientPublicKey = bls12_381.getPublicKey(recipientPrivateKey);
  const alpha = generatePrivateKey();
  const beta = generatePrivateKey();

  const u1 = bls12_381.G1.ProjectivePoint.BASE.multiply(
    BigInt(`0x${Buffer.from(alpha).toString("hex")}`)
  );
  const u2 = bls12_381.G1.ProjectivePoint.BASE.multiply(
    BigInt(`0x${Buffer.from(beta).toString("hex")}`)
  );

  const v1 = prevEphemeral.multiply(
    BigInt(`0x${Buffer.from(alpha).toString("hex")}`)
  );
  const v2 = bls12_381.G1.ProjectivePoint.fromHex(
    Buffer.from(recipientPublicKey).toString("hex")
  ).multiply(BigInt(`0x${Buffer.from(beta).toString("hex")}`));

  const v = v1.subtract(v2);

  const c = fiatShamirChallenge(
    senderPublicKey,
    recipientPublicKey,
    prevEphemeral,
    prevCiphertext,
    newEphemeral,
    newCiphertext,
    u1,
    u2,
    v
  );
  let s1 = BigInt(`0x${Buffer.from(alpha).toString("hex")}`) + BigInt(`0x${Buffer.from(c).toString("hex")}`) * BigInt(`0x${Buffer.from(senderPrivateKey).toString("hex")}`);
  s1 = s1 % bls12_381.G1.CURVE.n;
  let s2 = BigInt(`0x${Buffer.from(beta).toString("hex")}`) + BigInt(`0x${Buffer.from(c).toString("hex")}`) * BigInt(`0x${Buffer.from(newEncryptionRandomness).toString("hex")}`);
  s2 = s2 % bls12_381.G1.CURVE.n;

  return {
    s1,
    s2,
    u1,
    u2,
    v,
    senderPublicKey,
    recipientPublicKey,
    prevEphemeral,
    prevCiphertext,
    newEphemeral,
    newCiphertext,
  };
};
