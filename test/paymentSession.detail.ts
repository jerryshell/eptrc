import { sendEptrcRequest } from "../src/utils";

const paymentSessionDetailRequestBody = JSON.stringify({
  paymentSessionId: "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
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
