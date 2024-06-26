var MATTIE = MATTIE || {};
MATTIE.multiplayer = MATTIE.multiplayer || {};

// override the process move command function to record the last 20 commands
MATTIE.multiplayer.processMoveCmd = Game_Character.prototype.processMoveCommand;
Game_Character.prototype.processMoveCommand = function (command) {
	if (!this.last20Commands) this.last20Commands = [];
	if (this.last20Commands.length > 20) this.last20Commands.shift();
	this.last20Commands.push(command);
	MATTIE.multiplayer.processMoveCmd.call(this, command);
};

// override the force move route cmd to check if it hasnt alreay been run
MATTIE.multiplayer.forceMoveRoute = Game_Event.prototype.forceMoveRoute;
Game_Event.prototype.forceMoveRoute = function (moveRoute) {
	if (this.getValidMove(moveRoute)) { 
        MATTIE.multiplayer.forceMoveRoute.call(this, moveRoute); 
    } else {
		this._moveRouteForcing = false;
	}
	setTimeout(() => {
		this._moveRouteForcing = false;
	}, 15000);
};

/**
 * @description check if a move route has not already been performed
 * @param {*} moveRoute
 */
Game_Character.prototype.getValidMove = function (moveRoute) {
	if (moveRoute.list.every((obj) => obj.code === 0)) return true;

	if (!this.last20Commands) this.last20Commands = [];
	const last20Steps = this.last20Commands;

	if (last20Steps.every((obj) => obj.code === 0)) return true;
	const list = moveRoute.list;

	if (!list) {
		return true;
	}

	let found = false;
	// whether the move is a duplicate
	let validMove = last20Steps.length <= 0;
	let shouldContinue = true;

	let foundOnce = false;
	for (let index = last20Steps.length - 1; index > 0 && !found; index--) {
		const element = last20Steps[index];
		// go from the back of the list to the front till we find a code identical to the last code of our list
		if (element.code === list[list.length - 1].code) {
			found = true;
			foundOnce = true;

			let k = list.length - 1;
			const tolerance = 1;
			let misses = 0;
			let hits = 0;

			while (shouldContinue) {
				if (k <= 0 && hits >= list.length - 1) {
					shouldContinue = false;
					validMove = true;
				} else {
					const currentElement = list[k];
					const historicalElement = last20Steps[index];

					if (currentElement.code != historicalElement) {
						misses++;
						if (misses >= tolerance) {
							shouldContinue = false;
							found = false;
							misses = 0;
							hits = 0;
						}
					} else {
						hits++;
					}

					index--;
					k--;
				}
			}
			shouldContinue = true;
		}

		if (foundOnce && index <= 0) {
			validMove = true;
		}
	}

	return validMove;
};

MATTIE.multiplayer.moveStraight = Game_CharacterBase.prototype.moveStraight;
Game_Event.prototype.moveStraight = function (d, callAnyways = false) {
	if (!MATTIE.multiplayer.inBattle) {
		if (MATTIE.multiplayer.isEnemyHost || callAnyways || this._moveRouteForcing) MATTIE.multiplayer.moveStraight.call(this, d);
		if (MATTIE.multiplayer.isEnemyHost && !callAnyways && !this._moveRouteForcing) {
			const obj = {};

			obj.mapId = this._mapId;
			obj.id = this.eventId();
			obj.x = this._x;
			obj.y = this._y;
			obj.realX = this._realX;
			obj.realY = this._realY;
			obj.d = d;
			const netController = MATTIE.multiplayer.getCurrentNetController();
			netController.emitEventMoveEvent(obj);
		}
	}
};

MATTIE.multiplayer.Game_EventCanPass = Game_Event.prototype.canPass;
Game_Event.prototype.canPass = function (x, y, d) {
	var res = MATTIE.multiplayer.Game_EventCanPass.call(this, x, y, d);
	if (this._trueLock) return false;
	return res;
};

// override the near screen function to check if it is within 10 of any player
Game_CharacterBase.prototype.isNearTheScreen = function () {
	var nearestPlayer = MATTIE.multiplayer.getNearestPlayer(this.x, this.y);
	var dis = Math.abs(this.deltaXFrom(nearestPlayer.x));
	dis += Math.abs(this.deltaYFrom(nearestPlayer.y));
	return dis < 10;
};
