# SPX6900 Cognispheric Collective Points

## Prerequisites
- Bun
- Foundry

## Usage

**Install**

```shell
forge soldeer install
```

**.env**
Create `.env` from `.env.example`

**Build**

```shell
forge build
```

**Deploy**
```shell
forge script script/CCP.s.sol --slow --chain base --rpc-url base --verify --broadcast --private-key $PRIVATE_KEY -vvvv
```

**Running the bot**
**.env**
Create `.env` from `.env.example`

**Run**
```shell
bun start
```