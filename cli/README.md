# CLI

```
cd cli/
cargo build --bin enft-cli
target/debug/enft-cli -h

# creator generates msk

target/debug/enft-cli generate-master-key

Master sk: a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4

# creator generates encryption key (AES key)

target/debug/enft-cli generate-encryption-key

Encryption sk: 2fd7a46d6c4955630c91f6960b4cfc02f07254d0f41feccf03f67c3e2f07576f
Encryption pk: 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

# generate another pair, assume this is for buyer for later. 
Encryption sk: 2c21211240cb3e79ed3656f510513efc2aaa7d4f09d958ced92239b7af33c204
Encryption pk: 86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d

# creator encrypts the master key to the provided encryption key. Outputs the following: 
# 1. prints out encrypted master key 
# 2. output ciphertext to file 
# 3. output obfuscated_nft.png to file

target/debug/enft-cli encrypt -i ./capy.png --master-sk a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4 --enc-pk 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

Encrypted master sk:
"807fe2952817e98573e6e2f65c51dec919aedbc423186419c390053efb0f5aa79464d238cf33748cf6951736b9e13439a4224b87525ed2c0d9dbcbe79fd8c3c4f70976cb1c05b81e926436b3cf7eec14cb4ca33c6a084c27bd4f192ab1cad64b"
Ciphertext written to file.
Obfuscated image to file.

# now creator (seller) initiates transfers. Outputs the following: 
# 1. a new encrypted master key under the buyer pk. 
# 2. a consistency proof to ensure the encryption is indeed for the same master key. 

target/debug/enft-cli transfer --master-sk a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4 --prev-enc-msk 807fe2952817e98573e6e2f65c51dec919aedbc423186419c390053efb0f5aa79464d238cf33748cf6951736b9e13439a4224b87525ed2c0d9dbcbe79fd8c3c4f70976cb1c05b81e926436b3cf7eec14cb4ca33c6a084c27bd4f192ab1cad64b --buyer-pk 86de3db3f383379715bdf920768e5a2b9ad102c01de08e9b6009d8848aae8939448603ca0db10525aca5b4c6a270666d --seller-enc-sk 2fd7a46d6c4955630c91f6960b4cfc02f07254d0f41feccf03f67c3e2f07576f

Serialized newly encrypted master key (under buyer pk):
"a1e7dad92abc9fec13f9d62001033378154a96a8c834884c1fb3ecdbc1c45e39a2ab30167443416fa650ab8e53a1922ca45bc5c05fddf22014b4b9d100f33d1554439618bd69cb39b298b09bf80c876343ca5c9a9fbeb4e47eb2eab757b034a2"
Serialized consistency proof:
"211e6c4b6038553867f57c805f7602d2378a914103446309e3afbf64c07f6fb74c58be25314a7924b84635c00fe3386c74f5c80331fb553233103381884c2181a8d6918547581cc1d29ed863268048bf9e37051690372a25949d24df897a6931de5cbae504f63e02b524260d6853dee583d1c18db64b01cc5d953f92fdfacefd3b44e84ea550784faf0a8c3c72e39746e0c1179b59993480ebc069d29e1bbc36a1ac396c2bc210a4f17c2eeafd19ec08009b4715a87dfc6db31c8a78115b4ca15503588a9212eb0e39feb40905837769"

# Offchain verify the consistency proof. This happens onchain when the seller takes the payment. 
# todo

# buyer now has the ciphertext and the encrypted master key from onchain. He also already have buyer_sk. 

target/debug/enft-cli decrypt --enc-master-sk a1e7dad92abc9fec13f9d62001033378154a96a8c834884c1fb3ecdbc1c45e39a2ab30167443416fa650ab8e53a1922ca45bc5c05fddf22014b4b9d100f33d1554439618bd69cb39b298b09bf80c876343ca5c9a9fbeb4e47eb2eab757b034a2 --ciphertext-path ./ciphertext --buyer-sk 2c21211240cb3e79ed3656f510513efc2aaa7d4f09d958ced92239b7af33c204

Recovered master sk: "a1466cfa0e01b2b2a40663d18ce5651459444580ac4b3cd36a403ba0a46cb76eda010994c94858edc4811570f8893af4"
Original nft saved to original_nft.png. This is identical with capy.png
```