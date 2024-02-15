// Copyright (c) 2022, Mysten Labs, Inc.
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

pub fn load_and_sample_image(nft_path: &str) -> PreprocessedImage {
    let image = image::open(nft_path).unwrap();
    let (width, height) = image.dimensions();
    let image = [
        width.to_be_bytes().to_vec(),
        height.to_be_bytes().to_vec(),
        image.to_rgba8().into_raw(),
    ]
    .concat();
    let mut obfuscated_image = image.clone();

    // a list of sampled coordinates
    let mut selected_coordinates = vec![];

    // a list of values in the sampled coordinates
    let mut selected_values = vec![];

    let chunk_size = 100;

    // this code can be customized!
    // divvy up the image into chunks of 100x100 size and iterate through them.
    for i in 0..height as usize / chunk_size {
        for j in 0..width as usize / chunk_size {
            // randomly select a 100x100 chunk
            let x = rand::thread_rng().gen_range(0..5);
            if x == 0 {
                selected_coordinates.push((i, j));

                // if selected, push all values in this chunk to the selected_values
                for ii in i * chunk_size..(i + 1) * chunk_size {
                    for jj in j * chunk_size..(j + 1) * chunk_size {
                        let pixel_idx = ii * width as usize + jj;
                        for k in 4 * pixel_idx + 8..4 * pixel_idx + 12 {
                            selected_values.push(image[k]);
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

pub fn save_image(path: &str, obfuscated_image: &[u8]) {
    let _ = image::save_buffer(
        path,
        &obfuscated_image[8..],
        u32::from_be_bytes(obfuscated_image[0..4].try_into().unwrap()),
        u32::from_be_bytes(obfuscated_image[4..8].try_into().unwrap()),
        image::ColorType::Rgba8,
    );
}

/// Take the obfuscated image, ciphertext and master key, recover the original image and save to path.
pub fn recover_image(
    obfuscated_image: &[u8],
    ciphertext: FullCipherText,
    master_key: G1Element,
) -> Vec<u8> {
    let cipher = msk_to_cipher(&master_key);
    let plaintext = cipher
        .decrypt(&ciphertext.iv, &ciphertext.ciphertext)
        .unwrap();
    let mut recovered = obfuscated_image.to_vec();
    let width = usize::try_from(u32::from_be_bytes(
        obfuscated_image[0..4].try_into().unwrap(),
    ))
    .unwrap();
    let chunk_size = 100;
    let mut pt_idx = 0;
    // this code can be customized!
    for (i, j) in ciphertext.pixels.iter() {
        for ii in i * chunk_size..(i + 1) * chunk_size {
            for jj in j * chunk_size..(j + 1) * chunk_size {
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

/// Convert the master key G1 element to a cipher (where the AES key is derived from the master key).
/// The cipher can be used for encryption and decryption.
pub fn msk_to_cipher(msk: &G1Element) -> Aes256Gcm<U12> {
    let mut rng = StdRng::from_seed(Blake2b256::digest(msk.to_byte_array()).digest);
    let key: GenericByteArray<U32> = AesKey::generate(&mut rng);
    Aes256Gcm::<U12>::new(key)
}
