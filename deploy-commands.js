const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config()

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = process.env.GUILD_ID
const CLIENT_ID = process.env.CLIENT_ID

const commands = [
    new SlashCommandBuilder().setName('ping')
                            .setDescription('Replies with pong!'),

    new SlashCommandBuilder().setName('history')
                            .setDescription('Displays 9 of your recent matches!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.'))
                            .addIntegerOption(option => option.setName('season').setDescription('Season of games to display. If skiped the current running season is selected.')),


    new SlashCommandBuilder().setName('addbracket')
                            .setDescription('Adds match records of all matches played in the bracket!')
                            .addStringOption(option => option.setName('sessionid').setDescription('Session ID of the mtgdraft website.').setRequired(true))
                            .addIntegerOption(option => option.setName('season').setDescription('Season that this games get added to. If skiped the current running season is selected.')),

    new SlashCommandBuilder().setName('addmatch')
                            .setDescription('Add a new match record!')
                            .addUserOption(option => option.setName('opponent').setDescription('Select your opponent').setRequired(true))
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.'))
                            .addIntegerOption(option => option.setName('wins').setDescription('# of wins'))
                            .addIntegerOption(option => option.setName('losses').setDescription('# of losses'))
                            .addIntegerOption(option => option.setName('season').setDescription('Season that this game gets added to. If skiped the current running season is selected.'))
                            .addBooleanOption(option => option.setName('force').setDescription('Force the bot to add the match record when it\'s complaining about duplicates')),
                            

    new SlashCommandBuilder().setName('stats')
                            .setDescription('Displays your wins-losses, match points and more!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.'))
                            .addIntegerOption(option => option.setName('season').setDescription('Season from which the stats will be dispalyed. If skiped the current running season is selected.')),


    new SlashCommandBuilder().setName('standings')
                            .setDescription('Displays top 15 players!')
                            .addIntegerOption(option => option.setName('season').setDescription('Season from which standings will be displayed. If skiped the current running season is selected.')),

    new SlashCommandBuilder().setName('updateplayer')
                            .setDescription('Updates players stats!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.'))
                            .addIntegerOption(option => option.setName('season').setDescription('Season for which stats will be updated. If skiped the current running season is selected.')),

    new SlashCommandBuilder().setName('help')
                            .setDescription('Description of the bot and its commands!'),

]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);