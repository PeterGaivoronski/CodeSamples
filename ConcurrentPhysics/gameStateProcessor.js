var Physics = require('./client/physics.js')
, GameController = require('./GameController.js')
, SLOW_WEIGHT = 20
, FAST_WEIGHT = 3
, games = {
	// '123': {
	// 	, numPlayers: 8
	// 	. submittedActions: []
	// 	, turnNumber: x
	// 	, submittedTurns: [] // {turnNumber: x, targetTime: n, hash: "sdfsdf"}
	// 	, playerPings: []
	// 	, prevHighestPing: 0
	// 	, state: {
	// 		//physics state of the game. can be used to validate player actions.
	// 	}
	// }
}
, game

var loadedGame = require('./client/games/editor/editor.js')

var gameStateProcessor = {}

var processGames = function(){

	for(game in games){
		//wait for all turns to be submitted
		if(games[game].submittedTurns.length !== games[game].numPlayers) continue;
			
		//check hash if it's time
		if("hash" in games[game].submittedTurns[0]){
			var gameHash = calcHash(games[game].state)

			for(i = -1; ++i < NUM_PLAYERS;){
				if(games[game].submittedTurns[i].hash !== gameHash){
					//Physics simulations do not match, end game
					GameController.end(games[game])
				}
			}
		}

		var turnLowerBound = games[game].submittedTurns[0].targetTime
		, highestPing = games[game].playerPings[0]
		, i
		, proposedTurnLength
		, turnLength

		
		for(i = 0; ++i < NUM_PLAYERS;){
			//get the turn lower bound
			if(games[game].submittedTurns[i].targetTime > turnLowerBound){
				turnLowerBound = games[game].submittedTurns[i].targetTime
			}
			//get the highest ping
			if(games[game].playerPings[i] > highestPing){
				highestPing = games[game].playerPings[i]
			}
		}

		//getting faster
		if(games[game].prevHighestPing > highestPing){
			proposedTurnLength = turnLength - FAST_WEIGHT
			if(proposedTurnLength < highestPing){
				turnLength = highestPing
			}else{
				turnLength = proposedTurnLength
			}
		}
		//getting slower or staying the same
		else {
			proposedTurnLength = turnLength + SLOW_WEIGHT
			if(proposedTurnLength > highestPing){
				turnLength = highestPing
			}else{
				turnLength = proposedTurnLength
			}
		}

		//check for lower bound
		if(turnLength < turnLowerBound){
			turnLength = turnLowerBound
		}

		//validate turn commands - delete any invalid commands
		validateCommands(games[game].state, games[game].submittedActions)

		//send out the turn length for the next turn, and thereby signal the clients to simulate the next turn
		sendOutTurnCommandsAndLength()

		//make updates to the state
		games[game].state = applyCommands(games[game].state, games[game].submittedActions)

		//simulate turn (will probably finish way faster than the players, and move on to the next game instance)
		games[game].state = Physics.simulateFrames(loadedGame, turnLength)
	}

	setTimeout(processGames, 10)
}

module.exports = gameStateProcessor