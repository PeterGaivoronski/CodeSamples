var P = require("pjs").P
var uuid = require("node-uuid")
var async = require("async")

var ServerInfo = require("./ServerInfo.js")

var NetStorage = ServerInfo.NetStorage

var ObjectReference = ServerInfo.ObjectReference

var BaseModel = P(function(Proto, Super, Class){

	//***************
	//Definitions
	//***************

	Class.table = "classTable"
	Class.hashField = "groupID"
	Class.rangeField = "thisID"
	Class.storageType = "static"

	//how to tell if updating the object in the db will have no effect. 
	//for example: when a card's life is 0 or below, updating its life has no effect, because it is already dead.
	Class.validator = function(data){
		return true;
	}

	Class.schema = {
		//defaultVal - value to load if none provided
		//class - (for children) the class of objects to load into this field

		//{'field': {type: 'string', default: 'hi'}}
	}

	//an object of arrays that define various ways that the class can be serialized
	Class.views = {
		//'fullDB': ['groupID', 'thisID'],
		//'fullClient': ['groupID', 'thisID']
	}

	Class.transferSchema = {

	}

	//***************
	//Static Methods
	//***************

	Class.generatePrimaryKey = function(hashID, rangeID){
		var key = {}
		key[this.hashField] = hashID
		key[this.rangeField] = rangeID
		return key
	}

	//fetch all of this type of object with a certain hash key
	Class.queryAllDB = function(hashField, hashID, fields, index, parse, cb, storageType){
		var primaryKey = {}
		, storageType = storageType || this.storageType
		primaryKey[hashField] = {op: 'EQ', values: [hashID]}
		NetStorage.queryObj(storageType, this.table, this.schema, primaryKey, index, fields, false, parse, cb)
	}

	//count the number of this type of object with a certain hash key
	Class.countDB = function(hashField, hashID, index, cb, storageType){
		var primaryKey = {}
		, storageType = storageType || this.storageType
		primaryKey[hashField] = {op: 'EQ', values: [hashID]}
		console.log("count db request")
		console.log(arguments)

		NetStorage.queryObj(storageType, this.table, this.schema, primaryKey, index, "count", false, false, cb)
	}

	//return a boolean that shows whether an object of this type exists with a given primary key
	Class.existsDB = function(hashID, rangeID, cb, storageType){
		var primaryKeys = {}
		, storageType = storageType || this.storageType
		primaryKeys[this.hashField] = {op: 'EQ', values: [hashID]}
		if(this.rangeField !== null) primaryKeys[this.rangeField] = {op: 'EQ', values: [rangeID]}

		NetStorage.queryObj(storageType, this.table, this.schema, primaryKeys, null, "count", false, false, function(err, count){
			if(err) return cb(err)
			var exists = false;
			if(count > 0){
				exists = true;
			}
			cb(false, exists)
		})
	}

	//return a boolean that shows whether an object of this type exists with a given secondary index
	Class.existsDBIndex = function(hashID, rangeField, rangeID, index, cb, storageType){
		var primaryKeys = {}
		, storageType = storageType || this.storageType

		primaryKeys[this.hashField] = {op: 'EQ', values: [hashID]}
		primaryKeys[rangeField] = {op: 'EQ', values: [rangeID]}
		NetStorage.queryObj(storageType, this.table, this.schema, primaryKeys, index, "count", false, false, function(err, count){
			if(err) return cb(err)
			var exists = false;
			if(count > 0){
				exists = true;
			}
			cb(false, exists)
		})
	}

	//load the raw representation of the object from the database, for parsing according to arbitrary schemas
	Class.loadRaw = function(hashID, rangeID, strong, cb, storageType){
		var storageType = storageType || this.storageType

		console.log("loading raw object from: ")
		console.log("table: "+this.table)
		console.log("primary key: ", this.generatePrimaryKey(hashID, rangeID))
		console.log("storage type: "+this.storageType)

		NetStorage.readObj(storageType, this.table, this.schema, this.generatePrimaryKey(hashID, rangeID), null, strong, false, cb)
	}

	//parse a raw db response according to this class's schema
	Class.parseRawResponse = function(data){
		return NetStorage.helpers.parseResponse(this.schema, data)
	}

	//parse a string value according to the field definition in the class schema
	Class.parseValue = function(property, value){
		if(!(property in this.schema)) return value;
		
		return NetStorage.helpers.parseValue(this.schema[property].type, value)
	}

	//***************
	//Instance Methods
	//***************

	Proto.hashID = null;

	Proto.init = function(properties){
		//shorthand for constructor
		this.objClass = this.__proto__.constructor

		this.loadDefaults()
		//load properties if the hashField is provided in them.
		if(this.objClass.hashField in properties){
			this.load(properties)
		}
	}

	Proto.genUUID = function(){
		return uuid.v4()
	}

	Proto.loadDefaults = function(){
		var propertyValue;
		for(var property in this.objClass.schema){
			//null by default
			propertyValue = null;
			//load in defaults
			if(typeof this.constructor.schema[property].defaultVal !== "undefined"){
				switch(this.constructor.schema[property].defaultVal){
					case "newObject":
						propertyValue = {}
						break;
					case "newArray":
						propertyValue = []
						break;
					case "newNull":
						propertyValue = null
						break;
					default:
						propertyValue = this.constructor.schema[property].defaultVal
						break;
				}
			}
			this[property] = propertyValue
		}
	}

	Proto.load = function(properties){
		if(!(this.objClass.hashField in properties)){
			console.log("error: cannot load object without hash field")
			return false;
		}
		console.log("load called")
		console.log(this)
		console.log(properties)
		var propertyValue
		, propObj = {}
		, property;
		for(property in this.objClass.schema){
			//generate range ID if it does not exist
			if(property === this.objClass.rangeField){
				if(typeof properties[property] === "undefined"){
					propObj[property] = {op: "SET", v: this.genUUID(properties)}
					continue;
				}
			}
			//if property exists
			if(property in properties){
				propObj[property] = {op: "SET", v: properties[property]}
			}
		}
		this.modifyLocal(propObj)
	}

	//create a db entry for a locally created object
	Proto.createDB = function(cb, storageType){
		var storageType = storageType || this.objClass.storageType
		
		NetStorage.storeObj(storageType, this.objClass.table, this.objClass.schema, this.serializeCreateDB(), cb)
	}

	//needed for changing a hashID or rangeID of a value.
	// Proto.replaceDB = function(updates, cb){
	// 	this.loadFromDB()
	// }

	//read a db entry into a newly created object
	Proto.loadFromDB = function(hashID, rangeID, strong, cb, storageType){
		var self = this
		, storageType = storageType || this.objClass.storageType

		NetStorage.readObj(storageType, this.objClass.table, this.objClass.schema, this.constructor.generatePrimaryKey(hashID, rangeID), null, strong, true, function(err, data){
			if(err) return cb(err)
			if(Object.keys(data).length === 0) return cb("NotFound")

			console.log("load object from DB")
			console.log(data)

			self.load(data)
			cb(false)
		})
	}

	Proto.modify = function(updates, cb){
		var self = this;

		//first update the database if needed
		var dbUpdateNeeded = false, field;
		for(field in updates){
			if(self.objClass.views['fullDB'].indexOf(field) !== -1){
				dbUpdateNeeded = true;
				break;
			}
		}
		if(dbUpdateNeeded){
			self.updateDB(updates, function(err){
				//update the local values
				self.modifyLocal(updates)
				cb(err)
			})
		}else{
			self.modifyLocal(updates)
		}
	}

	Proto.modifyLocal = function(updates){
		// console.log(updates)
		var command
		, value

		for(var field in updates){
			command = updates[field]

			//don't add if undefined
			if(typeof command.v === "undefined") continue;

			value = this.objClass.parseValue(field, command.v)

			switch(command.op){
				case "SET":
					this[field] = value
					break;
				case "ADD":
					this[field] += value
					break;
				case "MUL":
					this[field] *= value
					break;
			}
		}
	}

	//update the db entry associated with the current object
	Proto.updateDB = function(updates, cb, storageType){
		var primaryKeys = this.constructor.generatePrimaryKey(this[this.objClass.hashField], this[this.objClass.rangeField])
		, storageType = storageType || this.objClass.storageType

	    var expected = JSON.parse(JSON.stringify(primaryKeys))
		for(var field in updates){
			expected[field] = this[field]
		}
		NetStorage.updateObj(storageType, this.objClass.table, this.objClass.schema, primaryKeys, updates, expected, this.objClass.validator, cb)
	}

	//delete the db entry associated with the current object
	Proto.deleteDB = function(cb, storageType){
		var hashID = this[this.constructor.hashField]
		, rangeID = this[this.constructor.rangeField]
		, storageType = storageType || this.objClass.storageType
		
		NetStorage.deleteObj(storageType, this.objClass.table, this.objClass.schema, this.constructor.generatePrimaryKey(hashID, rangeID), cb)
	}

	Proto.loadChildrenDB = function(field, cb){
		var self = this,
		child, 
		childClass = ObjectReference[this.objClass.schema[field].class],
		primaryKey = {};

		primaryKey[this.objClass.hashField] = {op: 'EQ', values: [this[this.objClass.hashField]]}

		NetStorage.queryObj(childClass.table, childClass.schema, primaryKey, null, null, false, true, function(err, data){
			data.forEach(function(childData){
				child = childClass(childData)
				self[field][child[child.class.rangeField]] = child
			})
		})
	}


	//transfer info from a source object to this object, following this object's transfer schema
	Proto.transferInfo = function(source){
		var loadObj = {}
		for(var field in this.constructor.transferSchema){
			loadObj[field] = {op: "SET", v: source[this.constructor.transferSchema[field]] }
		}
		this.modifyLocal(loadObj)
	}

	Proto.serializeView = function(type){
		if(!(type in this.constructor.views)) return {};
		var self = this,
		data = {};

		self.constructor.views[type].forEach(function(field){
			data[field] = self[field]
		})
		return data;
	}

	Proto.serializeCreateDB = function(){
		var obj = this.serializeView("fullDB")
		for(var field in obj){
			if(obj[field] === "") delete obj[field] //empty strings not allowed
		}
		return obj
	}

	//***************
	//Network Handlers
	//***************

	//object of {field: regex} to validate inputs
	Proto.requireFields = function(fields, args, spark){
		for(var field in fields){
			//check for whether field is in args
			if(!(field in args)){
				spark.writeError("noRequiredField_"+field)
				return false;
			}
			//check for whether the field is correctly formatted
			if(!fields[field].test(args[field])){
				spark.writeError("invalidField_"+field)
				return false;
			}
			
		}
		return true;
	}

	Proto.baseHandler = function(commandList, reqList, type, args, spark){

		var self = this;

		var command = type.split("/").slice(3)
		if(command.length === 0){
			commandFunc = commandList['_default']
		}else{
			var clist = commandList;
			for (var i = 0; i < command.length; i++) {
				if(command[i] in clist){
					
					//function is too early, command is invalid
					if(typeof clist === "object" && clist.length === 2){
						return spark.writeError("invalidAction")
					}

					//recurse downward
					clist = clist[command[i]]

					
				}else{
					//command not found in object
					return spark.writeError("unknownAction")
				}
			}
			if(typeof clist === "object" && clist.length === 2){
				//function found
				commandFunc = clist
			}else{
				//function not reached, command invalid
				return spark.writeError("invalidAction")
			}
		}
		//check if all required fields are entered
		if(!this.requireFields(commandFunc[0], args, spark)) return;
		//execute given function
		return commandFunc[1].prototype.constructor.call(self, type, args, spark)
		
	}

	//REST-like network handlers
	//request comes in as {type: '/create/[class]/other/params', args: {} }
	//passed into handler as { type: ['other', 'params', ... ], args: {} }

	Proto.createHandler = function(type, args, spark){
		if(!('createCommandList' in this)) return spark.writeError("unknownAction")
		return this.baseHandler(this.createCommandList, this.createReqFields, type, args, spark)
	}

	Proto.readHandler = function(type, args, spark){
		if(!('readCommandList' in this)) return spark.writeError("unknownAction")
		return this.baseHandler(this.readCommandList, this.readReqFields, type, args, spark)
	}

	Proto.updateHandler = function(type, args, spark){
		if(!('updateCommandList' in this)) return spark.writeError("unknownAction")
		return this.baseHandler(this.updateCommandList, this.updateReqFields, type, args, spark)
	}

	Proto.deleteHandler = function(type, args, spark){
		if(!('deleteCommandList' in this)) return spark.writeError("unknownAction")
		return this.baseHandler(this.deleteCommandList, this.deleteReqFields, type, args, spark)
	}


})

module.exports = BaseModel