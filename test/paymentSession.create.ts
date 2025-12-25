import { sendEptrcRequest } from "../src/utils";

const createPaymentSessionRequestBody = JSON.stringify({
  metadata: `{"orderId":"order.123","userId":"user.456"}`,
  notifyUrl: "https://witty-valley-21.webhook.cool",
});
console.dir({ createPaymentSessionRequestBody });

const createPaymentSessionResponse = await sendEptrcRequest({
  url: "http://127.0.0.1:3000/paymentSession/create",
  requestBody: createPaymentSessionRequestBody,
});

console.dir({ status: createPaymentSessionResponse.status });
console.dir({
  bodyJson: await createPaymentSessionResponse.json(),
});
