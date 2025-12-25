import { sendEptrcRequest } from "../src/utils";

const walletCollectionRequestBody = JSON.stringify({
  toAddress: "TDVZJznLGjXZZd44geotpwwrrgSor6sotF",
  feePayerPrivateKey:
    "261217AF2FE7B3755874D49F47899CBA76B76F65F2292D27E4F0DE55D17F48A4",
});
console.dir({ walletCollectionRequestBody });

const walletCollectionResponse = await sendEptrcRequest({
  url: "http://127.0.0.1:3000/wallet/collection",
  requestBody: walletCollectionRequestBody,
});

console.dir({ status: walletCollectionResponse.status });
console.dir(
  {
    bodyJson: await walletCollectionResponse.json(),
  },
  { depth: 10 },
);
