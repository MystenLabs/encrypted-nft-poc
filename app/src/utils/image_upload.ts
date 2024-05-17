// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { S3, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";

const public_read: ObjectCannedACL = "public-read";
const bucket = "byandreas";
const folder = "mystenlabs";
const endpoint = "https://byandreas.fra1.digitaloceanspaces.com";
const s3Client = new S3({
  forcePathStyle: false,
  endpoint: "https://fra1.digitaloceanspaces.com",
  region: "fra1",
  credentials: {
    accessKeyId: import.meta.env.VITE_DO_KEY,
    secretAccessKey: import.meta.env.VITE_DO_SECRET!,
  },
});

// helper
export function base64ToBlob(base64: string): Blob {
  const byteString = atob(base64.split(",")[1]);
  const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export async function uploadImage(file: File): Promise<string> {
  const params = {
    Bucket: bucket,
    Key: `${folder}/${file.name}`,
    Body: file,
    ACL: public_read,
    ContentType: file.type,
  };
  const result = await s3Client.send(new PutObjectCommand(params));
  console.log(result);
  return `${endpoint}/${folder}/${file.name}`;
}
