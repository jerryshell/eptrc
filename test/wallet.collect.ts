import { sendEptrcRequest } from "../src/utils";

const walletCollectRequestBody = JSON.stringify({
  toAddress: "TDVZJznLGjXZZd44geotpwwrrgSor6sotF",
  feePayerPrivateKey: "261217AF2FE7B3755874D49F47899CBA76B76F65F2292D27E4F0DE55D17F48A4",
});
console.dir({ walletCollectRequestBody });

const walletCollectResponse = await sendEptrcRequest({
  url: "http://127.0.0.1:3000/wallet/collect",
  requestBody: walletCollectRequestBody,
});

console.dir({ status: walletCollectResponse.status });
console.dir(
  {
    bodyJson: await walletCollectResponse.json(),
  },
  { depth: 10 },
);
