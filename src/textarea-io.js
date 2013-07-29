(function(undefined) {
	
	function TextArea (elem, options) {
		this.options = options == undefined ? {} : options;
		this.callbackQueue = [];
		this.inputQueue = [];
		this.element = elem;
		this._history = "";
		this.separator = this.options.separator == undefined ? "\n" : this.options.separator;

		elem.addEventListener("textarea-io-put", function(e) {
			this.element.value += e.value;
		});	
		this._currentBuf = "";
		var _t = this;
		elem.onkeydown = function(e) {
			if (e.which == 8 && _t._currentBuf.length == 0) {
				return false;
			} else if (e.which == 8) {
				_t._currentBuf = _t._currentBuf.substr(0, _t._currentBuf.length - 1);
				elem.value = _t._history + _t._currentBuf;
				return false;
			}
			if (e.which >= 37 && e.which <= 40) {
				return false;
			}
			if (e.which == 13) {
				_t._put(_t._currentBuf);
				_t._history += _t._currentBuf + _t.separator;
				_t._currentBuf = "";
				elem.value = _t._history;
			}
			return true;
		}
		elem.onkeyup = function(e) {
			return false;
		}
		elem.onkeypress = function(e) {
			if (e.which >= 32) {
				_t._currentBuf += String.fromCharCode(e.which);
				elem.value = _t._history + _t._currentBuf;
			}
			return false;
		}
		elem.onmousedown = function(e) {
			var temp = this.value;
			this.value = "";
			this.value = temp;
			elem.focus();
			return false;
		}
		elem.onselectstart = function() {
			return false;
		}
	}

	TextArea.prototype.Put = function(str) {
		this.element.value += str;
		this._history += str;
	}

	TextArea.prototype.Clear = function() {
		this.element.value = "";
		this._currentBuf = "";
		this._history = "";
	}

	var getCharFromFifo = function(fifo) {
		while (true) {
			if (fifo.length == 0) {
				return null;
			}
			current = fifo[0]
			if (current.length == 0) {
				fifo.splice(0, 1);
				continue;
			}
			toReturn = current.substr(0, 1)
			fifo[0] = current.substr(1, current.length - 1)
			return toReturn
		}
	}

	TextArea.prototype._put = function(val) {
		val = val + this.separator;
		this.inputQueue.push(val)
		if (this.callbackQueue.length != 0) {
			currentCall = this.callbackQueue[0];
			this.callbackQueue.splice(0, 1);
			this._processCallback(currentCall)
		}
	}

	TextArea.prototype._processCallback = function(currentCall) {
		var toGive = null;
		if (currentCall.mode == "num") {
			var toGive = parseInt(this.inputQueue[0]);
			if (!toGive && toGive != 0) {
				toGive = { err: "Error: Could not parse the input as a number" };
			}
			this.inputQueue.splice(0, 1);
			setTimeout(currentCall.callback, 0, toGive);
		} else if (currentCall.mode == "char") {
			var toGive = getCharFromFifo(this.inputQueue);
			if (toGive == null) {
				return; //putting empty value
			} else {
				setTimeout(currentCall.callback, 0, toGive);
			}
		} else if (currentCall.mode == "line") {
			var toGive = this.inputQueue[0];
			this.inputQueue.splice(0, 1);
			setTimeout(currentCall.callback, 0, toGive);
		}
	}

	//Possible modes:
	//"line": read an entire line, with separator at the end
	//"char": read one character at a time, separator character will be read
	//"num": read a number, no separator character will be send
	TextArea.prototype.Get = function(callback, mode) {
		if (callback == undefined) {
			throw "Error: must provide a callback to Get"
		}
		var type = mode == undefined ? "line" : mode;
		if (this.callbackQueue.length == 0) {
			this.callbackQueue.push({ callback: callback, mode: mode });
		} else {
			this._processCallback({ callback: callback, mode: mode })
		}
	}

	window.TextAreaIO = TextArea;
})();