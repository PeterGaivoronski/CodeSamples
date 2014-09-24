//Uses nodeunit for testing

var async = require('async')
var uuid = require('node-uuid')

var NetStorage = require('./DynamoDriver.js')

var ServerData = require('./ServerData.js')
var helpers = require('projectLibs')
var stats = helpers.stats

var tests = {}

//create 50 cards

var CardDBLength = ServerData.CardDB.length-1;

var CardDBMapping = {
	't': 'type',
	'e': 'edition',
	'a': 'attack',
	'd': 'defense',
	'n': 'energyUsage',
	'f': 'firstStrikes'
}

var generateCard = function(){
	var cardProto = ServerData.CardDB[stats.intRand(0, CardDBLength)]
	var card = {};
	var key, value;
	for (var attr in CardDBMapping){
		key = CardDBMapping[attr]
		value = cardProto[attr]
		switch(key){
			case "attack":
			case "defense":
			case "energyUsage":
			case "firstStrikes":
				value += stats.intRand(-1, 1);
				if (value < 1) value = 1;
			break;
		}
		card[key] = value; 
	}
	return card;
}

var cardSchema = {
	'deckID': {type: 'string'},
	'cardID': {type: 'string'},
	'attack': {type: 'integer'},
	'defense': {type: 'integer'},
	'edition': {type: 'integer'},
	'energyUsage': {type: 'integer'},
	'firstStrikes': {type: 'integer'},
	'type': {type: 'string'}
}

var cards = [], c;
var deckID = '65414688-edf8-43a7-9416-d8a2ffbd668e';
for (var i = 0; i < 50; i++) {
	c = generateCard()
	c.deckID = deckID;
	c.cardID = (i === 0)?'05f70199-b86f-4203-93cc-e0395bb3b061':uuid.v4();
	cards.push(c)
}

tests.checkCardParams = function(test){
	test.expect(2)

	test.ok(true, !!cards[0]['attack'])
	test.ok(true, !!cards[0]['defense'])

	test.done()
}

//store the cards into dynamo

tests.testDriverAsync = function(test){
	test.expect(5)

	async.auto({
		"storeCards": function(cb, r){
			var reqs = []
			for (var i = 0; i < 10; i++) {
				(function(i){
					reqs.push(function(cb){
						NetStorage.storeObj("test_bucket", cards[i], ["cardID"], function(err){
							if(err){
								cb(err)
								return console.log("store error: "+err)	
							}
							cb(false)
							console.log("stored obj")
						})
					})
				})(i)
			};

			async.parallel(reqs, function(err){
				console.log("saved all cards")
				test.equal(false, !!err)
				cb()
			})
		}

		, "readCards": ["storeCards", function(cb, r){
			NetStorage.readObj("test_bucket", {
				'deckID': '65414688-edf8-43a7-9416-d8a2ffbd668e',
				'cardID': '05f70199-b86f-4203-93cc-e0395bb3b061'
			}, null, false, function(err, data){
				if(err) return console.log("error: "+err)
				console.log(data)
				test.equal(false, !!err)
				cb()
			})
		}]

		, "updateCard": ["readCards", function(cb, r){
			NetStorage.readObj("test_bucket", cardSchema, {
				'deckID': '65414688-edf8-43a7-9416-d8a2ffbd668e',
				'cardID': '05f70199-b86f-4203-93cc-e0395bb3b061 222'
			}, null, false, function(err, data){
				console.log("read results")
				console.log(arguments)
				if(err) return console.log("read error: "+err)
				NetStorage.updateObj("test_bucket", cardSchema, {
					'deckID': '65414688-edf8-43a7-9416-d8a2ffbd668e',
					'cardID': '05f70199-b86f-4203-93cc-e0395bb3b061'
				}, {
					attack: 9
				}, data, function(data){
					console.log("running validator")
					return true;
					//return false;
				}, function(err){
					if(err) return console.log("update error: "+err)
					console.log("updated")
					test.equal(false, !!err)
					cb()
				})
			})
		}]

		, "queryCards": ["updateCard", function(cb, r){
			NetStorage.queryObj("test_bucket", cardSchema, {
				'deckID': {op: 'EQ', values: ['65414688-edf8-43a7-9416-d8a2ffbd668e']},
				//'type': {op: 'EQ', values: ['darossu']}
			}, null, null, false, function(err, data){
				if(err) return console.log("error: "+err)
				console.log(data)
				test.equal(false, !!err)
				cb()
			})
		}]
	}, function(err, r){
		//check if there were errors
		test.equal(false, !!err)

		console.log("operations completed!")

		test.done()
	})
}



module.exports = tests;