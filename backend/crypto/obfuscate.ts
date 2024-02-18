
import { Image } from "image-js";
import * as crypto from "crypto";
import { encrypt, decrypt, PrivateKey } from 'eciesjs'


interface ColorValues {
  [key: string]: number[];
}

// can be fine-tuned
const sensitivity = 0.7;
const gridSize = 100;
const initializationVector = crypto.getRandomValues(new Uint8Array(16));
const primeLength = 2048;

const imgToBase64 = async (img: Image) => {
  const data = img.toDataURL();
  return data.split(",")[1];
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

const randomTemplate = async (image: string): Promise<number[][]> => {
  const img = await Image.load(image);
  const cellWidth = Math.ceil(img.width / gridSize);
  const cellHeight = Math.ceil(img.height / gridSize);

  const erasedPixels: [number, number][] = [];
  for (let y = 0; y < img.height; y += cellHeight) {
    for (let x = 0; x < img.width; x += cellWidth) {
      const selectedX = Math.floor(Math.random() * cellWidth);
      const selectedY = Math.floor(Math.random() * cellHeight);
      erasedPixels.push([selectedX, selectedY]);
    }
  }
  return erasedPixels;
};

export const generateKeypair = async () => {
    const privKey = new PrivateKey();
    const pubKey = privKey.publicKey.toHex();
    return {
        privateKey: privKey.toHex(),
        publicKey: pubKey
    }
};

export const encryptSecretKey = async (secretKey: Uint8Array, privateKey: string) => {
    const privKey = PrivateKey.fromHex(privateKey);
    const pubKey = privKey.publicKey.toHex();
    return JSON.stringify(encrypt(pubKey, secretKey).toJSON());

}

export const decryptSecretKey = async (encryptedKey: string, privateKey: string) => {
    const privKey = PrivateKey.fromHex(privateKey);
    return decrypt(privKey.toHex(), Buffer.from(JSON.parse(encryptedKey).data));
}
const aesEncrypt = async (data: string, secretKey: Uint8Array) => {
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, initializationVector);
    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;   
}

const aesDecrypt = async (data: string, secretKey: Uint8Array) => {
    const decipher = crypto.createDecipheriv("aes-256-cbx", secretKey, initializationVector);
    let decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}
// method can be "edgeDetection" or "random"
export const obfuscate = async (
  image: string,
  method: string = "edgeDetection"
) => {
  let selectedPixels: number[][] = [];
  if (method === "edgeDetection") {
    selectedPixels = await edgeDetectionTemplate(image);
  } else {
    selectedPixels = await randomTemplate(image);
  }

  const img = await Image.load(image);
  const pixels = img.getPixelsArray();
  for (const [x, y] of selectedPixels) {
    const index = y * img.width + x;
    pixels[index] = [0, 0, 0, 0];
  }
  const obfuscatedImage = new Image(
    img.width,
    img.height,
    pixels.reduce((acc, row) => acc.concat(row), []),
    { components: 4 }
  );

  // generate a new secret key
  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  // find the color values of the selected pixels
  const values: ColorValues = {};
  for (let [x, y] of selectedPixels) {
    values[`${x},${y}`] = img.getPixelXY(x, y);
  }

  // encrypt the color values
  const ciphertext = await aesEncrypt(JSON.stringify(values), secretKey);

  return {
    obfuscatedImage: imgToBase64(obfuscatedImage),
    ciphertext,
    secretKey,
  };
};

export const deobfuscate = async (
  obfuscatedImage: string,
  ciphertext: string,
  secretKey: Uint8Array
) => {
  const img = await Image.load(obfuscatedImage);
  const pixels = img.getPixelsArray();
  const decrypted = JSON.parse(await aesDecrypt(ciphertext, secretKey));

  for (let [key, value] of Object.entries(decrypted)) {
    const [x, y] = key.split(",").map(Number);
    img.setPixelXY(x, y, value as number[]);
  }

  return imgToBase64(img);
};
