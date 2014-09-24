var async = require('async');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./awsConfig.json');

var dynamo = {};

var clients = {
	'static': new AWS.DynamoDB({apiVersion: '2012-08-10'}),
	'dynamic': null
}

dynamo.setDynamicClient = function(client){
	clients['dynamic'] = client;
}

dynamo.helpers = require('./dynamoDriverHelpers.js');

//************
//CACHE SETUP
//************
//apply a cacheClient to dynamoDriver to use cache
var cacheClient = null;
//apply a pubCacheClient and subCacheclient to send out update messages to clear cache after an update takes place
var pubCacheClient = null;
var subCacheclient = null;

dynamo.setCacheClients = function(cache, pub, sub){
	cacheClient = cache
	pubCacheClient = pub
	subCacheclient = sub

	subCacheclient.subscribe("/dbUpdate")

	subCacheclient.on("message", function(channel, message){
		switch(channel){
			case "/dbUpdate":
				//delete local cache of updated key
				cacheClient.del(message)
				break;
		}
	})
}

//************
//END CACHE SETUP
//************

//feed in keys as {key: value, key: value}
//expectedPrimary is an array of primary keys to check for before creating the object
dynamo.storeObj = function(client, table, schema, kvObj, cb){
	var expectedKeys = {},
	expectedPrimary = dynamo.helpers.primaryKeys(schema, true);

	expectedPrimary.forEach(function(key){
		expectedKeys[key] = {'Exists': false}
	})
	var req = {
		'TableName': table,
		'Item': dynamo.helpers.keyObj(schema, kvObj),
		'Expected': expectedKeys
	}
	clients[client].putItem(req, cb, dynamo.helpers.primaryKeys(schema))
}

//batch store
dynamo.batchStoreObj = function(client, table, schema, kvArray, cb){
	var reqs = []
	for (var i = 0; i < kvArray.length; i++) {
		(function(i){
			reqs.push(function(cb){
				dynamo.storeObj(client, table, schema, kvArray[i], function(err){
					if(err){
						cb(err)
						return console.log("batch store error: "+err)	
					}
					cb(false)
					// console.log("stored obj")
				})
			})
		})(i);
	}
	async.parallel(reqs, cb)
}

//feed in keys as {key: value, key: value}
//strong is a boolean that tells dynamo whether to run a strong read (more expensive but gives the exact current value of the item)
//has auto-cache support if a cacheClient is provided
dynamo.readObj = function(client, table, schema, kvObj, attrsToGet, strong, parse, cb){
	var key = dynamo.helpers.keyObj(schema, kvObj)

	if(!strong && cacheClient){
		//try to fetch from cache if not a strongly consistent request
		var cacheKey = parse+JSON.stringify(key)
		cacheClient.get(cacheKey, function(err, data){
			//cache read error, despite cache enabled. bubble the error to user
			if(err) return cb(err)

			if(data === null){
				//key not in cache, fetch from dynamo
				return sendReadObj(client, table, schema, key, attrsToGet, strong, parse, cb)
			}else{
				//return key from cache
				console.log("getting the key from cache: "+cacheKey)
				return cb(false, JSON.parse(data))	
			}
		})
	}else{
		//no cache active, fetch from dynamo
		return sendReadObj(client, table, schema, key, attrsToGet, strong, parse, cb)
	}
}

//send the read request to dynamo (used by dynamo.readObj)
var sendReadObj = function(client, table, schema, key, attrsToGet, strong, parse, cb){
	var req = {
		'TableName': table,
		'Key': key,
		'ConsistentRead': strong
	}
	if(attrsToGet){
		req['AttributesToGet'] = attrsToGet
	}
	clients[client].getItem(req, function(err, data){
		if(err){
			cb(err)
			return console.log("read error: "+err)
		}

		var response;
		if(parse === true){
			response = dynamo.helpers.parseResponse(schema, data['Item'])	
		}else{
			response = data['Item']
		}
		if(cacheClient){
			//if cache available, add key to cache
			var cacheKey = parse+JSON.stringify(key)
			console.log("caching data under: "+cacheKey)
			cacheClient.set(cacheKey, JSON.stringify(response), function(err){
				return cb(err, response)
			})
		}else{
			//no cache active, simply return response
			return cb(err, response)
		}
	}, dynamo.helpers.primaryKeys(schema))
}

//batch read
dynamo.batchReadObj = function(client, table, schema, kvArray, attrsToGet, strong, parse, cb){
	var reqs = []
	for (var i = 0; i < kvArray.length; i++) {
		(function(i){
			reqs.push(function(cb){
				dynamo.readObj(client, table, schema, kvArray[i], attrsToGet, strong, parse, function(err, data){
					if(err){
						cb(err)
						return console.log("batch read error: "+err)	
					}
					cb(false, data)
				})
			})
		})(i);
	}
	async.parallel(reqs, cb)
}

