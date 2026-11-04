# Kids Stay MCP Server

**Verified kid-friendly hotel data for Japan** — 2,200+ hotels checked against official sources across **53 kid-friendly conditions** (diaper-friendly baths, baby beds, kids' meals, in-room dining, and more), served over the Model Context Protocol.

Built and maintained by [Kids Stay](https://kids-stay.com/) (kids-stay.com), a hotel search site for families traveling with babies and toddlers in Japan.

- **Endpoint (Streamable HTTP):** `https://mcp.kidsstay.workers.dev/mcp`
- **Auth:** none — free and open
- **Access:** read-only, rate-limited (60 req/min per IP)
- **Registry:** [`io.github.sitebox/kids-stay`](https://registry.modelcontextprotocol.io) (official MCP registry)
- **About & terms:** https://kids-stay.com/en/mcp/ (English) · https://kids-stay.com/mcp/ (日本語)

## Why this exists

Booking sites can't answer questions like *"Which hot-spring hotels allow toddlers who aren't potty-trained in the shared bath?"* — that information lives deep inside each hotel's official website. Kids Stay reads those sources hotel by hotel and structures them into 53 verified conditions. This MCP server hands that data directly to AI assistants, with sources and verification dates attached.

## Tools

| Tool | Description |
|---|---|
| `search_hotels` | Search by condition IDs × prefecture/area × child age × budget. Returns up to 20 summary cards |
| `get_hotel` | Verified details for one hotel: conditions with per-hotel notes, target ages, nearby kid spots, sources |
| `list_conditions` | The 53 condition definitions (IDs, labels, EN labels) |
| `list_areas` | Hotel inventory per prefecture — useful for narrowing down before searching |

Every response includes `verified_at` (when the data was last checked), `sources` (official URLs for re-verification), a `page` link to the hotel's page, and a disclaimer. Data is maintained in Japanese with English labels; translation is left to the agent.

## Quick start

**Claude (claude.ai / desktop):** Settings → Connectors → *Add custom connector* → paste the endpoint URL.

**Claude Code:**

```bash
claude mcp add --transport http kids-stay https://mcp.kidsstay.workers.dev/mcp
```

**Any MCP client (Streamable HTTP):**

```json
{
  "kids-stay": {
    "type": "streamable-http",
    "url": "https://mcp.kidsstay.workers.dev/mcp"
  }
}
```

Then ask things like: *"Find hotels in Okinawa for a family with a 0-year-old — baby bed and baby food required."*

**Local (stdio):** for MCP clients that prefer stdio, this repository ships a zero-dependency local build ([`index.js`](./index.js), Node.js 18+). Introspection is served locally from the bundled tool definitions; tool calls fetch live data from the hosted endpoint (the single source of truth):

```bash
npx github:sitebox/kids-stay-mcp        # or: git clone && node index.js
```

## Data usage

Use in AI responses **with attribution** (link to the facility page on kids-stay.com) is welcome. Bulk redistribution, resale, or building competing databases is prohibited. Facilities change their services — always confirm current conditions on the hotel page before booking. Full terms: https://kids-stay.com/mcp/ and https://kids-stay.com/terms/

## About this repository

The MIT license in [`LICENSE`](./LICENSE) covers the code in this repository only. The hotel data served by the hosted endpoint is not part of this repository; its terms of use are described at https://kids-stay.com/mcp/ and https://kids-stay.com/terms/.

This repository is the public home of the server metadata ([`server.json`](./server.json)) and a small local stdio build ([`index.js`](./index.js), MIT-licensed) for registry and directory listings. The hosted implementation and the dataset itself are not part of this repository — the data is the product of ongoing manual verification against official sources, refreshed monthly, and is served only through the endpoint.

---

## 日本語

**Kids Stay MCPサーバー** — 全国2,200軒超の宿を「おむつが取れていない子と入れる風呂」「ベビーベッド」「離乳食」など**53種類の子連れ条件**で公式サイトの一次情報から検証したデータを、MCP経由でAIアシスタントに提供します。

- エンドポイント: `https://mcp.kidsstay.workers.dev/mcp`（Streamable HTTP・認証なし・無料）
- 案内・利用条件: https://kids-stay.com/mcp/
- 応答には検証日（`verified_at`）・出典・施設ページURLが必ず付きます

出典として施設ページを示したうえでのAI応答への利用は歓迎です。一括再配布・転売・競合データベースの構築は禁止です。設備・条件は変わることがあるため、予約前に施設ページで最新情報をご確認ください。
