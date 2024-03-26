module package::private_nft {
    use sui::bcs;
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
        let scalars = vector::singleton(c);
        vector::push_back(&mut scalars, bls12381::scalar_neg(&c));
        vector::push_back(&mut scalars, proof.s1);
        vector::push_back(&mut scalars, bls12381::scalar_neg(&proof.s2));
        let points = vector::singleton(enc2.ciphertext);
        vector::push_back(&mut points, enc1.ciphertext);
        vector::push_back(&mut points, enc1.ephemeral);
        vector::push_back(&mut points, *pk2);
        let lhs = bls12381::g1_multi_scalar_multiplication(&scalars, &points);
        if (!group_ops::equal(&lhs, &proof.v)) {
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
        let len = vector::length(&hash);
        *vector::borrow_mut(&mut hash, len-1) = 0;
        bls12381::scalar_from_bytes(&hash)
    }
}