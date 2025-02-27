import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CCP_ABI } from './abi';
import Bottleneck from 'bottleneck';

config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const BASE_RPC_URL = process.env.BASE_RPC_URL!;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const botUserId = parseInt(TELEGRAM_BOT_TOKEN.split(':')[0], 10);
const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC_URL) });
const account = privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`);
const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC_URL) });

let isTransferPending = false;
const limiter = new Bottleneck({ minTime: 1000 });

type Users = { id: bigint, username: string, balance: bigint };

async function getBalance(userId: number): Promise<bigint> {
    return (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CCP_ABI,
        functionName: 'balanceOf',
        args: [BigInt(userId)],
    })) as bigint;
}

bot.command('ccp', limiter.wrap(async (ctx: any) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('Could not determine your user ID.');
            return;
        }

        const balance = await getBalance(userId);
        const formattedBalance = formatEther(balance); // Converts from wei to ether, assuming 18 decimals
        await ctx.reply(`Your have ${formattedBalance} CCP`);
    } catch (error) {
        await ctx.reply('Error fetching balance. Please try again later.');
        console.error('Balance command error:', error);
    }
}));

bot.command('top', limiter.wrap(async (ctx: any) => {
    try {
        // Fetch the total number of users with usernames
        const userLength = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CCP_ABI,
            functionName: 'userLength',
        });

        // Fetch all user data from the contract
        const users = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CCP_ABI,
            functionName: 'users',
            args: [0n, userLength],
        }) as any as Users[];


        // Sort users by balance in descending order
        users.sort((a, b) => (a.balance > b.balance ? -1 : 1));

        // Take the top 5 users
        const top5 = users.slice(0, 5);

        // Check if there are any users to display
        if (top5.length === 0) {
            await ctx.reply('No users with CCP points found.');
            return;
        }

        // Format the response
        let response = 'Top 5 CCP Holders:\n';
        top5.forEach((user, index) => {
            const rank = index + 1;
            const username = user.username;
            const ether = formatEther(user.balance);
            response += `${rank}. ${username} - ${ether} CCP\n`;
        });

        // Send the response
        await ctx.reply(response);

    } catch (error) {
        await ctx.reply('Error fetching top holders. Please try again later.');
        console.error('Top command error:', error);
    }
}));

bot.command('tip', limiter.wrap(async (ctx: any) => {
    // Check if command is used in a group
    if (ctx.chat?.type === 'private') {
        await ctx.reply('This command can only be used in groups.');
        return;
    }

    // Check if a transfer is already pending
    if (isTransferPending) {
        await ctx.reply('A transfer is pending. Try later.');
        return;
    }

    // Get sender's user ID
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('Could not determine your user ID.');
        return;
    }

    // Parse the amount using regex: /tip followed by space(s) and digits
    const match = ctx.message?.text?.match(/\/tip\s+(\d+)/);
    if (!match) {
        await ctx.reply('Usage: Reply with /tip <amount>, where <amount> is a positive number.');
        return;
    }
    const amountStr = match[1]; // Captured digits

    // Convert to wei using parseEther (assumes amount is in ether units)
    let amount;
    try {
        amount = parseEther(amountStr);
        if (amount === 0n) {
            await ctx.reply('Amount must be greater than zero.');
            return;
        }
    } catch (error) {
        await ctx.reply('Invalid amount.');
        return;
    }

    // Check if the command is a reply
    const isReply = !!ctx.message?.reply_to_message;
    if (!isReply) {
        await ctx.reply('Usage: Reply to a message with /tip <amount>');
        return;
    }

    // Get recipient's user ID and details
    const sourceUsername = ctx.from?.username;
    const targetUsername = ctx.message.reply_to_message.from?.username;
    const toUserId = ctx.message.reply_to_message?.from?.id;
    const targetFullname = ctx.message.reply_to_message.from?.first_name + ' ' +
        (ctx.message.reply_to_message.from?.last_name || '');
    const sourceFullname = ctx.from?.first_name + ' ' + (ctx.from?.last_name || '');

    if (!toUserId) {
        await ctx.reply('Could not determine recipient from reply.');
        return;
    }

    // Prevent self-tipping or tipping the bot
    if (userId === toUserId) {
        await ctx.reply('You cannot tip yourself.');
        return;
    }
    if (toUserId === botUserId) {
        await ctx.reply('You cannot tip the bot.');
        return;
    }

    // Check sender's balance
    const senderBalance = await getBalance(userId);
    if (senderBalance < amount) {
        await ctx.reply(`Insufficient balance, you have ${formatEther(senderBalance)} CCP`);
        return;
    }

    // Execute the transfer
    isTransferPending = true;
    let hash;

    try {
        await ctx.reply(`Tipping ${formatEther(amount)} CCP to ${targetFullname}...`);

        hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: CCP_ABI,
            functionName: 'transfer',
            args: [BigInt(userId), sourceUsername, BigInt(toUserId), targetUsername, amount],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        await ctx.reply(`${sourceFullname} tipped ${formatEther(amount)} CCP to ${targetFullname}\n___\n${hash}`);
    } catch (error) {
        await ctx.reply(`Transfer may have failed, verify the tx ${hash} on basescan.`);
        console.error('Transfer error:', error);
    } finally {
        isTransferPending = false;
    }
}));

bot.launch();
console.log('Bot started');