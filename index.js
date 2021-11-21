const { Client, Intents } = require('discord.js')
const mongoose = require('mongoose')
const table = require('text-table')
const fetch = require('isomorphic-fetch')
require('dotenv').config()

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const DATABASE_CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING
const GUILD_ID = process.env.GUILD_ID


async function main() {
	connectDiscord()
	connectDatabase()
}


/////////////
// DISCORD //
/////////////

async function connectDiscord(){
	const client = new Client({ intents: [Intents.FLAGS.GUILDS, "GUILD_MEMBERS"] })

	client.once('ready', () => {
		console.log('Ready!')
	})

	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand()) return

		const { commandName, user, options } = interaction

		if (commandName === 'ping') {
			await interaction.reply('Pong!')

		} else if (commandName === 'history') {
			await interaction.deferReply()
				const player = options.getUser('player') || user
				const response = await history(player)
			await interaction.editReply(response)

		} else if (commandName === 'addmatch') {
			await interaction.deferReply()
				const opponent = options.getUser('opponent')
				const player = options.getUser('player') || user
				const wins = options.getInteger('wins')		|| 0
				const losses = options.getInteger('losses')	|| 0
                const force = options.getBoolean('force') || false
				const response = await addMatch(player, opponent, wins, losses, force)
			await interaction.editReply(response)

		} else if (commandName === 'stats') {
			await interaction.deferReply()
				const player = options.getUser('player') || user
				const response = await stats(player)
			await interaction.editReply(response)

		} else if (commandName === 'standings') {
			await interaction.deferReply()
				const response = await standings()
			await interaction.editReply(response)

		} else if (commandName === 'updateplayer') {
			await interaction.deferReply()
				const player = options.getUser('player') || user
				const response = await updatePlayerStats(player)
			await interaction.editReply(response)

		} else if (commandName === 'addbracket') {
			await interaction.deferReply()
				const sessionid = options.getString('sessionid') || null
				const response = await addbracket(sessionid, client.guilds.cache.get(GUILD_ID))
			await interaction.editReply(response)

		}else if (commandName === 'help') {
			await interaction.deferReply()
				const response = await help()
			await interaction.editReply(response)
		}



	})

	client.login(DISCORD_TOKEN)
}

///////////////
// FUNCTIONS //
///////////////

async function help(){

	return 	'```' +
			'Hello! I\'m Otto, APD league stats bot!\n'+
			'I keep track of matches and standings, so you can know who qualifys for the final pod each month.\n\n'+

			'Here are my comands:\n\n'+

			'/addbracket - Adds a all matches from a finished pod bracket.\n'+
				'\t[sesionid] - Session id of the pod from the mtgadraft.tk website.\n\n'+

			'/addmatch - Adds a match record into the database.\n'+
				'\t[opponent] - Person from the server that you played against. This field is required!\n'+
				'\t[player] - If this field is skiped the person posting is selected as player.\n'+
				'\t[wins] - Number of games that player won. If skiped value is set to 0.\n'+
				'\t[losses] - Number of games that opponent won. If skiped value is set to 0.\n\n'+

			'/standings - displays current top 15 players\n\n'+

			'/stats - displays players stats like match wins/losses, match win%, game win%...\n'+
				'\t[player] - If this field is skiped the person posting is selected as player.\n\n'+

			'/history - displays players last 9 matches\n'+
				'\t[player] - If this field is skiped the person posting is selected as player.\n\n'+

			'/updateplayer - double checks players stats and updates them if necessary\n'+
				'\t[player] - If this field is skiped the person posting is selected as player.\n\n'+

			'/help - displays this message'+
			'```'
}

