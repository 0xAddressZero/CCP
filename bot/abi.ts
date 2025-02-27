export const CCP_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'uint256' },
            { name: 'to', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'uint256' },
            { name: 'fromUsername', type: 'string' },
            { name: 'to', type: 'uint256' },
            { name: 'toUsername', type: 'string' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'user',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [
            {
                components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'username', type: 'string' },
                    { name: 'balance', type: 'uint256' },
                ],
                name: 'userInfo',
                type: 'tuple',
            },
        ],
    },
    {
        name: 'userLength',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: 'length', type: 'uint256' }],
    },
    {
        name: 'users',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'fromIndex', type: 'uint256' },
            { name: 'toIndex', type: 'uint256' },
        ],
        outputs: [
            {
                components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'username', type: 'string' },
                    { name: 'balance', type: 'uint256' },
                ],
                name: '_someUsers',
                type: 'tuple[]',
            },
        ],
    },
    {
        name: 'setUsername',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'id', type: 'uint256' },
            { name: 'username', type: 'string' },
        ],
        outputs: [],
    },
    {
        name: 'idToUserIndex',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: 'usernameIndex', type: 'uint256' }],
    },
    {
        name: 'usernameExists',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: 'exists', type: 'bool' }],
    },
    {
        name: 'mint',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'id', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'burn',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'id', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
] as const;