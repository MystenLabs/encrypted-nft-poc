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

app.post("/transfer_to", async (req, res) => {
  const {owner, recipient, encryptedMasterKey} = req.body;

  let ownerUser = await prisma.user.findUnique({
    where: {
      id: owner
    }
  });
  let recipientUser = await prisma.user.findUnique({
    where: {
      id: recipient
    }
  });
  if (!recipientUser) {
    const { publicKey, privateKey } = await generateKeypair();
    recipientUser = await prisma.user.create({
      data: {
        id: recipient,
        priv_key: privateKey,
        pub_key: publicKey,
      },
    });
  };
  const secretKey = decryptSecretKey(encryptedMasterKey, ownerUser?.priv_key!);
  const reEncrypted = encryptSecretKey(Uint8Array.from(secretKey), recipientUser.priv_key!);
  return res.send({encryptedSecretKey: reEncrypted});
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
    const { publicKey, privateKey } = await generateKeypair();
    user = await prisma.user.create({
      data: {
        id: seller,
        priv_key: privateKey,
        pub_key: publicKey,
      },
    });
  }

  const encryptedSecretKey = encryptSecretKey(secretKey, user.priv_key!);
  const cipherUrl = uploadCiphertext(ciphertext, imageName);
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
  const secretKey = decryptSecretKey(encSecretKey, user.priv_key!);
  console.log(secretKey);
  const deobfuscatedImage = await deobfuscate(obfuscatedImage, ciphertext, secretKey);

  return res.send({deobfuscatedImage});
});

app.listen(3000, () =>
  console.log(`🚀 Server ready at: http://localhost:3000`)
);
