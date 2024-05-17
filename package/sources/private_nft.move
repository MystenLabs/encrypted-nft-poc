// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module package::private_nft {
    use sui::bls12381;
    use sui::hash::blake2b256;
    use sui::group_ops::{Self, Element};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;
    
    use std::string::String;
    use std::vector;

    const EProveError: u64 = 1;

    struct EncryptedNFT has key, store {
        id: UID,
        name: String,
        image_url: String, // s3 or ipfs image url, todo: use metadata with display
        ciphertext_url: String,
        encrypted_master_key: ElGamalEncryption
    }

    // Basic sigma protocol for proving equality of two ElGamal encryptions.
    // See https://crypto.stackexchange.com/questions/30010/is-there-a-way-to-prove-equality-of-plaintext-that-was-encrypted-using-different
    // same as pub struct EqualityProof in rust CLI. 
    struct EqualityProof has drop, store {
        s1: Element<bls12381::Scalar>, // z1
        s2: Element<bls12381::Scalar>, // z2
        u1: Element<bls12381::G1>, // a1
        u2: Element<bls12381::G1>, // a2
        v: Element<bls12381::G1>, // a3
    }

    // An encryption of group element m under pk is (r*G, r*pk + m) for random r.
    struct ElGamalEncryption has drop, copy, store {
        ephemeral: Element<bls12381::G1>,
        ciphertext: Element<bls12381::G1>,
    }

    public fun new(
        name: String,
        image_url: String,
        ciphertext_url: String,
        ephemeral_v: vector<u8>,
        ciphertext_v: vector<u8>,
        ctx: &mut TxContext
        ): EncryptedNFT 
    {
        let ephemeral = bls12381::g1_from_bytes(&ephemeral_v);
        let ciphertext = bls12381::g1_from_bytes(&ciphertext_v);
        EncryptedNFT {
            id: object::new(ctx),
            name,
            image_url,
            ciphertext_url,
            encrypted_master_key: ElGamalEncryption {
                ephemeral,
                ciphertext,
            },
        }
    }


    public fun transfer_to(
        self: EncryptedNFT,
        to: address,
        sender_pub_key: vector<u8>,
        receiver_pub_key: vector<u8>,
        prev_ephemeral_v: vector<u8>,
        prev_ciphertext_v: vector<u8>,
        new_ephemeral_v: vector<u8>,
        new_ciphertext_v: vector<u8>,
        proof_s1: vector<u8>,
        proof_s2: vector<u8>,
        proof_u1: vector<u8>,
        proof_u2: vector<u8>,
        proof_v: vector<u8>,
        _ctx: &mut TxContext) {
        let proof = EqualityProof {
            s1: bls12381::scalar_from_bytes(&proof_s1),
            s2: bls12381::scalar_from_bytes(&proof_s2),
            u1: bls12381::g1_from_bytes(&proof_u1),
            u2: bls12381::g1_from_bytes(&proof_u2),
            v: bls12381::g1_from_bytes(&proof_v),
        };
        let new_enc_msk = ElGamalEncryption {
            ephemeral: bls12381::g1_from_bytes(&new_ephemeral_v),
            ciphertext: bls12381::g1_from_bytes(&new_ciphertext_v),
        };
        let prev_enc_msk = ElGamalEncryption {
            ephemeral: bls12381::g1_from_bytes(&prev_ephemeral_v),
            ciphertext: bls12381::g1_from_bytes(&prev_ciphertext_v),
        };
        assert!(equality_verify(
            &bls12381::g1_from_bytes(&sender_pub_key),
            &bls12381::g1_from_bytes(&receiver_pub_key),
            &prev_enc_msk,
            &new_enc_msk,
            &proof,
        ), EProveError);
        self.encrypted_master_key = new_enc_msk;
        transfer::public_transfer(self, to);
    }
    

    fun equality_verify(
        pk1: &Element<bls12381::G1>, // seller 
        pk2: &Element<bls12381::G1>, // buyer
        enc1: &ElGamalEncryption, // prev encryption
        enc2: &ElGamalEncryption, // curr encryption
        proof: &EqualityProof
    ): bool {
        let c = fiat_shamir_challenge(pk1, pk2, enc1, enc2, &proof.u1, &proof.u2, &proof.v);
        // Check if z1*G = a1 + c*pk1
        let lhs = bls12381::g1_mul(&proof.s1, &bls12381::g1_generator());
        let pk1_c = bls12381::g1_mul(&c, pk1);
        let rhs = bls12381::g1_add(&proof.u1, &pk1_c);
        if (!group_ops::equal(&lhs, &rhs)) {
            return false
        };
        // Check if z2*G = a2 + c*eph2
        let lhs = bls12381::g1_mul(&proof.s2, &bls12381::g1_generator());
        let eph2_c = bls12381::g1_mul(&c, &enc2.ephemeral);
        let rhs = bls12381::g1_add(&proof.u2, &eph2_c);
        if (!group_ops::equal(&lhs, &rhs)) {
            return false
        };
        //if prev_enc_msk.ephemeral * proof.s1 - buyer_enc_pk * proof.s2
        // != (prev_enc_msk.ciphertext - curr_enc_msk.ciphertext) * c + proof.v
        
        // Check if a3 = c*(ct2 - ct1) + z1*eph1 - z2*pk2
        let lhs1 = bls12381::g1_identity();
        lhs1 = bls12381::g1_add(&lhs1, &bls12381::g1_mul(&c, &enc2.ciphertext));
        lhs1 = bls12381::g1_add(&lhs1, &bls12381::g1_mul(&bls12381::scalar_neg(&c), &enc1.ciphertext));
        lhs1 = bls12381::g1_add(&lhs1, &bls12381::g1_mul(&proof.s1, &enc1.ephemeral));
        lhs1 = bls12381::g1_add(&lhs1, &bls12381::g1_mul(&bls12381::scalar_neg(&proof.s2), pk2));
        if (!group_ops::equal(&lhs1, &proof.v)) {
            return false
        };
        return true
    }

    fun fiat_shamir_challenge(
        pk1: &Element<bls12381::G1>,
        pk2: &Element<bls12381::G1>,
        enc1: &ElGamalEncryption,
        enc2: &ElGamalEncryption,
        a1: &Element<bls12381::G1>,
        a2: &Element<bls12381::G1>,
        a3: &Element<bls12381::G1>,
    ): Element<bls12381::Scalar> {
        let to_hash = vector::empty<u8>();
        vector::append(&mut to_hash, *group_ops::bytes(pk1));
        vector::append(&mut to_hash, *group_ops::bytes(pk2));
        vector::append(&mut to_hash, *group_ops::bytes(&enc1.ephemeral));
        vector::append(&mut to_hash, *group_ops::bytes(&enc1.ciphertext));
        vector::append(&mut to_hash, *group_ops::bytes(&enc2.ephemeral));
        vector::append(&mut to_hash, *group_ops::bytes(&enc2.ciphertext));
        vector::append(&mut to_hash, *group_ops::bytes(a1));
        vector::append(&mut to_hash, *group_ops::bytes(a2));
        vector::append(&mut to_hash, *group_ops::bytes(a3));
        let hash = blake2b256(&to_hash);

        // Make sure we are in the right field. Note that for security we only need the lower 128 bits.
        // let len = vector::length(&hash);
        *vector::borrow_mut(&mut hash, 0) = 0;
        bls12381::scalar_from_bytes(&hash)
    }


    #[test]
    public fun test_new() {
        use sui::test_scenario as ts;
        let user = @0x123;
        let recipient: address = @0x234;

        let name = std::string::utf8(b"Cool NFT");
        let image_url = std::string::utf8(b"https://coolnft.com/image.jpg");
        let ciphertext_url = std::string::utf8(b"https://coolnft.com/ciphertext.jpg");
        let sender_pub_key: vector<u8> = x"8f6823e107967915032bb701bfbf2c6f1f5fe4d584d9be1db7a0010f2b3510eac3c7176630a25b77d9e0a350a2f2a728";
        let receiver_pub_key: vector<u8> = x"8463affac6a1eb9b22caabfd5d2cefeacdf8a84175a588d3ee19f9ad4f53eeed7f5cfe464505792db811ea68cebaf136";
        let prevEph: vector<u8> = x"8cfca733533a0a3421cd93579a57f6ab68ead466105d9a25124bf8a5998124ebf1e94e8694e2c9bbb01b1b29fe7c2088";
        let prevCiph: vector<u8> = x"b6495bead5ac0759fd77088e7665c0ca1dc02ce866f6971bbe236e95a6533b46a2896bb282f70e5a29234ed0e70154ac";
        let newEph: vector<u8> = x"98dc2c7b9ea00fce02bd0abcc83523ce5aab00b0fe671bdab392649fddac7a55212181be3bf9c71d35a7745af509c8c5";
        let newCiph: vector<u8> = x"8990946a8bf81675185640e699d49d70db2fbcd094f7ab89d8c89d67d897937acb8bf759f7c58960a83eb8a60efc4984";
        let s1: vector<u8> = x"2fb95792192b8357e4304233474c516798526fd0d187b36c90af83e87ef6056f";
        let s2: vector<u8> = x"402dd9ec755e8e8d4f4ba57d5419f5c6b5791b359ea9e96fb5dbf653a58e5f52";
        let u1: vector<u8> = x"a9b484d6927e3a758d37464d332b0807d97029d1e158e9c9cc4a8bf28228183c8d183efc9d686f5c96535e4c39e401d6";
        let u2: vector<u8> = x"a1d98ef7dc3ab15ef1a344c06b2840d8e554fdef7364f80ad462b783e060ebe1f92d99f317e8a0cac838f00b1ffd40f1";
        let v: vector<u8> = x"8975a7437dda0bf41a095090884954b0f9f93cf304f2d33a20b90d8122e294f4596b7f14428df0d4a82b27f4d63bbb5f";
        let scenario = ts::begin(user);
        {
            let nft = new(
                name,
                image_url,
                ciphertext_url,
                prevEph,
                prevCiph,
                ts::ctx(&mut scenario)
            );

            transfer::public_transfer(nft, user);
        };
        ts::next_tx(&mut scenario, user);
        {
            let nft = ts::take_from_sender<EncryptedNFT>(&scenario);
            transfer_to(
                nft,
                recipient,
                sender_pub_key,
                receiver_pub_key,
                prevEph,
                prevCiph,
                newEph,
                newCiph,
                s1,
                s2,
                u1,
                u2,
                v,
                ts::ctx(&mut scenario)
            );

        };
        ts::end(scenario);

    }
}