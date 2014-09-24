//webworker-like safe javascript worker sandbox
//designed to be run as a separate nodejs process
//not a thread, so that memory is not shared, and therefore memory leaks and cpu leaks do not take out the root process

//filter harmful globals that show up in arbitrary function definitions
//node globals are defined here: http://nodejs.org/api/globals.html#globals_global_objects
var security = "\"use strict\";\
var global\
, process\
, Buffer\
, console\
, setTimeout\
, clearTimeout\
, setInterval\
, clearInterval\
, JSON\
, Function\
, Object\
, Array\
, Number\
, String\
, Boolean\
, RegExp\
, Date\
, Error\
, EvalError\
, RangeError\
, ReferenceError\
, SyntaxError\
, TypeError\
, URIError\
;";

var funcs = {}

process.on('message', function(data) {
   	var data = JSON.parse(data)
   	, response = null

	switch(data[1]){	

		//ping a worker - if the ping does not return, terminate it
		case "ping":
			response = 1
			break;
		//load a func
		case "loadFunc":
			//command, func, code
				try{
					funcs[data[2]] = new Function("world", "self", security+data[3])	
					response = "compiled "+data[2]+" successfully"
				}catch(e){
					response = "compilation error: "+e;
				}
				
			break;
		//execute a func
		case "exec":
			//command, func, [params]
				if(!(data[2] in funcs)){
					response = "function "+data[2]+" not defined."	
					break;
				}

				try{
					response = "func response: "+JSON.stringify(funcs[data[2]].apply(undefined, data[3]))
				}catch(e){
					response = "execution error: "+e;
				}

			break;
	}

	if(response !== null){
		process.send(JSON.stringify([data[0], data[1], response]));
	}
});
