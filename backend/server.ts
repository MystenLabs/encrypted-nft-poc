// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import cors from "cors";
import { prisma } from "./db";
import {
  generateKeypair,
  obfuscate,
  deobfuscate,
  encryptSecretKey,
  decryptSecretKey,
} from "./images/obfuscate";
import { uploadCiphertext, deleteItem, uploadImage } from "./images/bucket";

const app = express();
app.use(cors());
app.use(express.json({ limit: "35mb" }));

app.get("/", async (req, res) => {
  return res.send({ message: "🚀 API is functional 🚀" });
});

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  return res.send(users);
});

app.post("/public_key", async (req, res) => {
  const { buyer } = req.body;

  let user = await prisma.user.findUnique({
    where: {
      id: buyer,
    },
  });
  if (!user) {
    const { publicKey, privateKey } = await generateKeypair();
    user = await prisma.user.create({
      data: {
        id: buyer,
        priv_key: privateKey,
        pub_key: publicKey,
      },
    });
  }
  return res.send({ publicKey: user.pub_key });
});

app.post("/obfuscate", async (req, res) => {
  const { image, seller, imageName } = req.body;
  const { obfuscatedImage, ciphertext, secretKey } = await obfuscate(
    image,
    "cross"
  );

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
        priv_key: privateKey,
        pub_key: publicKey,
      },
    });
  }

  const encryptedSecretKey = await encryptSecretKey(secretKey, user.priv_key!);
  const cipherUrl = await uploadCiphertext(ciphertext, imageName);
  await uploadImage(obfuscatedImage, imageName);
  return res.send({ obfuscatedImage, cipherUrl, encryptedSecretKey });
});
app.post("/cancel_obfuscate", async (req, res) => {
  await deleteItem(req.body.cipherPath);
});

app.post("/deobfuscate", async (req, res) => {
  const {obfuscatedImageUrl, cipherUrl, encSecretKey, seller} = req.body;
  let user = await prisma.user.findUnique({
    where: {
      id: seller
    }
  });
  if (!user) return res.status(400).send({message: "User not found"});
  let response = await fetch(cipherUrl);
  const ciphertext = await response.text();
  response = await fetch(obfuscatedImageUrl);
  const blob = await response.blob();
  const obfuscatedImage = new Uint8Array(await blob.arrayBuffer());
  const secretKey = await decryptSecretKey(encSecretKey, user.priv_key!);

  const deobfuscatedImage = await deobfuscate(obfuscatedImage, ciphertext, secretKey);

  return res.send({deobfuscatedImage});
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

  const reEncrypted = await encryptSecretKey(Uint8Array.from(secretKey), buyerUser.priv_key!);

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
  const deobfuscatedImage = await deobfuscate(
    obfuscatedImage,
    ciphertext,
    decrypted
  );
  return res.send({ deobfuscatedImage });
});

app.listen(3000, () =>
  console.log(`🚀 Server ready at: http://localhost:3000`)
);
