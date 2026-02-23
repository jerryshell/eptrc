import { sendEptrcRequest } from "../src/utils";

const paymentSessionDetailRequestBody = JSON.stringify({
  paymentSessionId: "019c8a98-c808-7000-9e3e-d427291534c7",
});
console.dir({ paymentSessionDetailRequestBody });

const paymentSessionDetailResponse = await sendEptrcRequest({
  url: "http://127.0.0.1:3000/paymentSession/detail",
  requestBody: paymentSessionDetailRequestBody,
});

console.dir({ status: paymentSessionDetailResponse.status });
console.dir({
  bodyJson: await paymentSessionDetailResponse.json(),
});
