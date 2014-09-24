var funcs = {}
, security = "\"use strict\";\
var funcs\
, security\
, data\
, response\
, e\
, onmessage\
, postMessage\
, importScripts\
, addEventListener\
, dispatchEvent\
, removeEventListener\
, setTimeout\
, clearTimeout\
, setInterval\
, clearInterval\
, close\
, console\
, location\
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

onmessage = function(e){
	//got a message
	//[command, [params...]]

	var data = e.data
	, response = null

	switch(data[0]){	

		//ping a worker - if the ping does not return, terminate it
		case "ping":
			response = 1
			break;
		//load a func
		case "loadFunc":
			//command, func, code
				try{
					funcs[data[1]] = new Function("world", "self", security+data[2])	
					response = "compiled "+data[1]+" successfully"
				}catch(e){
					response = "compilation error: "+e;
				}
				
			break;
		//execute a func
		case "exec":
			//command, func, [params]
				if(!(data[1] in funcs)){
					response = "function "+data[1]+" not defined."	
					break;
				}

				try{
					response = "func response: "+JSON.stringify(funcs[data[1]].apply(undefined, data[2]))
				}catch(e){
					response = "execution error: "+e;
				}

			break;
	}

	if(response !== null){
		postMessage([data[0], response])	
		// postMessage([location.href])
	}
}