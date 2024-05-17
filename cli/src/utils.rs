// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::FullCipherText;
use fastcrypto::aes::Cipher;
use fastcrypto::hash::HashFunction;
use fastcrypto::{
    aes::{Aes256Gcm, AesKey, GenericByteArray},
    groups::bls12381::G1Element,
    hash::Blake2b256,
    serde_helpers::ToFromByteArray,
    traits::Generate,
};
use image::GenericImageView;
use rand::{rngs::StdRng, Rng, SeedableRng};
use typenum::U12;
use typenum::U32;

// This represents the chunks of 100x100 that the image is divided into.
const CHUNK_SIZE: usize = 100;

pub struct LoadedImage {
    width: u32,
    height: u32,
    pub data: Vec<u8>,
}
pub fn load_image(path: &str) -> LoadedImage {
    let image = image::open(path).unwrap();
    let (width, height) = image.dimensions();
    LoadedImage {
        data: [
            width.to_be_bytes().to_vec(),
            height.to_be_bytes().to_vec(),
            image.to_rgba8().into_raw(),
        ]
        .concat(),
        width,
        height,
    }
}
/// This reads in the image from the given path, and returns a PreprocessedImage struct,
/// it has the selected pixel coordinates and its values and the obfuscated image (with
/// the selected pixels removed).
pub fn load_and_sample_image(nft_path: &str) -> PreprocessedImage {
    let loaded_image = load_image(nft_path);
    let mut obfuscated_image = loaded_image.data.clone();

    // a list of sampled coordinates
    let mut selected_coordinates = vec![];

    // a list of values in the sampled coordinates
    let mut selected_values = vec![];

    // this code can be customized!
    // divvy up the image into chunks of 100x100 size and iterate through them.
    for i in 0..loaded_image.height as usize / CHUNK_SIZE {
        for j in 0..loaded_image.width as usize / CHUNK_SIZE {
            // randomly select a 100x100 chunk
            let x = rand::thread_rng().gen_range(0..5);
            if x == 0 {
                selected_coordinates.push((i, j));

                // if selected, push all values in this chunk to the selected_values
                for ii in i * CHUNK_SIZE..(i + 1) * CHUNK_SIZE {
                    for jj in j * CHUNK_SIZE..(j + 1) * CHUNK_SIZE {
                        let pixel_idx = ii * loaded_image.width as usize + jj;
                        for k in 4 * pixel_idx + 8..4 * pixel_idx + 12 {
                            selected_values.push(loaded_image.data[k]);
                            obfuscated_image[k] = 0;
                        }
                    }
                }
            }
        }
    }
    PreprocessedImage {
        selected_coordinates,
        selected_values,
        obfuscated_image,
    }
}

pub struct PreprocessedImage {
    pub selected_coordinates: Vec<(usize, usize)>,
    pub selected_values: Vec<u8>,
    pub obfuscated_image: Vec<u8>,
}

/// This takes the image bytes and save it as an image file.
pub fn save_image(path: &str, image_bytes: &[u8]) {
    let _ = image::save_buffer(
        path,
        &image_bytes[8..],
        u32::from_be_bytes(image_bytes[0..4].try_into().unwrap()),
        u32::from_be_bytes(image_bytes[4..8].try_into().unwrap()),
        image::ColorType::Rgba8,
    );
}

/// Take the obfuscated image, ciphertext and master key, recover the original
/// image and save to path.
pub fn recover_image(
    obfuscated_image: &[u8],
    ciphertext: FullCipherText,
    master_key: G1Element,
) -> Vec<u8> {
    let cipher = msk_to_cipher(&master_key);
    let plaintext = cipher.decrypt(&ciphertext.iv, &ciphertext.data).unwrap();

    let width = u32::from_be_bytes(obfuscated_image[0..4].try_into().unwrap()) as usize;

    let mut recovered = obfuscated_image.to_vec();
    let mut pt_idx = 0;

    // this code can be customized!
    // this iterates through the selected coordinates and sets the decrypted
    // values and outputs the recovered image bytes.
    for (i, j) in ciphertext.pixels.iter() {
        for ii in i * CHUNK_SIZE..(i + 1) * CHUNK_SIZE {
            for jj in j * CHUNK_SIZE..(j + 1) * CHUNK_SIZE {
                let pixel_idx = ii * width + jj;
                for k in 4 * pixel_idx + 8..4 * pixel_idx + 12 {
                    recovered[k] = plaintext[pt_idx];
                    pt_idx += 1;
                }
            }
        }
    }
    recovered
}

/// Convert the master key G1 element to a cipher (where the AES key is derived
/// from the master key). The cipher can be used for encryption and decryption.
pub fn msk_to_cipher(msk: &G1Element) -> Aes256Gcm<U12> {
    let mut rng = StdRng::from_seed(Blake2b256::digest(msk.to_byte_array()).digest);
    let key: GenericByteArray<U32> = AesKey::generate(&mut rng);
    Aes256Gcm::<U12>::new(key)
}
