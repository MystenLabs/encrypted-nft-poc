// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use fastcrypto::aes::InitializationVector;
use serde::{Deserialize, Serialize};
use typenum::U12;

pub mod key_derive;
pub mod utils;

#[derive(Clone, Serialize, Deserialize)]
pub struct FullCipherText {
    pub pixels: Vec<(usize, usize)>,
    pub iv: InitializationVector<U12>,
    pub data: Vec<u8>,
}

#[cfg(test)]
mod test {
    use fastcrypto::groups::{bls12381::G1Element, GroupElement};
    use proptest::arbitrary::Arbitrary;

    use crate::key_derive::derive_private_key;
    proptest::proptest! {
        #[test]
        fn proptest_derive_key(
            bytes in <[u8; 32]>::arbitrary()
        ) {
            let sk = derive_private_key(&bytes, &[0, 0, 0, 0], &[0, 0, 0, 0]);
            let _pk = G1Element::generator() * sk;
        }
    }
}
