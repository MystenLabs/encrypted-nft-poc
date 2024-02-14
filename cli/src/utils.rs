// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use image::GenericImageView;
use rand::Rng;

pub fn load_and_sample_image(nft_path: &str) -> PreprocessedImage {
    let image = image::open(nft_path).unwrap();
    let (width, height) = image.dimensions();
    let image = [
        width.to_be_bytes().to_vec(),
        height.to_be_bytes().to_vec(),
        image.to_rgba8().into_raw(),
    ]
    .concat();

    // a list of sampled coordinates
    let mut selected_coordinates = vec![];

    // a list of values in the sampled coordinates
    let mut selected_values = vec![];

    let chunk_size = 100;

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
                        }
                    }
                }
            }
        }
    }
    PreprocessedImage {
        selected_coordinates,
        selected_values,
    }
}

struct PreprocessedImage {
    selected_coordinates: Vec<(usize, usize)>,
    selected_values: Vec<u8>,
}
