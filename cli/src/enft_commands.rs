// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::str::FromStr;

use crate::key_derive::derive_key;
use crate::utils::load_image;
use crate::utils::{load_and_sample_image, save_image};
use bip32::DerivationPath;
use bip39::{Language, Mnemonic, MnemonicType};
use clap::Parser;
use fastcrypto::aes::Cipher;
use fastcrypto::aes::InitializationVector;
use fastcrypto::encoding::{Encoding, Hex};
use fastcrypto::groups::bls12381::{G1Element, Scalar, SCALAR_LENGTH};
use fastcrypto::hash::Blake2b256;
use fastcrypto::hmac::{hkdf_sha3_256, HkdfIkm};
use fastcrypto::serde_helpers::ToFromByteArray;
use fastcrypto::traits::{Generate, ToFromBytes};
use fastcrypto::{
    groups::{GroupElement, Scalar as ScalarTrait},
    hash::HashFunction,
};
use rand::rngs::StdRng;
use rand::SeedableRng;
use serde::{Deserialize, Serialize};
use typenum::U12;
use utils::{msk_to_cipher, recover_image};

pub mod key_derive;
pub mod utils;

#[derive(Parser)]
#[command(name = "enft-cli")]
#[command(about = "Offchain utilities for key generating, encrypting and decrypting NFTs", long_about = None)]
enum Command {
    /// Generate a master key. This can be used by the creator only.
    GenerateMasterKey,

    /// Generate the encryption key. This can be used by either the buyer
    /// or the creator.
    GenerateEncryptionKey,

    /// Generate a master private key and its mnemonics if not provided.
    /// Otherwise, derive the encryption key based on the providede mnemonics
    /// with the provided derivation path. Otherwise use the default
    /// derivation path m/94'/784'/0'/0'/0'.
    GenerateOrDeriveEncryptionKey(GenerateArgs),

    /// Example implementation for a key server that uses a master key and
    /// derive encryption keys based on unique app id and user id.
    DeriveEncryptionKey(DeriveArgs),

    /// Encrypt the master key under the given pubkey. Output encrypted
    /// master key (enc_msk) and ciphertext. This is done by creator when
    /// listing the NFT. The obfuscated NFT, enc_msk and ciphertext are
    /// posted on-chain.
    Encrypt(EncryptArgs),

    /// Encrypt the master key under the buyer pubkey. Output the newly
    /// encrypted master key and consistency proof. This is called by the
    /// seller when an NFT is transferred.
    Transfer(TransferArgs),

    /// Decrypt the original NFT from ciphertext. This can be done by
    /// anyone who can recover the master key and decrypt from ciphertext.
    Decrypt(DecryptArgs),

    /// Given a proof, the previous encryption and its pubkey (seller's pk),
    /// the current encryption and its pubkey (buyer's pk), verify the proof.
    Verify(VerifyArgs),
}

#[derive(Parser, Clone)]
struct GenerateArgs {
    /// The mnemonics representing the master private key.
    #[clap(short, long)]
    mnemonics: Option<String>,

    /// A valid derivation path in this form: m/94'/784'/{account}'/{change}'/{address}'.
    #[clap(short, long)]
    derivation_path: Option<DerivationPath>,
}

#[derive(Parser, Clone)]
struct DeriveArgs {
    /// The 32-byte master secret key encoded in hex held securely by the server.
    #[clap(short, long)]
    master_key: String,

    /// The app_id for the application (example: `iss_len || iss || aud_len || aud`).
    #[clap(short, long)]
    app_id: String,

    /// The user id uniquely identifying the use (example: `sub`).
    #[clap(short, long)]
    user_id: String,
}

#[derive(Parser, Clone)]
struct EncryptArgs {
    /// A path for the original file.
    #[clap(short, long)]
    image_path: String,

    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    master_sk: String,

    /// A hex encoding of the pubkey to encrypt with.
    #[clap(short, long)]
    enc_pk: String,
}

#[derive(Parser, Clone)]
struct TransferArgs {
    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    master_sk: String,
    /// An encrypted master key under the seller's pubkey.
    #[clap(short, long)]
    prev_enc_msk: String,
    /// A hex encoding of the buyer pk, i.e. pubkey to encrypt with.
    #[clap(short, long)]
    buyer_pk: String,
    /// A hex encoding of the seller's encryption private key.
    #[clap(short, long)]
    seller_enc_sk: String,
}