async function addbracket(sessionid, guild){
	if(sessionid == null)	return 'Empty session id!'

	let bracketUrl = 'https://www.mtgadraft.tk/getBracket/' + sessionid

	const bracketResponse = await fetch(bracketUrl)

	if(bracketResponse.status == 404){
		return 'Brackets for the session do not exist!'
	}

	const { players: bracketPlayers, results: bracketResults, swiss } = await bracketResponse.json()

	if(!swiss){
		return 'Tournament mode should be swiss!'
	}

    let players = []

	const serverMembers = await guild.members.fetch()

    for (let bracketPlayer of bracketPlayers){
        let player = serverMembers.find(member => member.displayName.toLowerCase().includes(bracketPlayer.userName.toLowerCase()))
        if(player === undefined){
            return 'Player ' + bracketPlayer.userName + ' not found'
        }
        players.push(player.user)
    }
    const results = bracketResults.map(([a, b]) => [parseInt(a, 10), parseInt(b, 10)])

    let parsedResults = parseResults(players, results)

	let rows = [['Player1', 'wins p1', 'wins p2', 'player2']]
	let options = { align: [ 'c', 'c', 'c', 'c' ] }

	for(let result of parsedResults){
        [player1, player2, winsPlayer1, winsPlayer2] = result;
        rows.push([player1.username, winsPlayer1, winsPlayer2, player2.username])
        addMatch(player1, player2, winsPlayer1, winsPlayer2, false)
    }

	return '```' + table(rows, options) + '```'
}

function parseResults(players, results){
    // bracket structure is kinda weird
    // w1 => 5-1, w2 => 5-2
    // w3 => 6-1, w4 => 6-2
    // so far so good, but
    // l1 => 8-1, l2 => 8-2
    // l3 => 7-1, l4 => 7-2
    // so losers flip around, but not totally
    // so its neither l1 => 7-1 nor l1 => 8-2, but the weird mixup l1 => 8-1
    // then for the third round it's again weird
    // w5 => 9-1, w6 => 9-2
    // l7 => 12-1, l8 => 12-2
    // the only way, but then
    // l5 => 10-1, w7 => 10-2
    // l6 => 11-1, w8 => 11-2
    // so it's not upper bracket/lower bracket after the first round but a mixup
    // and players that won round 1 but lost round 2 don't play against each other
    // so assuming first players wins, these are the seats:
    const roundSeats = [
        [0, 1, 2, 3, 4, 5, 6, 7],
        [0, 2, 4, 6, 5, 7, 1, 3],
        [0, 2, 1, 4, 3, 6, 5, 7]
    ]
    const roundMatches = 4
    const rounds = 3

    let parsedResults = []

    let lastRoundPlayers = [...players]
    for(let i = 0; i < rounds; i++){
        let roundResults = results.slice(i * roundMatches, (i + 1) * roundMatches)
        let seats = roundSeats[i]
        let roundPlayers = seats.map((i) => lastRoundPlayers[i])
        let flippedRoundPlayers = []

        for(let j = 0; j < roundMatches; j++){
            let player1 = roundPlayers[2 * j];
            let player2 = roundPlayers[2 * j + 1];
            let [wins, losses] = roundResults[j];

            if(wins < losses){
                [player1, player2] = [player2, player1];
                [wins, losses] = [losses, wins];
            }
            flippedRoundPlayers.push(player1)
            flippedRoundPlayers.push(player2)
            parsedResults.push([player1, player2, wins, losses])
        }

        lastRoundPlayers = flippedRoundPlayers
    }

    return parsedResults
}

async function standings(){
	const players = await playerModel.find().sort({matchWins: -1, matchWinPercentage: -1, gameWinPercentage: -1, opponentMatchWinPercentage: -1, opponentGameWinPercentage: -1} ).limit(15)

	let rows = [['Rank', 'Player', 'Match wins', 'Match win%', 'Game win%', 'Opp match win%', 'Opp game win%']]

	let rank = 1
	for(let player in players){
		rows.push([rank++, players[player].playerName, players[player].matchWins, players[player].matchWinPercentage.toFixed(2), players[player].gameWinPercentage.toFixed(2), players[player].opponentMatchWinPercentage.toFixed(2), players[player].opponentGameWinPercentage.toFixed(2)])
	}
	return '```' + table(rows) + '```'
}

async function stats(user){
	await checkIfPlayerExists(user)

	try{
		const player = await playerModel.findOne({playerId: user.id})

		let rows = [['Player:', player.playerName],
					['Match stats:', player.matchWins + '-' + player.matchLosses],
					['Game stats:', player.gameWins + '-' + player.gameLosses],
					['Match-win %:', player.matchWinPercentage.toFixed(2)],
					['Game-win %:', player.gameWinPercentage.toFixed(2)],
					['Opp Match-win %:', player.opponentMatchWinPercentage.toFixed(2)],
					['Opp Game-win %:', player.opponentGameWinPercentage.toFixed(2)]]

		return	'```' + table(rows) + '```'

	}catch(e){
		console.error(e)
	}
}

