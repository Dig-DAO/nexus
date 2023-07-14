const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const settings = require('../settings.json');
require('dotenv').config();

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'generate_shares',
        description:
            'Generate shares of a private key for a specified role with a specified threshold',
        options: [
            {
                name: 'role',
                description: 'Select a role.',
                type: 8,
                required: true,
            },
            {
                name: 'threshold',
                description:
                    'Select a threshold for shares to be collected to recover the private key',
                type: 4,
                required: true,
            },
            {
                name: 'create',
                description:
                    'Select true if you want to create a new private key',
                type: 5,
                required: false,
            },
        ],
    },
    {
        name: 'test_generate_keys',
        description: 'Generate a private and public key pair',
    },
    {
        name: 'test_get_members',
        description: 'get member ids for a selected role',
        options: [
            {
                name: 'role',
                description: 'Select a role.',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'test_dm',
        description: 'Send DMs to members with a selected role',
        options: [
            {
                name: 'role',
                description: 'Select a role.',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'test_recover',
        description:
            'Recover the private key from approved shares and show its public key',
    },
    {
        name: 'approve_share',
        description: 'Send your share',
        options: [
            {
                name: 'share',
                description: 'Your share',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'clear_approved_shares',
        description: 'Clear the approved shares',
    },
    {
        name: 'test_send_eth',
        description: 'Send 0.01eth to a specified address',
        options: [
            {
                name: 'address',
                description: 'A wallet address to send an ETH',
                type: 3,
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        const endpoint = Routes.applicationGuildCommands(
            settings.APPLICATION_ID,
            settings.GUILD_ID
        );
        await rest.put(endpoint, { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