#[derive(Parser, Clone)]
struct DecryptArgs {
    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    enc_master_sk: String,

    /// A path to get the raw ciphertext bytes.
    #[clap(short, long)]
    ciphertext_path: String,

    /// A hex encoding of the buyer's private key.
    #[clap(short, long)]
    buyer_sk: String,
}

#[derive(Parser, Clone)]
struct VerifyArgs {
    /// A serialized consistency proof.
    #[clap(long)]
    serialized_proof: String,

    /// Previous encrypted master key under seller's pubkey.
    #[clap(short, long)]
    prev_enc_msk: String,

    /// Current encrypted master key under buyer's pubkey.
    #[clap(short, long)]
    curr_enc_msk: String,

    /// A hex encoding of the seller's pk.
    #[clap(short, long)]
    seller_enc_pk: String,

    /// A hex encoding of the buyers's pk.
    #[clap(short, long)]
    buyer_enc_pk: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ElGamalEncryption {
    pub ephemeral: G1Element,
    pub ciphertext: G1Element,
}

/// A proof that two encrypted master keys are consistent wrt the same master key.
#[derive(Clone, Serialize, Deserialize)]
pub struct EqualityProof {
    pub s1: Scalar,    //z1
    pub s2: Scalar,    // z2
    pub u1: G1Element, // a1
    pub u2: G1Element, // a2
    pub v: G1Element,  // a3
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FullCipherText {
    pub pixels: Vec<(usize, usize)>,
    pub iv: InitializationVector<U12>,
    pub data: Vec<u8>,
}

fn main() {
    match execute(Command::parse()) {
        Ok(_) => {
            std::process::exit(exitcode::OK);
        }
        Err(e) => {
            println!("Error: {}", e);
            std::process::exit(exitcode::DATAERR);
        }
    }
}

fn execute(cmd: Command) -> Result<(), std::io::Error> {
    match cmd {
        Command::GenerateMasterKey => {
            let scalar: Scalar = Scalar::rand(&mut rand::thread_rng());
            let gen = G1Element::generator();
            let g1 = gen * scalar;
            let msk = Hex::encode(g1.to_byte_array());
            println!("Master sk: {}", msk);
            Ok(())
        }
        Command::GenerateEncryptionKey => {
            let sk: Scalar = Scalar::rand(&mut rand::thread_rng());
            let gen = G1Element::generator();
            let pk = gen * sk;
            let pk_str = Hex::encode(pk.to_byte_array());
            let sk_str = Hex::encode(sk.to_byte_array());
            println!("Encryption sk: {}", sk_str);
            println!("Encryption pk: {}", pk_str);
            Ok(())
        }
        Command::Encrypt(args) => {
            let msk = G1Element::from_byte_array(
                &Hex::decode(&args.master_sk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let enc_pk =
                G1Element::from_byte_array(&Hex::decode(&args.enc_pk).unwrap().try_into().unwrap())
                    .unwrap();
            let mut rng = rand::thread_rng();

            // 1. Encrypt the master key under the given pubkey.
            let gen = <G1Element as GroupElement>::generator();
            let encryption_randomness = <G1Element as GroupElement>::ScalarType::rand(&mut rng);
            let encrypted_msk = ElGamalEncryption {
                ephemeral: gen * encryption_randomness,
                ciphertext: enc_pk * encryption_randomness + msk,
            };
            let encrypted_msk = Hex::encode(bcs::to_bytes(&encrypted_msk).unwrap());
            println!("Encrypted master sk:");
            println!("{:?}", encrypted_msk);

            // 2. Generate the ciphertext.
            // First initialize an AES cipher from the seed deterministically derived from the master key.
            // i.e. the AES encryption key is derived from the master key.
            let cipher = msk_to_cipher(&msk);

            let preprocessed = load_and_sample_image(args.image_path.as_str());
            println!("Selected pixels: {:?}", preprocessed.selected_coordinates);
            let iv = InitializationVector::<U12>::generate(&mut rng);
            let data = cipher.encrypt(&iv, preprocessed.selected_values.as_slice());
            let full_ciphertext = FullCipherText {
                pixels: preprocessed.selected_coordinates,
                iv,
                data,
            };
            let contents = Hex::encode(bcs::to_bytes(&full_ciphertext).unwrap());
            std::fs::write("ciphertext", contents)?;
            println!("Ciphertext written to file.");

            save_image("obfuscated_nft.png", &preprocessed.obfuscated_image);
            println!("Obfuscated image to file.");
            Ok(())
        }
        Command::Transfer(args) => {
            let prev_enc_msk: ElGamalEncryption =
                bcs::from_bytes(&Hex::decode(&args.prev_enc_msk).unwrap()).unwrap();
            let buyer_pk = G1Element::from_byte_array(
                &Hex::decode(&args.buyer_pk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let msk = G1Element::from_byte_array(
                &Hex::decode(&args.master_sk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let seller_enc_sk = Scalar::from_byte_array(
                &Hex::decode(&args.seller_enc_sk)
                    .unwrap()
                    .try_into()
                    .unwrap(),
            )
            .unwrap();
            let seller_enc_pk = G1Element::generator() * seller_enc_sk;
            // first generate the newly encrypted master key under the buyer pk.
            let gen = <G1Element as GroupElement>::generator();
            let mut rng = rand::thread_rng();
            let encryption_randomness = <G1Element as GroupElement>::ScalarType::rand(&mut rng);
            let new_enc_msk = ElGamalEncryption {
                ephemeral: gen * encryption_randomness,
                ciphertext: buyer_pk * encryption_randomness + msk,
            };
            let new_enc_sk = Hex::encode(bcs::to_bytes(&new_enc_msk).unwrap());
            println!("Serialized newly encrypted master key (under buyer pk):");
            println!("{:?}", new_enc_sk);

            // then generate a proof that new_enc_msk and prev_enc_msk are equivalent wrt msk.
            let alpha: Scalar = Scalar::rand(&mut rng);
            let beta: Scalar = Scalar::rand(&mut rng);

            let u1 = gen * alpha;
            let u2 = gen * beta;
            let v = prev_enc_msk.ephemeral * alpha - buyer_pk * beta;

            let c = fiat_shamir_challenge(
                &seller_enc_pk,
                &buyer_pk,
                &prev_enc_msk,
                &new_enc_msk,
                u1,
                u2,
                v,
            );

            let proof = EqualityProof {
                s1: seller_enc_sk * c + alpha,
                s2: encryption_randomness * c + beta,
                u1,
                u2,
                v,
            };

            let proof = Hex::encode(bcs::to_bytes(&proof).unwrap());
            println!("Serialized equality proof:");
            println!("{:?}", proof);

            Ok(())
        }
        Command::Decrypt(args) => {
            let enc_msk: ElGamalEncryption =
                bcs::from_bytes(&Hex::decode(&args.enc_master_sk).unwrap()).unwrap();
            let ciphertext: FullCipherText = bcs::from_bytes(
                &Hex::decode(&std::fs::read_to_string(&args.ciphertext_path).unwrap()).unwrap(),
            )
            .unwrap();
            let obfuscated_image = load_image("obfuscated_nft.png");
            let buyer_sk =
                Scalar::from_byte_array(&Hex::decode(&args.buyer_sk).unwrap().try_into().unwrap())
                    .unwrap();

            let msk = enc_msk.ciphertext - enc_msk.ephemeral * buyer_sk;
            println!(
                "Recovered master sk: {:?}",
                Hex::encode(msk.to_byte_array())
            );

            let original = recover_image(&obfuscated_image.data, ciphertext, msk);
            save_image("original_nft.png", &original);
            println!("Original nft saved to original_nft.png. This is identical with capy.png");
            Ok(())
        }
        Command::Verify(args) => {
            let proof: EqualityProof =
                bcs::from_bytes(&Hex::decode(&args.serialized_proof).unwrap()).unwrap();
            let seller_enc_pk = G1Element::from_byte_array(
                &Hex::decode(&args.seller_enc_pk)
                    .unwrap()
                    .try_into()
                    .unwrap(),
            )
            .unwrap();
            let prev_enc_msk: ElGamalEncryption =
                bcs::from_bytes(&Hex::decode(&args.prev_enc_msk).unwrap()).unwrap();
            let curr_enc_msk: ElGamalEncryption =
                bcs::from_bytes(&Hex::decode(&args.curr_enc_msk).unwrap()).unwrap();
            let buyer_enc_pk = G1Element::from_byte_array(
                &Hex::decode(&args.buyer_enc_pk).unwrap().try_into().unwrap(),
            )
            .unwrap();

            let c = fiat_shamir_challenge(
                &seller_enc_pk,
                &buyer_enc_pk,
                &prev_enc_msk,
                &curr_enc_msk,
                proof.u1,
                proof.u2,
                proof.v,
            );
            let gen = <G1Element as GroupElement>::generator();

            if gen * proof.s1 != seller_enc_pk * c + proof.u1 {
                panic!("Invalid Schnorr proof for s1");
            }

            if gen * proof.s2 != curr_enc_msk.ephemeral * c + proof.u2 {
                panic!("Invalid Schnorr proof for s1");
            }

            if prev_enc_msk.ephemeral * proof.s1 - buyer_enc_pk * proof.s2
                != (prev_enc_msk.ciphertext - curr_enc_msk.ciphertext) * c + proof.v
            {
                panic!("Invalid Schnorr proof for v");
            }
            println!("Proof verified.");
            Ok(())
        }
        Command::GenerateOrDeriveEncryptionKey(args) => {
            let derivation_path = args
                .derivation_path
                .unwrap_or(DerivationPath::from_str("m/94'/784'/0'/0'/0").unwrap());

            let private_key = if let Some(mnemonics) = args.mnemonics {
                let mnemonics = Mnemonic::from_phrase(&mnemonics, Language::English).unwrap();
                derive_key(mnemonics, derivation_path)
            } else {
                let mnemonics = Mnemonic::new(MnemonicType::Words12, Language::English);
                println!("Generated mnemonics: {:?}", mnemonics.phrase());
                derive_key(mnemonics, derivation_path)
            };

            let gen = G1Element::generator();
            let public_key = gen * private_key;
            println!(
                "Private encryption key: {:?}",
                Hex::encode(private_key.to_byte_array())
            );
            println!(
                "Public encryption key: {:?}",
                Hex::encode(public_key.to_byte_array())
            );
            Ok(())
        }
        Command::DeriveEncryptionKey(args) => {
            let master_key = Hex::decode(&args.master_key).unwrap();
            let bytes = hkdf_sha3_256(
                &HkdfIkm::from_bytes(&master_key).unwrap(),
                args.app_id.as_bytes(),
                args.user_id.as_bytes(),
                SCALAR_LENGTH,
            )
            .unwrap();

            let mut rng = StdRng::from_seed(bytes.try_into().unwrap());
            let private_key = Scalar::rand(&mut rng);
            let gen = G1Element::generator();
            let public_key = gen * private_key;
            println!(
                "Private encryption key: {:?}",
                Hex::encode(private_key.to_byte_array())
            );
            println!(
                "Public encryption key: {:?}",
                Hex::encode(public_key.to_byte_array())
            );
            Ok(())
        }
    }
}

fn fiat_shamir_challenge(
    pk1: &G1Element,
    pk2: &G1Element,
    enc1: &ElGamalEncryption,
    enc2: &ElGamalEncryption,
    a1: G1Element,
    a2: G1Element,
    a3: G1Element,
) -> Scalar {
    let mut fiat_shamir_msg = Blake2b256::new();
    fiat_shamir_msg.update(pk1.to_byte_array());
    fiat_shamir_msg.update(pk2.to_byte_array());
    fiat_shamir_msg.update(enc1.ephemeral.to_byte_array());
    fiat_shamir_msg.update(enc1.ciphertext.to_byte_array());
    fiat_shamir_msg.update(enc2.ephemeral.to_byte_array());
    fiat_shamir_msg.update(enc2.ciphertext.to_byte_array());
    fiat_shamir_msg.update(a1.to_byte_array());
    fiat_shamir_msg.update(a2.to_byte_array());
    fiat_shamir_msg.update(a3.to_byte_array());

    let mut digest = fiat_shamir_msg.finalize().digest;
    digest[31] = 0;
    Scalar::from_byte_array(&digest).unwrap()
}
