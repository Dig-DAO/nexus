const { Client, GatewayIntentBits } = require('discord.js');
const ed = require('@noble/ed25519');
require('dotenv').config();
const ethers = require('ethers');
const sss = require('shamirs-secret-sharing');

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

let approvedShares = {};

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        try {
            await interaction.reply({ content: 'pong', ephemeral: true });
        } catch (error) {
            console.error(error.rawError);
        }
    }

    if (interaction.commandName === 'test_generate_keys') {
        const pk = getPrivateKey();
        const wallet = new ethers.Wallet(pk);
        try {
            await interaction.reply({
                content: `private key: ${pk}\npublic key: ${wallet.address}`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error.rawError);
        }
    }

    if (interaction.commandName === 'test_get_members') {
        try {
            const guild = await bot.guilds.fetch(interaction.guildId);
            const role = guild.roles.cache.get(
                interaction.options.getRole('role').id
            );

            await guild.members.fetch();

            role.members.map((member) => {
                console.log(member.user.id);
            });
            await interaction.reply({
                content: 'members logged',
                ephemeral: true,
            });
        } catch (error) {
            console.error(error.rawError);
        }
    }

    if (interaction.commandName === 'test_dm') {
        try {
            const guild = await bot.guilds.fetch(interaction.guildId);
            await guild.members.fetch();
            const role = guild.roles.cache.get(
                interaction.options.getRole('role').id
            );
            for (const [key, user] of role.members) {
                try {
                    await user.send(
                        'ボットからのDM送信のテストです。とくにアクションは必要ありません。'
                    );
                } catch (error) {
                    console.error(error.rawError);
                    await interaction.reply({
                        content: `DM送信中にエラーが発生しました。\nUsername: ${
                            user.nickname ?? user.displayName
                        }`,
                        ephemeral: true,
                    });
                    throw new Error('An error occurred on sending DMs');
                }
            }
            await interaction.reply({
                content: '指定されたロールのユーザ全員にDMを送信完了しました。',
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'generate_shares') {
        try {
            const guild = await bot.guilds.fetch(interaction.guildId);
            const role = guild.roles.cache.get(
                interaction.options.getRole('role').id
            );
            await guild.members.fetch();
            const members = role.members.map((member) => {
                return member.id;
            });
            const threshold =
                interaction.options.getInteger('threshold') ?? members.length;
            if (threshold > members.length) {
                await interaction.reply({
                    content:
                        '閾値は管理を行うメンバー数より小さい必要があります。',
                    ephemeral: true,
                });
                return;
            }
            const createNewPrivateKey =
                interaction.options.getBoolean('create') ?? false;
            let pk;
            if (createNewPrivateKey) {
                pk = getPrivateKey();
            } else {
                const shares = Object.values(approvedShares);
                if (shares.length === 0) {
                    await interaction.reply({
                        content: 'シェアがまだ登録されていません。',
                        ephemeral: true,
                    });
                    return;
                }
                pk = recoverPrivateKey(shares);
            }
            const address = new ethers.Wallet(pk).address;

            const shares = sss.split(pk, {
                shares: members.length,
                threshold: threshold,
            });
            let i = 0;
            for (const [key, member] of role.members) {
                try {
                    // TODO: remove TEST
                    const share = shares[i].toString('hex');
                    console.log(share);
                    await member.send(share);
                    i++;
                } catch (error) {
                    console.error(error.rawError);
                    await interaction.reply({
                        content: `DM送信中にエラーが発生しました。\nUsername: ${
                            user.nickname ?? user.displayName
                        }`,
                        ephemeral: true,
                    });
                    throw new Error('An error occurred on sending DMs');
                }
            }

            await interaction.reply({
                content:
                    'シェアが選ばれたロールのユーザにDMで送られました。\n' +
                    `Address: ${address}\n` +
                    `Member IDs: ${members}\n` +
                    `Threshold: ${threshold}`,
                // TODO: ephemeral to be removed
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'test_recover') {
        try {
            await interaction.deferReply({ ephemeral: true });

            const shares = Object.values(approvedShares);
            if (shares.length === 0) {
                await interaction.editReply({
                    content: 'シェアがまだ登録されていません。',
                    ephemeral: true,
                });
                return;
            }
            const pk = recoverPrivateKey(shares);
            try {
                const address = new ethers.Wallet(pk).address;
                await interaction.editReply({
                    content: `秘密鍵が復元できました！\nAddress: ${address}`,
                    ephemeral: true,
                });
            } catch (error) {
                await interaction.editReply({
                    content: `秘密鍵が復元できませんでした。`,
                    ephemeral: true,
                });
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'approve_share') {
        try {
            const share = interaction.options.getString('share');
            approvedShares[interaction.user.id] = share;
            await interaction.reply({
                content: `シェアが送信されました。\nNumber of approved shares: ${
                    Object.keys(approvedShares).length
                }`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error.rawError);
        }
    }

    if (interaction.commandName === 'clear_approved_shares') {
        try {
            approvedShares = {};
            await interaction.reply({
                content: '記録されたシェアのリストがクリアされました。',
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.commandName === 'test_send_eth') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const address = interaction.options.getString('address');
            const shares = Object.values(approvedShares);
            if (shares.length === 0) {
                await interaction.editReply({
                    content: 'シェアがまだ登録されていません。',
                    ephemeral: true,
                });
                return;
            }
            const pk = recoverPrivateKey(shares);
            const provider = new ethers.providers.JsonRpcProvider(
                'https://ethereum-goerli.publicnode.com'
            );
            const wallet = new ethers.Wallet(pk, provider);
            const tx = {
                to: address,
                value: ethers.utils.parseEther('0.01'),
            };
            try {
                const response = await wallet.sendTransaction(tx);
                await provider.waitForTransaction(response.hash);
                await interaction.editReply({
                    content: `${address} に0.01eth (Goerli) を送りました。`,
                    ephemeral: true,
                });
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: 'トランザクションに失敗しました',
                    ephemeral: true,
                });
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }

    function getPrivateKey() {
        const pkUint8Array = ed.utils.randomPrivateKey();
        return Buffer.from(pkUint8Array).toString('hex');
    }

    function recoverPrivateKey(shares) {
        const recovered = sss.combine(shares);
        return recovered.toString();
    }
});

bot.login(process.env.DISCORD_TOKEN);
