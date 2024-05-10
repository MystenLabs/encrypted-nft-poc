// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use bip32::DerivationPath;
use bip39::{Mnemonic, Seed};
use fastcrypto::groups::bls12381::Scalar;
use fastcrypto::groups::Scalar as _;
use rand::{rngs::StdRng, SeedableRng};
/// Given a seed and a derivation path, derive a scalar (a BLS12381 private key).
/// This code is referenced from https://crates.io/crates/slip10_ed25519/0.1.3 with slight modifications.
#[allow(non_snake_case)]
pub fn derive_key(mnemonics: Mnemonic, path: DerivationPath) -> Scalar {
    let seed = Seed::new(&mnemonics, "");
    let indexes: Vec<u32> = path.into_iter().map(|i| i.into()).collect::<Vec<_>>();

    let mut I = hmac_sha512(b"bls12381 seed", seed.as_bytes());
    let mut data = [0u8; 37];

    for i in indexes {
        let hardened_index = 0x80000000 | i;
        let Il = &I[0..32];
        let Ir = &I[32..64];

        data[1..33].copy_from_slice(Il);
        data[33..37].copy_from_slice(&hardened_index.to_be_bytes());

        //I = HMAC-SHA512(Key = Ir, Data = 0x00 || Il || ser32(i'))
        I = hmac_sha512(Ir, &data);
    }
    let mut rng = StdRng::from_seed(I[0..32].try_into().unwrap());
    Scalar::rand(&mut rng)
}

fn hmac_sha512(key: &[u8], data: &[u8]) -> [u8; 64] {
    hmac_sha512::HMAC::mac(data, key)
}