async function history(user){
	await checkIfPlayerExists(user)
	try{
		let matches = await matchModel.aggregate([
			{
				$match: {
					 $or : [{playerOneId: user.id}, {playerTwoId: user.id }]
				}
			},
			{
				$sort: { date: -1 }
			},
			{
				$limit: 9
			},
			{
				$lookup: {
				  from: 'playermodels',
				  let: { playerOneId: '$playerOneId', playerTwoId: '$playerTwoId' },
				  pipeline: [{
					  $match: {
						  $expr: {
							  $and: [
								{ $ne: [ '$playerId', user.id ] },
								{ $or : [
									{ $eq: ['$playerId', '$$playerOneId']},
									{ $eq: ['$playerId', '$$playerTwoId']}
								]}
							  ]
							}
						}
					}],
				 as: 'opponent'
				}
			},
			{
			  $unwind: {
				path: '$opponent'
			  }
			},
			{ $project: {
				playerOneId: true,
				playerTwoId: true,
				winsPlayerOne: true,
				winsPlayerTwo: true,
				date: true,
				opponent: '$opponent.playerName'
			}}
		])


		let rows = [['Opponent', 'wins', 'losses']]

		for(let match in matches){
			if(user.id === matches[match].playerOneId){
				rows.push([matches[match].opponent, matches[match].winsPlayerOne, matches[match].winsPlayerTwo])
			}else{
				rows.push([matches[match].opponent, matches[match].winsPlayerTwo, matches[match].winsPlayerOne])
			}
		}
		return '```History for player ' + user.username + '\n' + table(rows) + '```'
	}catch(e){
		console.error(e)
	}
}

async function updatePlayerStats(user){
	await checkIfPlayerExists(user)

	let matches = await matchModel.aggregate([
		{
			$match: {
				 $or : [{playerOneId: user.id}, {playerTwoId: user.id }]
			}
		},
		{
			$lookup: {
			  from: 'playermodels',
			  let: { playerOneId: '$playerOneId', playerTwoId: '$playerTwoId' },
			  pipeline: [{
				  $match: {
					  $expr: {
						  $and: [
							{ $ne: [ '$playerId', user.id ] },
							{ $or : [
								{ $eq: ['$playerId', '$$playerOneId']},
								{ $eq: ['$playerId', '$$playerTwoId']}
							]}
						  ]
						}
					}
				}],
			 as: 'opponent'
			}
		},
		{
		  $unwind: {
			path: '$opponent'
		  }
		}
	])

	let matchWins = 0
	let matchLosses = 0
	let gameWins = 0
	let gameLosses = 0

	let opponentMatchWinPercentage = 0
	let opponentGameWinPercentage = 0

	for(let match in matches){
		if(user.id === matches[match].playerOneId){
			gameWins += matches[match].winsPlayerOne
			gameLosses += matches[match].winsPlayerTwo

			if(matches[match].winsPlayerOne > matches[match].winsPlayerTwo){
				matchWins++
			}else{
				matchLosses++
			}

			opponentMatchWinPercentage += matches[match].opponent.matchWinPercentage
			opponentGameWinPercentage += matches[match].opponent.gameWinPercentage
		}else{
			gameWins += matches[match].winsPlayerTwo
			gameLosses += matches[match].winsPlayerOne

			if(matches[match].winsPlayerOne < matches[match].winsPlayerTwo){
				matchWins++
			}else{
				matchLosses++
			}

			opponentMatchWinPercentage += matches[match].opponent.matchWinPercentage
			opponentGameWinPercentage += matches[match].opponent.gameWinPercentage
		}
	}

	let matchWinPercentage = matchWins/(matchWins+matchLosses)
	matchWinPercentage = isNaN(matchWinPercentage) ? 0 : matchWinPercentage > 0.33 ? matchWinPercentage : 0.33
	let gameWinPercentage = gameWins/(gameWins+gameLosses)
	gameWinPercentage = isNaN(gameWinPercentage) ? 0 : gameWinPercentage > 0.33 ? gameWinPercentage : 0.33

	opponentMatchWinPercentage = matches.length == 0 ? 0 : opponentMatchWinPercentage/matches.length
	opponentGameWinPercentage = matches.length == 0 ? 0 : opponentGameWinPercentage/matches.length

	await playerModel.findOneAndUpdate({playerId: user.id},
		{
			$set: {
				matchWins: matchWins,
				matchLosses: matchLosses,
				gameWins: gameWins,
				gameLosses: gameLosses,
				matchWinPercentage: matchWinPercentage,
				gameWinPercentage: gameWinPercentage,
				opponentMatchWinPercentage: opponentMatchWinPercentage,
				opponentGameWinPercentage: opponentGameWinPercentage
			}
		}
	)

	return 'Player stats updated!'
}

