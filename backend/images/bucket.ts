import { S3, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config();

const public_read: ObjectCannedACL = "public-read";
const bucket = process.env.BUCKET_NAME;
const folder = process.env.BUCKET_FOLDER;
const endpoint = process.env.BUCKET_ADDRESS;
const s3Client = new S3({
  forcePathStyle: false,
  endpoint: process.env.BUCKET_ADDRESS,
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.BUCKET_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET!,
  },
});

export async function uploadImage(image: string, name: string): Promise<string> {
  const buf = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const params = {
    Bucket: bucket,
    Key: `${folder}/${name}`,
    Body: buf,
    ACL: public_read,
    ContentEncoding: 'base64',
    ContentType: "image/png",
  };
  await s3Client.send(new PutObjectCommand(params));
  return `${endpoint}/${bucket}/${folder}/${name}`;
}

export async function uploadCiphertext(cipher: string, imageName: string): Promise<string> {
  const path = `${folder}/${imageName}_ciphertext`;
    const params = {
        Bucket: bucket,
        Key: path,
        Body: cipher,
        ACL: public_read,
        ContentType: "text/plain",
    };
    const result = await s3Client.send(new PutObjectCommand(params));
    return `${endpoint}/${bucket}/${path}`;
}

export async function deleteItem(path: string): Promise<void> {
    const params = {
        Bucket: bucket,
        Key: path,
    };
    await s3Client.deleteObject(params);
}

export async function getItem(path: string): Promise<string> {
    const params = {
        Bucket: bucket,
        Key: path,
    };
    const result = await s3Client.getObject(params);
    return result.Body?.toString()!;
}