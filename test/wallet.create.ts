import { TronWeb } from "tronweb";

const {
  publicKey,
  privateKey,
  address: { base58: address },
} = await TronWeb.createAccount();

console.dir({
  publicKey,
  privateKey,
  address,
});
