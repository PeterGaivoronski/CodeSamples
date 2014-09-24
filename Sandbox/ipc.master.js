//sandbox controller. independent memory from child process allows the child to hoard cpu and ram and crash, leaving master alive.

//can restrict process cpu usage time using a timeout specified at worker creation
//can restrict max memory using node flags --max_old_space_size=3000 --max_new_space_size=3000 --max_executable_size=1000 (in megabytes)

var spawn = require('child_process').spawn

var commandLoop = 800000

var ProcessWorker = function(script, timeout){
	this.script = script
	this.proc = this.spawn(this.script)
	this.timeout = timeout || 100;
	this.commandsIssued = {}
	this.lastCommandIssued = 0
	this.commandLoops = 0
}
ProcessWorker.prototype.spawn = function(script){
	var self = this

	var proc = spawn('nodejs', ['--max_old_space_size=30', '--max_new_space_size=30', '--max_executable_size=30', script], {
		cwd: __dirname
		, env: process.env
		, stdio: [null, null, null, 'ipc']
	})
	proc.on("message", function(m){
		// console.log("got a message from worker: ", m)
		self.onmessage({
			data: JSON.parse(m)
		})
	})
	return proc
}
ProcessWorker.prototype.postMessage = function(arr){
	try{
		//record command number and add to command
		var commandNumber = this.lastCommandIssued
		, self = this

		this.commandsIssued[commandNumber] = 1
		arr.unshift(commandNumber)
		//increment command number
		this.lastCommandIssued = (this.lastCommandIssued + 1) % commandLoop
		if(this.lastCommandIssued === 0) this.commandLoops += 1;

		//send command to worker
		this.proc.send(JSON.stringify(arr))

		//set timeout for the command
		setTimeout(function(){
			if(commandNumber in self.commandsIssued){
				//command timed out
				self.commandsIssued = {}
				self.kill()
				console.log('process timed out, restarted.')
			}
		}, this.timeout)
	}catch(e){
		console.log('process already dead, restarting.', e)
		this.kill()
	}
}
ProcessWorker.prototype.kill = function(){
	this.proc.kill('SIGKILL')
	this.proc = this.spawn(this.script)
	console.log("process killed and restarted.")
}


var startWorker = function(script, timeout){
	var worker = new ProcessWorker(script, timeout)
	worker.onmessage = function(m){
		//remove command from timeout check list
		delete this.commandsIssued[m.data[0]]

		//process command
		switch(m.data[1]){
			default:
				console.log("worker response: ", m)
				break;
		}
	}
	return worker;
}


//////////////
//start script

var restrictedWorkerScript = 'ipcworker.js'
, restrictedWorker = startWorker(restrictedWorkerScript, 2000)

// var func = "var a = [1, 2, 3]; while(1){a = [a, a]}"
var func = "var a = 5; return a;"
, scriptname = "aaa"
, scriptargs = [1, 2]

restrictedWorker.postMessage(["loadFunc", scriptname, func])

restrictedWorker.postMessage(["exec", scriptname, scriptargs])