// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module marketplace::test {

    use sui::bls12381;
    use sui::group_ops::Element;
    use sui::group_ops;
    use std::vector;
    use std::option::Option;
    use std::option;
    #[test_only]
    use sui::bcs;
    #[test_only]
    use sui::test_utils::assert_eq;
    use marketplace::private_nft_market::{equality_proof_from_bytes, elgamal_encryption_from_bytes, insecure_equility_prove, insecure_elgamal_encrypt, equality_verify};

    const EInvalidLength: u64 = 0;


    // The following is insecure since the secret key is small, but in practice it should be a random scalar.
    #[test_only]
    fun insecure_elgamal_key_gen(sk: u64): (Element<bls12381::Scalar>, Element<bls12381::G1>) {
        let sk = bls12381::scalar_from_u64(sk);
        let pk = bls12381::g1_mul(&sk, &bls12381::g1_generator());
        (sk, pk)
    }

    #[test]
    fun test_elgamal_ops() {
        // We have two parties.
        let (sk1, pk1) = insecure_elgamal_key_gen(2110);
        let (_, pk2) = insecure_elgamal_key_gen(1021);
        // A sender wishes to send an encrypted message to pk1.
        let m = bls12381::g1_mul(&bls12381::scalar_from_u64(5555), &bls12381::g1_generator());
        let enc1 = insecure_elgamal_encrypt(&pk1, 1234, &m);
        // // The first party decrypts the message.
        // let m1 = elgamal_decrypt(&sk1, &enc1);
        // assert_eq(m, m1);
        // Now, the first party wishes to send an encrypted message to pk2.
        let r2 = 4321;
        let enc2 = insecure_elgamal_encrypt(&pk2, r2, &m);
        // And to prove equality of the two encrypted messages.
        let proof = insecure_equility_prove(&pk1, &pk2, &enc1, &enc2, &sk1,  8888, r2);
        // Anyone can verify it.
        assert!(equality_verify(&pk1, &pk2, &enc1, &enc2, &proof), 0);

        // Proving with an invalid witness should result in a failed verification.
        let bad_r2 = 1111;
        let proof = insecure_equility_prove(&pk1, &pk2, &enc1, &enc2, &sk1, 8888, bad_r2);
        assert!(!equality_verify(&pk1, &pk2, &enc1, &enc2, &proof), 0);
    }

    #[test]
    fun test_equality_verify() {
        let seller_pk = bls12381::g1_from_bytes(&x"86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892");
        let buyer_pk = bls12381::g1_from_bytes(&x"86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d");
        let prev_enc_msk = elgamal_encryption_from_bytes(x"83e35898f61711f28aee79c36f01c2f09db2629ea93cca2cca4243dfd5f6b1796a538f340fecca4a34942a7da11c8b6fae6644a47b891c9c04df63565e54b06207c9fcae0478a54a07e42e800eb0ee6df1efd3ce26c3471e1699597787727779");
        let curr_enc_msk = elgamal_encryption_from_bytes(x"b5222036738cbd5d3271f6f67a6a76a8747792891e777349bee13990e729ac5f4efb678434b1b26a00f485e68232eeef82ffb1c939387d848d79c7b428840c534c2f500d8f80e853c27d3f1a6f3ba8b917890adeb3f69913007c5b98cf8d87b2");
        let proof = equality_proof_from_bytes(x"0df498b308b3970764d58d3a28f9f8ce00a125cf8aaf29148807366b1e791aa55f1fba976ce92c480fcd1c320c7a826385c4eba8c4341a1997248481401ca1e4b4a5977fba3747a613e3f33766b39e4bdeedea5fdf2940ee7175366f3bdbe01392ff7a48f178661bb9476d751e401c8a8cb732b421173783048ab5b073eb5c3d50929191aa31e923837c8aa39401d93e8b6273eebd79563f5a9f177d94b379f4a9605fa55447eb5c324176c0f91e8357f8f345e239bf3e25230773d577387b6c6f7aa29937a484464e2de8c8289e6bb3");

        assert!(equality_verify(
            &seller_pk,
            &buyer_pk,
            &prev_enc_msk, 
            &curr_enc_msk, 
            &proof
        ), 0);
    }
}
