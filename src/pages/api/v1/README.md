# Activity API Endpoints

The Activity API provides endpoints for querying user on-chain activities, generating statistics, and exporting data for airdrop campaigns.

## Authentication

All endpoints require API key authentication via the `x-api-key` header.

## Endpoints

### 1. Query Activities

**Endpoint:** `GET /api/v1/activity`

Retrieves user activities with optional time range filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | number | No | Unix timestamp in seconds - start of time range |
| `end` | number | No | Unix timestamp in seconds - end of time range |

#### Response

Returns an array of activity records with the following fields:

```typescript
{
  id: string;
  userAddress: string;
  txHash: string;
  activityType: ActivityType;
  tokenAddress: string;
  chain: Chain;
  activityData: object;
  amount: string | null;  // BigInt as string
  price: string | null;   // BigInt as string
  jobId: string;
  isConfirmed: boolean;
  txSentAt: Date;
  txConfirmedAt: Date | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Examples

```bash
# Get all activities
curl -X GET "https://api.example.com/api/v1/activity" \
  -H "x-api-key: YOUR_API_KEY"

# Get activities from a specific date onwards
curl -X GET "https://api.example.com/api/v1/activity?start=1700000000" \
  -H "x-api-key: YOUR_API_KEY"

# Get activities within a date range
curl -X GET "https://api.example.com/api/v1/activity?start=1700000000&end=1705000000" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 2. Activity Statistics

**Endpoint:** `GET /api/v1/activity/stats`

Generates aggregated statistics for activities with flexible filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAddress` | string | No | Filter by specific user address |
| `tokenAddress` | string | No | Filter by specific token address |
| `chain` | string | No | Filter by blockchain (e.g., "mina:devnet") |
| `start` | number | No | Unix timestamp in seconds - start of time range |
| `end` | number | No | Unix timestamp in seconds - end of time range |

#### Response

```typescript
{
  totalActivities: number;
  confirmedActivities: number;
  pendingActivities: number;
  activitiesByType: Record<string, number>;
  uniqueUsers?: number;
  totalVolume?: string;      // BigInt as string
  averageAmount?: string;    // BigInt as string
}
```

#### Examples

```bash
# Get overall stats
curl -X GET "https://api.example.com/api/v1/activity/stats" \
  -H "x-api-key: YOUR_API_KEY"

# Get stats for a specific user
curl -X GET "https://api.example.com/api/v1/activity/stats?userAddress=B62qk..." \
  -H "x-api-key: YOUR_API_KEY"

# Get stats for a token within a date range
curl -X GET "https://api.example.com/api/v1/activity/stats?tokenAddress=B62qm...&start=1700000000&end=1705000000" \
  -H "x-api-key: YOUR_API_KEY"

# Get stats for a specific chain
curl -X GET "https://api.example.com/api/v1/activity/stats?chain=mina:devnet" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 3. Export for Airdrop

**Endpoint:** `POST /api/v1/activity/export`

Exports user activities with weighted scoring for airdrop distribution.

#### Request Body

```typescript
{
  campaignStart: number;           // Required - Unix timestamp
  campaignEnd: number;             // Required - Unix timestamp
  chain?: Chain;                   // Optional - filter by chain
  minActivityCount?: number;       // Optional - minimum activities required
  requiredActivityTypes?: ActivityType[];  // Optional - required activity types
  weightings?: Partial<Record<ActivityType, number>>;  // Optional - custom scoring weights
  format?: "json" | "csv";        // Optional - default: "json"
}
```

#### Response (JSON format)

```typescript
{
  users: [
    {
      userAddress: string;
      activityCount: number;
      activityTypes: ActivityType[];
      activityScore: number;      // Weighted score
      totalVolume: string;        // BigInt as string
      firstActivityDate: string;  // ISO 8601
      lastActivityDate: string;   // ISO 8601
    }
  ];
  totalUsers: number;
  campaignStartDate: string;
  campaignEndDate: string;
  totalActivities: number;
}
```

#### Response (CSV format)

Returns CSV text with columns: `userAddress`, `activityCount`, `activityScore`, `totalVolume`, `firstActivityDate`, `lastActivityDate`, `activityTypes`

#### Default Weightings

```typescript
{
  LAUNCH: 10,
  MINT: 2,
  TRANSFER: 1,
  BURN: 3,
  BID_CREATE: 5,
  BID_UPDATE: 2,
  BID_WITHDRAW: 1,
  OFFER_CREATE: 5,
  OFFER_UPDATE: 2,
  OFFER_WITHDRAW: 1,
  BUY: 3,
  SELL: 3,
  NFT_MINT: 5,
  NFT_UPDATE: 3,
  NFT_TRANSFER: 2,
  NFT_UPGRADE: 4,
  NFT_APPROVE: 1,
  NFT_REVOKE_APPROVAL: 1,
  AIRDROP: 1
}
```

#### Examples

```bash
# Export all users in JSON format
curl -X POST "https://api.example.com/api/v1/activity/export" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignStart": 1700000000,
    "campaignEnd": 1705000000
  }'

# Export with custom weightings in CSV format
curl -X POST "https://api.example.com/api/v1/activity/export" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignStart": 1700000000,
    "campaignEnd": 1705000000,
    "format": "csv",
    "weightings": {
      "LAUNCH": 20,
      "MINT": 5,
      "BUY": 10
    }
  }'

# Export with filters
curl -X POST "https://api.example.com/api/v1/activity/export" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignStart": 1700000000,
    "campaignEnd": 1705000000,
    "chain": "mina:devnet",
    "minActivityCount": 5,
    "requiredActivityTypes": ["LAUNCH", "MINT"]
  }'
```

---

## Activity Types

The following activity types are tracked:

- `LAUNCH` - Token launch
- `MINT` - Token minting
- `TRANSFER` - Token transfer
- `BURN` - Token burning
- `BID_CREATE` - Create bid offer
- `BID_UPDATE` - Update bid offer
- `BID_WITHDRAW` - Withdraw bid offer
- `OFFER_CREATE` - Create sell offer
- `OFFER_UPDATE` - Update sell offer
- `OFFER_WITHDRAW` - Withdraw sell offer
- `BUY` - Buy tokens
- `SELL` - Sell tokens
- `NFT_MINT` - Mint NFT
- `NFT_UPDATE` - Update NFT metadata
- `NFT_TRANSFER` - Transfer NFT
- `NFT_UPGRADE` - Upgrade NFT verification
- `NFT_APPROVE` - Approve NFT transaction
- `NFT_REVOKE_APPROVAL` - Revoke NFT approval
- `AIRDROP` - Airdrop distribution

## Supported Chains

- `mina:mainnet`
- `mina:devnet`
- `zeko:mainnet`
- `zeko:testnet`

## Error Responses

All endpoints return standard error responses:

```typescript
{
  error: string;
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing or invalid API key)
- `500` - Internal server error

## Notes

- All monetary values (`amount`, `price`, `totalVolume`) are returned as strings to safely handle BigInt values
- Timestamps are Unix timestamps in seconds
- Date strings in responses use ISO 8601 format
- Activities are ordered by `txSentAt` descending in query endpoint
- Pending activities have `txHash` starting with `pending-{jobId}`
