# Integración con Trustless Work — Escrow para el P2P

Referencia: https://docs.trustlesswork.com/trustless-work/api-rest/introduction

## 1. Tipo de escrow: `single-release`

Trustless Work ofrece dos modelos de escrow:

| | Single-release | Multi-release |
|---|---|---|
| Liberación | Un solo pago por el monto total | Pagos parciales por milestone, cada uno con su propio `amount` |
| Complejidad | Media | Alta |
| Caso ideal (doc oficial) | "Freelance with staged checks" — entrega única verificable | Grant disbursements, desarrollo por versiones |

**Decisión: `single-release`.** El flujo del P2P es "comprador paga fiat → vendedor confirma → se libera el USDT/USDC", una sola liberación por operación. El modelo multi-release no aporta nada aquí (solo añade complejidad de milestones con montos parciales); usamos **1 milestone implícito** ("pago fiat confirmado") en vez de varios.

## 2. Mapeo de roles a los actores del P2P

La API define 6 roles en el escrow. Para una operación de venta de USDT por EUR (vía SEPA/Bizum, como en `orders/page.tsx`):

| Rol Trustless Work | Actor en SafeSwap | Acción que realiza |
|---|---|---|
| `serviceProviders` | **Comprador** | Marca el milestone como cumplido ("ya envié el fiat") |
| `approvers` | **Vendedor** | Aprueba el milestone ("confirmo que recibí el fiat") |
| `releaseSigners` | Vendedor o plataforma | Firma la liberación una vez aprobado |
| `receiver` | **Comprador** | Recibe el USDT/USDC liberado |
| `disputeResolvers` | Plataforma / moderador SafeSwap | Resuelve disputas redirigiendo fondos |
| `platform` | Wallet de la plataforma | Cobra `platformFee` automáticamente |
| `admin` | Wallet admin | Única que puede editar el escrow antes de fondearlo |

Este mapeo encaja directo con lo ya construido en `PaymentBubble` (variants `request`/`sent`, `onPay`/`onReject`) dentro de `frontend/components/chat`.

## 3. Endpoints fundamentales (single-release v2)

- Base testnet: `https://dev.api.trustlesswork.com`
- Base mainnet: `https://api.trustlesswork.com`
- Header requerido: `x-api-key: <token>`
- Swagger: `https://api.trustlesswork.com/docs`

| Paso del flujo P2P | Endpoint | Método |
|---|---|---|
| 1. Vendedor acepta la orden → se crea el escrow | `/escrow/single-release/v2/deploy` | POST |
| 2. Vendedor deposita el USDT en el contrato | `/escrow/single-release/v2/fund` | POST |
| 3. Comprador marca "ya pagué" (en el chat) | `/escrow/single-release/v2/change-milestone-status` | POST |
| 4. Vendedor aprueba (confirma que recibió el fiat) | `/escrow/single-release/v2/approve-milestones` | POST |
| 5. Se libera el USDT al comprador | `/escrow/single-release/v2/release-funds` | POST |
| 6a. Disputa (si algo falla) | `/escrow/single-release/v2/dispute` | POST |
| 6b. Resolución de disputa | `/escrow/single-release/v2/resolve-dispute` | POST |
| Firmar y enviar cualquier XDR devuelto arriba | `/stellar/send-transaction` | POST |
| Listar escrows/operaciones del usuario (para `/p2p/orders` y `/transactions`) | `/helper/get-escrows-by-signer` | GET |
| Consultar saldo en escrow | `/helper/get-multiple-escrow-balance` | GET |
| Editar términos **antes** de fondear (monto, roles, fee) | `/escrow/single-release/v2/update` | PUT |

Todos los endpoints de escritura (`deploy`, `fund`, `change-milestone-status`, `approve-milestones`, `release-funds`, `dispute`, `resolve-dispute`, `update`) devuelven un `unsignedXdr` que el wallet del usuario debe firmar antes de enviarlo a `/stellar/send-transaction`.

### 3.1 Detalle de payloads clave