async function addMatch(user1, user2, wins, losses, force){
	await checkIfPlayerExists(user1)
	await checkIfPlayerExists(user2)

    if(user1.id > user2.id){
        [user1, user2] = [user2, user1];
        [wins, losses] = [losses, wins];
    }

	try{

		const newMatch = new matchModel({
			playerOneId: user1.id,
			playerTwoId: user2.id,
			winsPlayerOne: wins,
			winsPlayerTwo: losses,
			date: Date()
		})

        let matchAlreadyExists = await checkIfMatchAlreadyExists(newMatch)

        if(force || !matchAlreadyExists){
            await newMatch.save(async (err) => {
                await updatePlayerStats(user1)
                await updatePlayerStats(user2)
                if (err) return handleError(err)
            })

            let rows = [[user1.username, user2.username], [wins, losses]]
            let options = { align: [ 'c', 'c' ] }

            return '```' + table(rows, options) + '```'
        } else {
            return 'Similar match record already exists, use `force` if you are sure this is a new record'
        }
	}catch(err){
		console.error(err)
	}
}

async function checkIfMatchAlreadyExists(match){
    const GRACE_PERIOD_HOURS = 2
    let cutoffTime = new Date(match.date.getTime())
    cutoffTime.setHours(match.date.getHours() - GRACE_PERIOD_HOURS)

    return await matchModel.exists({
        playerOneId: match.playerOneId,
        playerTwoId: match.playerTwoId,
        date: { $gte: cutoffTime.toISOString()}
    })
}

async function checkIfPlayerExists(user){
	try {
		const exists = await playerModel.exists({ playerId: user.id })
		if(!exists){
			try{
				const newPlayer = new playerModel({
					playerId: user.id,
					playerName: user.username,
					matchWins: 0,
					matchLosses: 0,
					gameWins: 0,
					gameLosses: 0,
					matchWinPercentage: 0,
					gameWinPercentage: 0,
					opponentMatchWinPercentage: 0,
					opponentGameWinPercentage : 0
				})
				await newPlayer.save((err) => {
					if (err) return handleError(err)
				})
			}catch(e){
				console.error(e)
			}
		}
	} catch (err) {
		return console.error(err)
	}
}

//////////////
// DATABASE //
//////////////

async function connectDatabase(){
	await mongoose.connect(DATABASE_CONNECTION_STRING,  {useNewUrlParser: true, useUnifiedTopology: true});
    const db = mongoose.connection
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
}

//////////////////////
// SCHEMAS & MODELS //
//////////////////////

const matchSchema = new mongoose.Schema({
	playerOneId: String,
    playerTwoId: String,
    winsPlayerOne: Number,
    winsPlayerTwo: Number,
    date: Date
})

const playerSchema = new mongoose.Schema({
    playerId: String,
	playerName: String,
	matchWins: Number,
	matchLosses: Number,
	gameWins: Number,
	gameLosses: Number,
	matchWinPercentage: Number,
	gameWinPercentage: Number,
	opponentMatchWinPercentage: Number,
	opponentGameWinPercentage : Number

})

const playerModel = mongoose.model('playerModel', playerSchema)
const matchModel = mongoose.model('matchModel', matchSchema)


//////////////
// RUN MAIN //
//////////////
main()
