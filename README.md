# Encrypted NFT Demo

This dApp was created using `@mysten/create-dapp` that sets up a simple React
Client dApp using the following tools:

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Radix UI](https://www.radix-ui.com/) for pre-built UI components
- [ESLint](https://eslint.org/) for linting
- [`@mysten/dapp-kit`](https://sdk.mystenlabs.com/dapp-kit) for connecting to
  wallets and loading data
- [pnpm](https://pnpm.io/) for package management

## Deploying your Move code

### Install Sui cli

Before deploying your move code, ensure that you have installed the Sui CLI. You
can follow the [Sui installation instruction](https://docs.sui.io/build/install)
to get everything set up.

This template uses `devnet` by default, so we'll need to set up a devnet
environment in the CLI:

```bash
sui client new-env --alias devnet --rpc https://fullnode.devnet.sui.io:443
sui client switch --env devnet
```

If you haven't set up an address in the sui client yet, you can use the
following command to get a new address:

```bash
sui client new-address secp256k1
```

This well generate a new address and recover phrase for you. You can mark a
newly created address as you active address by running the following command
with your new address:

```bash
sui client switch --address 0xYOUR_ADDRESS...
```

We can ensure we have some Sui in our new wallet by requesting Sui from the
faucet (make sure to replace the address with your address):

```bash
curl --location --request POST 'https://faucet.devnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "0x1b87a727f58830d9ba2bfe6ecdc8fb49aa96fa2a2bbe175e128bfee13f6895ff"
    }
}'
```

### Publishing the move package

The move code for this template is located in the `package` directory. To publish
it, it is suggested to navigate to `app/publish/` and run `./publish.sh` in your console.
This will create an `.env` file in the app with the package id and the network you published to.
Sui CLI is a pre-requisite for this to function.

After you ran the script edit the `.env` that was created and add the backend address that by
default is set to `http://localhost:3000`. This can be changed in `backend/server.ts#175` by modifying
the number after `app.listen(3000 ...)`.

### Running the demo
This project has a backend, a frontend and a move contract that can be found respectively in:
`app/`, `backend/` and `package/`.

For the backend to work access to an S3 bucket or compatible is required. Please edit the `backend/env.example` file with
the correct values for your bucket. `BUCKET_FOLDER` is a new folder that will be created in your bucket to keep this project's
resources separated. After you edited the values, rename the `backend/env.example` to just `backend/.env`.

In order to run the project make sure you followed the previous step with the contract publishing. If you are using testnet 
and want to use an already published contract you can add an `app/.env` file with the following:

- VITE_PACKAGE_ID="address of the published contract"
- VITE_ACTIVE_NETWORK="testnet" // or the network your contract lives in.
- VITE_BACKEND="http://localhost:3000" // or whichever port your backend is listening to.

To run the backend, from `backend/` run `pnpm dev`.
To run the frontent, from `app/` run `pnpm dev`.

### Exploring the demo
Open a browser and navigate to `http://localhost:3000` (by default). If you changed the port, input the correct port.