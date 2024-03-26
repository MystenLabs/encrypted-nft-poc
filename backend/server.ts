// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import cors from "cors";
import { prisma } from "./db";
import {
  obfuscate,
  deobfuscate,
  encryptSecretKeyBLS,
  decryptSecretKeyBLS,
  serializeToHex,
  generatePrivateKey,
} from "./images/obfuscate";
import * as crypto from "crypto";
import { uploadCiphertext, deleteItem, uploadImage } from "./images/bucket";
import { enc } from "crypto-js";
import { generateProof } from "./images/proof";

const app = express();
app.use(cors());
app.use(express.json({ limit: "35mb" }));

app.get("/", async (_req, res) => {
  // sanity check
  return res.send({ message: "🚀 API is functional 🚀" });
});

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  return res.send(users);
});

app.post("/transfer_to", async (req, res) => {
  const { owner, recipient, encryptedMasterKey } = req.body;

  let ownerUser = await prisma.user.findUnique({
    where: {
      id: owner,
    },
  });
  let recipientUser = await prisma.user.findUnique({
    where: {
      id: recipient,
    },
  });
  if (!recipientUser) {
    const privateKey = generatePrivateKey();
    recipientUser = await prisma.user.create({
      data: {
        id: recipient,
        priv_key: Buffer.from(privateKey).toString("hex"),
      },
    });
  }
  const secretKey = decryptSecretKeyBLS(
    encryptedMasterKey,
    Uint8Array.from(Buffer.from(ownerUser.priv_key!, "hex"))
  );
  const encryptionRandomness = Uint8Array.from(crypto.randomBytes(8));
  const reEncrypted = encryptSecretKeyBLS(
    secretKey,
    Uint8Array.from(Buffer.from(recipientUser.priv_key!, "hex")),
    encryptionRandomness
  );
  const {
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
  } = generateProof(
    encryptedMasterKey,
    serializeToHex(reEncrypted),
    Uint8Array.from(Buffer.from(ownerUser.priv_key!, "hex")),
    Uint8Array.from(Buffer.from(recipientUser.priv_key!, "hex")),
    encryptionRandomness
  );
  return res.send({
    encryptedSecretKey: reEncrypted,
    proof: JSON.stringify({
      s1: s1.toString(16),
      s2: s2.toString(16),
      u1: u1.toHex(),
      u2: u2.toHex(),
      v: v.toHex(),
    }),
    senderPublicKey: Buffer.from(senderPublicKey).toString("hex"),
    recipientPublicKey: Buffer.from(recipientPublicKey).toString("hex"),
    prevEncMsk_Ephemeral: prevEncMsk_Ephemeral.toHex(),
    prevEncMsk_Ciphertext: prevEncMsk_Ciphertext.toHex(),
    newEncMsk_Ephemeral: newEncMsk_Ephemeral.toHex(),
    newEncMsk_Ciphertext: newEncMsk_Ciphertext.toHex(),
  });
});

app.post("/obfuscate", async (req, res) => {
  const { image, seller, imageName } = req.body;
  const { obfuscatedImage, ciphertext, secretKey } = await obfuscate(
    image,
    "uniform"
  );

  let user = await prisma.user.findUnique({
    where: {
      id: seller,
    },
  });
  if (!user) {
    const privateKey = generatePrivateKey();
    user = await prisma.user.create({
      data: {
        id: seller,
        priv_key: Buffer.from(privateKey).toString("hex"),
      },
    });
  }
  const encryptionRandomness = Uint8Array.from(crypto.randomBytes(8));
  const encryptedSecretKey = encryptSecretKeyBLS(
    secretKey,
    Uint8Array.from(Buffer.from(user.priv_key!, "hex")),
    encryptionRandomness
  );
  const cipherUrl = await uploadCiphertext(ciphertext, imageName);
  await uploadImage(obfuscatedImage, imageName);
  return res.send({
    obfuscatedImage,
    cipherUrl,
    ephemeral: encryptedSecretKey.ephemeral.toHex(),
    ciphertext: encryptedSecretKey.cipher.toHex(),
  });
});
app.post("/cancel_obfuscate", async (req, res) => {
  await deleteItem(req.body.cipherPath);
});

app.post("/deobfuscate", async (req, res) => {
  let { obfuscatedImageUrl, cipherUrl, encSecretKey, seller } = req.body;
  let user = await prisma.user.findUnique({
    where: {
      id: seller,
    },
  });
  if (!user) return res.status(400).send({ message: "User not found" });
  let response = await fetch(cipherUrl);
  const ciphertext = await response.text();
  response = await fetch(obfuscatedImageUrl);
  const blob = await response.blob();
  const obfuscatedImage = new Uint8Array(await blob.arrayBuffer());
  if (Array.isArray(encSecretKey))
    encSecretKey = Buffer.from(encSecretKey).toString("hex");
  const secretKey = decryptSecretKeyBLS(
    encSecretKey,
    Uint8Array.from(Buffer.from(user.priv_key!, "hex"))
  );

  const deobfuscatedImage = await deobfuscate(
    obfuscatedImage,
    ciphertext,
    secretKey
  );

  return res.send({ deobfuscatedImage });
});

app.listen(3000, () =>
  console.log(`🚀 Server ready at: http://localhost:3000`)
);
