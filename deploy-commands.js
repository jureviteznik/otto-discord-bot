const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('ping')
                            .setDescription('Replies with pong!'),

	new SlashCommandBuilder().setName('history')
                            .setDescription('Displays 9 of your recent matches!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.')),
                            

	new SlashCommandBuilder().setName('addmatch')
                            .setDescription('Add a new match record!')
                            .addUserOption(option => option.setName('opponent').setDescription('Select your opponent').setRequired(true))
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.'))
                            .addIntegerOption(option => option.setName('wins').setDescription('# of wins'))
                            .addIntegerOption(option => option.setName('losses').setDescription('# of losses')),

    new SlashCommandBuilder().setName('stats')
                            .setDescription('Displays your wins-losses and match points from this mounth!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.')),


    new SlashCommandBuilder().setName('standings')
                            .setDescription('Displays current top 15 players!'),

    new SlashCommandBuilder().setName('updateplayer')
                            .setDescription('Updates players stats!')
                            .addUserOption(option => option.setName('player').setDescription('Select player. If this is skiped the person posting is selected as player.')),


]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);