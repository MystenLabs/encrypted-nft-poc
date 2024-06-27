# Encrypted NFT CLI

This serves as a reference implementation for the encrypted NFT demo in Rust. Here we implement the key generation, encryption, decryption, transfer (where a new encryption is produced and an equality proof is generated), and onchain verification function in Rust. 

We also include a reference implementation for key derivations for BLS encryption key standard in Sui, proposed in [SIP](https://github.com/sui-foundation/sips/pull/23). 

```
cd cli/
cargo build --release
target/release/enft-cli -h

# creator generates msk

target/release/enft-cli generate-master-key

Master sk: a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4

# creator generates encryption key (AES key)

target/release/enft-cli generate-encryption-key

Encryption sk: 2fd7a46d6c4955630c91f6960b4cfc02f07254d0f41feccf03f67c3e2f07576f
Encryption pk: 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

# generate another pair, assume this is for buyer for later. 
Encryption sk: 2c21211240cb3e79ed3656f510513efc2aaa7d4f09d958ced92239b7af33c204
Encryption pk: 86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d

# creator encrypts the master key to the provided encryption key. Outputs the following: 
# 1. prints out encrypted master key 
# 2. output ciphertext to file 
# 3. output obfuscated_nft.png to file

target/release/enft-cli encrypt -i ./capy.png --master-sk a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4 --enc-pk 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

Encrypted master sk:
"83e35898f61711f28aee79c36f01c2f09db2629ea93cca2cca4243dfd5f6b1796a538f340fecca4a34942a7da11c8b6fae6644a47b891c9c04df63565e54b06207c9fcae0478a54a07e42e800eb0ee6df1efd3ce26c3471e1699597787727779"
Ciphertext written to file.
Obfuscated image to file.

# now creator (seller) initiates transfers. Outputs the following: 
# 1. a new encrypted master key under the buyer pk. 
# 2. a consistency proof to ensure the encryption is indeed for the same master key. 
# Note that the encrypted msk and the proof changes since it takes into account a randomness. 

target/release/enft-cli transfer --master-sk a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4 --prev-enc-msk 83e35898f61711f28aee79c36f01c2f09db2629ea93cca2cca4243dfd5f6b1796a538f340fecca4a34942a7da11c8b6fae6644a47b891c9c04df63565e54b06207c9fcae0478a54a07e42e800eb0ee6df1efd3ce26c3471e1699597787727779 --buyer-pk 86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d --seller-enc-sk 2fd7a46d6c4955630c91f6960b4cfc02f07254d0f41feccf03f67c3e2f07576f

Serialized newly encrypted master key (under buyer pk):
"b5222036738cbd5d3271f6f67a6a76a8747792891e777349bee13990e729ac5f4efb678434b1b26a00f485e68232eeef82ffb1c939387d848d79c7b428840c534c2f500d8f80e853c27d3f1a6f3ba8b917890adeb3f69913007c5b98cf8d87b2"
Serialized equality proof:
"0df498b308b3970764d58d3a28f9f8ce00a125cf8aaf29148807366b1e791aa55f1fba976ce92c480fcd1c320c7a826385c4eba8c4341a1997248481401ca1e4b4a5977fba3747a613e3f33766b39e4bdeedea5fdf2940ee7175366f3bdbe01392ff7a48f178661bb9476d751e401c8a8cb732b421173783048ab5b073eb5c3d50929191aa31e923837c8aa39401d93e8b6273eebd79563f5a9f177d94b379f4a9605fa55447eb5c324176c0f91e8357f8f345e239bf3e25230773d577387b6c6f7aa29937a484464e2de8c8289e6bb3"

# Offchain verify the consistency proof. This happens onchain when the seller takes the payment. 

target/release/enft-cli verify --serialized-proof 0df498b308b3970764d58d3a28f9f8ce00a125cf8aaf29148807366b1e791aa55f1fba976ce92c480fcd1c320c7a826385c4eba8c4341a1997248481401ca1e4b4a5977fba3747a613e3f33766b39e4bdeedea5fdf2940ee7175366f3bdbe01392ff7a48f178661bb9476d751e401c8a8cb732b421173783048ab5b073eb5c3d50929191aa31e923837c8aa39401d93e8b6273eebd79563f5a9f177d94b379f4a9605fa55447eb5c324176c0f91e8357f8f345e239bf3e25230773d577387b6c6f7aa29937a484464e2de8c8289e6bb3 --prev-enc-msk 83e35898f61711f28aee79c36f01c2f09db2629ea93cca2cca4243dfd5f6b1796a538f340fecca4a34942a7da11c8b6fae6644a47b891c9c04df63565e54b06207c9fcae0478a54a07e42e800eb0ee6df1efd3ce26c3471e1699597787727779 --curr-enc-msk b5222036738cbd5d3271f6f67a6a76a8747792891e777349bee13990e729ac5f4efb678434b1b26a00f485e68232eeef82ffb1c939387d848d79c7b428840c534c2f500d8f80e853c27d3f1a6f3ba8b917890adeb3f69913007c5b98cf8d87b2 --seller-enc-pk 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892 --buyer-enc-pk 86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d

# buyer now has the ciphertext and the encrypted master key from onchain. He also already have buyer_sk. 

target/release/enft-cli decrypt --enc-master-sk b5222036738cbd5d3271f6f67a6a76a8747792891e777349bee13990e729ac5f4efb678434b1b26a00f485e68232eeef82ffb1c939387d848d79c7b428840c534c2f500d8f80e853c27d3f1a6f3ba8b917890adeb3f69913007c5b98cf8d87b2 --ciphertext-path ./ciphertext --buyer-sk 2c21211240cb3e79ed3656f510513efc2aaa7d4f09d958ced92239b7af33c204

Recovered master sk: "a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4"
Original nft saved to original_nft.png. This is identical with capy.png
```


## Generate and Derive Encryption Key

1. User private key model (Reference implementation for [SIP](https://github.com/sui-foundation/sips/pull/28))
```
cd cli/
cargo build --release

target/release/enft-cli generate-or-derive-encryption-key

Generated mnemonics: "win violin swap modify pumpkin ready burst ivory weekend reopen female struggle"
Private encryption key: "1499ec4cdc769fccd5a8952dc20bae6aae271780dc187ebadf8d8a4b84db215f"
Public encryption key: "b1d1440ea034337d386d3989586c86705917a4e450dfdc216bb709dc83a7844ea549bd4f618c0244d5d11d48c5a6b053"

target/release/enft-cli generate-or-derive-encryption-key -m "dove vault canoe aisle tiger layer tape occur arrange control raccoon guilt"

Private encryption key: "26151c5c0cb67ab2f2f37d000374a629ae1b7f35658d1bd5af4954e5c7ff8f81"
Public encryption key: "82587479cf572cd6c17b19fcd979ef574da0f372f42498db7e8078319d8b74af73a9e583b54e9113111ada9301e0231a"

target/release/enft-cli generate-or-derive-encryption-key -m "dove vault canoe aisle tiger layer tape occur arrange control raccoon guilt" -d "m/94'/784'/1'/0'/0"

Private encryption key: "257f94f04abdc37734e8e637085f9a04eac0a2b81c5a0d39d88d1fa2db12a643"
Public encryption key: "ad3c8fce5b5f1fb04ecb70c3cb2c1661cee3018c91ad891e744a1bf12a94cfd0a82ce899d459fab06be57ec430e16423"
```

2. Custodial server model (Reference implementation for [SIP](https://github.com/sui-foundation/sips/pull/27))
```
target/release/enft-cli derive-encryption-key -m 0000000000000000000000000000000000000000000000000000000000000000 -a example_app -u 0

Private encryption key: "1951b5a79806a7c503c9456b7e20e46a37e2bf3c59b42d351b268b7a3a4bce1b"
Public encryption key: "8846743e175869c7fe8906aa24b22e24caaf8059125cbc944f9b38e77756665fa5e13b3e97203de7ad32d1c12e7ca5df"
```