//find objects by hash only, or by a secondary index
dynamo.queryObj = function(client, table, schema, kvObj, indexName, attrsToGet, strong, parse, cb){
	var req = {
		'TableName': table,
		'KeyConditions': dynamo.helpers.queryKeyObj(schema, kvObj),
		'ConsistentRead': strong
	}
	if(attrsToGet){
		if(attrsToGet === "count"){
			req['Select'] = "COUNT"
		}else{
			req['AttributesToGet'] = attrsToGet
		}
	}
	if(indexName){
		req['IndexName'] = indexName
	}
		//debug
		// console.log(req)
		// for(var key in req.KeyConditions){
		// 	console.log(req.KeyConditions[key])
		// }

	console.log("query request")
	console.log(req)
	console.log(req['KeyConditions'])

	clients[client].query(req, function(err, data){
		console.log(err)
		console.log("query response")
		console.log(data)

		if(attrsToGet === "count"){
			return cb(err, data['Count'])
		}

		if(data === null){
			return cb(false, [])
		}

		var response;
		//optionally return a non-parsed set of data for individual parsing
		if(parse === true){
			response = dynamo.helpers.parseQueryResponse(schema, data['Items'])
		}else{
			response = data['Items']
		}

		cb(err, response)
	}, dynamo.helpers.primaryKeys(schema))
}

var applyOperation = function(value, opObj){
	switch(opObj.op){
		case "SET":
			value = opObj.v;
			break;
		case "ADD":
			value += opObj.v;
			break;
		case "MUL":
			value *= opObj.v;
			break;
		default:
			return [false];
	}
	return [true, value];
}

//updates dictionary of attributeNames to { key: operation }, where operation is something like {op: "ADD", v: 5}
//expected is an obj of fields and expected values. the write only goes through if all of them are correct. these should be the values that you expect to be there (ie the values you read before)
//validator is a function that is executed when any of the expected values are not what they are meant to be. if the validator returns true, the value is read again strongly and the write runs again. if false, then the write stops.
dynamo.updateObj = function(client, table, schema, kvObj, updates, expected, validator, cb){
	var expectedKeys = {}, 
	key, 
	newValue,
	primaryKey = dynamo.helpers.keyObj(schema, kvObj);

	console.log("update called")
	console.log("expected values: ")
	console.log(expected)

	for(key in expected){
		expectedKeys[key] = { 'Value': dynamo.helpers.wrapValue( schema[key].type, expected[key] ) }
	}
	var attrUpdates = {}
	for(key in updates){
		newValue = applyOperation(expected[key], updates[key])
		if(newValue[0] === false) return cb("unknownOperation")
		attrUpdates[key] = { 'Value': dynamo.helpers.wrapValue( schema[key].type, newValue[1] ), 'Action': 'PUT' }
	}
	var req = {
		'TableName': table,
		'Key': primaryKey,
		'AttributeUpdates': attrUpdates,
		'Expected': expectedKeys
	}
	clients[client].updateItem(req, function(err, data){
		if(err && err.code === "ConditionalCheckFailedException"){
			//if the expected copy of the object is not correct, get a strong parsed copy of the object
			dynamo.readObj(client, table, schema, kvObj, Object.keys(expected), true, true, function(err, data){
				if(err) return cb(err)
				//if the validator returns true, try again
				if(validator(data)){
					console.log("conditional check failed. correct data: ")
					console.log(data)
					dynamo.updateObj(client, table, schema, kvObj, updates, data, validator, cb)	
				}else{
					//cancel update
					cb("ValidatorFailed")
				}
			})
		}else{
			//update successful

			//send update signal to caches if pubsub available
			//delete both parsed and unparsed versions
			if(pubCacheClient){
				pubCacheClient.publish("/dbUpdate", "true"+JSON.stringify(primaryKey))
				pubCacheClient.publish("/dbUpdate", "false"+JSON.stringify(primaryKey))	
			}

			cb(err)
		}
	}, dynamo.helpers.primaryKeys(schema))
}

//same params as store
dynamo.deleteObj = function(client, table, schema, kvObj, cb){
	var primaryKeys = dynamo.helpers.keyObj(schema, kvObj)
	, expectedKeys = {}

	//wrap the primary keys to create a conditional to check for the existence of the object
	//cannot do an Exists check here, because Exists: true requires a value to be specified anyway.
	for(var key in primaryKeys){
		expectedKeys[key] = {'Value': primaryKeys[key]}
	}

	var req = {
		'TableName': table,
		'Key': primaryKeys,
		'Expected': expectedKeys
	}
	clients[client].deleteItem(req, cb, dynamo.helpers.primaryKeys(schema))
}

//batch delete
dynamo.batchDeleteObj = function(client, table, schema, kvArray, cb){
	var reqs = []
	for (var i = 0; i < kvArray.length; i++) {
		(function(i){
			reqs.push(function(cb){
				dynamo.deleteObj(client, table, schema, kvArray[i], function(err){
					if(err){
						cb(err)
						return console.log("batch delete error: "+err)	
					}
					cb(false)
				})
			})
		})(i);
	}
	async.parallel(reqs, cb)
}

module.exports = dynamo;