
![SAFESWAP LOGO_ON RICH BLACK](https://github.com/user-attachments/assets/8260378d-07dd-4309-b7e0-da42247fa21c)
# SafeSwap
# P2P USDC Transfers on Stellar

Welcome to **SafeSwap**, a peer-to-peer platform that allows users to transfer **USDC** between Stellar wallet addresses through escrow-secured transactions. Powered by the **Stellar Network** and integrated with the **Trustless Work API**, SafeSwap ensures every transfer is transparent, trustless, and protected by smart contracts.

## 🚀 Features

- **P2P USDC Transfers**: Send USDC directly to any Stellar wallet address in a secure, peer-to-peer flow.
- **Escrow-Protected Transactions**: Funds are held in Stellar escrow contracts and only released when both parties fulfill the agreed conditions.
- **Trustless by Design**: No central authority controls the process — smart contracts on Stellar handle every step automatically.
- **Trustless Work API**: Manages escrow creation, funding, completion, and dispute resolution.
- **Fast & Low-Cost**: Built on Stellar for near-instant settlement with minimal transaction fees.

## 🛠️ Technology Stack

- **P2P App**: Next.js, Tailwind CSS v4, shadcn/ui
- **Backend (legacy)**: NestJS, GraphQL (Apollo Server), Prisma
- **Blockchain**: Stellar Network
- **API**: Trustless Work API for escrow smart contract management
- **Database**: PostgreSQL, Supabase

## 🔑 How It Works

The UI is intentionally minimal — no unnecessary steps, no friction.

1. **Browse Listings**: Users see a simple list of people who want to buy or sell USDC. Each listing shows the amount, direction (buy/sell), and the user's Stellar wallet address.
2. **Match & Connect**: A user picks a counterpart from the list whose offer matches their need.
3. **Initiate the Transfer**: Both parties agree on the amount. An escrow contract is created via the Trustless Work API, locking the USDC on the Stellar blockchain.
4. **Fund the Escrow**: The sender deposits the USDC into the escrow contract.
5. **Release**: Once both parties confirm, the contract releases the funds to the recipient's Stellar wallet automatically.
6. **Dispute Resolution**: If something goes wrong, either party can open a dispute handled by the escrow contract.

## 📄 Usage

### Prerequisites

- **Node.js** version 20 or higher
    - Refer to the [Node.js official documentation](https://nodejs.org/) to download and install the latest version.
    - To check your installed Node.js version:

        ```bash
        node -v
        ```

- **npm** version 10.9.2 or higher
    - To check your installed npm version:

        ```bash
        npm -v
        ```

    - To globally install or update npm:

        ```bash
        npm install -g npm@10.9.2
        ```

### Installation

1. **Clone the Repository**:

    ```bash
    git clone https://github.com/your-username/SafeSwap.git
    cd SafeSwap
    ```

2. **Install Dependencies**:

    ```bash
    npm install
    ```

3. **Environment Variables**:

    Copy `.env.example` to `.env.local` in the relevant app folder and fill in your values:

    ```bash
    cp p2p-safe-swap/.env.local p2p-safe-swap/.env.local
    ```

    Required variables:
    - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
    - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key (server-side only)
    - `TRUSTLESS_WORK_API_KEY` — your Trustless Work API key (server-side only)

    Full Supabase setup (projects, CLI, and client wrappers) is documented in
    [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md).

### Running Supabase migrations locally

The repo ships Supabase CLI configuration in `supabase/config.toml` with
migrations in `supabase/migrations/` and a local dev seed in
`supabase/seed.sql`.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Start the local stack and apply all migrations + seed:

    ```bash
    supabase start
    supabase db reset
    ```

    Or from the app folder: `npm run db:reset`.

3. Push migrations to a linked remote project (dev/prod) with
   `supabase db push`.

See [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md) for CLI linking,
environment variables, and the browser/server client wrappers.

---

### Available Commands

- `npm run dev` — Starts all applications in development mode.
- `npm run build` — Builds all applications for production.

---

### Running Specific Applications

Run individual applications directly from the root directory:

1. **P2P App**:

    ```bash
    cd p2p-safe-swap
    ```
    
    ```bash
    npm run dev
    ```

---

### Applications in the Monorepo

| App | Description | Path |
|---|---|---|
| **p2p-safe-swap** | P2P USDC transfer app built with Next.js 16 and Tailwind v4 | `p2p-safe-swap/` |

---

## 📚 Documentation

- [p2p-safe-swap README](p2p-safe-swap/README.md)
- [colors doc](https://github.com/Kaizenode/SafeSwap/blob/main/docs/guidelines/colors.md)

## 🤝 Contributing

We appreciate and welcome contributions! Please review our [CONTRIBUTING GUIDELINES](docs/guidelines/CONTRIBUTION_GUIDELINES.md) and [GIT GUIDELINES](docs/guidelines/GIT_GUIDELINES.md) before submitting a PR.

## 🧑‍💻 Authors

<table align="center">
  <tr>
    <td align="center" valign="top" width="25%">
      <img src="https://avatars.githubusercontent.com/u/66186331?v=4" alt="Daniel Calderón Díaz" width="120" />
      <br />
      <strong>Daniel Calderón Díaz</strong>
      <br />
      <a href="https://github.com/danielcdz" target="_blank">
        GitHub
      </a>
    </td>
    <td align="center" valign="top" width="25%">
      <img src="https://avatars.githubusercontent.com/u/85724318?v=4" alt="Diego Duarte Fernández" width="120" />
      <br />
      <strong>Diego Duarte Fernández</strong>
      <br />
      <a href="https://github.com/diegoTech14" target="_blank">
        GitHub
      </a>
    </td>
  </tr>
</table>

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