**`POST /escrow/single-release/v2/deploy`**
```json
{
  "signer": "G...",
  "engagementId": "string",
  "title": "string",
  "description": "string",
  "roles": {
    "approvers": ["G..."],
    "serviceProviders": ["G..."],
    "platform": "G...",
    "releaseSigners": ["G..."],
    "disputeResolvers": ["G..."],
    "receiver": "G...",
    "admin": "G...",
    "observers": []
  },
  "amount": 0,
  "platformFee": 1,
  "milestones": [
    { "description": "Pago fiat confirmado", "status": "pending", "approvalsTarget": 1 }
  ],
  "trustline": { "contractId": "C..." },
  "receiverMemo": 0
}
```
Respuesta: `{ unsignedXdr, txHash, contractId }`

**`POST /escrow/single-release/v2/fund`**
```json
{ "contractId": "C...", "signer": "G...", "amount": 0 }
```

**`POST /escrow/single-release/v2/change-milestone-status`**
```json
{
  "contractId": "C...",
  "serviceProvider": "G...",
  "updates": [{ "index": 0, "newStatus": "completed", "newEvidence": "opcional" }]
}
```

**`POST /escrow/single-release/v2/approve-milestones`**
```json
{ "contractId": "C...", "approver": "G...", "milestoneIndexes": [0] }
```

**`POST /escrow/single-release/v2/release-funds`**
```json
{ "contractId": "C...", "releaseSigner": "G..." }
```
Requiere que todos los milestones estén aprobados.

**`POST /escrow/single-release/v2/dispute`**
```json
{ "contractId": "C...", "signer": "G...", "reason": "string (max 500)" }
```
`signer` debe ser cualquier rol del escrow **excepto** `disputeResolvers`.

**`POST /escrow/single-release/v2/resolve-dispute`**
```json
{
  "contractId": "C...",
  "disputeResolver": "G...",
  "distributions": [{ "address": "G...", "amount": 0 }]
}
```
La suma de `distributions` debe ser exactamente igual al balance del escrow.

**`PUT /escrow/single-release/v2/update`**
Reemplazo completo del registro (roles, milestones, monto, fee, observers). Solo lo puede ejecutar el `admin`. Si el escrow ya tiene fondos, solo se pueden **añadir** milestones — el resto de propiedades queda bloqueado.

**`POST /stellar/send-transaction`**
```json
{ "signedXdr": "string" }
```
Respuesta incluye `txHash`, `ledger`, y en el caso de un deploy, `contractId` + `escrow`.

**`GET /helper/get-escrows-by-signer`**
Parámetros útiles: `signer`, `role`, `roleAddress`, `status`, `type` (`single-release`/`multi-release`), `engagementId`, `isActive`, `validateOnChain`, `orderBy`, `orderDirection`, `page`, `pageSize`.

**`GET /helper/get-multiple-escrow-balance`**
Parámetro: `addresses` (array).

## 4. Hallazgos en el código actual

1. **`lib/trustless-work.ts` está desactualizado.** Usa rutas antiguas (`/escrow/initialize-escrow`, `/escrow/complete-escrow`) que no coinciden con la API real (`/escrow/single-release/v2/deploy`, etc.), y usa `Authorization: Bearer` en vez de `x-api-key`. Le faltan los endpoints de fund, milestone status/approve, release, update, dispute/resolve-dispute y el submit de la transacción firmada (`/stellar/send-transaction`).
2. **`app/api/.env.example` tiene una API key con pinta de real** (`TW_API_KEY=7p9eNvg2VFR6...`) commiteada en el repo. Se recomienda rotarla y dejar solo un placeholder tipo `TW_API_KEY=your_api_key_here`.

## 5. Flujo end-to-end resumido

1. Vendedor publica orden (`/p2p/orders`) → comprador la toma.
2. Backend llama `deploy` → vendedor firma XDR → `send-transaction`.
3. Backend llama `fund` → vendedor firma XDR → `send-transaction` (USDT queda bloqueado).
4. Comprador transfiere el fiat fuera de la plataforma (SEPA/Bizum) y en el chat (`/p2p/chat`) pulsa "Pagar" → dispara `change-milestone-status`.
5. Vendedor confirma en el chat (`onAcceptPaymentRequest`) → dispara `approve-milestones`.
6. Se dispara `release-funds` → comprador recibe el USDT.
7. Si hay conflicto en cualquier punto: `dispute` → moderador resuelve con `resolve-dispute`.
8. `/transactions` y `/p2p/orders` consultan `get-escrows-by-signer` / `get-multiple-escrow-balance` para reflejar el estado real.
