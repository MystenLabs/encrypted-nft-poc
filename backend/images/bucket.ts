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
    accessKeyId: process.env.DO_KEY!,
    secretAccessKey: process.env.DO_SECRET!,
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
  const result = await s3Client.send(new PutObjectCommand(params));
  console.log(result);
  return `${endpoint}/${folder}/${name}`;
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
    return `${endpoint}/${path}`;
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