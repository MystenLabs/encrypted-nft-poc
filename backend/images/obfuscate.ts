import { Image } from "image-js";
import * as crypto from "crypto";
import { encrypt, decrypt, PrivateKey } from "eciesjs";

interface ColorValues {
  [key: string]: number[];
}

// can be fine-tuned
const sensitivity = 0.7;
const gridSize = 100;
const initializationVector = crypto.getRandomValues(new Uint8Array(16));

const imgToBase64 = (img: Image) => {
  const data = img.toDataURL("image/png");
  return data;
};

const edgeDetectionTemplate = async (image: string): Promise<number[][]> => {
  const img = await Image.load(image);
  const grayImage = img.grey();
  const gradientMagnitude = grayImage.sobelFilter();

  const thresholdedEdges = gradientMagnitude.data.map((pixel: number) => {
    return pixel > sensitivity ? 1 : 0;
  });
  // Convert the 1D thresholded edge array into a 2D boolean array
  const selectedPixels: number[][] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const index = y * img.width + x;
      if (thresholdedEdges[index] === 1) {
        selectedPixels.push([x, y]);
      }
    }
  }

  return selectedPixels;
};

const uniformTemplate = async (image: string): Promise<number[][]> => {
  const img = await Image.load(image);
  const cellWidth = Math.ceil(img.width / gridSize);
  const cellHeight = Math.ceil(img.height / gridSize);

  const erasedPixels: [number, number][] = [];
  for (let y = 0; y < img.height; y += cellHeight) {
    for (let x = 0; x < img.width; x += cellWidth) {
      if (x % 2 == 0 && y % 2 == 0) {
        erasedPixels.push([x, y]);
      }
    }
  }
  return erasedPixels;
};

const crossTemplate = async (image: string): Promise<number[][]> => {
  const img = await Image.load(image);
  const thickness = Math.ceil(Math.max(img.height / 10, img.width / 10)); 
  const selectedPixels: number[][] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (
        (x < img.width / 2 + thickness && x > img.width / 2 - thickness) ||
        (y < img.height / 2 + thickness && y > img.height / 2 - thickness)
      ) {
        selectedPixels.push([x, y]);
      }
    }
  }
  return selectedPixels;
};

export const generateKeypair = async () => {
  const privKey = new PrivateKey();
  const pubKey = privKey.publicKey.toHex();
  return {
    privateKey: privKey.toHex(),
    publicKey: pubKey,
  };
};

export const encryptSecretKey =  (
  secretKey: Uint8Array,
  privateKey: string
) => {
  const privKey = PrivateKey.fromHex(privateKey);
  const pubKey = privKey.publicKey.toHex();
  return encrypt(pubKey, secretKey).toString("hex");
};

export const decryptSecretKey = (
  encryptedKey: string,
  privateKey: string
) => {
  const privKey = PrivateKey.fromHex(privateKey);
  return decrypt(privKey.toHex(), Buffer.from(encryptedKey, "hex"));
};
const aesEncrypt = async (data: string, secretKey: Uint8Array) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    secretKey,
    initializationVector
  );
  let encrypted = cipher.update(data, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const aesDecrypt = async (data: string, secretKey: Uint8Array) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    secretKey,
    initializationVector
  );
  let decrypted = decipher.update(data, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
};
// method can be "edgeDetection" or "uniform" or "cross"
export const obfuscate = async (image: string, method: string = "cross") => {
  let selectedPixels: number[][] = [];
  if (method === "edgeDetection") {
    selectedPixels = await edgeDetectionTemplate(image);
  } else if (method === "uniform") {
    selectedPixels = await uniformTemplate(image);
  } else {
    selectedPixels = await crossTemplate(image);
  }
  const img = await Image.load(image);
  const values: ColorValues = {};
  for (let [x, y] of selectedPixels) {
    values[`${x},${y}`] = img.getPixelXY(x, y);
    img.setPixelXY(x, y, [0, 0, 0]);
  }
  const obfuscatedImage = new Image(img.width, img.height, img.data);

  // generate a new secret key
  const secretKey = crypto.getRandomValues(new Uint8Array(32));

  // encrypt the color values
  const ciphertext = await aesEncrypt(JSON.stringify(values), secretKey);

  return {
    obfuscatedImage: imgToBase64(obfuscatedImage),
    ciphertext,
    secretKey,
  };
};

export const deobfuscate = async (
  obfuscatedImage: string | Uint8Array,
  ciphertext: string,
  secretKey: Uint8Array
) => {
  const img = await Image.load(obfuscatedImage);
  const d = await aesDecrypt(ciphertext, secretKey);
  const decrypted: ColorValues = JSON.parse(
    d
  );
  for (let [key, value] of Object.entries(decrypted)) {
    const [x, y] = key.split(",").map(Number);
    img.setPixelXY(x, y, value as number[]);
  }

  return imgToBase64(img);
};