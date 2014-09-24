$(document).ready(function(){
	var chatContainer = $("#chatContainer"),
	chatMessageText = $(".chatMessageText"),
	chatEntryInput = $("#chatEntryContainer .chatEntryInput"),
	chatInputTolerance = 2,
	chatScroll = true;

	chatContainer.on("mouseover", function(){
		var self = $(this)
		if(self.is(":visible")){
			// chatScroll = false;

			chatContainer.removeClass("noBG")

			if(!self.hasClass("selected")){
				var inputPosition = chatEntryInput.offset(),
				inputWidth = chatEntryInput.width(),
				inputHeight = chatEntryInput.height()

				// console.log("input position:")
				// console.log(inputPosition)
				// console.log("input dim: "+inputWidth+" "+inputHeight)
				// console.log("mouse coords: "+mouseX+" "+mouseY)

				if(!helpers.spatial.pointBoxCollision(mouseX, mouseY, inputPosition.left-chatInputTolerance, inputPosition.top-chatInputTolerance, inputWidth+2*chatInputTolerance, inputHeight+2*chatInputTolerance)){
					self.data("lastPos", self.offset());
					self.hide()
				}
			}
		}
	})

	chatMessageText.on("mouseover", function(){
		chatScroll = false;
		// chatContainer.removeClass("noBG")
	})
	chatMessageText.on("mouseout", function(){
		chatScroll = true;
	})
	// chatMessageText.on("mousescroll", function(){
	// 	console.log("trying to scroll")
	// })

	chatEntryInput.on("focus", function(e){
		if(!chatContainer.hasClass("selected")){
			chatContainer.addClass("selected")
		}
	})
	chatEntryInput.on("blur", function(e){
		if(chatContainer.hasClass("selected")){
			chatContainer.removeClass("selected")
		}
	})
	chatEntryInput.on("mouseover", function(){
		chatContainer.removeClass("noBG")
	})
	chatEntryInput.on("mouseout", function(){
		chatContainer.addClass("noBG")
	})

	chatContainer.on("mouseout", function(){
		chatContainer.addClass("noBG")
	})

	var reShowChatContainer = function(){
		if(!chatContainer.is(":visible")){
			var position = chatContainer.data("lastPos"),
			width = chatContainer.width(),
			height = chatContainer.height()

			// console.log("mouse coords: "+mouseX+" "+mouseY)
			// console.log("chat coords: "+position.left+" "+position.top)

			if(!helpers.spatial.pointBoxCollision(mouseX, mouseY, position.left, position.top, width, height)){
				chatContainer.show()
				// chatContainer.addClass("noBG")
			}
		}
		
		setTimeout(reShowChatContainer, 500)	
	}

	setTimeout(reShowChatContainer, 500)

	var cmt = $(".chatMessageText")

	var genText = function(){
		cmt.append("chat_dude1>sample message"+Math.floor(Math.random()*1000)+"<br>");
		if(chatScroll === true){
			cmt.scrollTop(cmt.prop("scrollHeight"))	
		}
	}

	setInterval(genText, 2000) 
})