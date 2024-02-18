// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import { prisma } from "./db";
import {
  generateKeypair,
  obfuscate,
  deobfuscate,
  encryptSecretKey,
  decryptSecretKey,
} from "./crypto/obfuscate";
import { cipher } from "node-forge";

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  return res.send({ message: "🚀 API is functional 🚀" });
});

app.post("/obfuscate", async (req, res) => {
  const { image, seller } = req.body;
  const { obfuscatedImage, ciphertext, secretKey } = await obfuscate(image);

  let user = await prisma.user.findUnique({
    where: {
      id: seller,
    },
  });
  if (!user) {
    const { publicKey, privateKey } = await generateKeypair();
    user = await prisma.user.create({
      data: {
        id: seller,
        priv_key: publicKey,
        pub_key: privateKey,
      },
    });
  }
  const encryptedSecretKey = await encryptSecretKey(secretKey, user.priv_key!);
  return res.send({ obfuscatedImage, ciphertext, encryptedSecretKey });
});

app.post("/accept", async (req, res) => {
  const { seller, buyer, encryptedSecretKey } = req.body;
  let buyerUser = await prisma.user.findUnique({
    where: {
      id: buyer,
    },
  });
  const sellerUser = await prisma.user.findUnique({
    where: {
      id: seller,
    },
  });
  if (!sellerUser) {
    return res.status(400).send({ message: "Invalid seller or buyer" });
  }
  if (!buyerUser) {
    const { publicKey, privateKey } = await generateKeypair();
    buyerUser = await prisma.user.create({
      data: {
        id: seller,
        priv_key: publicKey,
        pub_key: privateKey,
      },
    });
  }
  const secretKey = await decryptSecretKey(
    encryptedSecretKey,
    sellerUser.priv_key!
  );
  const reEncrypted = await encryptSecretKey(secretKey, buyerUser.priv_key!);
  return res.send({ secretKey: reEncrypted });
});

app.post("/show", async (req, res) => {
  const { obfuscatedImage, ciphertext, secretKey, seller } = req.body;
  const user: any = prisma.user.findUnique({
    where: { id: seller },
  });
  if (!user) {
	return res.status(400).send({ message: "Invalid user" });
  }
  const decrypted = await decryptSecretKey(secretKey, user.priv_key!);
  const deobfuscatedImage = await deobfuscate(obfuscatedImage, ciphertext, decrypted);
  return res.send({ deobfuscatedImage });
});

app.listen(3000, () =>
  console.log(`🚀 Server ready at: http://localhost:3000`)
);