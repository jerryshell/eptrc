# EPTRC

[中文](./README.md) | [English](./README.en.md)

EPTRC (Easy Payment TRC) is a lightweight TRC20-USDT payment gateway.

## Quick Start

```bash
bun install
bun run db:push
bun run dev
```

Default service URL: `http://localhost:3000`

## Scripts

- `bun run dev`: Start local development server (hot reload)
- `bun run check`: Run TypeScript type check
- `bun run db:push`: Push Drizzle schema to database
- `bun run build:bun`: Build Bun runtime output to `dist/`
- `bun run build:linux-x64`: Build Linux x64 executable
- `bun run build:windows-x64`: Build Windows x64 executable
- `bun run build:darwin-x64`: Build macOS Intel x64 executable
- `bun run build:darwin-arm64`: Build macOS Apple Silicon executable

## Authentication

- `GET /` does not require authentication
- All other endpoints require `X-API-KEY`

## Integration Flow

1. Call `POST /paymentSession/create` to create a payment session
2. Show returned `address` and guide user transfer
3. Receive webhooks (`payment.session.paid` or `payment.session.timeout`)
4. Call `POST /paymentSession/detail` when reconciliation is needed
5. Periodically call `POST /wallet/collection` to collect funds

## Amount Precision

- All `amount` fields use integer strings in on-chain minimal units
- TRC20-USDT has `decimals = 6`
- Conversion example: `1000000 = 1.000000 USDT`

## API

### Health Check

`GET /`

Response example:

```json
{
  "version": "1.0.0",
  "tronGridBaseUrl": "https://nile.trongrid.io",
  "contractAddress": "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
}
```

### Create Payment Session

`POST /paymentSession/create`

Request body:

```json
{
  "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
  "notifyUrl": "https://api.merchant-system.com/eptrcNotify"
}
```

- `notifyUrl`: Required callback URL for payment result
- `metadata`: Optional, passed through in webhook payload

Success response example:

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
  "address": "TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy",
  "expiresAt": 1577934245000
}
```

### Get Payment Session Detail

`POST /paymentSession/detail`

Request body:

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d"
}
```

Use this endpoint to query session status, paid amount, blockchain tx ID, and collection state.

### Wallet Collection

`POST /wallet/collection`

Request body:

```json
{
  "toAddress": "TRx...target.address",
  "feePayerPrivateKey": "your.fee.payer.private.key"
}
```

- `toAddress`: Collection target address
- `feePayerPrivateKey`: Private key of the wallet paying TRX network fees
- Ensure this wallet has enough TRX balance
- Never expose this private key in frontend code, logs, or public channels

Response example:

```json
{
  "collectionResults": [
    {
      "address": "Txxx...",
      "status": "collected",
      "amount": "1000000",
      "txId": "2a6a..."
    },
    {
      "address": "Tyyy...",
      "status": "no.balance"
    },
    {
      "address": "Tzzz...",
      "status": "error",
      "error": "collection.failed"
    }
  ]
}
```

## Webhook

EPTRC sends a `POST` to `notifyUrl` when session status changes.

Headers:

```http
X-API-KEY: <WEBHOOK_KEY>
Content-Type: application/json
User-Agent: EPTRC/<version>
```

Event types:

- `payment.session.paid`
- `payment.session.timeout`

`payment.session.paid` example:

```json
{
  "event": "payment.session.paid",
  "data": {
    "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
    "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
    "amount": "1000000"
  }
}
```

`payment.session.timeout` example:

```json
{
  "event": "payment.session.timeout",
  "data": {
    "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
    "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}"
  }
}
```

## Environment Variables

```env
PORT=3000
API_KEY=it.is.very.secret
WEBHOOK_KEY=it.is.webhook.secret
DB_FILE_NAME=eptrc.sqlite
TRON_NETWORK=nile
```

- `PORT`: Service port, default `3000`
- `API_KEY`: Auth key for business APIs (`X-API-KEY`)
- `WEBHOOK_KEY`: Auth key for webhooks, falls back to `API_KEY` when unset
- `DB_FILE_NAME`: Database file name, default `eptrc.sqlite`
- `TRON_NETWORK`: `nile` testnet, `main` mainnet

## Support Me

If this project helps you, you can support me with this TRON address:

`TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy`
