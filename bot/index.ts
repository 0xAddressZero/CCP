import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import Bottleneck from 'bottleneck';

config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const BASE_RPC_URL = process.env.BASE_RPC_URL!;

const SPXP_ABI = [
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'uint256' }, { name: 'to', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const botUserId = parseInt(TELEGRAM_BOT_TOKEN.split(':')[0], 10);
const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC_URL) });
const account = privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`);
const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC_URL) });

let isTransferPending = false;
const limiter = new Bottleneck({ minTime: 1000 });

async function getBalance(userId: number): Promise<bigint> {
    return (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SPXP_ABI,
        functionName: 'balanceOf',
        args: [BigInt(userId)],
    })) as bigint;
}

bot.command('spxp', limiter.wrap(async (ctx) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('Could not determine your user ID.');
            return;
        }

        const balance = await getBalance(userId);
        const formattedBalance = formatEther(balance); // Converts from wei to ether, assuming 18 decimals
        await ctx.reply(`Your have ${formattedBalance} SPXP`);
    } catch (error) {
        await ctx.reply('Error fetching balance. Please try again later.');
        console.error('Balance command error:', error);
    }
}));

bot.command('tip', limiter.wrap(async (ctx) => {
    if (ctx.chat?.type == 'private') {
        await ctx.reply('This command can only be used in groups.');
        return
    }

    if (isTransferPending) {
        await ctx.reply('A transfer is pending. Try later.');
        return;
    }

    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('Could not determine your user ID.');
        return;
    }


    const args = ctx.message?.text?.split(' ').slice(1);
    const isReply = !!ctx.message?.reply_to_message;
    if (!args || args.length === 0) {
        await ctx.reply('Usage: Reply with /tip <amount>');
        return;
    }

    const amountMatch = args[0].match(/\d+/);
    const amountStr = amountMatch ? amountMatch[0] : '';

    if (!amountMatch) {
        await ctx.reply('Invalid amount.');
        return;
    }

    let toUserId: number;
    let target: string;
    let sourceFullname = ctx.from?.first_name + ' ' + (ctx.from?.last_name || '');
    let targetFullname: string;

    if (isReply) {
        toUserId = ctx.message.reply_to_message?.from?.id!;
        target = ctx.message.reply_to_message?.from?.username!;

        const firstName = ctx.message.reply_to_message.from?.first_name;
        const lastName = ctx.message.reply_to_message.from?.last_name || '';
        targetFullname = firstName + ' ' + lastName;

        if (!toUserId) {
            await ctx.reply('Could not determine recipient from reply.');
            return;
        }
    } else {
        await ctx.reply('Usage: Reply to a message with /tip <amount>');
        return;
    }

    if (userId == toUserId) {
        await ctx.reply('You cannot tip yourself.');
        return;
    }

    if (toUserId == botUserId) {
        await ctx.reply('You cannot tip the bot.');
        return;
    }

    let amount;

    // don't allow floating point amount like 0.1 or 1.1212
    if (amountStr.includes('.')) {
        await ctx.reply('Invalid amount');
        return;
    }

    try {
        amount = parseEther(amountStr);

        if (amount <= 0) {
            await ctx.reply('Invalid amount.');
            return;
        }
    } catch (error) {
        await ctx.reply('Invalid amount.');
        return;
    }

    const senderBalance = await getBalance(userId);
    if (senderBalance < amount) {
        await ctx.reply('Insufficient balance, you have ' + formatEther(senderBalance) + ' SPXP');
        return;
    }

    isTransferPending = true;
    try {
        await ctx.reply(`Tipping ${formatEther(amount)} SPXP to ${targetFullname}...`);

        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: SPXP_ABI,
            functionName: 'transfer',
            args: [BigInt(userId), BigInt(toUserId), amount],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        const basescanUrl = `https://basescan.org/tx/${hash}`;
        await ctx.reply(`${sourceFullname} tipped ${formatEther(amount)} SPXP to ${targetFullname}. [Tx](${basescanUrl})`, { parse_mode: "Markdown" });

    } finally {
        isTransferPending = false;
    }
}));

bot.launch();
console.log('Bot started');