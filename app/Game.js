const { ipcRenderer } = require('electron');

// Planet Rendering
// The offscreen canvas creates a gl context as opposed to a 2d context which allows us to perform shaders,
// which is essentially hardware accelleration which we use to filter out the background of planet renders.
// Then, we take this webGL context and render it, 10 times per second, to a 2d context which caches
// the final planet render, which is then rendered to the 2d canvas buffer, which is the main game render.
var offScreenPlanetCanvas = document.createElement('canvas');
var offscreenPlanetGl = offScreenPlanetCanvas.getContext('webgl') || offScreenPlanetCanvas.getContext('experimental-webgl');
var shaderPlanetCanvas = document.createElement('canvas');
var shaderPlanetCtx = shaderPlanetCanvas.getContext('2d');

var offscreenStarCanvas = document.createElement('canvas'); // For rendering the stars in webgl to perform shading
var starGl = offscreenStarCanvas.getContext('webgl') || offscreenStarCanvas.getContext('experimental-webgl');
var renderStarCanvas = document.createElement('canvas'); // For rendering the stars back to a 2d image context
var renderStarCtx = renderStarCanvas.getContext('2d');

function Game()
{
	//Tracked Data
	var score = 0;
	var enemyPoints = 0;
	var enemiesKilled = 0;
	var itemsUsed = 0;
	var totalCores = 0;
	
    this.gameLoop = null;
    var self = this;
    var gameState = 0;
    var levelStart = false;
    var debug = false;
	var playerInfo = false;
	var masterBGMVolume = 0.2;
	var bossPhase = -1;
    var postProcessing = {bloom: false}
	
	//GUI Info
	var currentGui = 0;
	var lastGui = 0;
	var NULL_GUI_STATE = 8;// Should always be above current state limit
	//State GUIs
	// 0 = Main Menu
	// 1 = Pause Menu
	// 2 = Level Up Menu
	// 3 = Continue Menu
	// 4 = Level Up Menu
	// 5 = Game Over Menu
	// 6 = Options Menu
	// 7 = Submit Score Menu
	//Non-State Guis
	// Debug
	// Life & other ingame info(can't be on any state gui's)
    
	//Input Info
	var mouseX = 0;
	var mouseY = 0;
    var keysDown = {};
	var gamepads = {};
    var hasControllerInput = false;
    var gamepadLeft = false;
    var gamepadRight = false;
    var gamepadUp = false;
    var gamepadDown = false;
    var gamepadA = false;
    var gamepadB = false;
    var gamepadStart = false;
	
	//Options
	var particleOffset = 5;
	
    // Timing
    var prevTime = Date.now();
    var delta = 0;
    var elapsedTime = 0;
    var frame = 0;
    var FPS = 0;
    var tickTime = 0;
    var ticks = 1;
    var seconds = 0;
    var paused = false;

    // Asset Information
    var starTypes = 10;

    // Context
    var _canvas = null;
    var _buffer = null;
    var canvas = null;
    var buffer = null;
    
    // Resources
	var imagesLoaded = false;
	this.loadedImage = function()
	{
		numImagesLoaded++;
		//console.log("Loaded image: " + numImagesLoaded + "/" + numOfImages);
		if(numImagesLoaded >= numOfImages) {
			imagesLoaded = true;
            starGeneration.initStars();
		} else {
			imagesLoaded = false;
		}
	}
	var numImagesLoaded = 0;
        // Graphics
        var starImages = [];
        for(var i = 0; i < starTypes; i++)
        {
            starImages[i] = new Image();
            starImages[i].addEventListener('load', self.loadedImage, false);
            starImages[i].addEventListener('error', function() {
                console.log('Error loading image: Graphics/Stars/star_' + i + '.png');
            });
            starImages[i].src = ('Graphics/Stars/star_' + i + '.png');
        }

        var portraitImages = [];
        for(var i = 0; i < 6; i++)
        {
            portraitImages[i] = new Image();
            portraitImages[i].addEventListener('load', self.loadedImage, false);
            portraitImages[i].addEventListener('error', function() {
                console.log('Error loading image: Graphics/NPC/portrait_' + i + '.png');
            });
            portraitImages[i].src = ('Graphics/NPC/portrait_' + i + '.png');
        }

        var fgImages = [];
        for(var i = 0; i < 12; i++) {
            fgImages[i] = new Image();
            fgImages[i].addEventListener('load', self.loadedImage, false);
            fgImages[i].addEventListener('error', function() {
                console.log('Error loading image: Graphics/Foreground/fg_' + i + '.png');
            });
            fgImages[i].src = ('Graphics/Foreground/fg_' + i + '.png');
        }
		
        var images = [];
        for(var i = 0; i < 14; i++)
        {
            images[i] = new Image();
			images[i].addEventListener('load', self.loadedImage, false);
            images[i].src = ('Graphics/GUI_0' + i + '.png');
        }
        
        var enemyImages = [];
        for(var i = 0; i < 21; i++)
        {
            enemyImages[i] = new Image();
			enemyImages[i].addEventListener('load', self.loadedImage, false);
            enemyImages[i].src = ('Graphics/ship_' + i + '.png');
        }
        
        var playerImages1 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages1[i] = new Image();
			playerImages1[i].addEventListener('load', self.loadedImage, false);
            playerImages1[i].src = ('Graphics/Player/ship1/normal/player_' + i + '.png');
        }

        var playerImages2 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages2[i] = new Image();
			playerImages2[i].addEventListener('load', self.loadedImage, false);
            playerImages2[i].src = ('Graphics/Player/ship2/normal/player_' + i + '.png');
        }

        var playerImages3 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages3[i] = new Image();
			playerImages3[i].addEventListener('load', self.loadedImage, false);
            playerImages3[i].src = ('Graphics/Player/ship3/normal/player_' + i + '.png');
        }

        var playerImages4 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages4[i] = new Image();
			playerImages4[i].addEventListener('load', self.loadedImage, false);
            playerImages4[i].src = ('Graphics/Player/ship4/normal/player_' + i + '.png');
        }

        var playerImages5 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages5[i] = new Image();
			playerImages5[i].addEventListener('load', self.loadedImage, false);
            playerImages5[i].src = ('Graphics/Player/ship5/normal/player_' + i + '.png');
        }

        var playerImages6 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages6[i] = new Image();
			playerImages6[i].addEventListener('load', self.loadedImage, false);
            playerImages6[i].src = ('Graphics/Player/ship6/normal/player_' + i + '.png');
        }

        var playerImages7 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages7[i] = new Image();
			playerImages7[i].addEventListener('load', self.loadedImage, false);
            playerImages7[i].src = ('Graphics/Player/ship7/normal/player_' + i + '.png');
        }

        var playerImages8 = [];
        for(var i = 0; i < 20; i++)
        {
            playerImages8[i] = new Image();
			playerImages8[i].addEventListener('load', self.loadedImage, false);
            playerImages8[i].src = ('Graphics/Player/ship8/normal/player_' + i + '.png');
        }
        
        var itemImages = [];
        for(var i = 0; i < 5; i++)
        {
            itemImages[i] = new Image();
			itemImages[i].addEventListener('load', self.loadedImage, false);
            itemImages[i].src = ('Graphics/item_0' + i + '.png')
        }

		var logoImages = [];
        for(var i = 0; i < 1; i++)
        {
            logoImages[i] = new Image();
			logoImages[i].addEventListener('load', self.loadedImage, false);
            logoImages[i].src = ('Graphics/Logo.png')
        }

	var numOfImages = (starImages.length + images.length + enemyImages.length + playerImages1.length + playerImages2.length + playerImages3.length 
        + playerImages4.length + playerImages5.length + playerImages6.length + playerImages7.length + playerImages8.length  
        + itemImages.length + logoImages.length + fgImages.length + portraitImages.length);
	
	
    // Containers
    var stars = [];
    var guiText = [];
    var missiles = [];
    var enemies = [];
    var explosions = [];
	var money = [];
	var randomItems = [];
    
	var NUM_OF_RANDOM_ITEMS = 4;
	//0 = Health
	//1 = Shield
	//2 = Secondary Ammo
	//3 = Cores
    
    // Scoring
    var destroys = 0;
	var totalDestroys = 0;
	var totalShots = 0;

    // Mechanics
    var shootSwap = false;
    var colSwap = true;
    var Keys = [0, 0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 0, 0];
    
    // World
    var numStars = 500;
	var numEnemies = 0;

    /******************************************************/
    // Listeners
    /******************************************************/

    addEventListener("keydown", function(e)
    {
        keysDown[e.keyCode] = true;
        keyPressed = e.keyCode;
    }, false);

    addEventListener("keyup", function(e)
    {
        keysDown[e.keyCode] = false;
    }, false);
	
	addEventListener("mousemove", function(e){
        getMousePos(_canvas, e);
    }, false);
    
	addEventListener("click", doMouseClick, false);
    
   //Sound Event Listener	
	document.querySelector("#bgm_square").addEventListener("ended",swapBGM,false);
	document.querySelector("#bgm_fast").addEventListener("ended",swapBGM,false);
	document.querySelector("#bgm_soar").addEventListener("ended",swapBGM,false);
	document.querySelector("#bgm_dorian").addEventListener("ended",swapBGM,false);
	document.querySelector("#bgm_euphoria").addEventListener("ended",swapBGM,false);
	document.querySelector("#bgm_energy").addEventListener("ended",swapBGM,false);
	//Error Detection
	document.querySelector("#bgm_square").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_fast").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_soar").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_dorian").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_euphoria").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_energy").addEventListener("error",swapBGM,false);

    // Event listener for gamepad connection
    window.addEventListener("gamepadconnected", (e) => {
        console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}.`);
        gamepads[e.gamepad.index] = e.gamepad;
        hasControllerInput = true;
    });

    // Event listener for gamepad disconnection
    window.addEventListener("gamepaddisconnected", (e) => {
        console.log(`Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}.`);
        delete gamepads[e.gamepad.index];
        hasControllerInput = false;
    });
    
    /******************************************************/
    // Global Functions
    /******************************************************/

    this.InitSounds = function()
    {
        gco.bgm = document.getElementById('bgm_square');
        gco.init_audio();
        sfx.Init();
    }
	
	this.RefreshSoundsOnGameLoss = function()
	{
		gco.bgm = document.getElementById('bgm_square');
		gco.init_audio();
	}
	
	this.isEnemyAlive = function(enemyNumber)
	{
		for(var i = 0; i < enemies.length; i++)
		{
			if(enemies[i].enemyNum == enemyNumber && enemies[i].life > 0)
			{
				return true;
			}
		}
		return false;
	}
	
	this.getEnemy = function(enemyNumber)
	{
		for(var i = 0; i < enemies.length; i++)
		{
			if(enemies[i].enemyNum == enemyNumber)
			{
				return enemies[i];
			}
		}
	}
   
    this.hardReset = function()
    {
        paused = false;
        currentGui = 0;
        gameState = 0;
        missiles = [];
		enemies = [];
		explosions = [];
		money = [];
		randomItems = [];
		totalDestroys = 0;
		destroys = 0;
        player.life = 100;
		player.resetShield();
		player.recharge = true;
		totalShots = 0;
        player = new player(24, 40);
        if (player.ship == 8) new player(40, 40);
		gco.bgm.pause();
		gco = new GameControlObject();
		gco.Init();
        menu = new Menu();
        menu.Init()
		sfx.pause(1);
		self.RefreshSoundsOnGameLoss();
		enemyGeneration = new EnemyGeneration();
    }
	
    this.softReset = function()
    {
        missiles = [];
        enemies = [];
        explosions = [];
        money = [];
        randomItems = [];
        totalDestroys += destroys;
        destroys = 0;
        player.life = 100;
        totalShots += player.totalMissiles;
        player.totalMissiles = 0;
        player.x = _buffer.width / 2;
        player.y = _buffer.height + player.height / 2;
        gco.ResetFuel();
        gco.GoToUpgradeMenu();
        player.resetShield();
        sfx.pause(1);//Pause laser sound on round end
        enemyGeneration.hasBoss = false;
    }
    
    this.popArray = function(Array, popThis)
    {
        for(var i = popThis; i < Array.length - 1; i++)
        {
            Array[i] = Array[i + 1];
        }
        Array.pop();
    }
	
	this.checkAllSoundsPaused = function()
	{
		if( document.getElementById('bgm_square').paused &&
			document.getElementById('bgm_fast').paused &&
			document.getElementById('bgm_soar').paused &&
			document.getElementById('bgm_dorian').paused && 
			document.getElementById('bgm_boss').paused &&
			document.getElementById('bgm_euphoria').paused &&
			document.getElementById('bgm_energy').paused
		){ return true;}
		return false;
	}

    this.clamp = function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    /******************************************************/
    
    
    /******************************************************/
    // Objects
    /******************************************************/
	
    function GameControlObject()
    {
        this.level = 1; // Starting at 1
        this.win = false;
        this.enemiesKilled = []; // [enemyNum] = 126
        this.weaponsOwned = []; // [weaponNum] = true
        this.weaponPrice = []; // [weaponNum] = 486 (cores)
        this.ownLaser = false;
        this.laserPrice = 1000;
        this.levelProgress = 0.0; // Percentage
        this.levelMission = new LevelMission();
        this.extras = [];
        this.extraPrices = [];
        this.fuelLevel = 1;
        this.onTick = 0;
        this.missionText = [];
        this.secondaryAmmoPrice = 25;
        this.bgm = null;
        this.playingBossMusic = false;
        
        this.bossX = 0; // Final Boss X set when boss dies
        this.bossY = 0; // Final Boss Y set when boss dies
        
        this.credits = new Credits();
        this.story = new Story();
        this.playStory = false;
        
        this.mustPurchasePrevious = 0;
        this.notEnoughCores = 0;
        
        this.Init = function() {
            this.levelMission.GenerateObjectives();
            
            this.weaponsOwned[0] = true;//Primary Assult
            this.weaponsOwned[1] = false;//Rapid Fire Assult
            this.weaponsOwned[2] = false;//Rapid Fire Cyclone
            this.weaponsOwned[49] = true;//Null Weapon
            this.weaponsOwned[50] = true;//SD-15 Sidewinder
            this.weaponsOwned[51] = false;//DM-21 Auto Strike
            this.weaponsOwned[52] = false;//Impact Burst Mine
            
            this.weaponPrice[0] = 0;//Primary Assult
            this.weaponPrice[1] = 150;//Rapid Fire Assult
            this.weaponPrice[2] = 500;//Rapid Fire Cyclone
            this.weaponPrice[50] = 0;//SD-15 Sidewinder
            this.weaponPrice[51] = 250;//DM-21 Auto Strike
            this.weaponPrice[52] = 500;//Impact Burst Mine
        }
        
        this.init_audio = function() {
            if(this.bgm.currentTime) {
                this.bgm.currentTime = 0;
            }
            this.bgm.volume = masterBGMVolume;
            this.bgm.play();
        }
        
        this.CheckLevelCompletion = function() {
            if(this.levelMission.CheckCompletion()) {
                this.level += 1;
                this.levelMission.ResetObjectives();
                player.life = 100;
                player.resetShield();
            }
        }
        
        this.PurchaseWeapon = function(wepID) { //assumes player has the cash/doesn't own weapon
            if(wepID < 9000) {
                if(wepID > 49) {
                    if(this.weaponsOwned[wepID - 1]) {
                        this.weaponsOwned[wepID] = true;
                        player.money -= this.weaponPrice[wepID];
                        this.EquipWeapon(wepID);
                    } else {
                        this.mustPurchasePrevious = 1000;
                    }
                } else {
                    if(wepID - 1 < 0) {
                        this.weaponsOwned[wepID] = true;
                        this.EquipWeapon(wepID);
                    } else {
                        if(this.weaponsOwned[wepID - 1]) {
                            this.weaponsOwned[wepID] = true;
                            player.money -= this.weaponPrice[wepID];
                            this.EquipWeapon(wepID);
                        } else {
                            this.mustPurchasePrevious = 1000;
                        }
                    }
                }
            } else {
                if(this.weaponsOwned[52]) {
                    this.ownLaser = true;
                    player.money -= gco.laserPrice;
                    this.EquipWeapon(wepID);
                } else {
                    this.mustPurchasePrevious = 1000;
                }
            }
        }
        
        this.EquipWeapon = function(wepID) {
            if(wepID > 48) {
                player.secondary = wepID;
            } else {
                player.weapon = wepID;
            }
        }
        
        this.PurchaseExtras = function(itemNumber) {
            switch(itemNumber) {
                case 0: { // Shield
                    player.money -= (player.shieldLevel + 1) * 250;
                    player.upgradeShield();
                    break;
                }
                case 1: { // Fuel
                    break;
                }
                case 2: { // Secondary Ammo Level
                    player.money -= (player.secondaryAmmoLevel + 1) * 50;
                    player.upgradeSecondaryAmmo();
                    break;
                }
                case 3: { // Extra Secondary Ammo
                    player.money -= this.secondaryAmmoPrice;
                    player.secondaryAmmo += 25;
                    if(player.secondaryAmmo > player.maxSecondaryAmmo){player.secondaryAmmo = player.maxSecondaryAmmo;}
                    break;
                }
            }
        }
        
        this.ResetFuel = function() {
            let fuelMultiplier = 60; // Base: 60
            player.currentFuel = this.fuelLevel * fuelMultiplier;
        }
        
        this.GoToUpgradeMenu = function() {
            currentGui = 2;//Go to upgradeMenu
            gameState = 0;//Take game out of live mode
            menu.delayNextInput();
            playerInfo = false;
            this.levelProgress = this.levelMission.GetCompletionPercent();
            this.CheckLevelCompletion();
            sfx.pause(1);
        }
        
        this.StartLevel = function() {
            currentGui = NULL_GUI_STATE;//default case will Trigger
            gameState = 1;//Put Game in live mode
            if(this.level > 5 && !this.playingBossMusic) {
                this.playingBossMusic = true;
                this.bgm.pause();
                this.bgm = document.getElementById('bgm_boss');
                this.bgm.loop = true;
                this.init_audio();
            }
            ed.initEvent(1); // Fly in to level event
        }
        
        this.ShowContinueScreen = function() {
            player.lives -= 1;
            currentGui = player.lives < 0 ? 5 : 3; // Game Over or Continue
        }
        
        this.TogglePauseGame = function() {
            paused = !paused;
        }
        
        this.Update = function() {
            if(this.onTick != ticks) {
                this.onTick = ticks;
                if(!gco.win) {
                    if(this.onTick == 19 && player.isAlive() && this.level < 6) { // Update Fuel
                        if(player.currentFuel == 0) {
                            ed.initEvent(2); // Fly out of level event
                        }
                        player.currentFuel -= 1;
                    }
                } else {
                    if(Math.floor(Math.random() * 4) == 1) {
                        this.RandomBossExplosion();
                    }
                }
            }
        }

        this.goToLevelUpMenu = function() {
            menu.delayNextInput();
            currentGui = 4; // Go to level up menu
            gameState = 0;
        }
        
        this.RandomBossExplosion = function() {
            var randX = Math.floor(Math.random() * 51) - 25;
            var randY = Math.floor(Math.random() * 27) - 13;
            var R = Math.floor(Math.random() * 2);
            var G = Math.floor(Math.random() * 2);
            var B = Math.floor(Math.random() * 2);
            if(R == 1){R = 3} else {R = 0.1}; if(G == 1){G = 3} else {G = 0.1}; if(B == 1){B = 3} else {B = 0.1};
            explosion = new Explosion(this.bossX + randX, this.bossY + randY, 75, 4, 200, R, G, B);
            explosions.push(explosion);
            sfx.play(0);
        }
        
        this.EndStoryMode = function() {
            this.playStory = false;
            this.story = new Story();
        }
    }

    function EventDirector() {
        this.onTick = 0;
        this.activeEvent = 0; // 0 = No Active Event
        this.eventTime = 0;
        this.dialogue = new Dialogue();
        
        // Event variables other systems can watch or use
        this.moveMultiplierOne = 1;

        this.eventPlaying = function() { // Easy function for other game systems to query for event state
            return this.activeEvent !== 0;
        }

        this.initEvent = function(event) {
            this.activeEvent = event;
            if(this.activeEvent == 1) {
                this.eventTime = 60; // 3 Seconds
                player.y = _buffer.height + player.height;
                sfx.play(3);
            } else if(this.activeEvent == 2) {
                this.eventTime = 60; // 3 Seconds
                sfx.play(3);
            } else if(this.activeEvent == 3) {
                this.dialogue.initDialogueForLevel();
            }
        }

        this.endEvent = function() {
            this.activeEvent = 0;
        }

        this.Update = function() {
            if(ticks != this.onTick) {
                this.onTick = ticks
                if (this.eventTime > 0) this.eventTime--; // For time based events, this controls the time of the event in 50ms increments
            }
            // Event Updates
            if(this.activeEvent == 1) this.levelIntroUpdate();
            if(this.activeEvent == 2) this.levelOutroUpdate();
            if(this.activeEvent == 3) this.levelDialogue();
        }

        // Event 1
        this.levelIntroUpdate = function() {
            this.moveMultiplierOne = this.eventTime * 5
            if(this.moveMultiplierOne < 1) this.moveMultiplierOne = 1;

            // Nearly working example
            // Constants
            let endY = _buffer.height / 2;  // Target: middle of the screen
            let startY = player.y;  // Start: below the screen
            let totalDistance = startY - endY / 2; // Total distance to travel

            // Calculate normalized time t based on eventTime
            let normalizedTime = (60 - this.eventTime) / 60;
            normalizedTime = Math.max(0, Math.min(1, normalizedTime)); // Ensure it's between 0 and 1

            // Speed calculation using the derivative of the cubic easing function
            // Speed should be proportional to the derivative of the easing function times the total distance
            let speed = -3 * Math.pow(1 - normalizedTime, 2) * totalDistance / 3; // Total duration is 3 seconds

            // Update player.y by speed adjusted for delta
            player.y += speed * delta;  // Use += since speed will be negative, moving the player up

            if(this.eventTime <= 0) {
                this.endEvent();
                if(!this.dialogue.didDialogueForLevel()) {
                    this.initEvent(3)
                }
            }
        }

        // Event 2
        this.levelOutroUpdate = function() {
            // Star movement multiplier calculation for event
            let t = 60 - this.eventTime;  // Converts countdown to count up from 0 to 60
            if (t <= 20) { // First second: ramp up from 1 to 300, Linear interpolation from 1 to 300 over 20 units of time
                this.moveMultiplierOne = 1 + (299 * (t / 20));
            } else if (t <= 40) { // Second second: hold at 300
                this.moveMultiplierOne = 300;
            } else if (t <= 60) { // Third second: ramp down from 300 to 1, Linear interpolation from 300 to 1 over 20 units of time
                this.moveMultiplierOne = 300 - (299 * ((t - 40) / 20));
            } else { // Just in case, hold at 1 if something goes wrong
                this.moveMultiplierOne = 1;
            }

            // Calculate the ship's speed
            let speed;
            if (t <= 20) { // First second: ramp up from 0 to 500, Linear interpolation from 0 to 500 over 20 units of time
                speed = 500 * (t / 20);
            } else {
                speed = 500; // Hold speed at 500
            }

            // Player movement multiplier for event
            player.y -= speed * delta;

            // Enemy ship movement multiplier for event
            for(var i = 0; i < enemies.length; i++) { // Enemy Update Ticks
                enemies[i].y += speed * delta;
            }

            // Other items screen exit
            for(var i = 0; i < money.length; i++) { // Money Item Updates
                money[i].y += speed * delta;
            }
            for(var i = 0; i < randomItems.length; i++) { // Random Item Updates
                randomItems[i].y += speed * delta;
            }

            if(this.eventTime <= 0) {
                if(gco.levelMission.CheckCompletion()) {
                    gco.goToLevelUpMenu()
                } else {
                    self.softReset();
                    gco.GoToUpgradeMenu();	
                }
                this.endEvent();
            }
        }

        // Event 3
        this.levelDialogue = function() {
            if(this.dialogue.isFinished()) {
                this.endEvent();
            } else {
                this.dialogue.Update();
            }
        }

        this.Draw = function() {
            if(this.activeEvent == 3) {
                this.dialogue.Draw();
            }
        }

        this.DoInput = function() {
            if(this.activeEvent == 3) {
                this.dialogue.DoInput();
            }
        }
    }

    function Dialogue() {
        let onTick = 0;
        let dialogueForLevel = [false, false, false, false, false, false];
        let d = null;
        let lineIndex = 0;
        let lineText = "";
        let subTick = 0;
        let maxSubTick = 16;
        let playInitialSound = true;
        let percentageDone = 0;
        let timeout = 0;
        let dialogueFinished = false;

        this.isFinished = function() {
            return dialogueFinished;
        }

        this.didDialogueForLevel = function() {
            return dialogueForLevel[gco.level - 1];
        }

        this.initDialogueForLevel = function() {
            d = dialogues[gco.level - 1];
            dialogueForLevel[gco.level - 1] = true;

            // Reset all values controlling the dialogue progression
            dialogueFinished = false;
            lineIndex = 0;
            resetDialogueValues()
        }

        const resetDialogueValues = function() {
            subTick = 0;
            lineText = "";
            playInitialSound = true;
            percentageDone = 0;
        }

        this.Update = function() {
            // Determine the maximum sub-tick interval based on the character's voice type
            const characterVoiceType = d.lines[lineIndex].character;
            maxSubTick = [2, 5, 1, 3].includes(characterVoiceType) ? 10 : 16;
        
            if (ticks !== onTick) { // Ticks go 0-19 every second in 50 ms intervals
                onTick = ticks;
                subTick++;

                // Count down timeout
                if(timeout > 0) { timeout--; }

                // Read through the text, 1 letter at a time, into the rendered cache state
                if (lineText.length < d.lines[lineIndex].line.length) {
                    lineText += d.lines[lineIndex].line[lineText.length];  // Append next character
                }

                // Calculate the percentage of the line that has been displayed
                percentageDone = (lineText.length / d.lines[lineIndex].line.length) * 100;
        
                // Play sound effects based on the current tick interval and character's voice type
                if (percentageDone < 90) {
                    const midVoice = [0, 4].includes(characterVoiceType);
                    if (!midVoice && (playInitialSound || subTick % 10 === 0)) {
                        sfx.play([2, 5].includes(characterVoiceType) ? 4 : 6);
                    }
                    if (midVoice && (playInitialSound || subTick % 16 === 0)) {
                        sfx.play(5); // Mid dialogue text SFX for characters 0 and 4
                    }
                }

                if (subTick >= maxSubTick) subTick = 0; // Reset subTick
                playInitialSound = false;
            }
        }

        const Continue = function() {
            if(lineIndex == d.lines.length - 1) {
                dialogueFinished = true;
            } else {
                resetDialogueValues();
                lineIndex++;
            }
            
        }

        this.DoInput = function() {
            if(timeout > 0 || percentageDone < 99) return;
            timeout = 15;
            Continue();
        }

        this.Draw = function() {
            var dialogueBoxWidth = 500;
            var dialogueBoxHeight = 175;
            drawDialogueBox(dialogueBoxWidth, dialogueBoxHeight);
            drawCharacterPortrait(dialogueBoxWidth, dialogueBoxHeight);
            drawDialogueText(dialogueBoxWidth, dialogueBoxHeight);
            if(percentageDone > 99) {
                drawContinuePrompt(dialogueBoxWidth, dialogueBoxHeight);
            }
        }

        const drawDialogueBox = function(width, height) {
            // Calculate center position and dimensions
            var x = _buffer.width / 2;
            var y = _buffer.height - 130; // Positioned 110 pixels up from the bottom
            var radius = 20; // Radius for the rounded corners
        
            // Start drawing the dialogue box
            buffer.beginPath();
            buffer.moveTo(x - width / 2 + radius, y - height / 2); // Top-left corner
            buffer.arcTo(x + width / 2, y - height / 2, x + width / 2, y + height / 2, radius); // Top-right corner
            buffer.arcTo(x + width / 2, y + height / 2, x - width / 2, y + height / 2, radius); // Bottom-right corner
            buffer.arcTo(x - width / 2, y + height / 2, x - width / 2, y - height / 2, radius); // Bottom-left corner
            buffer.arcTo(x - width / 2, y - height / 2, x + width / 2, y - height / 2, radius); // Back to top-left corner
            buffer.closePath();
        
            // Create gradient
            var gradient = buffer.createLinearGradient(x, y - height / 2, x, y + height / 2);
            gradient.addColorStop(0, 'rgb(100, 149, 237)');
            gradient.addColorStop(1, 'darkblue');
            buffer.fillStyle = gradient;
            buffer.fill();
        
            // Draw border
            buffer.lineWidth = 4;
            buffer.strokeStyle = 'white';
            buffer.stroke();
        }

        const drawCharacterPortrait = function(dialogueBoxWidth, dialogueBoxHeight) {
            // Calculate dimensions and position
            var padding = 16; // Padding around the image
            var imageWidth = dialogueBoxHeight - (2 * padding); // Adjust for padding
            var imageHeight = imageWidth; // Maintain aspect ratio
            var x = (_buffer.width / 2) - (dialogueBoxWidth / 2) + padding; // Left position inside the dialogue box
            var y = _buffer.height - 130 - (dialogueBoxHeight / 2) + padding; // Vertical centering
            var borderRadius = 10; // Radius for rounded corners

            // Save the current state of the canvas context
            buffer.save();

            // Draw black background with rounded corners
            buffer.fillStyle = 'black';
            buffer.beginPath();
            buffer.moveTo(x + borderRadius, y);
            buffer.arcTo(x + imageWidth, y, x + imageWidth, y + imageHeight, borderRadius);
            buffer.arcTo(x + imageWidth, y + imageHeight, x, y + imageHeight, borderRadius);
            buffer.arcTo(x, y + imageHeight, x, y, borderRadius);
            buffer.arcTo(x, y, x + imageWidth, y, borderRadius);
            buffer.closePath();
            buffer.fill();

            // Clip the image area to rounded rectangle before drawing the image
            buffer.beginPath();
            buffer.moveTo(x + borderRadius, y);
            buffer.arcTo(x + imageWidth, y, x + imageWidth, y + imageHeight, borderRadius);
            buffer.arcTo(x + imageWidth, y + imageHeight, x, y + imageHeight, borderRadius);
            buffer.arcTo(x, y + imageHeight, x, y, borderRadius);
            buffer.arcTo(x, y, x + imageWidth, y, borderRadius);
            buffer.closePath();
            buffer.clip();

            // Draw image with shadow for emphasis
            buffer.shadowBlur = 1;
            buffer.shadowColor = 'rgb(0, 173, 239)';
            buffer.drawImage(portraitImages[d.lines[lineIndex].character], x, y, imageWidth, imageHeight);
            buffer.shadowBlur = 0;

            // Restore the context to remove the clipping path
            buffer.restore();

            // Draw border around the image with rounded corners
            buffer.strokeStyle = 'white';
            buffer.lineWidth = 4;
            buffer.beginPath();
            buffer.moveTo(x + borderRadius, y);
            buffer.arcTo(x + imageWidth, y, x + imageWidth, y + imageHeight, borderRadius);
            buffer.arcTo(x + imageWidth, y + imageHeight, x, y + imageHeight, borderRadius);
            buffer.arcTo(x, y + imageHeight, x, y, borderRadius);
            buffer.arcTo(x, y, x + imageWidth, y, borderRadius);
            buffer.closePath();
            buffer.stroke();
        }

        const drawDialogueText = function(dialogueBoxWidth, dialogueBoxHeight) {
            const fontSize = 28;
            const lineHeight = fontSize + 4;
            const padding = 16;
            const fontFamily = "VT323";
        
            // Assuming each character in VT323 at 28px is approximately 12px wide
            const charWidth = 12; // This value should be adjusted based on visual tests or accurate measurements
            const portraitWidth = dialogueBoxHeight - (2 * padding);
            const textAreaWidth = dialogueBoxWidth - portraitWidth - (3 * padding);
            const textX = _buffer.width / 2 - dialogueBoxWidth / 2 + portraitWidth + (2 * padding);
            const textY = _buffer.height - (dialogueBoxHeight + 28);
        
            const maxCharsPerLine = Math.floor(textAreaWidth / charWidth);

            // To see the background of the text uncomment the following
            // buffer.fillStyle = 'black';
            // buffer.fillRect(textX, textY, textAreaWidth, dialogueBoxHeight - (2 * padding));
            
            const words = lineText.split(' ');
            let currentLine = '';
            let currentY = textY;
            let guiText = [];
        
            words.forEach(word => {
                if ((currentLine + word + ' ').length > maxCharsPerLine) {
                    guiText.push(new GUIText(currentLine, textX, currentY, `${fontSize}px ${fontFamily}`, "left", "top", "white"));
                    currentLine = word + ' ';
                    currentY += lineHeight;
                } else {
                    currentLine += word + ' ';
                }
            });
        
            if (currentLine.trim()) {
                guiText.push(new GUIText(currentLine, textX, currentY, `${fontSize}px ${fontFamily}`, "left", "top", "white"));
            }
        
            guiText.forEach(text => {
                text.Draw(_buffer);
            });
        }

        const drawContinuePrompt = function(dialogueBoxWidth, dialogueBoxHeight) {
            const fontSize = 28; // Smaller font for the continue prompt
            const fontFamily = "VT323"; // Using the same monospaced font for consistency
            const padding = 12; // Padding inside the dialogue box
        
            // Calculate positions
            const textX = _buffer.width / 2 + dialogueBoxWidth / 2 - padding; // Right align the text within the dialogue box
            const textY = _buffer.height - padding; // Position at the bottom of the dialogue box
            const arrowX = textX - 100; // Position the arrow 70px to the left of the text
            const arrowY = textY - 12; // Slightly adjust the arrow position for vertical alignment
        
            // Create GUIText object for "Continue"
            const continueText = new GUIText("Continue", textX, textY, `${fontSize}px ${fontFamily}`, "right", "bottom", "white");
        
            // Draw the "Continue" text using GUIText.Draw method
            continueText.Draw();
        
            // Draw the green arrow using the predefined function
            menu.DrawArrow(3, arrowX, arrowY, 20); // Assuming `menu.DrawArrow` handles the drawing based on provided coordinates
        }

        // One dialogue per level
        let dialogues = [
            // Level 1
            {lines: [
                {character: 0, line: "Atha, we've reached the edge of the drone fleet."},
                {character: player.captain, line: "I can see that much, Sato..."},
                {character: player.captain, line: "...And how many times have I told you to call me Captain."},
                {character: 0, line: "We're at the edge of it all and that's what you're worried about...?"},
                {character: 1, line: "Focus! We have to push forward, it's the last shot we have to save everyone."},
                {character: 0, line: "You don't have to tell me twice, all systems go CAPTAIN!"},
                {character: player.captain, line: "Asshole... Ready yourself, here they come!"},
            ]},

            // level 2
            {lines: [
                {character: 0, line: "This is temporary level 2 dialogue..."},
            ]},

            // Level 3
            {lines: [
                {character: 0, line: "This is temporary level 3 dialogue..."},
            ]},

            // Level 4
            {lines: [
                {character: 0, line: "This is temporary level 4 dialogue..."},
            ]},

            // Level 5
            {lines: [
                {character: 0, line: "This is temporary level 5 dialogue..."},
            ]},

            // Level 6
            {lines: [
                {character: 0, line: "This is temporary boss level dialogue..."},
            ]},
        ]
    }

    function Menu()
    {
        this.states = []
        this.timeout = 5
        this.onTick = 0

        this.Init = function()
        {
            this.resetStates();

            // When testing a GUI for dev purposes, use the following to get to it immediately on the main game screen
            // setTimeout(() => { currentGui = 7; }, 1000)
        }

        this.resetStates = function()
        {
            //State GUIs
            // 0 = Main Menu
            // 1 = Pause Menu
            // 2 = Upgrade Menu
            // 3 = Continue Menu
            // 4 = Level Up Menu
            // 5 = Game Over Menu
            // 6 = Options Menu
            // 7 = Submit Score Menu
            this.states = [
                [true, false, false, false],
                [true, false, false],
                [[false, false], [false, false, false, true], [false, false, false, false, false, false, false]],
                [true, false, false],
                [true],
                [true, false],
                [true, false, false, false],
                [true, false],
            ]
        }

        this.delayNextInput = function() {
            this.timeout = 15; // 750ms delay
        }
		
        this.move = function(activeMenu, direction)
        {
            // activeMenu - is whatever currentGui is active, which correlates to the index of states.
            // direction - 0, 1, 2, 3 - up, left, down, right - Depending on the activeMenu, this will correlate to moves in the menu.

            // Escape this function if a menu option was moved within the last n milliseconds
            if(this.timeout > 0) return;

            if(activeMenu == 0 || activeMenu == 1 || activeMenu == 3 || activeMenu == 5 || activeMenu == 7) { // Linear Navigation Support
                var currentIndex = this.states[activeMenu].findIndex(value => value === true);
                var newIndex = currentIndex;
                // up/left = up, down/right = down
                newIndex += ((direction === 0 || direction === 1) && currentIndex > 0) ? -1 : ((direction === 2 || direction === 3) && currentIndex < this.states[activeMenu].length - 1) ? 1 : 0;
                if (newIndex !== currentIndex) {
                    this.states[activeMenu][currentIndex] = false; // Disable old menu position
                    this.states[activeMenu][newIndex] = true; // Enable new menu position
                }
                this.timeout = 5; // 250 ms delay before next action
            } else
            if(activeMenu == 2) { // 2D Navigation Support
                let [currentRow, currentCol] = this.findCurrentPosition(this.states[activeMenu]);
                switch(direction) {
                    case 0: // Up
                        if (currentRow > 0) {
                            currentRow--;
                            currentCol = this.findClosestColumn(this.states[activeMenu][currentRow].length, currentCol, this.states[activeMenu][currentRow + 1].length);
                        }
                        break;
                    case 1: // Left
                        if (currentCol > 0) currentCol--;
                        break;
                    case 2: // Down
                        if (currentRow < this.states[activeMenu].length - 1) {
                            currentRow++;
                            currentCol = this.findClosestColumn(this.states[activeMenu][currentRow].length, currentCol, this.states[activeMenu][currentRow - 1].length);
                        }
                        break;
                    case 3: // Right
                        if (currentCol < this.states[activeMenu][currentRow].length - 1) currentCol++;
                        break;
                }
            
                // Reset the current state to all false
                this.resetMenuStates(this.states[activeMenu]);
                // Set the new position to true
                this.states[activeMenu][currentRow][currentCol] = true;
                this.timeout = 5; // 250 ms delay before next action
            } else
            if(activeMenu == 6) { // Options menu - Custom event states for left/Right inputs
                if(direction === 0 || direction === 2) {
                    var currentIndex = this.states[activeMenu].findIndex(value => value === true);
                    var newIndex = currentIndex;
                    // up = up, down = down
                    newIndex += (direction === 0 && currentIndex > 0) ? -1 : (direction === 2 && currentIndex < this.states[activeMenu].length - 1) ? 1 : 0;
                    if (newIndex !== currentIndex) {
                        this.states[activeMenu][currentIndex] = false; // Disable old menu position
                        this.states[activeMenu][newIndex] = true; // Enable new menu position
                    }
                }

                // Custom actions for left/right on this menu
                if(direction == 1 || direction == 3) {
                    if(this.states[6][0]) {
                        particleOffset = self.clamp(particleOffset + (direction == 1 ? -1 : 1), 1, 5);
                    } else
                    if(this.states[6][1]) {
                        if(direction == 1) {
                            if(gco.bgm.volume >= 0.1) gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 - 0.1;
                        } else {
                            if(gco.bgm.volume < 0.91) gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 + 0.1;
                        }
                        masterBGMVolume = gco.bgm.volume;
                    } else
                    if(this.states[6][2]) {
                        if(direction == 1) {
                            if(sfx.masterVolume >= 0.1) sfx.volume(Math.round(sfx.masterVolume * 100) / 100 - 0.1);sfx.play(0);
                        } else {
                            if(sfx.masterVolume < 0.91) sfx.volume(Math.round(sfx.masterVolume * 100) / 100 + 0.1);sfx.play(0);
                        }
                    }
                }

                this.timeout = 5; // 250 ms delay before next action
            }
        }

        this.findCurrentPosition = function(menu) {
            for (let row = 0; row < menu.length; row++) {
                let col = menu[row].indexOf(true);
                if (col !== -1) return [row, col];
            }
            return [-1, -1]; // Not found
        }
        
        this.findClosestColumn = function(targetRowLength, currentCol, currentRowLength) {
            // Calculate the current position's relative percentage in its row
            const relativePosition = currentCol / (currentRowLength - 1);
            // Determine the closest column in the target row based on the relative position
            const closestCol = Math.round((targetRowLength - 1) * relativePosition);
            // Ensure the calculated column index stays within the bounds of the target row
            return Math.max(0, Math.min(closestCol, targetRowLength - 1));
        }
        
        this.resetMenuStates = function(menu) {
            for (let row = 0; row < menu.length; row++) {
                for (let col = 0; col < menu[row].length; col++) {
                    menu[row][col] = false;
                }
            }
        }

        this.back = function()
        {
            if(currentGui == 6){ currentGui = lastGui; lastGui = 6; }
            if(currentGui == 1 && !gco.win){ gco.TogglePauseGame(); currentGui = NULL_GUI_STATE; }
        }

        this.select = function()
        { // This function should mimic the doMouseClick functionality. If something is added there, it should be here, and visa-versa
            if(this.timeout > 0) return;
            this.timeout = 5; // 250 ms delay before next action
            switch(currentGui) {
                case 0:
                { // Main Menu
                    if(!gco.playStory) {
                        if(this.states[0][0]) currentGui = 2; this.delayNextInput();
                        if(this.states[0][1]) currentGui = 6; lastGui = 0;
                        if(this.states[0][2]) gco.playStory = true;
                        if(this.states[0][3]) ipcRenderer.send('quit-app');
                    }
                    break;
                }
                case 1: { // Pause Menu
                    if(this.states[1][0]){ currentGui = 6; lastGui = 1; }
                    if(this.states[1][1]){ self.hardReset(); this.delayNextInput(); }
                    if(this.states[1][2]){ ipcRenderer.send('quit-app'); }
                    break;
                }
                case 2: { // Upgrade Menu
                    
                    // Options
                    if(this.states[2][0][0]){ currentGui = 6; lastGui = 2; this.delayNextInput(); }
                    // Quit
                    if(this.states[2][0][1]){ self.hardReset(); }

                    // Primary Assult
                    if(this.states[2][1][0]){ if(gco.weaponsOwned[0]){ gco.EquipWeapon(0); } else { if(player.money >= gco.weaponPrice[0]){ gco.PurchaseWeapon(0); } else {gco.notEnoughCores = 1000;}} }
                    // Rapid Fire Assult
                    if(this.states[2][1][1]){ if(gco.weaponsOwned[1]){ gco.EquipWeapon(1); } else { if(player.money >= gco.weaponPrice[1]){ gco.PurchaseWeapon(1); } else {gco.notEnoughCores = 1000;}} }
                    // Rapid Fire Cyclone
                    if(this.states[2][1][2]){ if(gco.weaponsOwned[2]){ gco.EquipWeapon(2); } else { if(player.money >= gco.weaponPrice[2]){ gco.PurchaseWeapon(2); } else {gco.notEnoughCores = 1000;}} }
                    // Start Level
                    if(this.states[2][1][3]){ if(player.weapon != 49){ gco.StartLevel(); }}

                    // Missile
                    if(this.states[2][2][0]){ if(gco.weaponsOwned[50]){ gco.EquipWeapon(50); } else { if(player.money >= gco.weaponPrice[50]){ gco.PurchaseWeapon(50); } else {gco.notEnoughCores = 1000;}} }
                    // DM-21 Auto Strike
                    if(this.states[2][2][1]){ if(gco.weaponsOwned[51]){ gco.EquipWeapon(51); } else { if(player.money >= gco.weaponPrice[51]){ gco.PurchaseWeapon(51); } else {gco.notEnoughCores = 1000;}} }
                    // Impact Burst Mine
                    if(this.states[2][2][2]){ if(gco.weaponsOwned[52]){ gco.EquipWeapon(52); } else { if(player.money >= gco.weaponPrice[52]){ gco.PurchaseWeapon(52); } else {gco.notEnoughCores = 1000;}} }
                    // Laser
                    if(this.states[2][2][3]){ if(gco.ownLaser){ gco.EquipWeapon(9000); } else { if(player.money >= gco.laserPrice){ gco.PurchaseWeapon(9000); } else {gco.notEnoughCores = 1000;}} }
                    // Shield
                    if(this.states[2][2][4]){ if(player.money >= (player.shieldLevel + 1) * 250){gco.PurchaseExtras(0);} else {gco.notEnoughCores = 1000;} }
                    // Ammo Capacity
                    if(this.states[2][2][5]){ if(player.money >= (player.secondaryAmmoLevel + 1) * 50){gco.PurchaseExtras(2);} else {gco.notEnoughCores = 1000;} }
                    // Purchase Ammo
                    if(this.states[2][2][6]){ if(player.money >= gco.secondaryAmmoPrice && player.secondaryAmmo < player.maxSecondaryAmmo){gco.PurchaseExtras(3);} else {gco.notEnoughCores = 1000;} }

                    break;
                }
                case 3: { // Continue Menu
                    if(this.states[3][0]){ currentGui = NULL_GUI_STATE; self.softReset(); this.delayNextInput();}
                    if(this.states[3][1]){ self.hardReset(); this.delayNextInput(); }
                    if(this.states[3][2]){ ipcRenderer.send('quit-app'); }
                    break;
                }
                case 4: { // Level Up Menu
                    if(this.states[4][0]) { self.softReset(); gco.GoToUpgradeMenu(); this.delayNextInput(); }
                    break;
                }
                case 5: { // Game Over Menu
                    if(this.states[5][0]){ self.hardReset(); this.delayNextInput(); }
                    if(this.states[5][1]) ipcRenderer.send('quit-app');
                    break;
                }
                case 6: { // Options Menu
                    if(this.states[6][3]) { currentGui = lastGui; lastGui = 6; this.delayNextInput(); }
                    break;
                }
                case 7: { // Score Menu
                    if(this.states[7][0]) { self.hardReset(); }
                    if(this.states[7][1]) { ipcRenderer.send('quit-app'); }
                    break;
                }
            }
        }

        this.Update = function()
        {
            if(ticks != this.onTick) {
                this.onTick = ticks
                if (this.timeout > 0) {
                    this.timeout--;
                }
            }
        }

        this.DrawArrow = function(direction, x, y, arrowLength = 24) {
            buffer.beginPath();
            buffer.fillStyle = "rgb(96, 255, 96)"; // Green fill
            buffer.strokeStyle = "rgb(0, 128, 0)"; // Darker green stroke for the arrow's outline
        
            // Calculate arrowWidth as a factor of arrowLength, for example, arrowLength / 2.5
            const arrowWidth = arrowLength / 2.5;
        
            switch(direction) {
                case 0: // Up
                    buffer.moveTo(x, y);
                    buffer.lineTo(x - arrowWidth, y + arrowLength);
                    buffer.lineTo(x, y + arrowLength - (arrowLength / 5));
                    buffer.lineTo(x + arrowWidth, y + arrowLength);
                    buffer.lineTo(x, y);
                    break;
                case 1: // Left
                    buffer.moveTo(x, y);
                    buffer.lineTo(x + arrowLength, y - arrowWidth);
                    buffer.lineTo(x + arrowLength - (arrowLength / 5), y);
                    buffer.lineTo(x + arrowLength, y + arrowWidth);
                    buffer.lineTo(x, y);
                    break;
                case 2: // Down
                    buffer.moveTo(x, y);
                    buffer.lineTo(x - arrowWidth, y - arrowLength);
                    buffer.lineTo(x, y - arrowLength + (arrowLength / 5));
                    buffer.lineTo(x + arrowWidth, y - arrowLength);
                    buffer.lineTo(x, y);
                    break;
                case 3: // Right
                    buffer.moveTo(x, y);
                    buffer.lineTo(x - arrowLength, y - arrowWidth);
                    buffer.lineTo(x - arrowLength + (arrowLength / 5), y);
                    buffer.lineTo(x - arrowLength, y + arrowWidth);
                    buffer.lineTo(x, y);
                    break;
            }
        
            buffer.stroke();
            buffer.fill();
            buffer.closePath();
        }
	}
	
	function swapBGM()
	{
		switch(Math.floor(Math.random() * 6))
		{
			case 0:
			{
				gco.bgm = document.getElementById('bgm_square');
				break;	
			}
			case 1:
			{
				gco.bgm = document.getElementById('bgm_fast');
				break;	
			}
			case 2:
			{
				gco.bgm = document.getElementById('bgm_soar');
				break;
			}
			case 3:
			{
				gco.bgm = document.getElementById('bgm_dorian');
				break;
			}
			case 4:
			{
				gco.bgm = document.getElementById('bgm_euphoria');
				break;
			}
			case 5:
			{
				gco.bgm = document.getElementById('bgm_energy');
				break;
			}
			default:{}
		}
		gco.init_audio();
	}
	
	function SFXObject()
	{
		// Audio Channels
		this.explosion = {index: 0, channel: [], channels: 25} // Explosion Channels
		this.laser = 0; this.laserPlaying = false; // Player Laser Channel
		this.bossLaser = 0; this.bossLaserPlaying = false; // Boss Laser Channel
        this.whooshOne = 0; // Whoosh One Channel
        this.dialogueLow = {index: 0, channel: [], channels: 10} // Low Dialogue Channels
        this.dialogueMid = {index: 0, channel: [], channels: 10} // Mid Dialogue Channels
        this.dialogueHigh = {index: 0, channel: [], channels: 10} // High Dialogue Channels

        // Other Variables
        this.masterVolume = 0.2;
        
        this.Init = function() {
            // Explosions
            for(var i = 0; i < this.explosion.channels; i++) {
                var a = new Audio('Audio/Explode.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.explosion.channel.push(a);
            }

            // Player Lasers
            this.laser = new Audio('Audio/lasorz.mp3');
            this.laser.volume = this.masterVolume;
            this.laser.preload = 'auto';
            this.laser.loop = true;
            
            // Boss Lasers
            this.bossLaser = new Audio('Audio/lasorz.mp3');
            this.bossLaser.volume = this.masterVolume;
            this.bossLaser.preload = 'auto';
            this.bossLaser.loop = true;

            // Whoose One
            this.whooshOne = new Audio('Audio/sfx/woosh-low-long.mp3');
            this.whooshOne.volume = this.masterVolume;
            this.whooshOne.preload = 'auto';

            // Low Dialogues
            for(var i = 0; i < this.dialogueLow.channels; i++) {
                var a = new Audio('Audio/sfx/dialogue_low.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.dialogueLow.channel.push(a);
            }

            // Mid Dialogues
            for(var i = 0; i < this.dialogueMid.channels; i++) {
                var a = new Audio('Audio/sfx/dialogue_mid.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.dialogueMid.channel.push(a);
            }

            // High Dialogues
            for(var i = 0; i < this.dialogueHigh.channels; i++) {
                var a = new Audio('Audio/sfx/dialogue_high.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.dialogueHigh.channel.push(a);
            }
        }
		
        this.play = function(playfx) {
            switch(playfx) {
                case 0: { // Explode
                    if(this.explosion.channel[this.explosion.index]) {
                        this.explosion.channel[this.explosion.index].play();
                        this.explosion.index += 1; if(this.explosion.index > (this.explosion.channels - 1)){this.explosion.index = 0;}
                    }
                    break;
                }
                case 1: { // Laser
                    this.laser.play();
                    this.laserPlaying = true;
                    break;
                }
                case 2: { // Boss Laser
                    this.bossLaser.play();
                    this.bossLaserPlaying = true;
                    break;
                }
                case 3: { // Whoosh One
                    this.whooshOne.play();
                    break;
                }
                case 4: { // Dialogue Low
                    if(this.dialogueLow.channel[this.dialogueLow.index]) {
                        this.dialogueLow.channel[this.dialogueLow.index].play();
                        this.dialogueLow.index += 1; if(this.dialogueLow.index > (this.dialogueLow.channels - 1)){this.dialogueLow.index = 0;}
                    }
                    break;
                }
                case 5: { // Dialogue Mid
                    if(this.dialogueMid.channel[this.dialogueMid.index]) {
                        this.dialogueMid.channel[this.dialogueMid.index].play();
                        this.dialogueMid.index += 1; if(this.dialogueMid.index > (this.dialogueMid.channels - 1)){this.dialogueMid.index = 0;}
                    }
                    break;
                }
                case 6: { // Dialogue High
                    if(this.dialogueHigh.channel[this.dialogueHigh.index]) {
                        this.dialogueHigh.channel[this.dialogueHigh.index].play();
                        this.dialogueHigh.index += 1; if(this.dialogueHigh.index > (this.dialogueHigh.channels - 1)){this.dialogueHigh.index = 0;}
                    }
                    break;
                }
            }
        }
		
        this.pause = function(stopfx) { // Only some SFX can be paused once started
            switch(stopfx) {
                case 1: { // Laser
                    this.laser.pause();
                    this.laserPlaying = false;
                    break;
                }
                case 2: { // Boss Laser
                    this.bossLaser.pause();
                    this.bossLaserPlaying = false;
                    break;
                }
            }
        }
        
        this.volume = function(value) {
            for(var i = 0; i < this.explosion.channel.length; i++) {
                this.explosion.channel[i].volume = value;
            }
            this.laser.volume = value;
            this.bossLaser.volume = value;
            this.whooshOne.volume = value;
            this.masterVolume = value;
            for(var i = 0; i < this.dialogueLow.channel.length; i++) {
                this.dialogueLow.channel[i].volume = value;
            }
            for(var i = 0; i < this.dialogueMid.channel.length; i++) {
                this.dialogueMid.channel[i].volume = value;
            }
            for(var i = 0; i < this.dialogueHigh.channel.length; i++) {
                this.dialogueHigh.channel[i].volume = value;
            }
        }
    }
	
	function LevelMission()
	{
		this.objectives = [];
		this.progress = [];
		
		this.GenerateObjectives = function()
		{
            let randomMultiplier = 25; // Base: 25
            let floorAddative = 35; // Base: 35
			for(var i = 0; i < gco.level; i++)
			{//For each level, a new enemy type objective is placed on the mission stack.
				if(gco.level >= 6){ this.objectives.push(0); }
				else{ this.objectives.push(Math.floor(Math.random() * randomMultiplier) + floorAddative); }
				this.progress.push(0);
			}
		}
		
		this.UpdateProgress = function(enType)
		{
			this.progress[enType] += 1;
		}
		
		this.CheckCompletion = function()
		{//returns true if level is complete, else returns false
			if(gco.level < 6)
			{
				var completion = [];
				for(var i = 0; i < gco.level; i++)
				{
					if(this.progress[i] >= this.objectives[i])
					{
						//Awesome
					} else
					{
						return false;
					}
				}
				return true;
			} else
			{
				return false;
			}
		}
		
		this.GetCompletionPercent = function()
		{
			var total = 0; var kills = 0;
			for(var i = 0; i < gco.level; i++)
			{
				total += this.objectives[i];
				if(this.progress[i] > this.objectives[i]){kills += this.objectives[i];} else { kills += this.progress[i]; }
			}
			return (kills / total);
		}
		
		this.ResetObjectives = function()
		{
			this.objectives = [];
			this.progress = [];
			this.GenerateObjectives();
		}
	}

    function ForegroundGeneration()
    {
        this.onTick = 0;
        this.objects = [];

        this.Update = function() {
            if(ticks != this.onTick) {
                this.onTick = ticks;
                for(var i = 0; i < this.objects.length; i++) {
                    if(this.objects[i].y > this.objects[i].killY) {
                        self.popArray(this.objects, i);
                    }
                }

                if(this.objects.length < 2) {
                    this.generate();
                }
            }

            for(var i = 0; i < this.objects.length; i++) {
                this.objects[i].Update();
            }
        }

        this.Draw = function() {
            for(var i = 0; i < this.objects.length; i++) {
                this.objects[i].Draw();
            }
        }

        this.generate = function() {
            if(Math.random() <= 0.5) { // 0.5% chance per tick to get a foreground object
                this.objects.push(new ForegroundObject());
            }
        }
    }

    function ForegroundObject() {
        this.onTick = 0;
        this.x = Math.floor(Math.random() * _buffer.width);
        this.y = 0;
        this.model = Math.floor(Math.random() * 12);
        this.speed = Math.floor(Math.random() * 70) + 30;
        this.xVel = (Math.floor(Math.random() * 1) + 0.5) * (Math.floor(Math.random() * 2) > 0 ? 1 : -1);
        this.height = [32, 32, 32, 32, 31, 30, 18, 11, 32, 32, 32, 20][this.model];
        this.killY = _canvas.height + (this.height / 2);
        this.rotation = 0;
    
        this.Update = function() {
            if (ticks != this.onTick) {
                this.onTick = ticks;
                // Update rotation
                this.rotation += 1; // Adjust the rotation speed as needed
                if (this.rotation >= 360) {
                    this.rotation -= 360; // Keep rotation within 0 to 359 degrees
                }
            }
    
            // Movement Dynamics
            this.x += ((this.speed / 2) * this.xVel) * delta;
            this.y += (this.speed * player.yVecMulti) * delta;
            if (this.y > this.killY) {
                return 1;
            }
            return 0;
        }
    
        this.Draw = function() {
            if (imagesLoaded) {
                buffer.save(); // Save the current state
                buffer.translate(this.x, this.y); // Translate to the object's position
                buffer.rotate(this.rotation * Math.PI / 180); // Rotate
                buffer.drawImage(fgImages[this.model], -fgImages[this.model].width / 2, -fgImages[this.model].height / 2, fgImages[this.model].width, fgImages[this.model].height); // Draw the image centered at (0,0)
                buffer.restore(); // Restore the previous state
            } else {
                buffer.fillStyle = 'rgb(200, 200, 255)';
                buffer.beginPath();
                buffer.arc(this.x, this.y, 2, 0, Math.PI * 2, true);
                buffer.closePath();
                buffer.fill();
            }
        }
    }
    
    function StarGeneration()
    {
        this.onTick = 0;
        this.hasPlanet = false;

        this.initStars = function() {
            this.hasPlanet = false;
            stars = [];
            for(i = 0; i < numStars; i++)
            {
                var X = Math.floor(Math.random() * _buffer.width);
                var Y = Math.floor(Math.random() * _buffer.height);
                var starType = this.genRandomStarType(true);
                var speed = this.starSpeed(starType);
                var height = this.starHeight(starType);
                star = new Star(X, Y, starType, speed, false, height);
                stars.push(star);
            }
        }

        this.starSpeed = function(starType) {
            if(starType == -1) return 100;
            return [0.8, 1, 1.1, 1.3, 1.5, 1.7, 1.9, 2.2, 2.5, 2.7][starType];
        }

        this.starHeight = function(starType) {
            if(starType == -1) return 500;
            return [1, 3, 3, 5, 9, 9, 7, 9, 17, 21][starType];
        }

        this.generate = function() {
            if(ticks != this.onTick) {
                this.onTick = ticks;
                if(stars.length < numStars) {
                    while(stars.length < numStars) {
                        var starType = this.genRandomStarType(ed.activeEvent == 1 || ed.activeEvent == 2); // Only gen stars in fly in and out events
                        var X = Math.floor(Math.random() * _buffer.width);
                        var Y = 0;
                        var speed = this.starSpeed(starType);
                        var isPlanet = false;
                        var height = this.starHeight(starType);
                        if(starType == -1) { // Planets
                            Y = -250;
                            isPlanet = true;
                            this.hasPlanet = true;
                        }
                        star = new Star(X, Y, starType, speed, isPlanet, height);
                        stars.push(star);
                    }
                }
            }
        }

        this.genRandomStarType = function(onlyStars) {
            var starWeights = [100, 20, 8, 7, 6, 5, 4, 3, 2, 1];
            if(onlyStars || this.hasPlanet) { // Stars
                var totalWeight = starWeights.reduce((acc, val) => acc + val, 0);
                var rand = Math.random() * totalWeight;
                var cumulativeWeight = 0;
                for (var i = 0; i < starWeights.length; i++) {
                    cumulativeWeight += starWeights[i];
                    if (rand < cumulativeWeight) {
                        return i;
                    }
                }
                return starWeights.length - 1; // Fallback
            } else { // Planet
                return -1;
            }
        }
    }

    function Star(X, Y, mdl, spd, isPlnt, hght) {
        this.onTick = 0;
        this.x = X;
        this.y = Y;
        this.Model = mdl;
        this.speed = spd;
        this.isPlanet = isPlnt;
        this.height = hght;
        this.killY = _canvas.height + (this.height / 2);

        // Custom Star Shading
        this.color = { r: 125, g: 125, b: 255 };
        this.image = null;
        this.imageLoaded = false;
        this.customStarShader = false;
        if (!this.isPlanet && Math.random() < 0.2) { // 20% chance for non-standard stars
            this.customStarShader = true;
    
            if (Math.random() < 0.8) {
                // Primary color star: two components are reduced near zero
                let colors = [0, 0, 0];
                let primaryColorIndex = Math.floor(Math.random() * 3); // Select which color will be primary
                colors[primaryColorIndex] = 225 + Math.floor(Math.random() * 30); // Set the primary color component to a high value from 225 to 255
                this.color = { r: colors[0], g: colors[1], b: colors[2] };
            } else {
                // Secondary color star: one component is reduced near zero
                let colors = [225, 225, 225].map(val => val + Math.floor(Math.random() * 30)); // Start with high values from 225 to 255
                const reduceIndex = Math.floor(Math.random() * 3); // Select one color to reduce
                colors[reduceIndex] = Math.max(0, colors[reduceIndex] - 200); // Reduce one component significantly to near zero
                this.color = { r: colors[0], g: colors[1], b: colors[2] };
            }
        }

        this.Update = function() {
            if(ticks != this.onTick) {
                this.onTick = ticks;
                if(this.onTick % 2 === 0 && this.isPlanet) { // Planet Pre-Rendering
                    this.renderPlanet();
                }
            }

            // Movement Dynamics
            this.y += ((this.speed * player.yVecMulti) * ed.moveMultiplierOne) * delta;
            if(this.y > this.killY) {
                return 1;
            }
            return 0;
        }

        this.renderStar = function() {
            if(this.isPlanet) return;
        
            // Clear and reset rendering contexts so we can re-render this game loop.
            starGl.clear(starGl.COLOR_BUFFER_BIT);
            renderStarCtx.clearRect(0, 0, renderStarCanvas.width, renderStarCanvas.height);
            offscreenStarCanvas.width = starImages[this.Model].width;
            offscreenStarCanvas.height = starImages[this.Model].height;
            renderStarCanvas.width = starImages[this.Model].width;
            renderStarCanvas.height = starImages[this.Model].height;
        
            // Vertex shader code
            var vertexShaderSource = `
                attribute vec2 a_position;
                varying vec2 v_texCoord;
        
                void main() {
                    gl_Position = vec4(a_position, 0, 1);
                    v_texCoord = a_position * 0.5 + 0.5;
                }
            `;
        
            // Fragment shader code
            var fragmentShaderSource = `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_texture;
                uniform vec3 targetColor;
        
                void main() {
                    vec4 color = texture2D(u_texture, v_texCoord);
                    if (color.rgb == vec3(0, 0, 0)) {
                        discard; // Discard black color pixels
                    }
                    vec3 newColor = mix(color.rgb, targetColor, 0.5); // Mix original color with target color
                    gl_FragColor = vec4(newColor, color.a);
                }
            `;
        
            // Compile shaders
            var vertexShader = starGl.createShader(starGl.VERTEX_SHADER);
            starGl.shaderSource(vertexShader, vertexShaderSource);
            starGl.compileShader(vertexShader);
        
            var fragmentShader = starGl.createShader(starGl.FRAGMENT_SHADER);
            starGl.shaderSource(fragmentShader, fragmentShaderSource);
            starGl.compileShader(fragmentShader);
        
            // Link shaders into a program
            var shaderProgram = starGl.createProgram();
            starGl.attachShader(shaderProgram, vertexShader);
            starGl.attachShader(shaderProgram, fragmentShader);
            starGl.linkProgram(shaderProgram);
            starGl.useProgram(shaderProgram);
        
            // Create and bind buffer to render a quad
            var positionBuffer = starGl.createBuffer();
            starGl.bindBuffer(starGl.ARRAY_BUFFER, positionBuffer);
            starGl.bufferData(starGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), starGl.STATIC_DRAW);
        
            var positionLocation = starGl.getAttribLocation(shaderProgram, 'a_position');
            starGl.enableVertexAttribArray(positionLocation);
            starGl.vertexAttribPointer(positionLocation, 2, starGl.FLOAT, false, 0, 0);
        
            // Create a texture from your source canvas
            var texture = starGl.createTexture();
            starGl.bindTexture(starGl.TEXTURE_2D, texture);
            starGl.texImage2D(starGl.TEXTURE_2D, 0, starGl.RGBA, starGl.RGBA, starGl.UNSIGNED_BYTE, starImages[this.Model]);
            starGl.texParameteri(starGl.TEXTURE_2D, starGl.TEXTURE_MIN_FILTER, starGl.LINEAR);
            starGl.texParameteri(starGl.TEXTURE_2D, starGl.TEXTURE_WRAP_S, starGl.CLAMP_TO_EDGE);
            starGl.texParameteri(starGl.TEXTURE_2D, starGl.TEXTURE_WRAP_T, starGl.CLAMP_TO_EDGE);
        
            // Set the texture and color uniform in the shader
            var textureLocation = starGl.getUniformLocation(shaderProgram, 'u_texture');
            var colorLocation = starGl.getUniformLocation(shaderProgram, 'targetColor');
            starGl.uniform1i(textureLocation, 0);
            starGl.uniform3fv(colorLocation, [this.color.r / 255, this.color.g / 255, this.color.b / 255]);
        
            // Set the viewport to match the offscreen canvas size
            starGl.viewport(0, 0, offscreenStarCanvas.width, offscreenStarCanvas.height);
        
            // Render the quad with the shader applied
            starGl.drawArrays(starGl.TRIANGLE_STRIP, 0, 4);
        
            // Get the resulting image data from WebGL
            var imageData = new Uint8Array(offscreenStarCanvas.width * offscreenStarCanvas.height * 4);
            starGl.readPixels(0, 0, offscreenStarCanvas.width, offscreenStarCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        
            // Put the modified image data onto your buffer canvas
            var imageDataUint8Clamped = new Uint8ClampedArray(imageData);
            var imageDataObject = new ImageData(imageDataUint8Clamped, offscreenStarCanvas.width, offscreenStarCanvas.height);
            renderStarCtx.putImageData(imageDataObject, 0, 0);
        
            if (offscreenStarCanvas.width > 0 && offscreenStarCanvas.height > 0) {
                this.image = new Image();
                this.image.onload = () => { this.imageLoaded = true; };
                this.image.src = renderStarCanvas.toDataURL();
            }
        }

        this.renderPlanet = function() {
            var planetCanvas = document.querySelector('#root canvas');
            if(planetCanvas == null) return;
            // Clear and reset our planet rendering contexts so we can re-render this game loop.
            offscreenPlanetGl.clear(offscreenPlanetGl.COLOR_BUFFER_BIT);
            shaderPlanetCtx.clearRect(0, 0, shaderPlanetCanvas.width, shaderPlanetCanvas.height);
            offScreenPlanetCanvas.width = planetCanvas.width;
            offScreenPlanetCanvas.height = planetCanvas.height;

            // Vertex shader code
            var vertexShaderSource = `
                attribute vec2 a_position;
                varying vec2 v_texCoord;

                void main() {
                    gl_Position = vec4(a_position, 0, 1);
                    v_texCoord = a_position * 0.5 + 0.5;
                }
            `;

            // Fragment shader code
            var fragmentShaderSource = `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_texture;

                void main() {
                    vec4 color = texture2D(u_texture, v_texCoord);
                    if (color == vec4(0, 0, 0, 1)) {
                        discard; // Discard black color pixels
                    }
                    gl_FragColor = color;
                }
            `;

            // Compile shaders
            var vertexShader = offscreenPlanetGl.createShader(offscreenPlanetGl.VERTEX_SHADER);
            offscreenPlanetGl.shaderSource(vertexShader, vertexShaderSource);
            offscreenPlanetGl.compileShader(vertexShader);

            var fragmentShader = offscreenPlanetGl.createShader(offscreenPlanetGl.FRAGMENT_SHADER);
            offscreenPlanetGl.shaderSource(fragmentShader, fragmentShaderSource);
            offscreenPlanetGl.compileShader(fragmentShader);

            // Link shaders into a program
            var shaderProgram = offscreenPlanetGl.createProgram();
            offscreenPlanetGl.attachShader(shaderProgram, vertexShader);
            offscreenPlanetGl.attachShader(shaderProgram, fragmentShader);
            offscreenPlanetGl.linkProgram(shaderProgram);
            offscreenPlanetGl.useProgram(shaderProgram);

            // Create and bind buffer to render a quad
            var positionBuffer = offscreenPlanetGl.createBuffer();
            offscreenPlanetGl.bindBuffer(offscreenPlanetGl.ARRAY_BUFFER, positionBuffer);
            offscreenPlanetGl.bufferData(offscreenPlanetGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), offscreenPlanetGl.STATIC_DRAW);

            var positionLocation = offscreenPlanetGl.getAttribLocation(shaderProgram, 'a_position');
            offscreenPlanetGl.enableVertexAttribArray(positionLocation);
            offscreenPlanetGl.vertexAttribPointer(positionLocation, 2, offscreenPlanetGl.FLOAT, false, 0, 0);

            // Create a texture from your source canvas
            var texture = offscreenPlanetGl.createTexture();
            offscreenPlanetGl.bindTexture(offscreenPlanetGl.TEXTURE_2D, texture);
            offscreenPlanetGl.texImage2D(offscreenPlanetGl.TEXTURE_2D, 0, offscreenPlanetGl.RGBA, offscreenPlanetGl.RGBA, offscreenPlanetGl.UNSIGNED_BYTE, planetCanvas);
            offscreenPlanetGl.texParameteri(offscreenPlanetGl.TEXTURE_2D, offscreenPlanetGl.TEXTURE_MIN_FILTER, offscreenPlanetGl.LINEAR);
            offscreenPlanetGl.texParameteri(offscreenPlanetGl.TEXTURE_2D, offscreenPlanetGl.TEXTURE_WRAP_S, offscreenPlanetGl.CLAMP_TO_EDGE);
            offscreenPlanetGl.texParameteri(offscreenPlanetGl.TEXTURE_2D, offscreenPlanetGl.TEXTURE_WRAP_T, offscreenPlanetGl.CLAMP_TO_EDGE);

            // Set the texture uniform in the shader
            var textureLocation = offscreenPlanetGl.getUniformLocation(shaderProgram, 'u_texture');
            offscreenPlanetGl.uniform1i(textureLocation, 0);

            // Ensure the webGL context has the correct dimensions for our planet canvas
            offscreenPlanetGl.viewport(0, 0, offScreenPlanetCanvas.width, offScreenPlanetCanvas.height);

            // Render the quad with the shader applied
            offscreenPlanetGl.drawArrays(offscreenPlanetGl.TRIANGLE_STRIP, 0, 4);

            // Get the resulting image data from WebGL
            var imageData = new Uint8Array(offScreenPlanetCanvas.width * offScreenPlanetCanvas.height * 4);
            offscreenPlanetGl.readPixels(0, 0, offScreenPlanetCanvas.width, offScreenPlanetCanvas.height, offscreenPlanetGl.RGBA, offscreenPlanetGl.UNSIGNED_BYTE, imageData);

            // Put the modified image data onto your buffer canvas
            var imageDataUint8Clamped = new Uint8ClampedArray(imageData);
            var imageDataObject = new ImageData(imageDataUint8Clamped, offScreenPlanetCanvas.width, offScreenPlanetCanvas.height);

            shaderPlanetCanvas.width = offScreenPlanetCanvas.width;
            shaderPlanetCanvas.height = offScreenPlanetCanvas.height;
            shaderPlanetCtx.putImageData(imageDataObject, 0, 0);
        }

        this.randomlySelectPlanet = function() {
            if(!this.isPlanet) return;

            // Get the select element
            var selectElement = document.querySelector('.dg.ac select');

            if(!selectElement) return;

            // Get all the options within the select element
            var options = selectElement.options;

            // Calculate a random index within the range of options
            var randomIndex = Math.floor(Math.random() * options.length);

            // Set the selected option based on the random index
            options[randomIndex].selected = true;

            // Simulate the change event on the select element
            var event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);
        }
    
        // Call pre-render on object creation
        this.randomlySelectPlanet();
        if(this.customStarShader) {
            this.renderStar();
        }
        
    }

	function EnemyGeneration()
	{
		this.hasBoss = false;
		this.onTick = 0;
		this.generate = function(lev)
		{
            if(!this.hasBoss || (bossPhase != -1 && bossPhase > 3))
            {
                if(ticks != this.onTick)
                {
                    this.onTick = ticks;
                    //Random enemy spawning with random levels
                    for(var i = 0; i <= lev; i++)
                    {
                        var rand = Math.floor(Math.random() * 30);
                        if(rand == 10)
                        {
                            var theType = -1;
                            while(true)
                            {//logic to only generate 1 boss
                                theType = Math.round(Math.random() * (lev - 1));
                                if(gco.level > 5)
                                {
                                    if(theType == 5 && this.hasBoss)
                                    {
                                        continue;
                                    } else {
                                        break;
                                    }
                                } else {
                                    break;
                                }
                            }
                            var startingX = Math.floor(Math.random() * _buffer.width);
                            var theSpeed = 0;
                            var theDmg = 0;
                            var theLife = 0;
                            var Cores = 0;
                            var height = 0;
                            var width = 0;
                            var model = 0;
                            var points = 0;
                            switch(theType)
                            {
                                case 0:
                                {//Drones
                                    theLife = Math.round(Math.random() * 4) + 2;
                                    theSpeed = Math.round(Math.random() * 50) + 50;
                                    theDmg = Math.round(Math.random() * 5) + 5;
                                    Cores = Math.round(Math.random() * 2) + 1;
                                    if(theDmg > 7){model = 1; points = 2;} else {model = 0; points = 1;}
                                    width = 15;
                                    height = 25;
                                    break;
                                }
                                case 1:
                                {//Weavers
                                    theLife = Math.round(Math.random() * 10) + 7;
                                    theSpeed = Math.round(Math.random() * 50) + 50;
                                    theDmg = Math.round(Math.random() * 7) + 7;
                                    Cores = Math.round(Math.random() * 5) + 1;
                                    if(theDmg > 10){model = 3; points = 4;} else {model = 2; points = 3;}
                                    width = 31;
                                    height = 21;
                                    break;
                                }
                                case 2:
                                {//Kamakaze Ships
                                    theLife = Math.round(Math.random() * 15) + 10;
                                    theSpeed = Math.round(Math.random() * 150) + 200;
                                    theDmg = Math.round(Math.random() * 10) + 10;
                                    if(theDmg >= 16)
                                    {
                                        model = 5;
                                        theDmg = Math.round(Math.random() * 10) + 10;
                                        Cores = Math.round(Math.random() * 15) + 10;
                                        points = 6;
                                    }else 
                                    {
                                        points = 5;
                                        model = 4;
                                        theDmg = Math.round(Math.random() * 9) + 9;
                                        Cores = Math.round(Math.random() * 5) + 1;
                                    }
                                    width = 21;
                                    height = 31;
                                    break;
                                }
                                case 3:
                                {//Splitters
                                    theLife = Math.round(Math.random() * 20) + 20;
                                    theSpeed = Math.round(Math.random() * 35) + 35;
                                    theDmg = Math.round(Math.random() * 15) + 15;
                                    if(theDmg >= 23)
                                    {
                                        points = 8;
                                        model = 8;
                                        theDmg = Math.round(Math.random() * 17) + 17;
                                        Cores = Math.round(Math.random() * 30) + 20;
                                        width = 37;
                                        height = 31;
                                    }else 
                                    {
                                        points = 7;
                                        model = 6;
                                        Cores = Math.round(Math.random() * 25) + 10;
                                        width = 29;
                                        height = 30;
                                    }//Missiles 15 x 31
                                    break;
                                }
                                case 4:
                                {//Teleporters
                                    theLife = Math.round(Math.random() * 25) + 15;
                                    theSpeed = Math.round(Math.random() * 35) + 35;
                                    theDmg = Math.round(Math.random() * 17) + 17;
                                    if(theDmg >= 28)
                                    {
                                        points = 10;
                                        theLife = Math.round(Math.random() * 25) + 25;
                                        model = 11;
                                        Cores = Math.round(Math.random() * 30) + 20;
                                        width = 26;
                                        height = 21;
                                    }else 
                                    {
                                        points = 9;
                                        model = 10;
                                        Cores = Math.round(Math.random() * 25) + 10;
                                        width = 26;
                                        height = 21;
                                    }//Missiles 15 x 31
                                    break;
                                }
                                case 5:
                                {//Boss
                                    this.hasBoss = true;
                                    theLife = 500;
                                    theSpeed = 75;
                                    theDmg = 75;
                                    model = 16;
                                    points = 1000;
                                    Cores = 1000;
                                    width = 116;
                                    height = 72;
                                    break;
                                }
                            }
                            
                            enemy = new Enemy(theSpeed, theDmg, theLife, Cores, width, height, model, startingX, 0, theType, points);
                            enemies.push(enemy);
                        }
                    }
                }
            }
		}
	}
	
	function Enemy(spd, dmg, lfe, crs, wdth, hght, mdl, inX, inY, theType, pts)
    {
		numEnemies++;
		this.onTick = 0;
		this.enemyNum = numEnemies;
        
        // Position and movement
        this.x = inX;
        this.y = inY;
        this.speed = spd;
        this.waveLength = 0;
        this.moveVar = 0;
        this.xMoveSpeed = 0;
		this.momentum = 0;
		this.direction = 2;
		this.lastDirection = 2;//0 = left;
        this.tele = 0;
		this.xmove = 0;
        this.startX = this.x;
        this.startY = this.y;
		this.xstop = _buffer.width / 2;
        this.ystop = 0;
        this.readyForTeleport = false;
		this.teleportTimer = 2;
		this.didTeleport = false;
		this.points = pts;
		this.inCenter = false;
		this.moveLeft = false;
        
        this.width = wdth;
        this.height = hght;
		this.damage = dmg;
        this.life = lfe;
		this.type = theType;
		this.Cores = crs;
		this.Model = mdl;
		this.timeAlive = 0;
		this.startLife = this.life;
		this.canFire = [];
		this.isBoss = false;
		this.readyToShoot = false;
		this.shootTimer = 2;
		this.didShoot = false;
        this.phase = 0;
		this.phaseSave = 0;
        this.spawnEnemy = 0;
		this.shootTick = 0;
        this.moveX = 0;
		this.moveY = 0;
		this.doRealMovement = false;
		this.moveYSpeed = 25;
		this.foundCircle = false;
		this.circleYStop = 0;
		this.kamakazeSpawn1 = 0;
		this.weaverSpawn = 0;
		
		this.laserTimer = 0;
		this.laser = false;
		this.laserX = this.x;
		this.laserY = this.y + 25;
		this.laserWidth = 10;
		this.laserHeight = _canvas.height - this.y + 25;
		
		this.baseLife = 1500;
		this.currentMaxLife = this.life;
		
		switch(this.type)
		{//Special Case Initialization
			case 2:
			{
				this.xMoveSpeed = Math.round(Math.random() * 25) + 25;
				if(this.x < player.x){this.direction = this.lastDirection = 1;} else if(this.x > player.x){this.direction = this.lastDirection = 0;} else {}
				break;	
			}
			case 4:
			{
				this.ystop = Math.round(Math.random() * 301) + 100;
				if(this.Model == 11)
				{
					for(var i = 0; i < 3; i++)
					{
						this.canFire.push(true);
					}
				} else
				{
					this.canFire.push(true);
				}
				break;
			}
			case 5:
			{
				this.ystop = 200;
				this.circleYStop = 165;
				this.xMoveSpeed = this.speed;
                this.waveLength = 100;
				this.isBoss = true;
                this.phase = -1;
                this.sinOffset = -1;
				break;
			}
			case 50:
			{
				this.xMoveSpeed = Math.round(Math.random() * 25) + 25;
				if(this.x < player.x){this.direction = this.lastDirection = 1;} else if(this.x > player.x){this.direction = this.lastDirection = 0;} else {}
				break;	
			}
		}

        this.Update = function()
        {
			this.timeAlive += delta;
			switch(this.type)
			{
				case 0:
				{//Drones
					this.y += this.speed * delta;
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 0.1, 3, 0.1);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					}
					else if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
				case 1:
				{//Weavers
					this.y += this.speed * delta;
					this.x = this.startX + (30 * Math.sin(6 * 3.14 * 100 * (this.timeAlive / 1000)));
					
					if(this.onTick % 2 == 0)
					{
						if(Math.round(Math.random() * 100) == 1)
						{
							this.shoot(100);
						}
					}
					
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 3, 0.1);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					}
					else if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
				case 2:
				{//Kamakaze Ships
					if(this.x < player.x){this.direction = 1;} else if(this.x > player.x){this.direction = 0;} else {}
					if(this.direction != this.lastDirection){this.momentum = this.xMoveSpeed * 2; this.lastDirection = this.direction;}
					this.y += this.speed * delta;
					//Not-So-Friendly Boom Ship
					if(this.y < player.y)
					{
						if(this.x < player.x)
						{
							this.x += (this.xMoveSpeed - this.momentum) * delta;
						}
						else if(this.x > player.x)
						{
							this.x -= (this.xMoveSpeed - this.momentum) * delta;
						} else { }
						this.momentum -= delta * 100;
						if(this.momentum < 0){this.momentum = 0;}
					}
					if(this.Model == 5)
					{
						if(Math.round(Math.random() * 500) == 1)
						{
							this.shoot(100);
						}
					} else{}
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 0.1, 0.1);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					}
					else if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
				case 3:
				{//Splitters
					this.y += this.speed * delta;
					if(this.Model == 6)
					{//Normal Ship
						if(Math.round(Math.random() * 500) == 1){ this.shoot(100); }
						if(this.life <= 0)
						{
							destroys += 1;
							explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 0.1, 0.1);
							explosions.push(explosion);
							//Update Mission Data
							gco.levelMission.UpdateProgress(this.type);
							for(var i = 0; i < 2; i++)
							{
								var xStart = Math.round(Math.random() * 40) + 10;
								var LOR = Math.round(Math.random() * 1) + 1;//Left or Right...1 or 2
								if(LOR == 0){xStart *= -1;}
								enemy = new Enemy(this.speed, this.damage, Math.round(this.startLife / 2) + 1, Math.round(this.Cores / 3) + 1, 15, 31, 7, this.x + xStart, this.y, 50, 2);
								enemies.push(enemy);
							}
							return 1;
						}
					} else
					{//Elite Ship
						if(Math.round(Math.random() * 400) == 1){ this.shoot(100); }
						if(this.life <= 0)
						{
							destroys += 1;
							explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 0.1, 0.1);
							explosions.push(explosion);
							//Update Mission Data
							gco.levelMission.UpdateProgress(this.type);
							for(var i = 0; i < 3; i++)
							{
								var xStart = Math.round(Math.random() * 40) + 10;
								var LOR = Math.round(Math.random() * 1) + 1;//Left or Right...1 or 2
								if(LOR == 0){xStart *= -1;}
								enemy = new Enemy(this.speed, this.damage, Math.round(this.startLife / 2) + 1, Math.round(this.Cores / 3) + 1, 15, 31, 9, this.x + xStart, this.y, 50, 2);
								enemies.push(enemy);
							}
							return 1;
						}
					}
					if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
				case 4:
				{//Teleporters
					this.y += this.speed * delta;
					if(!this.didTeleport){ this.speed = this.ystop - this.y; }
					if(this.speed < 50 && this.speed > 35 && this.canFire[0])
					{
						this.canFire[0] = false;
						this.shoot(100);
					} else
					if(this.speed < 35 && this.speed > 25 && this.canFire[1])
					{
						this.canFire[1] = false;
						this.shoot(100);
					} else
					if(this.speed < 25 && this.canFire[2])
					{
						this.canFire[2] = false;
						this.shoot(100);
					}
					
					if(this.speed < 25){ this.readyForTeleport = true; }
					
					if(this.readyForTeleport)
					{
						if(this.teleportTimer <= 0)
						{
							this.y += 10;
							this.readyForTeleport = false;
							this.didTeleport = true;
							explosions.push(new Explosion(this.x, this.y, 50, 1, 500, 0.1, 0.1, 3));
							if(Math.round(Math.random() * 1) == 1)
							{//teleport left
								this.x -= Math.round(Math.random() * 100) + 50;
								if(this.x < 0){this.x = 5;}
							} else
							{//teleport right
								this.x += Math.round(Math.random() * 100) + 50;
								if(this.x > _buffer.width){this.x = _buffer.width - 5;}
							}
							explosions.push(new Explosion(this.x, this.y, 50, 1, 500, 0.1, 0.1, 3));
						}
						this.teleportTimer -= delta;
					}
					
					if(this.didTeleport){ this.speed = this.y - this.ystop;	}
					
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 3, 3);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					}
					else if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
				case 5:
				{//Boss
                    switch(this.phase)
                    {
                        case -1:
                        {
							this.life = this.currentMaxLife;
                            // Move to proper position
                            if(Math.round(this.y) <= this.ystop){ this.y += this.speed * delta; this.speed = this.ystop - this.y; }
							if(Math.abs(this.y - this.ystop) < 5){ this.didTeleport = true;}
                            // Center boss
                            if(!this.inCenter){
							if(this.x >= _buffer.width / 2){this.x -= this.xMoveSpeed * delta; this.xMoveSpeed = this.x - this.xstop; if(Math.abs(this.x - this.xstop) < 15 && this.didTeleport){this.inCenter = true; this.phase = this.phaseSave; this.speed = 10; this.startX = this.x; this.startY = this.y;}}
							else {this.x += this.xMoveSpeed * delta; this.xMoveSpeed = this.xstop - this.x; if(this.x > Math.abs(this.xstop - 15) && this.didTeleport){this.inCenter = true; this.phase = this.phaseSave; this.speed = 10; this.startX = this.x; this.startY = this.y;}}
							}
                        break;
                        }
                        case 0:
                        {
                            // Weapons
							this.laserX = this.x;
							this.laserY = this.y + 25;
							this.laserHeight = _canvas.height - this.y + 25;
                            if(this.laser){ if(!sfx.bossLaserPlaying){ sfx.play(2); } } else { if(sfx.bossLaserPlaying){ sfx.pause(2); } }
                            if(this.onTick == 0){ this.laserTimer += 1; if(this.laserTimer >= 5 && !this.laser){ this.laser = true; } else if(this.laserTimer >= 8){ this.laser = false; this.laserTimer = 0; } }
                            if(this.shootTick != ticks){ this.shootTick = ticks; if(this.shootTick < 9){ this.shoot(102); } else { this.shoot(103); } }
							// Movement
							if(!this.doRealMovement){this.moveX = this.startX + (150 * Math.cos(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;if(this.moveX > this.x){if(this.moveX - this.x <= 5){this.doRealMovement = true;}}else{if(this.x - this.moveX <= 5){this.doRealMovement = true;}}}else{this.x = this.startX + (150 * Math.cos(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;}
                        break;
                        }
                        case 1:
                        {
                            // Weapons
							this.laserX = this.x;
							this.laserY = this.y + 25;
							this.laserHeight = _canvas.height - this.y + 25;
                            if(this.laser){ if(!sfx.bossLaserPlaying){ sfx.play(2); } } else { if(sfx.bossLaserPlaying){ sfx.pause(2); } }
                            if(this.onTick == 0){ this.laserTimer += 1; if(this.laserTimer >= 1 && !this.laser){ this.laser = true; } else if(this.laserTimer >= 2) { this.laser = false; this.laserTimer = 0; } }
							if(this.shootTick != ticks){ this.shootTick = ticks; if(this.shootTick % 2 == 0){ } else { this.shoot(103); } }
							if(this.kamakazeSpawn1 != ticks)
                            {
								this.kamakazeSpawn1 = ticks;
								if(this.kamakazeSpawn1 == 5 || this.kamakazeSpawn1 == 15)
								{
									switch(this.spawnEnemy)
									{
										case 0:{ this.spawnKamakaze(this.x - 35, this.y + 25); this.spawnEnemy++; break; }
										case 1:{ this.spawnKamakaze(this.x + 35, this.y + 25); this.spawnEnemy++; break; }
										case 2:{ this.spawnEnemy = 0;break; }
									}
								}
                            }
                            // Movement
							if(!this.doRealMovement){
								this.moveX = this.startX + (100 * Math.sin(this.speed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
								this.moveY = this.startY + (100 * Math.cos(this.speed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
								var lenX = this.moveX - this.x;
								var lenY = this.moveY - this.y;
								var distance = Math.sqrt(lenX * lenX + lenY * lenY);
								if(distance < 5){ this.doRealMovement = true; } else { this.y += (375 - this.y) * delta; }
								if(!this.foundCircle){this.y += this.moveYSpeed * delta; this.moveYSpeed = this.circleYStop - this.y;}
							} else { 
								this.x = this.startX + (100 * Math.sin(this.speed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
								this.y = this.startY + (100 * Math.cos(this.speed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
							}
                        break;
                        }
                        case 2:
                        {
                            // Weapons
                            if(this.shootTick != ticks){ this.shootTick = ticks; if(this.shootTick % 2 == 0){ } else { this.shoot(103); } }
							
							//Timed Explosive
							
							if(this.kamakazeSpawn1 != ticks)
                            {
								this.kamakazeSpawn1 = ticks;
								if(this.kamakazeSpawn1 == 1)
								{
									var xOffsetSpawn = -50;
									for(var i = 0; i < 3; i++)
									{
										switch(i)
										{
											case 0:{this.spawnKamakaze(this.x + xOffsetSpawn, -50);break;}
											case 1:{this.spawnKamakaze(this.x + xOffsetSpawn,   0);break;}
											case 2:{this.spawnKamakaze(this.x + xOffsetSpawn, -50);break;}
										}
										xOffsetSpawn += 50;
									}
								}
								if(this.kamakazeSpawn1 == 5 || this.kamakazeSpawn1 == 15)
								{
									switch(this.spawnEnemy)
									{
										case 0:{ this.spawnKamakaze(this.x - 35, this.y + 25); this.spawnEnemy++; break; }
										case 1:{ this.spawnEnemy = 0; break; }
									}
								}
                            }
                            // Movement
							if(!this.doRealMovement){
								this.moveX = this.startX + (150 * Math.sin(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;
								if(this.moveX > this.x){ if(this.moveX - this.x <= 5){this.doRealMovement = true;}} else { if(this.x - this.moveX <= 5){this.doRealMovement = true;}}
							} else { 
								this.y = this.startY + (10 * Math.cos(this.speed * Math.PI * (this.waveLength * 2) * (this.timeAlive / 1000))) * this.sinOffset;
								this.x = this.startX + (75 * Math.sin(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;
							}
                        break;
                        }
                        case 3:
                        {
                            // Weapons
                            // Laser
							this.laserX = this.x;
							this.laserY = this.y + 25;
							this.laserHeight = _canvas.height - this.y + 25;
                            if(this.laser){ if(!sfx.bossLaserPlaying){sfx.play(2);} } else { if(sfx.bossLaserPlaying){sfx.pause(2);} }
                            if(this.onTick == 0){ this.laserTimer += 1; if(this.laserTimer >= 1 && !this.laser){ this.laser = true; } else if(this.laserTimer >= 2){ this.laser = false; this.laserTimer = 0; } }
                            // Timed Explosives
                            if(this.shootTick != ticks){ this.shootTick = ticks; if(this.shootTick % 20 == 0){ this.shoot(104); } }
                            // Spawn fighter squadron
                            if(this.kamakazeSpawn1 != ticks)
                            {   this.kamakazeSpawn1 = ticks;
								if(this.kamakazeSpawn1 == 1)
								{
									var xOffsetSpawn = -50;
									for(var i = 0; i < 3; i++)
									{
										switch(i)
										{
											case 0:{this.spawnKamakaze(this.x + xOffsetSpawn, -50);break;}
											case 1:{this.spawnKamakaze(this.x + xOffsetSpawn,   0);break;}
											case 2:{this.spawnKamakaze(this.x + xOffsetSpawn, -50);break;}
										}
										xOffsetSpawn += 50;
									}
									var X = 0; if(this.weaverSpawn == 0){this.weaverSpawn = 1; X = this.x - 100;} else { this.weaverSpawn = 0; X = this.x + 100; }
									if(X > this.x){ this.spawnWeaver(X, -50); this.spawnWeaver(X - 50, 0); } else { this.spawnWeaver(X, -50); this.spawnWeaver(X + 50, 0); }
								}
								if(this.kamakazeSpawn1 == 5 || this.kamakazeSpawn1 == 15)
								{
									switch(this.spawnEnemy)
									{
										case 0:{this.spawnKamakaze(this.x - 35, this.y + 25); this.spawnEnemy++; break;}
										case 1:{this.spawnEnemy = 0; break;}
									}
								}
                            }
                            // Movement
                            if(!this.doRealMovement){this.moveX = this.startX + (150 * Math.cos(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;if(this.moveX > this.x){if(this.moveX - this.x <= 5){this.doRealMovement = true;}}else{if(this.x - this.moveX <= 5){this.doRealMovement = true;}}}else{this.x = this.startX + (150 * Math.cos(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;}
                        break;
                        }
                        case 4:
                        {
                            // Weapons
                            // Laser
							this.laserX = this.x;
							this.laserY = this.y + 25;
							this.laserHeight = _canvas.height - this.y + 25;
                            if(this.laser){ if(!sfx.bossLaserPlaying){sfx.play(2);} } else { if(sfx.bossLaserPlaying){sfx.pause(2);} }
                            if(this.onTick == 0){ this.laserTimer += 1; if(this.laserTimer >= 1 && !this.laser){ this.laser = true; } else if(this.laserTimer >= 2){ this.laser = false; this.laserTimer = 0; } }
                            // Timed Explosives
                            if(this.shootTick != ticks){ this.shootTick = ticks; if(this.shootTick % 10 == 0){ this.shoot(104); } }
							 // Movement
							if(!this.doRealMovement){
								if(this.moveX <= 50) { this.moveLeft = false; }
								else if(this.moveX >= _buffer.width - 50){ this.moveLeft = true;}
								if(this.moveLeft){ this.moveX -= (this.speed * 5) * delta; } else { this.moveX += (this.speed * 5) * delta; }
								this.moveY = this.startY + (150 * Math.sin(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;
								
								var lenX = this.moveX - this.x;
								var lenY = this.moveY - this.y;
								var distance = Math.sqrt(lenX * lenX + lenY * lenY);
								if(distance < 15){ this.doRealMovement = true; } else { this.y += 25 * delta; }
								
								if(this.x > this.moveX){ this.x -= (Math.abs(this.x - this.moveX) * 3) * delta; } else {this.x += (Math.abs(this.x - this.moveX) * 3) * delta;}
								if(this.y > this.moveY){ this.y -= (Math.abs(this.y - this.moveY) * 3) * delta; } else {this.y += (Math.abs(this.y - this.moveY) * 3) * delta;}
							} else { 
								if(this.x <= 50) { this.moveLeft = false; }
								else if(this.x >= _buffer.width - 50){ this.moveLeft = true;}
								if(this.moveLeft){ this.x -= (this.speed * 5) * delta; } else { this.x += (this.speed * 5) * delta; }
								this.y = this.startY + (150 * Math.sin(this.speed * Math.PI * (this.waveLength / 2) * (this.timeAlive / 1000))) * this.sinOffset;
							}
                        break;
                        }
                    }
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 3, 3);
						explosions.push(explosion);
						this.spawnEnemy = 0;
						this.weaverSpawn = 0;
						this.speed = 10;
                        this.doRealMovement = false;
						if(sfx.bossLaserPlaying){ sfx.pause(2); }
						this.startX = this.x;
						this.startY = this.y;
						this.circleYStop = this.y + 25;
						this.phaseSave++;
						bossPhase = this.phaseSave;
                        if(this.phaseSave >= 5)
                        {
                            //Update Mission Data
                            gco.levelMission.UpdateProgress(this.type);
                            gco.win = true;
							gco.bossX = this.x;
							gco.bossY = this.y;
                            return 3;
                        }
                        else
                        {
							this.Model++;
							this.laser = false;
							this.inCenter = false;
                            this.life = this.baseLife * this.phaseSave;
							this.currentMaxLife = this.life;
							this.phase = -1;
							sfx.play(0);
                        }
						return 2;
					}
					return 0;
				}
				case 50:
				{//Splitter Small
					this.y += this.speed * delta;
					if(this.Model == 7)
					{
						if(Math.round(Math.random() * 700) == 1){ this.shoot(100); }
					} else
					{
						if(this.x < player.x){this.direction = 1;} else if(this.x > player.x){this.direction = 0;} else {}
						if(this.direction != this.lastDirection){this.momentum = this.xMoveSpeed * 2; this.lastDirection = this.direction;}
						if(this.y < player.y)
						{
							if(this.x < player.x)
							{
								this.x += (this.xMoveSpeed - this.momentum) * delta;
							}
							else if(this.x > player.x)
							{
								this.x -= (this.xMoveSpeed - this.momentum) * delta;
							} else { }
							this.momentum -= delta * 100;
							if(this.momentum < 0){this.momentum = 0;}
						}
						if(Math.round(Math.random() * 700) == 1){ this.shoot(100); }
					}
					if(this.life <= 0)
					{
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 0.1, 0.1);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					}
					else if(this.y > _canvas.height)
					{
						return 1;
					}
					return 0;
				}
			}
        }
		
		this.spawnKamakaze = function(X, Y)
		{
			var theLife = Math.round(Math.random() * 15) + 10;
			var theSpeed = Math.round(Math.random() * 150) + 200;
			var theDmg = Math.round(Math.random() * 10) + 10;
			var model;
			var Cores;
			var points;
			if(theDmg >= 16)
			{
				model = 5;
				theDmg = Math.round(Math.random() * 10) + 10;
				Cores = Math.round(Math.random() * 15) + 10;
				points = 6;
			}else 
			{
				points = 5;
				model = 4;
				theDmg = Math.round(Math.random() * 9) + 9;
				Cores = Math.round(Math.random() * 5) + 1;
			}
			width = 21;
			height = 31;
			var enemy = new Enemy(theSpeed, theDmg, theLife, Cores, width, height, model, X, Y, 2, points);
			enemies.push(enemy);
		}
		this.spawnWeaver = function(X, Y)
		{
			var theLife = Math.round(Math.random() * 15) + 15;
			var theSpeed = Math.round(Math.random() * 50) + 100;
			var theDmg = Math.round(Math.random() * 10) + 15;
			var Cores = Math.round(Math.random() * 20) + 20;
			var model;
			var points;
			if(theDmg > 10){model = 3; points = 7;} else {model = 2; points = 6;}
			width = 31;
			height = 21;
			var enemy = new Enemy(theSpeed, theDmg, theLife, Cores, width, height, model, X, Y, 1, points);
			enemies.push(enemy);
		}
		
		this.shoot = function(missileType)
        {
			switch(missileType)
			{
				case 100:
				{
					this.totalMissiles += 1;
					missile = new Missile(missiles.length, 300, missileType, this.x, this.y + 25, this.damage / 2);
					missiles.push(missile);
					break;
				}
				case 101:
				{
					this.totalMissiles += 1;
					missile = new Missile(missiles.length, 300, missileType, this.x, this.y + 25, this.damage * 2);
					missiles.push(missile);
					break;
				}
                case 102:
                {
                    this.totalMissiles += 1;
					missile = new Missile(missiles.length, 300, missileType, this.x - 24, this.y + 25, this.damage / 5);
					missiles.push(missile);
					break;
                }
                case 103:
                {
                    this.totalMissiles += 1;
					missile = new Missile(missiles.length, 300, missileType, this.x + 24, this.y + 25, this.damage / 5);
					missiles.push(missile);
					break;
                }
                case 104:
                {
                    this.totalMissiles += 1;
					missile = new Missile(missiles.length, 100, missileType, this.x, this.y, this.damage);
					missiles.push(missile);
					break;
                }
			}
        }
    }
	
	function RandomItemGeneration()
	{// randomItems[]
		this.onTick = 0;
		this.generate = function(lev)
		{
			if(ticks != this.onTick)
			{
				this.onTick = ticks;
				//Random enemy spawning with random levels
				var rand = Math.floor(Math.random() * (200));
				if(rand == 10)
				{
					//1% chance per tick to get an enemy.
					var startingX = Math.floor(Math.random() * _buffer.width);
					var itemNumber = (Math.floor(Math.random() * NUM_OF_RANDOM_ITEMS));
					newItem = new Item(itemNumber, startingX, 0);
					randomItems.push(newItem);
				}
			}
		}
	}
	
	function Item(itemNumber, inX, inY)
	{
		this.itemNum = itemNumber;
		this.x = inX;
        this.y = inY;
		this.speed = 50;
        this.width = 15;
        this.height = 15;
		this.used = false;
		
		this.Update = function()
		{
            this.y += this.speed * delta;
			if(this.used || this.y > _canvas.height)
			{
				return 1;
			}
			return 0;
		}
		
		this.doItemEffect = function()
		{
			if(!this.used)
			{
				itemsUsed += 1;
				switch(this.itemNum)
				{
					case 0:
					{//health
						player.life += 20; if(player.life > player.maxLife){player.life = player.maxLife;}
						this.used = true;
						break;
					}
					case 1:
					{//shield
						if(player.hasShield)
						{
							player.shield += 50 * player.shieldLevel;if(player.shield > player.maxShield){player.shield = player.maxShield;}
							player.recharge = true;
						}
						this.used = true;
						break;
					}
					case 2:
					{//secondary ammo
						this.used = true;
						player.secondaryAmmo += 25;
						if(player.secondaryAmmo > player.maxSecondaryAmmo){player.secondaryAmmo = player.maxSecondaryAmmo;}
						break;
					}
					case 3:
					{// Corez!!!
						this.used = true;
						var newAmount = 25 * gco.level;
						player.money += newAmount;
						totalCores += newAmount;
						break;	
					}
				}
			}
		}
	}
	
	function MoneyEntity(amnt, inX, inY)
	{
		this.amount = amnt;
		this.x = inX;
        this.y = inY;
		this.speed = 50;
        this.width = 15;
        this.height = 15;
		this.used = false;
		this.Update = function()
		{
            this.y += this.speed * delta;
			if(this.used || this.y > _canvas.height)
			{
				return 1;
			}
			return 0;
		}
	}

    function Missile(missNum, theSpeed, missType, inX, inY, dmg)
    {
        this.missileNum = missNum;
        this.x = inX;
        this.y = inY;
        this.speed = theSpeed;
        this.width = 25;
        this.height = 25;
        this.life = 1;
		this.damage = dmg;
		this.missileType = missType;
		this.moveVar = 0;
		this.startX = this.x;
		this.timeAlive = 0;
		this.sinOffset = 1;
        this.timer = 0;
		this.detonated = false;
		//Special Init logic
		this.missileTarget = 1000;//missile target will remain 1000 is no target selected
		switch(this.missileType)
		{
			case 2:
			{
				if(this.damage == 3){this.sinOffset = -1;}	
				break;
			}
			case 51:
			{
				var distance = 1000;
				var tempTarget = 1000;
				for(var i = 0; i < enemies.length; i++)
				{
					if(enemies[i].x > this.x - 50 && enemies[i].x < this.x + 50)
					{//Enemy is within missile's sight
						if(this.y - enemies[i].y > 0 && this.y - enemies[i].y < distance)
						{//Enemy is in front of missile and is the closest to missile
							distance = this.y - enemies[i].y;
							tempTarget = enemies[i].enemyNum;
						}
					}
				}
				if(tempTarget != 1000)
				{
					this.missileTarget = tempTarget;
				}
				break;
			}
            case 104:
            {
                this.timer = Math.floor(Math.random() * (4)) + 2;
                break;
            }
		}
		
        this.Update = function(i)
        {
			this.timeAlive += delta;
			if(this.y < 0 || this.y > _buffer.height){ this.life = 0; }
			switch(this.missileType)
			{
				case 0:
				{//Primary Assult
					this.y -= this.speed * delta;
					break;
				}
				case 1:
				{//Rapid Fire Assult
					this.y -= this.speed * delta;
					break;
				}
				case 2:
				{//Rapid Fire Cyclone
					this.x = this.startX + (30 * Math.sin(30 * 3.14 * 100 * (this.timeAlive / 1000))) * this.sinOffset;
					this.y -= this.speed * delta;
					break;
				}
				case 50:
				{//SD-15 Sidewinder
					this.y -= this.speed * delta;
					break;
				}
				case 51:
				{//DM-21 Auto Strike
					this.y -= this.speed * delta;
					if(this.missileTarget != 1000)
					{
						if(self.isEnemyAlive(this.missileTarget))
						{
							var targetEnemy = self.getEnemy(this.missileTarget);
							if(targetEnemy.x < this.x)
							{
								this.x -= (this.speed / 2) * delta;
							} else
							if(targetEnemy.x > this.x)
							{
								this.x += (this.speed / 2) * delta;
							} else
							{
								this.x = targetEnemy.x;
							}
						}
					}
					break;
				}
                case 52:
				{//Impact Burst Mine
					break;
				}
				case 100:
				{//Level 2 enemy bullet
					this.y += this.speed * delta;
					break;
				}
				case 101:
				{//Level 5 enemy bomb
					this.y += this.speed * delta;
					break;
				}
                case 102:
				{//Boss shotA
					this.y += this.speed * delta;
					break;
				}
                case 103:
				{//Boss shotB
					this.y += this.speed * delta;
					break;
				}
                case 104:
				{//Boss timed explosive
                    if(!this.detonated)
                    {
                        if(this.timer > 0)
                        {
                            if(ticks % 20 == 0)
                            {
                                this.timer--;
                            }
                            this.y += this.speed * delta;
                        }
                        else
                        {
                            this.detonated = true;
                            this.width = 60;
                            this.height = 60;
                            this.timer = 10;
                        }
                    }
                    else
                    {
                        this.timer--;
                        if(this.timer <= 0)
                        {
							sfx.play(0);
                            this.life = 0;
                        }
                    }
					if(missiles[i].life <= 0)
					{
                        explosion = new Explosion(missiles[i].x, missiles[i].y, 15, 5, 60, 3, 0.1, 0.1);
                        explosions.push(explosion);
                        explosion = new Explosion(missiles[i].x, missiles[i].y, 15, 5, 60, 3, 3, 0.1);
                        explosions.push(explosion);
                    }
					break;
				}
			}
        }
    }

    function Particle(X, Y, R, G, B)
    {
        this.x = X;
        this.y = Y;
        this.xv = ((Math.random() - 0.5) * 2.0 * 5.0) * 80;//*80 for delta offset
        this.yv = ((Math.random() - 0.5) * 2.0 * 5.0) * 80;
        this.red = R;
        this.green = G;
        this.blue = B;
    }
    
    function Explosion(X, Y, NumParticles, Size, MaxAge, R, G, B)
    {
        this.particles = [];
        this.numParticles = Math.ceil((NumParticles / 5) * particleOffset);
        this.size = Size;
        this.age = 0;
        this.maxAge = MaxAge;
        X = Math.round(X);
        Y = Math.round(Y);
				
        for(var i = 0; i < this.numParticles; i++) {
            this.particles.push(new Particle(X, Y, R, G, B));
        }
            
        this.Update = function() {
            for(var i = 0; i < this.particles.length; i++) {
                this.particles[i].x += this.particles[i].xv * delta;
                this.particles[i].y += this.particles[i].yv * delta;
            }
            
            if(this.age >= this.maxAge) {
              return 1;
            }
            this.age = this.age + 1;
            return 0;
        }
    }

    function Player(Width, Height)
    {
		this.x = 400;
		this.y = 300;
        this.movingX = 0;
        this.movingY = 0;
        this.movingUp = false;
        this.movingDown = false;
        this.movingLeft = false;
        this.movingRight = false;
        this.yVecMulti = 1;
		this.speed = 200;
		this.width = Width;
		this.height = Height;
		this.totalMissiles = 0;
		this.life = 100;
		this.lives = 3;
		this.maxLife = 100;
		this.shieldLevel = 0;
		this.shield = 100;
		this.maxShield = this.shield * this.shieldLevel;
		this.hasShield = false;
        this.ship = 8;
        this.captain = 2;
	
		this.weapon = 0;// 0 - 48
		this.secondary = 50;//Starts at 50, 49 = no secondary.
		this.secondaryAmmo = 50;
		this.secondaryAmmoLevel = 1;
		this.maxSecondaryAmmo = 50 * this.secondaryAmmoLevel;
	
		this.weaponFunc = true;//Used for weapon effects
		this.didShoot = false;
		this.onTick = 0;
		this.money = 0;
		this.currentFuel = 60; // Base 60
		this.MAX_FUEL = 60;
	
		this.laser = false;//true if laser is on
		this.laserX = this.x;
		this.laserY = this.y - 25;
		this.laserWidth = 20;
		this.laserHeight = this.y - 25;
        this.idleAnim = 0; // 0-3
        this.turnAnimL = 4; // 4-11
        this.turnAnimR = 12; // 12-19  
        this.money = 0;
        
        this.isAlive = function()
        {
            return (this.life > 0);
        }
    
        this.DamagePlayer = function(dmg)
        {
            if(this.hasShield && this.shield > 0)
            {
                this.shield -= dmg * 3;
            } else
            {
                this.life -= dmg;
                if(this.life < 0){this.life = 0;}
            }
            if(!this.isAlive())
            { 
                gco.ShowContinueScreen();
                sfx.play(0);
                explosion = new Explosion(player.x, player.y, 350, 5, 200, 0.1, 3, 0.1);
                explosions.push(explosion);
                this.laser = false;
            }
        }

        this.setMovementVector = function(moveX, moveY) {
            this.movingX = moveX;
            this.movingY = moveY;

            // Set states for Y trajectories
            if(this.movingY < 0) {
                this.movingUp = true;
                this.movingDown = false;
                if(this.yVecMulti < 1.3) this.yVecMulti += delta;
            } else if(this.movingY > 0) {
                this.movingUp = false;
                this.movingDown = true;
                if(this.yVecMulti > 0.85) this.yVecMulti -= delta;
            } else if(this.movingY == 0) {
                this.movingUp = false;
                this.movingDown = false;
                if(this.yVecMulti > 1) this.yVecMulti -= delta;
                if(this.yVecMulti < 1) this.yVecMulti += delta;
            }

            // Set states for X trajectories
            if(this.movingX < 0) {
                this.movingLeft = true;
                this.movingRight = false;
            } else if(this.movingX > 0) {
                this.movingLeft = false;
                this.movingRight = true;
            } else if(this.movingX == 0) {
                this.movingLeft = false;
                this.movingRight = false;
            }
        }

        this.Update = function()
        {
            this.x1 = this.x;
            this.y1 = this.y - (this.height / 2);
            this.x2 = this.x - (this.width / 2);
            this.y2 = this.y + (this.height / 2);
            this.x3 = this.x + (this.width / 2);
            this.y3 = this.y + (this.height / 2);

            //Laser Updating
            if(this.secondary >= 9000) {
                if(Keys[19] != 0 && this.secondaryAmmo > 0) {
                    if(!sfx.laserPlaying){ sfx.play(1); }
                    this.laser = true;
                    this.laserX = this.x;
                    this.laserY = 0;
                    this.laserHeight = this.y - 25;
                    if(ticks == 0){ this.secondaryAmmo -= 3; if(this.secondaryAmmo < 0){this.secondaryAmmo = 0;} }
                } else { if(sfx.laserPlaying){ sfx.pause(1); } this.laser = false; }
            } else
            {
                this.laser = false;
                if(sfx.laserPlaying){ sfx.pause(1); }
            }
            
            if(this.hasShield)
            {
                if(this.shield <= 0)
                {
                    this.shield = 0;
                }
            }
        }

        this.drawPlayer = function() {

            if(this.ship == 2){
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages2[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages2[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages2[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages2[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages2[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                } 
            }else if (this.ship == 3) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages3[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages3[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages3[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages3[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages3[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 4) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages4[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages4[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages4[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages4[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages4[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 5) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages5[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages5[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages5[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages5[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages5[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 6) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages6[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages6[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages6[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages6[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages6[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 7) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages7[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages7[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages7[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages7[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages7[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);   
                }
            }else if (this.ship == 8) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages8[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages8[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages8[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages8[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages8[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            } else {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages1[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying()) {
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages1[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages1[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages1[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages1[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }  
            }

        }

        this.runOnTick = function()
        {
            if(this.onTick % 2 == 0) {
                this.idleAnim++;
                if(this.idleAnim > 3) this.idleAnim = 0;
            }
            if(Keys[1] >= 1){
                if(this.onTick % 2 == 0) {
                    this.turnAnimL++;
                    if(this.turnAnimL > 11) this.turnAnimL = 8;
                }
            }
            if(Keys[3] >= 1){
                if(this.onTick % 2 == 0) {
                    this.turnAnimR++;
                    if(this.turnAnimR > 19) this.turnAnimR = 16;
                }
            }
            if(Keys[1] == 0) this.turnAnimL = 4;            
            if(Keys[3] == 0) this.turnAnimR = 12;
        }
		
		this.upgradeShield = function()
		{
			this.hasShield = true;
			this.shieldLevel += 1;
			this.maxShield = 100 * this.shieldLevel
			this.resetShield();
		}
		
		this.resetShield = function()
		{
			this.shield = this.maxShield;
		}
		
		this.upgradeSecondaryAmmo = function()
		{
			this.secondaryAmmoLevel += 1;
			this.maxSecondaryAmmo = 50 * this.secondaryAmmoLevel;
			this.resetSecondaryAmmo();
		}
		
		this.resetSecondaryAmmo = function()
		{
			if(this.secondaryAmmo < this.maxSecondaryAmmo)
			{
				this.secondaryAmmo = this.maxSecondaryAmmo;
			}
		}

        this.shoot = function()
        {
                switch(this.weapon)
                {
                    case 0:
                    {
                        this.totalMissiles += 1;
                        if(this.weaponFunc)
                        {
                            missile = new Missile(missiles.length, 300, this.weapon, this.x, this.y - 25, 1);
                            missiles.push(missile);
                        }
                        this.weaponFunc = !this.weaponFunc;
                        break;
                    }
                    case 1:
                    {
                        this.totalMissiles += 1;
                        if(this.weaponFunc)
                        {
                            missile = new Missile(missiles.length, 300, this.weapon, this.x - 5, this.y - 25, 2);
                            missiles.push(missile);
                        } else
                        {
                            missile = new Missile(missiles.length, 300, this.weapon, this.x + 5, this.y - 25, 2);
                            missiles.push(missile);
                        }
                        this.weaponFunc = !this.weaponFunc;
                        break;
                    }
                    case 2:
                    {
                        this.totalMissiles += 1;
                        if(this.weaponFunc)
                        {
                            missile = new Missile(missiles.length, 300, 1, this.x - 5, this.y - 25, 2);
                            missiles.push(missile);
                            missile = new Missile(missiles.length, 300, this.weapon, this.x + 5, this.y - 25, 2);
                            missiles.push(missile);
                        } else
                        {
                            missile = new Missile(missiles.length, 300, 1, this.x + 5, this.y - 25, 2);
                            missiles.push(missile);
                            missile = new Missile(missiles.length, 300, this.weapon, this.x - 5, this.y - 25, 3);
                            missiles.push(missile);
                        }
                        this.weaponFunc = !this.weaponFunc;
                        break;
                    }
                    default:{break;}
                }
        }

		this.shootSecondary = function()
		{
			if(this.secondaryAmmo > 0 && this.secondary < 9000)
			{
				switch(this.secondary)
				{
					case 50:
					{
                        this.secondaryAmmo -= 1;
						this.totalMissiles += 1;
						missile = new Missile(missiles.length, 200, this.secondary, this.x, this.y - 25, 20);
						missiles.push(missile);
						break;
					}
					case 51:
					{
                        this.secondaryAmmo -= 1;
						this.totalMissiles += 1;
						missile = new Missile(missiles.length, 200, this.secondary, this.x, this.y - 25, 15);
						missiles.push(missile);
						break;
					}
                    case 52:
					{
                        this.secondaryAmmo -= 1;
						this.totalMissiles += 1;
						missile = new Missile(missiles.length, 200, this.secondary, this.x, this.y - 25, 25);
						missiles.push(missile);
						break;
					}
				}
			}
		}
    }
    
    function GUIText(Text, X, Y, fStyle, aX, aY, col)
    {
        this.text = Text;
        this.x = X;
        this.y = Y;
        this.fontStyle = fStyle;
        this.alignX = aX;
        this.alignY = aY;
        this.color = col;

        this.Draw = function() {
            buffer.beginPath();
            buffer.font = this.fontStyle;
            buffer.textAlign = this.alignX;
            buffer.textBaseline = this.alignY;
            buffer.fillStyle = this.color;
            buffer.fillText(this.text, this.x, this.y);
            buffer.closePath();
        };
    }
	
	function Story()
	{
		this.overlayAlpha = 0.0;
		this.center = _buffer.width / 2;
		this.credits = [];
		this.lines = 15;
		this.lineHeight = 30;
		this.yOffset = 0;
		this.scrollSpeed = 25;
		this.isBlackedOut = false;
		var out = "";
		var size = "";
		var color = "";
		for(var i = 0; i < this.lines; i++)
		{
			switch(i)
			{
				case 0:{out = "In the year 3280, humans and Drones clashed for control of the universe."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 1:{out = "After decades of fierce conflict, humanity's presence in international"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 2:{out = "space began to dwindle, and, the Drones overran all major human civilization."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 3:{out = " "; size = "18px Helvetica"; color = "rgb(96, 255, 96)"; break;}
				case 4:{out = " "; size = "18px Helvetica"; color = "rgb(96, 255, 96)"; break;}
				case 5:{out = "It was a total loss. International Space Command HQ was reduced to ash."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 6:{out = "Whatever was left of the fleet scattered across the far reaches of"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 7:{out = "space to hide from the dreaded armies of the Drones."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 8:{out = " "; size = "18px Helvetica"; color = "rgb(96, 255, 96)"; break;}
				case 9:{out = " "; size = "18px Helvetica"; color = "rgb(96, 255, 96)"; break;}
				case 10:{out = "Although the future of humanity is left bleak by the Drone bombardment,"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 11:{out = "an ace pilot now races through space towards the heart of the Drone army."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 12:{out = "There is only one mission to complete now: "; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 13:{out = " "; size = "18px Helvetica"; color = "rgb(96, 255, 96)"; break;}
				case 14:{out = "Kill all the Things"; size = "32px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
				default:{out = "Line not added."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
			}
			this.credits[i] = new GUIText(out, this.center, _buffer.height + (this.lineHeight * i), size, "center", "top", color);
		}
		
		this.Update = function()
		{
			if(this.overlayAlpha >= 1){ this.isBlackedOut = true; } else { this.overlayAlpha += delta / 2; }
			if(this.isBlackedOut && !this.CreditsFinished())
            {
                this.yOffset += this.scrollSpeed * delta;
            }
			else if(this.isBlackedOut && this.CreditsFinished())
			{
				this.overlayAlpha -= delta;
				if(this.overlayAlpha <= 0){ gco.EndStoryMode(); }
			}
		}
		
		this.Draw = function()
		{
			this.DrawOverlay();
			if(this.isBlackedOut && !this.CreditsFinished()){ this.DrawCredits(); }
		}
		
		this.DrawOverlay = function()
		{
			buffer.fillStyle = "rgba(0, 0, 0, " + this.overlayAlpha + ")";
			buffer.fillRect(0, 0, _buffer.width, _buffer.height);
		}
		
		this.DrawCredits = function()
		{
			buffer.beginPath();
			for(var i = 0; i < this.credits.length; i++)
			{
				buffer.fillStyle = this.credits[i].color;
				buffer.font = this.credits[i].fontStyle;
				buffer.textAlign = this.credits[i].alignX;
				buffer.textBaseline = this.credits[i].alignY;
				buffer.fillText(this.credits[i].text, this.credits[i].x, this.credits[i].y - this.yOffset);
			}
			buffer.closePath();
		}
		
		this.CreditsFinished = function()
		{
			if(this.credits[this.credits.length - 1].y - this.yOffset < -20){ return true; } else { return false; }
		}
	}
	
	function Credits()
	{
		this.overlayAlpha = 0.0;
		this.center = _buffer.width / 2;
		this.credits = [];
		this.lines = 27;
		this.lineHeight = 50;
		this.yOffset = 0;
		this.scrollSpeed = 25;
		this.isBlackedOut = false;
		var out = "";
		var size = "";
		var color = "";
		for(var i = 0; i < this.lines; i++)
		{
			switch(i)
			{
				case 0:{out = "Humanity is Saved"; size = "28px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
				case 1:{out = "Our ace pilot has defeated the drone core in enough time to save humanity."; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 2:{out = "The task of rebuilding civilization, however difficult, can still never"; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 3:{out = "match the devotion and courage it took for our ace pilot to..."; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 4:{out = "Kill all the Things"; size = "48px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
				case 5:{out = " "; size = "10px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 6:{out = "Produced by"; size = "18px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				//case 7:{out = "Insert Last Bonfire Logo Here"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 7:{out = ""; size = "32px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 8:{out = ""; size = "32px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 9:{out = ""; size = "32px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 10:{out = "Program Managers"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 11:{out = "Shawn Deprey"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 12:{out = "Lead Game System Designers"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 13:{out = "Shawn Deprey"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 14:{out = "Lead Software Engineers"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 15:{out = "Shawn Deprey"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 16:{out = "Software Engineers"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 17:{out = "Drew Muller"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 18:{out = "Graphic Designers"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 19:{out = "Shawn Deprey"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 20:{out = "Drew Muller"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 21:{out = "Sound Artists"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96)"; break;}
				case 22:{out = "David Van Laar-Veth (The Badass)"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 23:{out = "Story"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96"; break;}
				case 24:{out = "Mico Picache"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
				case 25:{out = " "; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
				case 26:{out = "Thanks for playing!"; size = "28px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
				default:{out = ""; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
			}
			this.credits[i] = new GUIText(out, this.center, _buffer.height + (this.lineHeight * i), size, "center", "top", color);
		}
		
		this.Update = function()
		{
			if(this.overlayAlpha >= 1){ this.isBlackedOut = true; } else { this.overlayAlpha += delta / 16; }
			if(this.isBlackedOut && !this.CreditsFinished()){ this.yOffset += this.scrollSpeed * delta; }
			else if(this.isBlackedOut && this.CreditsFinished() && currentGui != 7){ currentGui = 7; menu.delayNextInput(); }
		}
		
		this.Draw = function()
		{
			this.DrawOverlay();
			if(this.isBlackedOut && !this.CreditsFinished()){ this.DrawCredits(); }
		}
		
		this.DrawOverlay = function()
		{
			buffer.fillStyle = "rgba(0, 0, 0, " + this.overlayAlpha + ")";
			buffer.fillRect(0, 0, _buffer.width, _buffer.height);
		}
		
		this.DrawCredits = function()
		{
			buffer.beginPath();
			for(var i = 0; i < this.credits.length; i++)
			{
				if(i == 7) {
					buffer.drawImage(logoImages[0], 200, this.credits[i].y - this.yOffset, 400, 100);
				}else{
					buffer.fillStyle = this.credits[i].color;
					buffer.font = this.credits[i].fontStyle;
					buffer.textAlign = this.credits[i].alignX;
					buffer.textBaseline = this.credits[i].alignY;
					buffer.fillText(this.credits[i].text, this.credits[i].x, this.credits[i].y - this.yOffset);
				}
			}
			buffer.closePath();
		}
		
		this.CreditsFinished = function()
		{
			if(this.credits[this.credits.length - 1].y - this.yOffset < -20){ return true; } else { return false; }
		}
	}
    
    /******************************************************/
    

    /******************************************************/
    // Initialization
    /******************************************************/
    this.Init = function()
    {
        _canvas = document.getElementById('canvas');
        if(_canvas && _canvas.getContext)
        {
            canvas = _canvas.getContext('2d');
            // Disable image smoothing
            canvas.imageSmoothingEnabled = false;
            canvas.mozImageSmoothingEnabled = false; // Firefox
            canvas.webkitImageSmoothingEnabled = false; // Chrome, Safari, Opera
            canvas.msImageSmoothingEnabled = false; // IE

            _buffer = document.createElement('canvas');
            _buffer.width = _canvas.width;
            _buffer.height = _canvas.height;
            // Disable image smoothing
            buffer = _buffer.getContext('2d');
            buffer.imageSmoothingEnabled = false;
            buffer.mozImageSmoothingEnabled = false; // Firefox
            buffer.webkitImageSmoothingEnabled = false; // Chrome, Safari, Opera
            buffer.msImageSmoothingEnabled = false; // IE
            buffer.strokeStyle = "rgb(255, 255, 255)";
            buffer.fillStyle = "rgb(255, 255, 255)";
            buffer.font = "bold 25px sans-serif";
        }
        player = new Player(24, 40);
        if (player.ship == 8) player = new Player(40, 40);
		enemyGeneration = new EnemyGeneration();
        starGeneration = new StarGeneration();
        foregroundGeneration = new ForegroundGeneration();
		itemGeneration = new RandomItemGeneration();
		gco = new GameControlObject();
		gco.Init();
        menu = new Menu(); // State manager for all game menus to enable keyboard and gamepad navigation
        menu.Init()
        ed = new EventDirector();
		
		sfx = new SFXObject();
    }

    /******************************************************/


    /******************************************************/
    // Run
    /******************************************************/
    
    this.Run = function()
    {	
        if(canvas != null) {
            self.gameLoop = setInterval(self.Loop, 1);
        }	
    }
    
    /******************************************************/


    /******************************************************/
    // Update
    /******************************************************/
    
    this.Update = function()
    {
		if(ticks == 0){if(self.checkAllSoundsPaused()){ swapBGM(); }}
		if(gco.mustPurchasePrevious > 0){ gco.mustPurchasePrevious -= (delta * 1000); }
		if(gco.notEnoughCores > 0){ gco.notEnoughCores -= (delta * 1000); }
		if(gco.playStory){ gco.story.Update(); }
		// Stop Sound Check
		if((currentGui != NULL_GUI_STATE) && sfx.laserPlaying){sfx.pause(1);}
		if((gameState != 1) && sfx.bossLaserPlaying){sfx.pause(2);}
        if(levelStart){ bgm.play(); }

        // Menus
        menu.Update();

        // Input
        self.doInput();
        self.getInput();

		// Random Star & Foreground Generation
        if(!paused) {
            starGeneration.generate();
            foregroundGeneration.Update();
            ed.Update();
            for(var i = 0; i < stars.length; i++) {
                if(stars[i].Update() != 0) {
                    if(stars[i].isPlanet){ starGeneration.hasPlanet = false;}
                    self.popArray(stars, i);
                }
            }
        }

        // Game objects that should keep running even during an event
        if(!paused && gameState == 1 && !gco.win) {
            for(var i = 0; i < missiles.length; i++) { // Update Missile Objects 
                missiles[i].Update(i);
                if(missiles[i].life <= 0){ self.popArray(missiles, i); }
            }
            for(var i = 0; i < explosions.length; i++) { // Explosion Object Updates
                if(explosions[i].Update() != 0) self.popArray(explosions, i);
            }
        }

        if(!ed.eventPlaying()) { // If event is not playing
            if(!paused && gameState == 1 && !gco.win) {
                gco.Update(); // Game Control Object Update
                enemyGeneration.generate(gco.level); // Random Enemy Generation
                itemGeneration.generate(); // Random Item Generation

                if(player.isAlive()) { // Update Player
                    self.levelBoundingCheck(player);
                    player.Update();
                }
                
                for(var i = 0; i < enemies.length; i++) { // Enemy Update Ticks
                    if(enemies[i].onTick != ticks){ enemies[i].onTick = ticks; }
                    switch(enemies[i].Update()){
                        case 1:
                            if(!self.isEnemyAlive(enemies[i].enemyNum)) {
                                enemiesKilled += 1;
                                enemyPoints += enemies[i].points;
                                sfx.play(0);
                                mon = new MoneyEntity(enemies[i].Cores, enemies[i].x, enemies[i].y);
                                money.push(mon);
                            }
                            if(!gco.win) self.popArray(enemies, i);
                        break;
                    }
                }
                
                for(var i = 0; i < money.length; i++) { // Money Item Updates
                    if(money[i].Update() != 0) self.popArray(money, i);
                }
                for(var i = 0; i < randomItems.length; i++) { // Random Item Updates
                    if(randomItems[i].Update() != 0) self.popArray(randomItems, i);
                }
                
                // Collision Detection
                if(colSwap) {
                    colSwap = false;
                    for(var i = 0; i < money.length; i++) { // Actual Collision with money
                        if(player.isAlive() && !money[i].used) {
                            if(self.Collision(player, money[i])) {
                                player.money += money[i].amount;
                                totalCores += money[i].amount;
                                money[i].used = true;
                            }
                        }
                    }
                    
                    for(var i = 0; i < randomItems.length; i++) { // Actual Collision with random item
                        if(player.isAlive() && !randomItems[i].used) {
                            if(self.Collision(player, randomItems[i])) {
                                randomItems[i].doItemEffect();
                            }
                        }
                    }
                    
                    for(var a = 0; a < enemies.length; a++) { // Various Update Ticks and Collision with enemies
                        if(player.isAlive()) {
                            if(ticks % 2 == 0) { // Laser Collision Detection
                                if(enemies[a].laser) { // Boss Laser
                                    if(self.BossLaserCollision(player, enemies[a])) {
                                        player.DamagePlayer(2);
                                    }
                                }
                                if(player.laser) { // Player Laser
                                    if(self.LaserCollision(enemies[a])) {
                                        enemies[a].life -= 5;
                                        explosion = new Explosion(enemies[a].x, enemies[a].y, 2, 4, 50, 0.1, 0.1, 3.0);
                                        explosions.push(explosion);
                                    }
                                }
                            }
                            
                            if(self.Collision(player, enemies[a])) { // Player Collision with enemies or boss
                                if(enemies[a].isBoss) {
                                    player.DamagePlayer(9000); // once to ensure shield is gone
                                    player.DamagePlayer(9000); // once to ensure player death
                                } else {
                                    player.DamagePlayer(Math.round(enemies[a].damage));
                                    explosion = new Explosion(player.x, player.y, 5, 10, 60, 0.1, 3, 0.1);
                                    explosions.push(explosion);
                                    enemies[a].life = 0;
                                }
                            }
                                                
                            for(var b = 0; b < missiles.length; b++) { // Missile Collision Detection
                                if(missiles[b].missileType > 99) { // Collision detection with enemy missiles and player
                                    if(self.Collision(player, missiles[b])) {
                                        explosion = new Explosion(missiles[b].x, missiles[b].y, 5, 10, 100, 1, 1, 1);
                                        explosions.push(explosion);
                                        player.DamagePlayer(missiles[b].damage);
                                        this.popArray(missiles, b);
                                    }
                                } else { // Collision detection with player missiles and enemies
                                    if(self.Collision(missiles[b], enemies[a])) {
                                        explosion = new Explosion(missiles[b].x, missiles[b].y, 5, 10, 100, 1, 1, 1);
                                        explosions.push(explosion);
                                        enemies[a].life -= missiles[b].damage;
                                        this.popArray(missiles, b);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    score = (enemyPoints + enemiesKilled) * 10;
                    colSwap = true;
                }

            // WIN CONDITION & CREDITS
            // -------------------------------------------------------------------------------
            // The game is won at this point. Do what happens exactly after game is beat here.
            } else if(gameState == 1 && gco.win) {
                if(sfx.laserPlaying){sfx.pause(1);}
                gco.credits.Update();
                if(!gco.credits.isBlackedOut){ gco.Update(); }//Will do random boss explosions
                for(var i = 0; i < explosions.length; i++){
                    if(explosions[i].Update() != 0) {
                        self.popArray(explosions, i);
                    }
                }
            }
        }
    }

	this.PlayerCollision = function(Player, Target)
    {
        if(
           ((Player.y - Player.height / 2) <= (Target.y + Target.height / 3) &&
           (Player.y + Player.height / 2) >= (Target.y - Target.height / 3))
          )
        {
            if(
               ((Player.x - Player.width / 2) <= (Target.x + Target.width / 3) &&
               (Player.x + Player.width / 2) >= (Target.x - Target.width / 3))
              )
            {
                return true;
            }
            return false;
        }
        return false;
    }
	
	this.levelBoundingCheck = function(Player)
	{
		if(Player.y - Player.height / 2 < 0){Player.y = Player.height / 2;}
		if(Player.y + Player.height / 2 > _buffer.height){Player.y = _buffer.height - Player.height / 2;}
		if(Player.x - Player.width / 2 < 0){Player.x = Player.width / 2;}
		if(Player.x + Player.width / 2 > _buffer.width){Player.x = _buffer.width - Player.width / 2;}
	}
    
    this.Collision = function(Shot, Target)
    {
        if(
           ((Shot.y - Shot.height / 2) <= (Target.y + Target.height / 2) &&
           (Shot.y + Shot.height / 2) >= (Target.y - Target.height / 2))
          )
        {
            if(
               ((Shot.x - Shot.width / 2) <= (Target.x + Target.width / 2) &&
               (Shot.x + Shot.width / 2) >= (Target.x - Target.width / 2))
              )
            {
                return true;
            }
            return false;
        }
        return false;
    }
	
	this.LaserCollision = function(Target)
	{
		if((player.laserY <= (Target.y + Target.height / 2) && player.laserHeight >= (Target.y - Target.height / 2)))
        {
            if(((player.laserX - 10) <= (Target.x + Target.width / 2) && (player.laserX + 10) >= (Target.x - Target.width / 2)))
            {
                return true;
            }
            return false;
        }
        return false;
	}
	
	this.BossLaserCollision = function(Target, Boss)
	{
		if((Boss.laserY <= (Target.y + Target.height / 2) && (Boss.laserHeight + Boss.y) >= (Target.y - Target.height / 2)))
        {
            if(((Boss.laserX - 5) <= (Target.x + Target.width / 2) && (Boss.laserX + 5) >= (Target.x - Target.width / 2)))
            {
                return true;
            }
            return false;
        }
        return false;
	}
	
	function doMouseClick(e)
	{
        if(ed.eventPlaying()) {
            ed.DoInput()
        }
        // This function should mimic the menu.select() functionality. If something is added there, it should be here, and visa-versa
		//State GUIs
            // 0 = Main Menu
            // 1 = Pause Menu
            // 2 = Level Up Menu
            // 3 = Continue Menu
            // 4 = Level Up Menu
            // 5 = Game Over Menu
            // 6 = Options Menu
            // 7 = Submit Score Menu
		switch(currentGui)
		{
			case 0:
			{//Main Menu
                if(!gco.playStory)
                {
                    if(mouseX > (_canvas.width / 2 + 10) - 115 && mouseX < (_canvas.width / 2 + 10) + 100 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10)
                    {
                        currentGui = 2;//default case will Trigger
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 65 && mouseX < (_canvas.width / 2 + 10) + 40 && mouseY < (_canvas.height / 2 + 60) + 20 && mouseY > (_canvas.height / 2 + 60) - 10)
                    {
                        currentGui = 6; lastGui = 0;	
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 65 && mouseX < (_canvas.width / 2 + 10) + 40 && mouseY < (_canvas.height / 2 + 110) + 20 && mouseY > (_canvas.height / 2 + 110) - 10)
                    {
                        gco.playStory = true;
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 80 && mouseX < (_canvas.width / 2 + 10) + 55 && mouseY < (_canvas.height / 2 + 150) + 20 && mouseY > (_canvas.height / 2 + 150) - 10)
                    {
                        ipcRenderer.send('quit-app');
                    }
                }
                break;
			}
            case 1:
            {//Pause Menu
                if(mouseX > (_canvas.width / 2) - 50 && mouseX < (_canvas.width / 2) + 50 && mouseY < (_canvas.height / 2) + 30 && mouseY > (_canvas.height / 2)) {
                    currentGui = 6; lastGui = 1;
                }
                if(mouseX > (_canvas.width / 2) - 54 && mouseX < (_canvas.width / 2) + 54 && mouseY < (_canvas.height / 2) + 70 && mouseY > (_canvas.height / 2) + 45) {
                    self.hardReset();
                }
                if(mouseX > (_canvas.width / 2 ) - 52 && mouseX < (_canvas.width / 2 + 20) + 35 && mouseY < (_canvas.height / 2 + 110) - 3 && mouseY > (_canvas.height / 2 + 80) ) {
                    ipcRenderer.send('quit-app');
                }
                break;
            }
			case 2:
			{//Level up Menu
                //**********************************************************************//
                //						UPGRADE MENU SECTION							//
                //**********************************************************************//
                if(mouseX > (_canvas.width - 210) && mouseX < (_canvas.width - 10) && mouseY < (278) && mouseY > (250))
                {//Start Level
                    if(player.weapon != 49){ gco.StartLevel(); }
                }
                if(mouseX > (_canvas.width - 235) && mouseX < (_canvas.width - 125) && mouseY < (55) && mouseY > (15))
                {//Options Menu
                    currentGui = 6; lastGui = 2;
                }
                if(mouseX > (_canvas.width - 90) && mouseX < (_canvas.width - 25) && mouseY < (55) && mouseY > (15))
                {//Quit
                    self.hardReset();
                }
                if(mouseX > 10 && mouseX < 58 && mouseY > 280 && mouseY < 328)
                {//Primary Assult, Weapon ID: 0
                    if(gco.weaponsOwned[0]){ gco.EquipWeapon(0); } else { if(player.money >= gco.weaponPrice[0]){ gco.PurchaseWeapon(0); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 60 && mouseX < 108 && mouseY > 280 && mouseY < 328)
                {//Rapid Fire Assult, Weapon ID: 1
                    if(gco.weaponsOwned[1]){ gco.EquipWeapon(1); } else { if(player.money >= gco.weaponPrice[1]){ gco.PurchaseWeapon(1); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 110 && mouseX < 158 && mouseY > 280 && mouseY < 328)
                {//Rapid Fire Cyclone, Weapon ID: 2
                    if(gco.weaponsOwned[2]){ gco.EquipWeapon(2); } else { if(player.money >= gco.weaponPrice[2]){ gco.PurchaseWeapon(2); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 10 && mouseX < 58 && mouseY > 448 && mouseY < 496)
                {//SD-15 Sidewinder, Weapon ID: 50
                    if(gco.weaponsOwned[50]){ gco.EquipWeapon(50); } else { if(player.money >= gco.weaponPrice[50]){ gco.PurchaseWeapon(50); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 60 && mouseX < 108 && mouseY > 448 && mouseY < 496)
                {//DM-21 Auto Strike, Weapon ID: 51
                    if(gco.weaponsOwned[51]){ gco.EquipWeapon(51); } else { if(player.money >= gco.weaponPrice[51]){ gco.PurchaseWeapon(51); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 110 && mouseX < 158 && mouseY > 448 && mouseY < 496)
                {//Impact Burst Mine, Weapon ID: 52
                    if(gco.weaponsOwned[52]){ gco.EquipWeapon(52); } else { if(player.money >= gco.weaponPrice[52]){ gco.PurchaseWeapon(52); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > 160 && mouseX < 208 && mouseY > 448 && mouseY < 496)
                {//Laser: Weapon ID: 9000
                    if(gco.ownLaser){ gco.EquipWeapon(9000); } else { if(player.money >= gco.laserPrice){ gco.PurchaseWeapon(9000); } else {gco.notEnoughCores = 1000;}}
                }
                if(mouseX > _canvas.width - 300 && mouseX < _canvas.width - 252 && mouseY > 448 && mouseY < 496)
                {//Shield
                    if(player.money >= (player.shieldLevel + 1) * 250){gco.PurchaseExtras(0);} else {gco.notEnoughCores = 1000;}
                }
                if(mouseX > _canvas.width - 250 && mouseX < _canvas.width - 202 && mouseY > 448 && mouseY < 496)
                {//Max Ammo
                    if(player.money >= (player.secondaryAmmoLevel + 1) * 50){gco.PurchaseExtras(2);} else {gco.notEnoughCores = 1000;}
                }
                if(mouseX > _canvas.width - 200 && mouseX < _canvas.width - 152 && mouseY > 448 && mouseY < 496)
                {//Buy Secondary Ammo
                    if(player.money >= gco.secondaryAmmoPrice && player.secondaryAmmo < player.maxSecondaryAmmo){gco.PurchaseExtras(3);} else {gco.notEnoughCores = 1000;}
                }
                //**********************************************************************//
                //					  END UPGRADE MENU SECTION							//
                //**********************************************************************//
				break;
			}
			case 3:
			{// Continue Menu
				if(mouseX > (_canvas.width / 2 + 10) - 75 && mouseX < (_canvas.width / 2 + 10) + 60 &&
				   mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10)
				{
					currentGui = NULL_GUI_STATE;
					self.softReset();
				}
				if(mouseX > (_canvas.width / 2 + 10) - 61 && mouseX < (_canvas.width / 2 + 10) + 43 && mouseY < (_canvas.height / 2 + 53) + 20 && mouseY > (_canvas.height / 2 + 50) )
                {
					self.hardReset();
                }
				if(mouseX > (_canvas.width / 2 + 10) - 61 && mouseX < (_canvas.width / 2 + 10) + 43 && mouseY < (_canvas.height / 2 + 106) + 20 && mouseY > (_canvas.height / 2 + 100) )
				{
					ipcRenderer.send('quit-app');
				}
				break;
			}
			case 4:
			{// Level Up Menu
				if(mouseX > (_canvas.width / 2 + 10) - 75 && mouseX < (_canvas.width / 2 + 10) + 60 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10) {
                    self.softReset();
                    gco.GoToUpgradeMenu();	
                }
                break;
			}
			case 5:
			{// Game Over Menu
                if(mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 30) && mouseY > (_canvas.height / 2)) {
                    self.hardReset();
                }
                if(mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 80) && mouseY > (_canvas.height / 2 + 48)) {
                    ipcRenderer.send('quit-app');
                }
				break;
			}
			case 6:
			{//Options Menu
                // Back button
				if(mouseX > 0 && mouseX < 90 && mouseY < _canvas.height && mouseY > _canvas.height - 45){currentGui = lastGui; lastGui = 6;}
                
                // Graphics
				if(mouseX > 200 && mouseX < 225 && mouseY > 150 && mouseY < 200)
                {
					particleOffset -= 1;
					if(particleOffset < 1){particleOffset = 1;}
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 150 && mouseY < 200)
                {
					particleOffset += 1;
                    if(particleOffset > 5){particleOffset = 5;}
				}
                
                // BGM Volume
                if(mouseX > 200 && mouseX < 225 && mouseY > 290 && mouseY < 340)
                {
                    if(gco.bgm.volume < 0.1){break;}
                    else{gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 - 0.1;}
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 290 && mouseY < 340)
                {
                    if(gco.bgm.volume > 0.91){break;}
                    else{gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 + 0.1;}
				}
				masterBGMVolume = gco.bgm.volume;
                
                // SFX Volume
                if(mouseX > 200 && mouseX < 225 && mouseY > 430 && mouseY < 480)
                {
                    if(sfx.masterVolume < 0.1){break;}
                    else{sfx.volume(Math.round(sfx.masterVolume * 100) / 100 - 0.1);sfx.play(0);}
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 430 && mouseY < 480)
                {
                    if(sfx.masterVolume > 0.91){break;}
                    else{sfx.volume(Math.round(sfx.masterVolume * 100) / 100 + 0.1);sfx.play(0);}
				}
                
				break;
			}
			case 7:
			{// Submit Score Menu
                if(mouseX > (_canvas.width / 2 + 10) - 110 && mouseX < (_canvas.width / 2 + 10) + 95 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10) {
                    // Need to figure out what to do on the submit score screen
                    // self.submitScore("http://www.blackmodulestudio.com/games/katt/update_database.php", self.buildScoresHash(), "POST");
                    self.hardReset();
                }
                if(mouseX > (_canvas.width / 2 + 10) - 100 && mouseX < (_canvas.width / 2 + 10) + 80 && mouseY < (_canvas.height / 2 + 58) + 20 && mouseY > (_canvas.height / 2 + 58) - 10) {
                    ipcRenderer.send('quit-app');
                }
				break;
			}
		}
	}

    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        
        // Since the canvas is centered using CSS translate, the scaling is applied
        // around the center. We calculate the scale to adjust mouse coordinates accurately.
        const scaleX = canvas.width / rect.width; // The width scale factor
        const scaleY = canvas.height / rect.height; // The height scale factor
        
        // Adjust mouse positions considering the scale factor.
        // The calculation here subtracts the rect's left/top (which includes any translation)
        // from the clientX/clientY, then adjusts by the scaling factor,
        // aligning the mouse position to the scaled canvas coordinate system.
        mouseX = (evt.clientX - rect.left) * scaleX;
        mouseY = (evt.clientY - rect.top) * scaleY;
    }

    this.doGamepadInput = function() {
        // Xbox One Controller Mapping:
        // 0: A button
        // 1: B button
        // 2: X button
        // 3: Y button
        // 4: Left bumper (LB)
        // 5: Right bumper (RB)
        // 6: Left trigger (LT) - value between 0 and 1
        // 7: Right trigger (RT) - value between 0 and 1
        // 8: Back/View button
        // 9: Start/Menu button
        // 10: Left stick press
        // 11: Right stick press
        // 12: D-pad up
        // 13: D-pad down
        // 14: D-pad left
        // 15: D-pad right
        // 16: Home/Guide button

        // PlayStation Controllers:
        // PlayStation controllers generally follow a similar mapping, with the main difference being the symbols on the buttons:
        // 0: Cross (X) button
        // 1: Circle (O) button
        // 2: Square ([]) button
        // 3: Triangle (∆) button
        // The rest of the mappings like bumpers, triggers, and D-pad directions correspond closely to the Xbox layout.

        // Reset all gamepad input states
        gamepadLeft = false;
        gamepadRight = false;
        gamepadUp = false;
        gamepadDown = false;
        gamepadA = false;
        gamepadB = false;
        gamepadStart = false;

        // Do Gamepad Input
        const detectedGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let gamepad of detectedGamepads) {
            if (gamepad) {
                gamepads[gamepad.index] = gamepad;
            }
        }
        for (let index in gamepads) {
            const gamepad = gamepads[index];
            if (gamepad) {
                const joystickThreshold = 0.10;
                const triggerThreshold = 0.30;
                const leftTriggerPressed = gamepad.buttons[6].value > triggerThreshold;
                const rightTriggerPressed = gamepad.buttons[7].value > triggerThreshold;
                if(gamepad.axes[0] < -joystickThreshold || gamepad.buttons[14].pressed) { gamepadLeft = true; }
                if(gamepad.axes[0] > joystickThreshold || gamepad.buttons[15].pressed) { gamepadRight = true; }
                if(gamepad.axes[1] < -joystickThreshold || gamepad.buttons[12].pressed) { gamepadUp = true; }
                if(gamepad.axes[1] > joystickThreshold || gamepad.buttons[13].pressed) { gamepadDown = true; }
                if(gamepad.buttons[0].pressed || leftTriggerPressed || rightTriggerPressed) { gamepadA = true; }
                if(gamepad.buttons[1].pressed || gamepad.buttons[4].pressed || gamepad.buttons[5].pressed) { gamepadB = true; }
                if(gamepad.buttons[9].pressed) { gamepadStart = true; }
            }
        }
    }

    this.doInput = function()
    {
        // Do Gamepad Input
        this.doGamepadInput();
        if(hasControllerInput) {
            // Do Keyboard Input
            if(gamepadUp) // W || Up
            {if(Keys[0] == 0){Keys[0] = 1;}else if(Keys[0] == 1 || Keys[0] == 2){Keys[0] = 2;}}else if(!gamepadUp){if(Keys[0] == 1 || Keys[0] == 2){Keys[0] = 0;}}

            if(gamepadLeft) // A || Left
            {if(Keys[1] == 0){Keys[1] = 1;}else if(Keys[1] == 1 || Keys[1] == 2){Keys[1] = 2;}}else if(!gamepadLeft){if(Keys[1] == 1 || Keys[1] == 2){Keys[1] = 0;}}

            if(gamepadDown) // S || Down
            {if(Keys[2] == 0){Keys[2] = 1;}else if(Keys[2] == 1 || Keys[2] == 2){Keys[2] = 2;}}else if(!gamepadDown){if(Keys[2] == 1 || Keys[2] == 2){Keys[2] = 0;}}

            if(gamepadRight) // D || Right
            {if(Keys[3] == 0){Keys[3] = 1;}else if(Keys[3] == 1 || Keys[3] == 2){Keys[3] = 2;}}else if(!gamepadRight){if(Keys[3] == 1 || Keys[3] == 2){Keys[3] = 0;}}

            if(gamepadA) // Space
            {if(Keys[16] == 0){Keys[16] = 1;}else if(Keys[16] == 1 || Keys[16] == 2){Keys[16] = 2;}}else if(!gamepadA){if(Keys[16] == 1 || Keys[16] == 2){Keys[16] = 0;}}

            if(gamepadStart) // Escape
            {if(Keys[17] == 0){Keys[17] = 1;}else if(Keys[17] == 1 || Keys[17] == 2){Keys[17] = 2;}}else if(!gamepadStart){if(Keys[17] == 1 || Keys[17] == 2){Keys[17] = 0;}}
            
            if(gamepadA) // Enter
            {if(Keys[18] == 0){Keys[18] = 1;}else if(Keys[18] == 1 || Keys[18] == 2){Keys[18] = 2;}}else if(!gamepadA){if(Keys[18] == 1 || Keys[18] == 2){Keys[18] = 0;}}

            if(gamepadB) // B
            {if(Keys[19] == 0){Keys[19] = 1;}else if(Keys[19] == 1 || Keys[19] == 2){Keys[19] = 2;}}else if(!gamepadB){if(Keys[19] == 1 || Keys[19] == 2){Keys[19] = 0;}}
        } else {
            // Do Keyboard Input
            if(keysDown[38] == true || keysDown[87] == true) // W || Up
            {if(Keys[0] == 0){Keys[0] = 1;}else if(Keys[0] == 1 || Keys[0] == 2){Keys[0] = 2;}}else if(keysDown[38] == false || keysDown[87] == false){if(Keys[0] == 1 || Keys[0] == 2){Keys[0] = 0;}}

            if(keysDown[37] == true || keysDown[65] == true) // A || Left
            {if(Keys[1] == 0){Keys[1] = 1;}else if(Keys[1] == 1 || Keys[1] == 2){Keys[1] = 2;}}else if(keysDown[37] == false || keysDown[65] == false){if(Keys[1] == 1 || Keys[1] == 2){Keys[1] = 0;}}

            if(keysDown[40] == true || keysDown[83] == true) // S || Down
            {if(Keys[2] == 0){Keys[2] = 1;}else if(Keys[2] == 1 || Keys[2] == 2){Keys[2] = 2;}}else if(keysDown[40] == false || keysDown[83] == false){if(Keys[2] == 1 || Keys[2] == 2){Keys[2] = 0;}}

            if(keysDown[39] == true || keysDown[68] == true) // D || Right
            {if(Keys[3] == 0){Keys[3] = 1;}else if(Keys[3] == 1 || Keys[3] == 2){Keys[3] = 2;}}else if(keysDown[39] == false || keysDown[68] == false){if(Keys[3] == 1 || Keys[3] == 2){Keys[3] = 0;}}

            if(keysDown[81] == true) // Q
            {if(Keys[4] == 0){Keys[4] = 1;}else if(Keys[4] == 1 || Keys[4] == 2){Keys[4] = 2;}}else if(keysDown[81] == false){if(Keys[4] == 1 || Keys[4] == 2){Keys[4] = 0;}}
            
            if(keysDown[69] == true) // E
            {if(Keys[5] == 0){Keys[5] = 1;}else if(Keys[5] == 1 || Keys[5] == 2){Keys[5] = 2;}}else if(keysDown[69] == false){if(Keys[5] == 1 || Keys[5] == 2){Keys[5] = 0;}}

            if(keysDown[48] == true) // 0
            {if(Keys[6] == 0){Keys[6] = 1;}else if(Keys[6] == 1 || Keys[6] == 2){Keys[6] = 2;}}else if(keysDown[48] == false){if(Keys[6] == 1 || Keys[6] == 2){Keys[6] = 0;}}

            if(keysDown[49] == true) // 1
            {if(Keys[7] == 0){Keys[7] = 1;}else if(Keys[7] == 1 || Keys[7] == 2){Keys[7] = 2;}}else if(keysDown[49] == false){if(Keys[7] == 1 || Keys[7] == 2){Keys[7] = 0;}}

            if(keysDown[50] == true) // 2
            {if(Keys[8] == 0){Keys[8] = 1;}else if(Keys[8] == 1 || Keys[8] == 2){Keys[8] = 2;}}else if(keysDown[50] == false){if(Keys[8] == 1 || Keys[8] == 2){Keys[8] = 0;}}

            if(keysDown[51] == true) // 3
            {if(Keys[9] == 0){Keys[9] = 1;}else if(Keys[9] == 1 || Keys[9] == 2){Keys[9] = 2;}}else if(keysDown[51] == false){if(Keys[9] == 1 || Keys[9] == 2){Keys[9] = 0;}}

            if(keysDown[52] == true) // 4
            {if(Keys[10] == 0){Keys[10] = 1;}else if(Keys[10] == 1 || Keys[10] == 2){Keys[10] = 2;}}else if(keysDown[52] == false){if(Keys[10] == 1 || Keys[10] == 2){Keys[10] = 0;}}

            if(keysDown[53] == true) // 5
            {if(Keys[11] == 0){Keys[11] = 1;}else if(Keys[11] == 1 || Keys[11] == 2){Keys[11] = 2;}}else if(keysDown[53] == false){if(Keys[11] == 1 || Keys[11] == 2){Keys[11] = 0;}}

            if(keysDown[54] == true) // 6
            {if(Keys[12] == 0){Keys[12] = 1;}else if(Keys[12] == 1 || Keys[12] == 2){Keys[12] = 2;}}else if(keysDown[54] == false){if(Keys[12] == 1 || Keys[12] == 2){Keys[12] = 0;}}

            if(keysDown[55] == true) // 7
            {if(Keys[13] == 0){Keys[13] = 1;}else if(Keys[13] == 1 || Keys[13] == 2){Keys[13] = 2;}}else if(keysDown[55] == false){if(Keys[13] == 1 || Keys[13] == 2){Keys[13] = 0;}}

            if(keysDown[56] == true) // 8
            {if(Keys[14] == 0){Keys[14] = 1;}else if(Keys[14] == 1 || Keys[14] == 2){Keys[14] = 2;}}else if(keysDown[56] == false){if(Keys[14] == 1 || Keys[14] == 2){Keys[14] = 0;}}

            if(keysDown[57] == true) // 9
            {if(Keys[15] == 0){Keys[15] = 1;}else if(Keys[15] == 1 || Keys[15] == 2){Keys[15] = 2;}}else if(keysDown[57] == false){if(Keys[15] == 1 || Keys[15] == 2){Keys[15] = 0;}}

            if(keysDown[32] == true) // Space
            {if(Keys[16] == 0){Keys[16] = 1;}else if(Keys[16] == 1 || Keys[16] == 2){Keys[16] = 2;}}else if(keysDown[32] == false){if(Keys[16] == 1 || Keys[16] == 2){Keys[16] = 0;}}

            if(keysDown[27] == true) // Escape
            {if(Keys[17] == 0){Keys[17] = 1;}else if(Keys[17] == 1 || Keys[17] == 2){Keys[17] = 2;}}else if(keysDown[27] == false){if(Keys[17] == 1 || Keys[17] == 2){Keys[17] = 0;}}
            
            if(keysDown[13] == true) // Enter
            {if(Keys[18] == 0){Keys[18] = 1;}else if(Keys[18] == 1 || Keys[18] == 2){Keys[18] = 2;}}else if(keysDown[13] == false){if(Keys[18] == 1 || Keys[18] == 2){Keys[18] = 0;}}

            if(keysDown[66] == true) // B
            {if(Keys[19] == 0){Keys[19] = 1;}else if(Keys[19] == 1 || Keys[19] == 2){Keys[19] = 2;}}else if(keysDown[66] == false){if(Keys[19] == 1 || Keys[19] == 2){Keys[19] = 0;}}
        }
    }
    
    this.getInput = function()
    {
        if(Keys[17] == 1) { // Escape/Pause
			if(gameState == 1 && player.isAlive() && !ed.eventPlaying()) {
                if(!gco.win){ if(currentGui != 6){ gco.TogglePauseGame(); } }
				if(!paused){ currentGui = NULL_GUI_STATE;} else { currentGui = 1; }
			}
			
        }

        // Temporary input for enabling post processing
        if(Keys[15] == 1) {
            postProcessing.bloom = !postProcessing.bloom;
        }

        // If we are currently not in an active game level gui, do input for menus...
        if(currentGui != 8) {
            if(Keys[0] >= 1) menu.move(currentGui, 0); // W || Up
            if(Keys[1] >= 1) menu.move(currentGui, 1); // A || Left
            if(Keys[2] >= 1) menu.move(currentGui, 2); // S || Down
            if(Keys[3] >= 1) menu.move(currentGui, 3); // D || Right
            if(Keys[16] >= 1 || Keys[18] >= 1) menu.select(); // Space || Enter
            if((currentGui == 6 || currentGui == 1) && Keys[19] > 1) menu.back();
        }

        if(ed.eventPlaying()) {
            if(Keys[16] >= 1 || Keys[18] >= 1) ed.DoInput(); // Space || Enter
        }
    
        if(!paused) {
            if(Keys[4] == 1) {
				debug = !debug;
            }
			if(Keys[5] == 1 && gameState == 1) {
				if(playerInfo)
				{
					explosion = new Explosion(135, _canvas.height - 50, 75, 10, 100, 0.1, 3, 0.1);
                    explosions.push(explosion);
					explosion = new Explosion(135, _canvas.height - 30, 75, 10, 100, 0.1, 3, 0.1);
                    explosions.push(explosion);
					explosion = new Explosion(450, _canvas.height - 30, 75, 10, 100, 0.1, 3, 0.1);
                    explosions.push(explosion);
				}
				playerInfo = !playerInfo;
			}
            if(player.isAlive() && gameState == 1 && !gco.win && !ed.eventPlaying()) {
                // Player Movement
                let moveX = 0;
                let moveY = 0;
                if(Keys[0] >= 1) moveY -= player.speed * delta; // W || Up
                if(Keys[1] >= 1) moveX -= player.speed * delta; // A || Left
                if(Keys[2] >= 1) moveY += player.speed * delta; // S || Down
                if(Keys[3] >= 1) moveX += player.speed * delta; // D || Right
                // Set the current movement vectors for the player.
                player.setMovementVector(moveX, moveY);
                // Only update player position if there's movement
                if (moveX !== 0 || moveY !== 0) {
                    // Normalize the speed if moving diagonally
                    if (moveX !== 0 && moveY !== 0) {
                        const norm = Math.sqrt(moveX * moveX + moveY * moveY);
                        moveX = (moveX / norm) * player.speed * delta;
                        moveY = (moveY / norm) * player.speed * delta;
                    }
                    // Apply the calculated movement
                    player.x += moveX;
                    player.y += moveY;
                }

                if(ticks != player.onTick) {//On Tick Player Input
                    player.onTick = ticks;
                    player.runOnTick();
                    if(Keys[16] >= 1) { // Space
                        player.shoot();
                    }
                }
				
                if(Keys[19] == 1) // B
                {
                    player.shootSecondary();
                }
            }
            else
            {
                if(Keys[18] == 1) // Enter
                {
                    // self.reset();
                }
            }
        }
    }

	this.buildScoresHash = function()
	{
		var scores = {};
		scores['kills'] = enemiesKilled;
		scores['cores'] = totalCores;
		scores['highest_score'] = score;
		scores['items_used'] = itemsUsed;
		scores['from_game'] = "fromgame";
		return scores;
	}
    
	this.submitScore = function(path, params, method)
	{
        method = method || "post"; // Set method to post by default, if not specified.
        // The rest of this code assumes you are not using a library.
        // It can be made less wordy if you use one.
        var form = document.createElement("form");
        form.setAttribute("method", method);
        form.setAttribute("action", path);
        for(var key in params)
        {
            if(params.hasOwnProperty(key))
            {
                var form_child = document.createElement("input");
                form_child.setAttribute("type", "hidden");
                form_child.setAttribute("name", key);
                form_child.setAttribute("value", params[key]);
                form.appendChild(form_child);
             }
        }
        document.body.appendChild(form);
        form.submit();
    }

    /******************************************************/
    
    
    /******************************************************/
    // Draw
    /******************************************************/
    this.Draw = function()
    {
        buffer.clearRect(0, 0, _buffer.width, _buffer.height);
        canvas.clearRect(0, 0, _canvas.width, _canvas.height);

        // Background
        buffer.fillStyle = "rgb(0, 0, 0)";
        buffer.fillRect(0, 0, _buffer.width, _buffer.height);
        
        // Stars
        self.drawStars();
        
        if(gameState == 1 && !gco.credits.isBlackedOut)
        {
            //Money
            self.drawMoney();
            
            //Random Items
            self.drawItems();
            
            // Player
            if(player.isAlive()) {
                player.drawPlayer();
                if(player.hasShield && player.shield > 0) {
                    self.drawShield();
                }
            }

            //Enemies
            self.drawEnemies();
            
            // Missile
            self.drawMissiles();

            //Laser
            if(player.laser){ self.drawLaser(); }
            
            // Explosion
            self.drawExplosions();
            
            // GUI
            self.drawHUD();
        }

        // Foreground
        foregroundGeneration.Draw();
        
        if(gco.win){ gco.credits.Draw(); }
        ed.Draw(); // Only Draws when needed
        self.drawGUI();
        if(gco.playStory){ gco.story.Draw(); }

        if(postProcessing.bloom) {
            applyPostProcessing(_buffer, buffer);
        }
        canvas.drawImage(_buffer, 0, 0);
    }

    this.drawStars = function() {
        var p = -1; // p is for planet
        for (var i = 0; i < stars.length; i++) {
            if(stars[i].isPlanet){p = i; continue;}
            if (stars[i].imageLoaded) { // Check if the image is loaded and ready
                buffer.drawImage(stars[i].image, stars[i].x - (stars[i].image.width / 2), stars[i].y - (stars[i].image.height / 2));
            } else {
                if (imagesLoaded) {
                    buffer.drawImage(starImages[stars[i].Model], stars[i].x - (starImages[stars[i].Model].width / 2), stars[i].y - (starImages[stars[i].Model].height / 2), starImages[stars[i].Model].width, starImages[stars[i].Model].height);
                } else {
                    buffer.fillStyle = 'rgb(200, 200, 255)';
                    buffer.beginPath();
                    buffer.arc(stars[i].x, stars[i].y, 2, 0, Math.PI * 2, true);
                    buffer.closePath();
                    buffer.fill();
                }
            }
        }
        if (p != -1) { // Ensure planets are drawn in front of stars
            buffer.drawImage(shaderPlanetCanvas, stars[p].x - (offScreenPlanetCanvas.width / 2), stars[p].y - (offScreenPlanetCanvas.height / 2));
        }
    }
    
    this.drawShield = function()
    {
		buffer.shadowBlur = 20;
		buffer.shadowColor = 'rgb(0, 128, 255)';
		
        buffer.beginPath();
            buffer.strokeStyle = 'rgb(0, 128, 255)';
            buffer.lineWidth = 3;
            buffer.arc(player.x, player.y, 28, 0, Math.PI * 2, true);
            buffer.stroke();
        buffer.closePath();
        buffer.lineWidth = 1;
        buffer.beginPath();
            buffer.globalAlpha = 0.5;
            buffer.fillStyle = 'rgb(0, 128, 255)';
            buffer.arc(player.x, player.y, 28, 0, Math.PI * 2, true);
            buffer.fill();
        buffer.closePath();
        buffer.globalAlpha = 1;
		
		buffer.shadowBlur = 0;
    }
	
	this.drawEnemies = function()
    {
		var drawLaser = false;
		var x = 0, y = 0, h = 0, w = 0;
		buffer.beginPath();
        for(var i = 0; i < enemies.length; i++)
        {
			buffer.drawImage(enemyImages[enemies[i].Model], enemies[i].x - (enemies[i].width / 2), enemies[i].y - (enemies[i].height / 2), enemies[i].width, enemies[i].height);
			if(enemies[i].isBoss)
			{
                self.drawBossLifeMeter(enemies[i]);
			}
			if(enemies[i].laser == true){ drawLaser = true; x = enemies[i].laserX; y = enemies[i].laserY; h = enemies[i].laserHeight; w = enemies[i].laserWidth; }
        }
		buffer.closePath();
		if(drawLaser){ this.drawBossLaser(x, y, w, h); }
    }
	
	this.drawMoney = function()
	{
		for(var i = 0; i < money.length; i++)
		{
			buffer.drawImage(itemImages[0], money[i].x - (money[i].width / 2), money[i].y - (money[i].height / 2), money[i].width, money[i].height);
		}
	}
    
	this.drawItems = function()
	{
        var rand_health = Math.floor(Math.random() * 100) + 243;
        var rand1_health = Math.floor(Math.random() * 100) + 100;
        var rand2_health = Math.floor(Math.random() * 100) + 188;
        var r_health = rand_health;
        var g_health = rand1_health;
        var b_health = rand2_health;
        buffer.lineWidth = 3;
        
        var rand_shield = Math.floor(Math.random() * 100) - 50;
        var rand1_shield = Math.floor(Math.random() * 100) + 63;
        var rand2_shield = Math.floor(Math.random() * 100) + 138;
        var r_shield = rand_shield;
        var g_shield = rand1_shield;
        var b_shield = rand2_shield;
        
        var rand_ammo = Math.floor(Math.random() * 100) + 128;
        var rand1_ammo = Math.floor(Math.random() * 100) + 128;
        var rand2_ammo = Math.floor(Math.random() * 100) + 128;
        var r_ammo = rand_ammo;
        var g_ammo = rand1_ammo;
        var b_ammo = rand2_ammo;
        
		for(var i = 0; i < randomItems.length; i++)
		{
			switch(randomItems[i].itemNum)
			{
				case 0:
				{//Health
                    buffer.beginPath();
                    buffer.fillStyle = "rgb(" + r_health + ", " + g_health + ", " + b_health + ")";
                    buffer.strokeStyle = "rgb(255, 0, 0)";
                        buffer.moveTo(randomItems[i].x, randomItems[i].y - 2.5);
                        buffer.lineTo(randomItems[i].x + 2.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 6.25, randomItems[i].y - 2.5);
                        buffer.lineTo(randomItems[i].x, randomItems[i].y + 5);
                        buffer.lineTo(randomItems[i].x - 6.25, randomItems[i].y - 2.5);
                        buffer.lineTo(randomItems[i].x - 5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x - 2.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x, randomItems[i].y - 2.5);
                    buffer.stroke();
                    buffer.fill();
                    buffer.closePath();
					break;
				}
				case 1:
				{//Shield
                    buffer.beginPath();
					buffer.fillStyle = "rgb(" + r_shield + ", " + g_shield + ", " + b_shield + ")";
                    buffer.strokeStyle = "rgb(0, 113, 188)";
                        buffer.moveTo(randomItems[i].x, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 5, randomItems[i].y);
                        buffer.lineTo(randomItems[i].x, randomItems[i].y + 7.5);
                        buffer.lineTo(randomItems[i].x - 5, randomItems[i].y);
                        buffer.lineTo(randomItems[i].x - 5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x, randomItems[i].y - 5);
                    buffer.stroke();
                    buffer.fill();
                    buffer.closePath();
					break;
				}
				case 2:
				{//Secondary Ammo
                    buffer.beginPath();
				    buffer.fillStyle = "rgb(" + r_ammo + ", " + g_ammo + ", " + b_ammo + ")";
                    buffer.strokeStyle = "rgb(128, 128, 128)";
                        buffer.moveTo(randomItems[i].x - 10, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x - 8.75, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x - 7.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x - 7.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x - 12.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x - 12.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x - 11.25, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x - 10, randomItems[i].y - 10);

                        buffer.moveTo(randomItems[i].x, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x + 1.25, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x + 2.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 2.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x - 2.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x - 2.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x - 1.25, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x, randomItems[i].y - 10);

                        buffer.moveTo(randomItems[i].x + 10, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x + 11.25, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x + 12.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 12.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x + 7.5, randomItems[i].y + 10);
                        buffer.lineTo(randomItems[i].x + 7.5, randomItems[i].y - 5);
                        buffer.lineTo(randomItems[i].x + 8.75, randomItems[i].y - 10);
                        buffer.lineTo(randomItems[i].x + 10, randomItems[i].y - 10);
                    buffer.stroke();
                    buffer.fill();
                    buffer.closePath();
					break;
				}
				case 3:
				{	
					buffer.fillStyle = 'rgb(200, 200, 255)';
					buffer.shadowColor = 'rgb(200, 200, 255)';
					buffer.shadowBlur = 10;
						buffer.drawImage(itemImages[0], randomItems[i].x - (randomItems[i].width / 2), randomItems[i].y - (randomItems[i].height / 2), 25, 25);
					buffer.shadowBlur = 0;
					break;
				}
                default:break;
			}
		}
        buffer.lineWidth = 1;
	}
    
    this.drawMissiles = function()
    {
        for(var i = 0; i < missiles.length; i++)
        {
			switch(missiles[i].missileType)
			{
				case 0:
				case 1:
				case 2:
				{//Primary Assult Ultra
					buffer.drawImage(itemImages[1], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
					break;
				}
				case 50:
				case 51:
				{
					buffer.drawImage(itemImages[2], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
					break;
				}
                case 52:
				{
					buffer.drawImage(itemImages[3], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
					break;
				}
				case 100:
				case 101:
                case 102:
                case 103:
                case 104:
				{
					buffer.drawImage(itemImages[4], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
					break;
				}
			}
        }
    }
    
	this.drawLaser = function()
	{
		/* Data
		this.laser = false;//true if laser is on
		this.laserX = this.x;
		this.laserY = this.y - 25;
		this.laserWidth = 20;
		this.laserHeight = this.y - 25;
		this.laserGlowWidth = 5;
		this.glowDirection = 0;//0=out, 1=in;
		*/
		buffer.shadowBlur = 20;
		buffer.shadowColor = 'rgb(0, 128, 255)';
		buffer.beginPath();
			buffer.fillStyle = "rgb(0, 128, 255)";
			buffer.fillRect(player.laserX - 10, player.laserY, player.laserWidth, player.laserHeight);
			buffer.fillStyle = "rgb(0, 200, 255)";
			buffer.fillRect(player.laserX - 5, player.laserY, player.laserWidth / 2, player.laserHeight);
		buffer.closePath();
		buffer.shadowBlur = 0;
	}
	
	this.drawBossLaser = function(x, y, width, height)
	{
		/* Data
		this.laser = false;//true if laser is on
		this.laserX = this.x;
		this.laserY = this.y - 25;
		this.laserWidth = 20;
		this.laserHeight = this.y - 25;
		*/
		buffer.shadowBlur = 10;
		buffer.shadowColor = 'rgb(255, 60, 0)';
		buffer.beginPath();
			buffer.fillStyle = 'rgb(255, 60, 0)';
			buffer.fillRect(x - 5, y, width, height);
		buffer.closePath();
		buffer.shadowBlur = 0;
	}
    
    this.drawExplosions = function()
    {
		buffer.fillStyle = "rgb(0, 0, 0)";
        for(a = 0; a < explosions.length; a++)
        {
            for(var i = 0; i < explosions[a].particles.length; i++)
            {
                var rand = Math.floor(Math.random() * 3) + explosions[a].particles[i].red;
                var rand1 = Math.floor(Math.random() * 3) + explosions[a].particles[i].green;
                var rand2 = Math.floor(Math.random() * 3) + explosions[a].particles[i].blue;
                
                var p = explosions[a].particles[i];
                var r = 255 - Math.round(explosions[a].age * explosions[a].size / rand);
                var g = 255 - Math.round(explosions[a].age * explosions[a].size / rand1);
                var b = 255 - Math.round(explosions[a].age * explosions[a].size / rand2);
                //buffer.beginPath();
                    buffer.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                    var rand3 = Math.floor(Math.random() * 6) + 1;
                    buffer.fillRect(p.x, p.y, rand3, rand3);
                //buffer.closePath();
            }
        }
    }
	  
    this.drawHUD = function()
    {
		self.drawAmmoGui();
        self.drawLifeMeter();
        self.drawShieldMeter();
        self.drawFuelMeter();
		self.drawPlayerLives();
    }
	
	this.drawPlayerLives = function()
	{
		var xOffset = 0;
		for(var i = 0; i < player.lives; i++)
		{
            if(player.ship == 2){
                buffer.drawImage(playerImages2[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 3){
                buffer.drawImage(playerImages3[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 4){
                buffer.drawImage(playerImages4[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 5){
                buffer.drawImage(playerImages5[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 6){
                buffer.drawImage(playerImages6[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 7){
                buffer.drawImage(playerImages7[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else if (player.ship == 8){
                buffer.drawImage(playerImages8[0], _buffer.width - (84 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }else{
                buffer.drawImage(playerImages1[0], _buffer.width - (60 - xOffset), _buffer.height - 25, player.width / 2, player.height / 2);
            }
			
            if(player.ship == 8) xOffset += 28;
            else xOffset += 20;
		}
	}
	
	this.drawAmmoGui = function()
	{
		var rand_ammo = Math.floor(Math.random() * 100) + 128;
        var rand1_ammo = Math.floor(Math.random() * 100) + 128;
        var rand2_ammo = Math.floor(Math.random() * 100) + 128;
        var r_ammo = rand_ammo;
        var g_ammo = rand1_ammo;
        var b_ammo = rand2_ammo;
		
		this.x = 20;
		this.y = _buffer.height - 95;
		buffer.beginPath();
		buffer.fillStyle = "rgb(" + r_ammo + ", " + g_ammo + ", " + b_ammo + ")";
		buffer.strokeStyle = "rgb(128, 128, 128)";
			buffer.moveTo(this.x - 10, this.y - 10);
			buffer.lineTo(this.x - 8.75, this.y - 10);
			buffer.lineTo(this.x - 7.5, this.y - 5);
			buffer.lineTo(this.x - 7.5, this.y + 10);
			buffer.lineTo(this.x - 12.5, this.y + 10);
			buffer.lineTo(this.x - 12.5, this.y - 5);
			buffer.lineTo(this.x - 11.25, this.y - 10);
			buffer.lineTo(this.x - 10, this.y - 10);

			buffer.moveTo(this.x, this.y - 10);
			buffer.lineTo(this.x + 1.25, this.y - 10);
			buffer.lineTo(this.x + 2.5, this.y - 5);
			buffer.lineTo(this.x + 2.5, this.y + 10);
			buffer.lineTo(this.x - 2.5, this.y + 10);
			buffer.lineTo(this.x - 2.5, this.y - 5);
			buffer.lineTo(this.x - 1.25, this.y - 10);
			buffer.lineTo(this.x, this.y - 10);

			buffer.moveTo(this.x + 10, this.y - 10);
			buffer.lineTo(this.x + 11.25, this.y - 10);
			buffer.lineTo(this.x + 12.5, this.y - 5);
			buffer.lineTo(this.x + 12.5, this.y + 10);
			buffer.lineTo(this.x + 7.5, this.y + 10);
			buffer.lineTo(this.x + 7.5, this.y - 5);
			buffer.lineTo(this.x + 8.75, this.y - 10);
			buffer.lineTo(this.x + 10, this.y - 10);
		buffer.stroke();
		buffer.fill();
		buffer.closePath();
		
		var guiText  = new GUIText("x" + player.secondaryAmmo, this.x + 15, this.y - 6, 
                                    "18px VT323", "left", "top", "rgb(230, 230, 255)");
		buffer.beginPath();
			buffer.fillStyle = guiText.color;
			buffer.font = guiText.fontStyle;
			buffer.textAlign = guiText.alignX;
			buffer.textBaseline = guiText.alignY;
			buffer.fillText(guiText.text, guiText.x, guiText.y);
		buffer.closePath();
	}
    
    this.drawLifeMeter = function()
    {
        var width = 100;
        var height = 15;
        var x1 = 0;
        var y1 = _buffer.height - 25;
        var x2 = width;
        var y2 = y1 + height;

        var grd = buffer.createLinearGradient(x1, y1, x2, y2);
        grd.addColorStop(0, "rgb("+ ((player.maxLife - player.life) * 2) +", 0, 0)");
        grd.addColorStop(1, "rgb(0, "+ (255 -((player.maxLife - player.life) * 2)) +", 0)");
		buffer.beginPath();
            buffer.fillStyle = grd;
            buffer.fillRect(x1, y1, player.life, height);
        buffer.closePath();

        buffer.beginPath();
            buffer.strokeStyle = "rgb(255, 255, 255)";
                buffer.moveTo(x1, y1);
                buffer.lineTo(x2, y1);
                buffer.lineTo(x2, y2);
                buffer.lineTo(x1, y2);
                buffer.lineTo(x1, y1);
            buffer.stroke();
        buffer.closePath();
    }
    
    this.drawBossLifeMeter = function(boss)
    {
        var BLM_width = 100;
        var BLM_height = 10;
        var BLM_x1 = (boss.x + 8) - boss.width / 2;
        var BLM_y1 = boss.y - 50;
        var BLM_x2 = BLM_x1 + BLM_width;
        var BLM_y2 = BLM_y1 + BLM_height;

        buffer.beginPath();
            buffer.fillStyle = "rgb(255, 0, 0)";
            buffer.fillRect(BLM_x1, BLM_y1, ((boss.life / boss.currentMaxLife) * 100), BLM_height);
        buffer.closePath();
        
        buffer.beginPath();
            buffer.strokeStyle = "rgb(255, 255, 255)";
                buffer.moveTo(BLM_x1, BLM_y1);
                buffer.lineTo(BLM_x2, BLM_y1);
                buffer.lineTo(BLM_x2, BLM_y2);
                buffer.lineTo(BLM_x1, BLM_y2);
                buffer.lineTo(BLM_x1, BLM_y1);
            buffer.stroke();
        buffer.closePath();
    }
    
    this.drawShieldMeter = function()
    {
		if(player.hasShield)
		{
			var width = 100;
			var height = 15;
			var x1 = 0;
			var y1 = _buffer.height - 50;
			var x2 = width;
			var y2 = y1 + height;
	
			var grd = buffer.createLinearGradient(x1, y1, x2, y2);
			grd.addColorStop(0, "rgb(0, 0, 255)");
			grd.addColorStop(1, "rgb(0, 192, 255)");
			buffer.beginPath();
				buffer.fillStyle = grd;
				buffer.fillRect(x1, y1, player.shield / player.shieldLevel, height);
			buffer.closePath();
			
			buffer.beginPath();
				buffer.strokeStyle = "rgb(255, 255, 255)";
					buffer.moveTo(x1, y1);
					buffer.lineTo(x2, y1);
					buffer.lineTo(x2, y2);
					buffer.lineTo(x1, y2);
					buffer.lineTo(x1, y1);
				buffer.stroke();
			buffer.closePath();
		}
    }
    
    this.drawFuelMeter = function()
    {
        var width = 100;
        var height = 15;
        var x1 = 0;
        var y1 = _buffer.height - 75;
        var x2 = width;
        var y2 = y1 + height;

        buffer.beginPath();
            buffer.fillStyle = "rgba(80, 73, 113, 0.5)";
            buffer.fillRect(x1, y1, width, height);
        buffer.closePath();
        
        var grd = buffer.createLinearGradient(x1, y1, x2, y2);
        grd.addColorStop(0, "rgb(80, 73, 113)");
        grd.addColorStop(1, "rgb(148, 116, 180)");
		buffer.beginPath();
            buffer.fillStyle = grd;
            buffer.fillRect(x1, y1, (player.currentFuel / player.MAX_FUEL) * width, height);
        buffer.closePath();
        
        buffer.beginPath();
            buffer.strokeStyle = "rgb(255, 255, 255)";
                buffer.moveTo(x1, y1);
                buffer.lineTo(x2, y1);
                buffer.lineTo(x2, y2);
                buffer.lineTo(x1, y2);
                buffer.lineTo(x1, y1);
            buffer.stroke();
        buffer.closePath();
    }
    
    this.drawGUI = function()
    {
		//State GUIs
			// 0 = Main Menu
            // 1 = Pause Menu
            // 2 = Upgrade Up Menu
            // 3 = Continue Menu
            // 4 = Level Up Menu
            // 5 = Game Over Menu
            // 6 = Options Menu
            // 7 = Submit Score Menu
		//Non-State Guis
		// Debug
		// Life & other ingame info(can't be on any state gui's)
		
		//Draw State Gui's
		var guiText = [];
		switch(currentGui)
		{
			case 0:
			{// Main Menu
                guiText[0] = new GUIText("Kill All The Things", _canvas.width / 2, _canvas.height / 2 - 100, "48px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 255)");
                guiText[1] = new GUIText("Insert Coin", _canvas.width / 2, _canvas.height / 2, "28px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                if(menu.states[0][0] || (mouseX > (_canvas.width / 2 + 10) - 105 && mouseX < (_canvas.width / 2 + 10) + 90 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10))
                {
                    if(menu.states[0][0]) menu.DrawArrow(3, (_canvas.width / 2) - 125, _canvas.height / 2 + 12)
                    guiText[1] = new GUIText("Insert Coin", _canvas.width / 2, _canvas.height / 2, "28px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
                }
                guiText[2] = new GUIText("Options", _canvas.width / 2, (_canvas.height / 2) + 50, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[0][1] || (mouseX > (_canvas.width / 2 + 3) - 45 && mouseX < (_canvas.width / 2 + 22) + 20 && mouseY < (_canvas.height / 2 + 60) + 17 && mouseY > (_canvas.height / 2 + 60) - 10))
                {
                    if(menu.states[0][1]) menu.DrawArrow(3, (_canvas.width / 2) - 65, _canvas.height / 2 + 63)
                    guiText[2] = new GUIText("Options", _canvas.width / 2, (_canvas.height / 2) + 50, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                guiText[3] = new GUIText("Story", _canvas.width / 2, (_canvas.height / 2) + 100, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[0][2] || (mouseX > (_canvas.width / 2 + 10) - 38 && mouseX < (_canvas.width / 2 + 10) + 17 && mouseY < (_canvas.height / 2 + 110) + 17 && mouseY > (_canvas.height / 2 + 110) - 10))
                {
                    if(menu.states[0][2]) menu.DrawArrow(3, (_canvas.width / 2) - 50, _canvas.height / 2 + 113)
                    guiText[3] = new GUIText("Story", _canvas.width / 2, (_canvas.height / 2) + 100, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                guiText[4] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2) + 145, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[0][3] || (mouseX > (_canvas.width / 2 ) - 52 && mouseX < (_canvas.width / 2 + 20) + 35 && mouseY < (_canvas.height / 2 + 150) + 13 && mouseY > (_canvas.height / 2 + 155) - 8))
                {
                    if(menu.states[0][3]) menu.DrawArrow(3, (_canvas.width / 2) - 80, _canvas.height / 2 + 158)
                    guiText[4] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2) + 145, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
				break;
			}
            case 1:
            {// Pause Menu
                guiText[0] = new GUIText("Paused", _canvas.width / 2, _canvas.height / 2 - 80, "40px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
                guiText[1] = new GUIText("Options", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[1][0] || (mouseX > (_canvas.width / 2) - 50 && mouseX < (_canvas.width / 2) + 50 && mouseY < (_canvas.height / 2) + 30 && mouseY > (_canvas.height / 2))) {
                    if(menu.states[1][0]) menu.DrawArrow(3, (_canvas.width / 2) - 50, (_canvas.height / 2) + 15)
                    guiText[1] = new GUIText("Options", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                guiText[2] = new GUIText("Main Menu", _canvas.width / 2, (_canvas.height / 2) + 40, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[1][1] || (mouseX > (_canvas.width / 2) - 54 && mouseX < (_canvas.width / 2) + 54 && mouseY < (_canvas.height / 2) + 70 && mouseY > (_canvas.height / 2) + 45)) {
                    if(menu.states[1][1]) menu.DrawArrow(3, (_canvas.width / 2) - 60, (_canvas.height / 2) + 55)
                    guiText[2] = new GUIText("Main Menu", _canvas.width / 2, (_canvas.height / 2) + 40, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                guiText[3] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2) + 80, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                if(menu.states[1][2] || (mouseX > (_canvas.width / 2 ) - 52 && mouseX < (_canvas.width / 2 + 20) + 35 && mouseY < (_canvas.height / 2 + 107) && mouseY > (_canvas.height / 2 + 80))) {
                    if(menu.states[1][2]) menu.DrawArrow(3, (_canvas.width / 2) - 58, (_canvas.height / 2) + 95)
                    guiText[3] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2) + 80, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                break;
			}
			case 2:
			{// Upgrade Menu
                //**********************************************************************//
                //						UPGRADE MENU SECTION							//
                //**********************************************************************//

                //Static Text
                guiText[0] = new GUIText("Missions", 10, 10, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[1] = new GUIText("Primary Fire", 10, _canvas.height / 2 - 50, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[2] = new GUIText("Artillery", 10, 420, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[3] = new GUIText("Cores: " + player.money, _canvas.width - 100, _canvas.height - 53, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[4] = new GUIText("Extra Items", _canvas.width - 300, 420, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[7] = new GUIText("Level " + gco.level, 5, _buffer.height / 2 - 76, "20px VT323", "left", "top", "rgb(230, 230, 255)");
				guiText[8] = new GUIText("", _canvas.width - 271, 448, "20px VT323", "left", "top", "rgb(0, 0, 0)");
				guiText[9] = new GUIText("", _canvas.width - 221, 448, "20px VT323", "left", "top", "rgb(0, 0, 0)");


//**********************************************************************//
//					    MISSION MENU SECTION							//
//**********************************************************************//
                var drawX = 10;
                var drawY = 50;
                var j = 0;
                for(var i = 0; i < gco.levelMission.objectives.length; i++)
                {
                    j++;
                    var outText = "";
                    switch(i)
                    {//Case Cooresponds to enemy types, enemy type missions cooresponds to level.
                        case 0:{outText += "Drone Kills: "; break;}
                        case 1:{outText += "Weaver Kills: "; break;}
                        case 2:{outText += "Kamakaze Kills: "; break;}
                        case 3:{outText += "Splitter Kills: "; break;}
                        case 4:{outText += "Teleporter Kills: "; break;}
						case 5:{outText += "Drone Core... Time to Kill all the Things! Ready yourself, there is no turning back! "; break;}
                        default:{outText += "Level Not Added: "; break;}
                    }
					if(i != 5)
					{
						gco.missionText[i] = new GUIText(outText + gco.levelMission.progress[i] + "/" + gco.levelMission.objectives[i], drawX, drawY, "16px VT323", "left", "top", "rgb(230, 230, 255)");
					} else
					{
						gco.missionText[i] = new GUIText(outText, drawX, drawY, "16px VT323", "left", "top", "rgb(230, 230, 255)");
					}
                    if(j == 4)
                    {
                        j = 0;
                        drawY = 50;
                        drawX += 200;
                    } else
                    {
                        drawY += 35;
                    }
                }
//**********************************************************************//
//					   END MISSION MENU SECTION							//
//**********************************************************************//
									
				var xDrawOffset = 160;
                buffer.beginPath();
                for(var i = 0; i < gco.missionText.length; i++)
                {
                    buffer.fillStyle = gco.missionText[i].color;
                    buffer.font = gco.missionText[i].fontStyle;
                    buffer.textAlign = gco.missionText[i].alignX;
                    buffer.textBaseline = gco.missionText[i].alignY;
                    buffer.fillText(gco.missionText[i].text, gco.missionText[i].x, gco.missionText[i].y);
					switch(i){
						case 0:{ buffer.drawImage(enemyImages[0], gco.missionText[i].x + xDrawOffset, gco.missionText[i].y - 5, enemyImages[0].width, enemyImages[0].height); break;}
						case 1:{ buffer.drawImage(enemyImages[2], gco.missionText[i].x + xDrawOffset, gco.missionText[i].y - 5, enemyImages[2].width, enemyImages[2].height); break;}
						case 2:{ buffer.drawImage(enemyImages[4], gco.missionText[i].x + xDrawOffset, gco.missionText[i].y - 5, enemyImages[4].width, enemyImages[4].height); break;}
						case 3:{ buffer.drawImage(enemyImages[6], gco.missionText[i].x + xDrawOffset, gco.missionText[i].y - 5, enemyImages[6].width, enemyImages[6].height); break;}
						case 4:{ buffer.drawImage(enemyImages[11], gco.missionText[i].x + xDrawOffset, gco.missionText[i].y - 5, enemyImages[11].width, enemyImages[11].height); break;}
					}
                }
                buffer.closePath();
            // Level Progress Meter
                var LPM_width = _buffer.width;
                var LPM_height = 20;
                var LPM_x1 = 0;
                var LPM_y1 = _buffer.height / 2 - 75;
                var LPM_x2 = LPM_width;
                var LPM_y2 = LPM_y1 + LPM_height;

                buffer.beginPath();
                    buffer.fillStyle = "rgba(0, 192, 255, 0.5)";
                    buffer.fillRect(LPM_x1, LPM_y1, LPM_width, LPM_height);
                buffer.closePath();
                var LPM_grd = buffer.createLinearGradient(LPM_x1, LPM_y1, LPM_x2, LPM_y2);
                LPM_grd.addColorStop(0, "rgb(0, 0, 255)");
                LPM_grd.addColorStop(1, "rgb(0, 192, 255)");
                buffer.beginPath();
                    buffer.fillStyle = LPM_grd;
                    buffer.fillRect(LPM_x1, LPM_y1, LPM_width * gco.levelProgress, LPM_height);
                buffer.closePath();
                
                buffer.beginPath();
                    buffer.strokeStyle = "rgb(255, 255, 255)";
                        buffer.moveTo(LPM_x1, LPM_y1);
                        buffer.lineTo(LPM_x2, LPM_y1);
                        buffer.lineTo(LPM_x2, LPM_y2);
                        buffer.lineTo(LPM_x1, LPM_y2);
                        buffer.lineTo(LPM_x1, LPM_y1);
                    buffer.stroke();
                buffer.closePath();
                
                if(menu.states[2][1][3] || (mouseX > (_canvas.width - 210) && mouseX < (_canvas.width - 10) && mouseY < (278) && mouseY > (250)))
                {//Start Level
                    guiText[5] = new GUIText("Start Level", _canvas.width - 110, 250, "28px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
					menu.DrawArrow(3, _canvas.width - 225, 262);
                    if(player.weapon == 49){guiText[12] = new GUIText("Must equip main weapon", _canvas.width - 100, 280, "12px VT323", "center", "top", "rgb(255, 50, 50)");}
                } else
                {
                    guiText[5] = new GUIText("Start Level", _canvas.width - 110, 250, "28px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }

                // Bottom text tooltip initialization
                //guiText[6] = new GUIText("Select item to purchase.", _canvas.width / 2, _canvas.height - 33, "16px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[6] = new GUIText("", _canvas.width / 2, _canvas.height - 53, "18px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[10] = new GUIText("", _canvas.width / 2, _canvas.height - 303, "16px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[11] = new GUIText("", _canvas.width / 2, _canvas.height - 303, "16px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[12] = new GUIText("", _canvas.width / 2, _canvas.height - 303, "16px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[13] = new GUIText("", _canvas.width / 2, _canvas.height - 33, "14px VT323", "center", "top", "rgb(230, 230, 255)");
				guiText[14] = new GUIText("", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(230, 230, 255)");

                // GUI Icons
// NEW WEAPON Primary Assult
                if(menu.states[2][1][0] || (mouseX > 10 && mouseX < 58 && mouseY > 280 && mouseY < 328))
                {//Primary Assult, Weapon ID: 0
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[0], 10, 280, 48, 48);    
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 34, 336);					
					guiText[6].text = "Primary Assult";
					if(player.weapon == 0){
						guiText[13].text = "Equipped";
					}else{
						guiText[13].text = "Select to Equip";
					}
					
                }
                if(gco.weaponsOwned[0] && player.weapon == 0)
                {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[0], 10, 280, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[0], 10, 280, 48, 48);
					buffer.globalAlpha = 1.0;
                } 
                //END WEAPON

// NEW WEAPON Rapid Fire Assult
                if(menu.states[2][1][1] || (mouseX > 60 && mouseX < 108 && mouseY > 280 && mouseY < 328))
                {//Rapid Fire Assult, Weapon ID: 1
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[1], 60, 280, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 84, 336);
					guiText[6].text = "Rapid Fire Assult";
                    if(gco.weaponsOwned[1])
                    {
						if(player.weapon == 1){
							guiText[13].text = "Equipped";
						}else{
							guiText[13].text = "Select to Equip";
						}
                    } else
                    {
						guiText[13].text = gco.weaponPrice[1] + " Cores";
                    }
                }
                if(gco.weaponsOwned[1] && player.weapon == 1)
                {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 150, 250)';
                    buffer.drawImage(images[1], 60, 280, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[1], 60, 280, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON
				
// NEW WEAPON Rapid Fire Cyclone
                if(menu.states[2][1][2] || (mouseX > 110 && mouseX < 158 && mouseY > 280 && mouseY < 328))
                {//Rapid Fire Cyclone, Weapon ID: 2
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[7], 110, 280, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 134, 336);
					guiText[6].text = "Rapid Fire Cyclone";
                    if(gco.weaponsOwned[2])
                    {
						if(player.weapon == 2){
							guiText[13].text = "Equipped";
						}else{
							guiText[13].text = "Select to Equip";
						}
                    } else
                    {
                        guiText[13].text = gco.weaponPrice[2] + " Cores";
                    }
                }
                if(gco.weaponsOwned[2] && player.weapon == 2)
                {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 150, 250)';
                    buffer.drawImage(images[7], 110, 280, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[7], 110, 280, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON

// NEW WEAPON SD-15 Sidewinder
                if(menu.states[2][2][0] || (mouseX > 10 && mouseX < 58 && mouseY > 448 && mouseY < 496))
                {//SD-15 Sidewinder, Weapon ID: 50
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[2], 10, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 34, 504);
                    guiText[6].text = "SD-15 Sidewinder";
					if(player.secondary == 50){
						guiText[13].text = "Equipped";
					}else{
						guiText[13].text = "Select to Equip";
					}
                    
                }
                if(gco.weaponsOwned[50] && player.secondary == 50)
                {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[2], 10, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[2], 10, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }

                //END WEAPON

// NEW WEAPON DM-21 Auto Strike
                if(menu.states[2][2][1] || (mouseX > 60 && mouseX < 108 && mouseY > 448 && mouseY < 496))
                {//DM-21 Auto Strike, Weapon ID: 51
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[3], 60, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 84, 504);
					guiText[6].text = "DM-21 Auto Strike";
                    if(gco.weaponsOwned[51])
                    {
						if(player.secondary == 51){
							guiText[13].text = "Equipped";
						}else{
							guiText[13].text = "Select to Equip";
						}
                    } else
                    {
                        guiText[13].text = gco.weaponPrice[51] + " Cores";
                    }
                }
                if(gco.weaponsOwned[51] && player.secondary == 51)
                {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[3], 60, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[3], 60, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON

// NEW WEAPON Impact Burst Mine
                if(menu.states[2][2][2] || (mouseX > 110 && mouseX < 158 && mouseY > 448 && mouseY < 496))
                {//Impact Burst Mine, Weapon ID: 52
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[8], 110, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 134, 504);
					guiText[6].text = "Impact Burst Mine";
                    if(gco.weaponsOwned[52])
                    {
						if(player.secondary == 52){
							guiText[13].text = "Equipped";
						}else{
							guiText[13].text = "Select to Equip";
						}
                    } else
                    {
                        guiText[13].text = gco.weaponPrice[52] + " Cores";
                    }
                }
                if(gco.weaponsOwned[52] && player.secondary == 52)
                {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[8], 110, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[8], 110, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON
				
// NEW WEAPON Laser
                if(menu.states[2][2][3] || (mouseX > 160 && mouseX < 208 && mouseY > 448 && mouseY < 496))
                {//Laser: Weapon ID: 9000
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[9], 160, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 184, 504);
					guiText[6].text = "LB-24 Ultima Laser";
                    if(gco.ownLaser)
                    {
						if(player.secondary == 9000){
							guiText[13].text = "Equipped";
						}else{
							guiText[13].text = "Select to Equip";
						}
                    } else
                    {
                        guiText[13].text = gco.laserPrice + " Cores";
                    }
                }
                if(gco.ownLaser && player.secondary == 9000)
                {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[9], 160, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[9], 160, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON
				
// NEW POWERUP Shield
                if(menu.states[2][2][4] || (mouseX > _canvas.width - 300 && mouseX < _canvas.width - 252 && mouseY > 448 && mouseY < 496))
                {//Shield
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, _canvas.width - 276, 504);
					guiText[6].text = "Shield"
					guiText[6].y = _canvas.height - 65
					guiText[6].fontStyle = "20px VT323"
                    if(player.hasShield)
                     {
						guiText[14] = new GUIText("Upgrade: " + (player.shieldLevel + 1) * 250 + " Cores", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(230, 230, 255)");
						guiText[13].text = "Level: " + player.shieldLevel
						guiText[13].y = _canvas.height - 43
                     } else {
						guiText[14] = new GUIText("250 Cores", _canvas.width / 2, _canvas.height - 33, "14px VT323", "center", "top", "rgb(230, 230, 255)");
					 }
                }
                if(player.hasShield)
                {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON

// NEW POWERUP Max Ammo
                if(menu.states[2][2][5] || (mouseX > _canvas.width - 250 && mouseX < _canvas.width - 202 && mouseY > 448 && mouseY < 496))
                {//Max Ammo
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[5], _canvas.width - 250, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, _canvas.width - 226, 504);
					guiText[6].text = "Ammo"
					guiText[6].y = _canvas.height - 65
					guiText[6].fontStyle = "20px VT323"
					guiText[14] = new GUIText("Upgrade: " + (player.secondaryAmmoLevel + 1) * 50 + " Cores", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(230, 230, 255)");
					guiText[13].text = "Level: " + player.secondaryAmmoLevel;
					guiText[13].y = _canvas.height - 43;

                    //guiText[6].text = "Ammo Level: " + player.secondaryAmmoLevel + "  Max Secondary Ammo: " + player.maxSecondaryAmmo + ". Upgrade for " + (player.secondaryAmmoLevel + 1) * 50 + " cores.";
                }
                if(player.secondaryAmmoLevel > 1) {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[5], _canvas.width - 250, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
				else {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[5], _canvas.width - 250, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON
			
// NEW POWERUP Buy Secondary Ammo
                if(menu.states[2][2][6] || (mouseX > _canvas.width - 200 && mouseX < _canvas.width - 152 && mouseY > 448 && mouseY < 496))
                {//Buy Secondary Ammo
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[6], _canvas.width - 200, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, _canvas.width - 176, 504);
					guiText[6].text = "Ammo"
					guiText[6].y = _canvas.height - 65
					guiText[6].fontStyle = "20px VT323"
					guiText[13].text = "Level: " + player.secondaryAmmoLevel;
					guiText[13].y = _canvas.height - 43;
					guiText[13].text = player.secondaryAmmo + "/" + player.maxSecondaryAmmo;
					if(player.secondaryAmmo < player.maxSecondaryAmmo) {
						guiText[14] = new GUIText(gco.secondaryAmmoPrice + " Cores", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(230, 230, 255)");
					} else {
						guiText[14] = new GUIText("Full", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(255, 0, 0)");
					}
                }
                if(player.secondaryAmmo < player.maxSecondaryAmmo)
                {
					buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[6], _canvas.width - 200, 448, 48, 48);
					buffer.shadowBlur = 0;
                }
                else
                {
					buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[6], _canvas.width - 200, 448, 48, 48);
					buffer.globalAlpha = 1.0;
                }
                //END WEAPON

				// Options Menu Selection
                if(menu.states[2][0][0] || (mouseX > (_canvas.width - 248) && mouseX < (_canvas.width - 147) && mouseY < (48) && mouseY > (20)))
                {//Options Menu
                    guiText[10] = new GUIText("Options", _canvas.width - 200, 20, "20px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
					menu.DrawArrow(3, _canvas.width - 263, 28);
                } else
                {
                    guiText[10] = new GUIText("Options", _canvas.width - 200, 20, "20px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }

                // Quit game
                if(menu.states[2][0][1] || (mouseX > (_canvas.width - 86) && mouseX < (_canvas.width - 30) && mouseY < (48) && mouseY > (20)))
                {//Quit
                    guiText[11] = new GUIText("Quit", _canvas.width - 60, 20, "20px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
					menu.DrawArrow(3, _canvas.width - 100, 28);
                } else
                {
                    guiText[11] = new GUIText("Quit", _canvas.width - 60, 20, "20px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }
				
				guiText[12] = new GUIText("Score: " + score, 10, _canvas.height - 53, "18px VT323", "left", "top", "rgb(230, 230, 255)");
//**********************************************************************//
//					  BEGIN PILOT SELECT SECTION						//
//**********************************************************************//

//**********************************************************************//
//					  END PILOT SELECT SECTION							//
//**********************************************************************//

//**********************************************************************//
//					  END UPGRADE MENU SECTION							//
//**********************************************************************//
                break;
			}
			case 3:
			{// Continue Menu
				guiText[0] = new GUIText("You Died", _canvas.width / 2, _canvas.height / 2 - 100, "42px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
										 
        		if(menu.states[3][0] || (mouseX > (_canvas.width / 2 + 15) - 65 && mouseX < (_canvas.width / 2 + 15) + 36 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 14)) {
                    if(menu.states[3][0]) menu.DrawArrow(3, _canvas.width / 2 - 56, _canvas.height / 2 + 15);
					guiText[1] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
				} else {
					guiText[1] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
				}
				if(menu.states[3][1] || (mouseX > (_canvas.width / 2 + 10) - 63 && mouseX < (_canvas.width / 2 + 10) + 43 && mouseY < (_canvas.height / 2 + 53) + 20 && mouseY > (_canvas.height / 2 + 50)))	{
                    if(menu.states[3][1]) menu.DrawArrow(3, _canvas.width / 2 - 60, _canvas.height / 2 + 66);
					guiText[2] = new GUIText("Main Menu", _canvas.width / 2, (_canvas.height / 2 + 50), "28px VT323", "center", "top", "rgb(255, 255, 255)");
				} else {
					guiText[2] = new GUIText("Main Menu", _canvas.width / 2, (_canvas.height / 2 + 50), "28px VT323", "center", "top", "rgb(210, 210, 210)");
				}
				if(menu.states[3][2] || (mouseX > (_canvas.width / 2 + 10) - 63 && mouseX < (_canvas.width / 2 + 10) + 43 && mouseY < (_canvas.height / 2 + 106) + 20 && mouseY > (_canvas.height / 2 + 100))) {
                    if(menu.states[3][2]) menu.DrawArrow(3, _canvas.width / 2 - 60, _canvas.height / 2 + 115);
					guiText[3] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2 + 100), "28px VT323", "center", "top", "rgb(255, 255, 255)");
				} else {
					guiText[3] = new GUIText("Exit Game", _canvas.width / 2, (_canvas.height / 2 + 100), "28px VT323", "center", "top", "rgb(210, 210, 210)");
				}
				break;
			}
			case 4:
			{// Level Up Menu
                guiText[0] = new GUIText("Level Up!", _canvas.width / 2, _canvas.height / 2 - 150, "44px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
                guiText[1] = new GUIText("Now on level: " + (gco.level + 1), _canvas.width / 2, _canvas.height / 2 - 100, "28px VT323", "center", "top", "rgb(255, 0, 0)");						 
                if(menu.states[4][0] || (mouseX > (_canvas.width / 2 + 10) - 75 && mouseX < (_canvas.width / 2 + 10) + 60 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10)) {
                    if(menu.states[4][0]) menu.DrawArrow(3, _canvas.width / 2 - 65, _canvas.height / 2 + 15);
                    guiText[2] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                } else {
                    guiText[2] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                break;
			}
			case 5:
			{// Game Over Menu
                guiText[0] = new GUIText("Game Over", _canvas.width / 2, _canvas.height / 2 - 100, "44px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
                if(menu.states[5][0] || (mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 30) && mouseY > (_canvas.height / 2))) {
                    if(menu.states[5][0]) menu.DrawArrow(3, _canvas.width / 2 - 65, _canvas.height / 2 + 15);
                    guiText[1] = new GUIText("Main Menu", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                } else {
                    guiText[1] = new GUIText("Main Menu", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                }
                if(menu.states[5][1] || (mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 80) && mouseY > (_canvas.height / 2 + 48))) {
                    if(menu.states[5][1]) menu.DrawArrow(3, _canvas.width / 2 - 65, _canvas.height / 2 + 65);
                    guiText[2] = new GUIText("Exit Game", _canvas.width / 2, _canvas.height / 2 + 50, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                } else {
                    guiText[2] = new GUIText("Exit Game", _canvas.width / 2, _canvas.height / 2 + 50, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                }
                break;
			}
			case 6:
			{
                //Options Menu
				guiText[0] = new GUIText("Options", _canvas.width / 2, 25, "36px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
				guiText[1] = new GUIText("Back", 10, _canvas.height - 35, "28px Thunderstrike", "left", "top", `rgb(96, ${menu.states[6][3] ? '255' : '150'}, 96)`);
                if(menu.states[6][3]) menu.DrawArrow(1, 105, _canvas.height - 20)
				if(mouseX > 0 && mouseX < 90 && mouseY < _canvas.height && mouseY > _canvas.height - 45)
				{
					guiText[1] = new GUIText("Back", 10, _canvas.height - 35, "28px Thunderstrike", "left", "top", "rgb(96, 255, 96)");
				}

                // Graphics
                guiText[2] = new GUIText("Particles", (_canvas.width / 2), 125, "20px Thunderstrike", "center", "top", `rgb(96, ${menu.states[6][0] ? '255' : '150'}, 96)`);
                if(menu.states[6][0]) menu.DrawArrow(3, _canvas.width / 2 - 75, 134)
                
                if(mouseX >= 200 && mouseX <= 225 && mouseY >= 150 && mouseY <= 200)
                {
					buffer.drawImage(images[11], (_canvas.width / 4), 150, 400, 50);
				}
                else if(mouseX >= 575 && mouseX <= 600 && mouseY >= 150 && mouseY <= 200)
                {
                    buffer.drawImage(images[12], (_canvas.width / 4), 150, 400, 50);
                }
                else
                {
                    buffer.drawImage(images[10], (_canvas.width / 4), 150, 400, 50);
                }
				
                buffer.drawImage(images[13], (19 + (87.5 * particleOffset) - 87.5) + (_canvas.width / 4), 161, 13, 28);
                
				switch(particleOffset)
				{
					case 1:{guiText[3] = new GUIText(particleOffset, _canvas.width / 2, 205, "26px VT323", "center", "top", "rgb(96, 255, 96)");
							guiText[4] = new GUIText("Need new computer...", _canvas.width / 2, 235, "14px VT323", "center", "top", "rgb(96, 255, 96)");break;}
					case 2:{guiText[3] = new GUIText(particleOffset, _canvas.width / 2, 205, "26px VT323", "center", "top", "rgb(120, 200, 60)");
							guiText[4] = new GUIText("Needs Shinies :(", _canvas.width / 2, 235, "14px VT323", "center", "top", "rgb(120, 200, 60)");break;}
					case 3:{guiText[3] = new GUIText(particleOffset, _canvas.width / 2, 205, "26px VT323", "center", "top", "rgb(150, 100, 20)");
							guiText[4] = new GUIText("Less Shinies.", _canvas.width / 2, 235, "14px VT323", "center", "top", "rgb(150, 100, 20)");break;}
					case 4:{guiText[3] = new GUIText(particleOffset, _canvas.width / 2, 205, "26px VT323", "center", "top", "rgb(200, 25, 0)");
							guiText[4] = new GUIText("Shinies!", _canvas.width / 2, 235, "14px VT323", "center", "top", "rgb(200, 55, 0)");break;}
					case 5:{guiText[3] = new GUIText(particleOffset, _canvas.width / 2, 205, "26px VT323", "center", "top", "rgb(255, 0, 0)");
							guiText[4] = new GUIText("OMFG SPARKLES!", _canvas.width / 2, 235, "14px VT323", "center", "top", "rgb(255, 0, 0)");break;}
				}
				
                // BGM Volume
				guiText[5] = new GUIText("BGM Volume", (_canvas.width / 2), 265, "20px Thunderstrike", "center", "top", `rgb(96, ${menu.states[6][1] ? '255' : '150'}, 96)`);
                if(menu.states[6][1]) menu.DrawArrow(3, _canvas.width / 2 - 95, 274)
                
                if(mouseX >= 200 && mouseX <= 225 && mouseY >= 290 && mouseY <= 340)
                {
					buffer.drawImage(images[11], (_canvas.width / 4), 290, 400, 50);
				}
                else if(mouseX >= 575 && mouseX <= 600 && mouseY >= 290 && mouseY <= 340)
                {
                    buffer.drawImage(images[12], (_canvas.width / 4), 290, 400, 50);
                }
                else
                {
                    buffer.drawImage(images[10], (_canvas.width / 4), 290, 400, 50);
                }
				
                buffer.drawImage(images[13], (19 + (35 * Math.round(gco.bgm.volume * 10))) + (_canvas.width / 4), 301, 13, 28);
                
                guiText[6] = new GUIText(Math.round(gco.bgm.volume * 100) + "%", _canvas.width / 2, 345, "26px VT323", "center", "top", "rgb(96, 255, 96)");
                
                // SFX Volume
				guiText[7] = new GUIText("SFX Volume", (_canvas.width / 2), 405, "20px Thunderstrike", "center", "top", `rgb(96, ${menu.states[6][2] ? '255' : '150'}, 96)`);
                if(menu.states[6][2]) menu.DrawArrow(3, _canvas.width / 2 - 92, 414)
                
                if(mouseX >= 200 && mouseX <= 225 && mouseY >= 430 && mouseY <= 480)
                {
					buffer.drawImage(images[11], (_canvas.width / 4), 430, 400, 50);
				}
                else if(mouseX >= 575 && mouseX <= 600 && mouseY >= 430 && mouseY <= 480)
                {
                    buffer.drawImage(images[12], (_canvas.width / 4), 430, 400, 50);
                }
                else
                {
                    buffer.drawImage(images[10], (_canvas.width / 4), 430, 400, 50);
                }
				
                buffer.drawImage(images[13], (19 + (35 * Math.round(sfx.masterVolume * 10))) + (_canvas.width / 4), 441, 13, 28);
                
                guiText[8] = new GUIText(Math.round(sfx.masterVolume * 100) + "%", _canvas.width / 2, 485, "26px VT323", "center", "top", "rgb(96, 255, 96)");
                break;
			}
			case 7:
			{ // Score Menu
				guiText[0] = new GUIText("Score" , _canvas.width / 2, _canvas.height / 2 - 230, "48px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
				guiText[1] = new GUIText(score , _canvas.width / 2, _canvas.height / 2 - 160, "38px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
				guiText[2] = new GUIText("Kills: " + enemiesKilled + "  Cores: " + totalCores + "  Items Used: " + itemsUsed, _canvas.width / 2, _canvas.height / 2 - 80, "20px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
        		if(menu.states[7][0] || (mouseX > _canvas.width / 2 - 60 && mouseX < _canvas.width / 2 + 60 && mouseY < _canvas.height / 2 + 30 && mouseY > _canvas.height / 2)) {
                    if(menu.states[7][0]) menu.DrawArrow(3, _canvas.width / 2 - 60, _canvas.height / 2 + 15);
					guiText[3] = new GUIText("Main Menu", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
				} else {
					guiText[3] = new GUIText("Main Menu", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
				}
				if(menu.states[7][1] || (mouseX > _canvas.width / 2 - 60 && mouseX < _canvas.width / 2 + 60 && mouseY < _canvas.height / 2 + 78 && mouseY > _canvas.height / 2 + 48)) {
                    if(menu.states[7][1]) menu.DrawArrow(3, _canvas.width / 2 - 60, _canvas.height / 2 + 65);
					guiText[4] = new GUIText("Exit Game", _canvas.width / 2, _canvas.height / 2 + 50, "28px VT323", "center", "top", "rgb(255, 255, 255)");
				} else {
					guiText[4] = new GUIText("Exit Game", _canvas.width / 2, _canvas.height / 2 + 50, "28px VT323", "center", "top", "rgb(210, 210, 210)");
				}
				break;
			}
			default:{break;}
		}
		buffer.beginPath();
		for(var i = 0; i < guiText.length; i++)
        {
			buffer.fillStyle = guiText[i].color;
			buffer.font = guiText[i].fontStyle;
			buffer.textAlign = guiText[i].alignX;
			buffer.textBaseline = guiText[i].alignY;
			buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
		}
		buffer.closePath();
		delete guiText;
		if(!gco.win)
		{//Stateless Menu Items
			var guiText = [];
			//Debug
			if(debug)
			{
				guiText[0] = new GUIText("Shot: " + player.totalMissiles, 32, 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[1] = new GUIText("In Air: " + missiles.length, _canvas.width - 100, 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[2] = new GUIText("Enemies: " + enemies.length, _canvas.width - 250, 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[3] = new GUIText("Explosions: " + explosions.length, _canvas.width - 150, _canvas.height - 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[4] = new GUIText("FPS: " + FPS, 182, 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[5] = new GUIText("Seconds: " + seconds, 182, 52, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[6] = new GUIText("Tick: " + ticks, 182, 72, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				buffer.beginPath();
				for(var i = 0; i < guiText.length; i++)
				{
					buffer.fillStyle = guiText[i].color;
					buffer.font = guiText[i].fontStyle;
					buffer.textAlign = guiText[i].alignX;
					buffer.textBaseline = guiText[i].alignY;
					buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
				}
				buffer.closePath();
			}
			delete guiText;
			//End Debug
			
			// Player Info
			var guiText = [];
			if(playerInfo)
			{
				guiText[0] = new GUIText("Fuel: " + player.currentFuel, 105, _canvas.height - 78, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[1] = new GUIText(player.hasShield ? "Shield: " + Math.floor(player.shield) : "" , 105, _canvas.height - 53, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[2] = new GUIText("Hull: " + player.life, 105, _canvas.height - 28, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[3] = new GUIText("Destroyed: " + destroys, _canvas.width / 2, _canvas.height - 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[4] = new GUIText("Cores: " + player.money, _canvas.width / 2, _canvas.height - 53, "18px VT323", "left", "top", "rgb(96, 255, 96)");
				guiText[5] = new GUIText("Score: " + score, _canvas.width - 100, 20, "12px VT323", "left", "top", "rgb(96, 255, 96)");
			} else
			{
                if(gameState == 1)
                {
                    guiText[0] = new GUIText("[E] Ship Info", 105, _canvas.height - 28, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                }
			}
			buffer.beginPath();
				for(var i = 0; i < guiText.length; i++)
				{
					buffer.fillStyle = guiText[i].color;
					buffer.font = guiText[i].fontStyle;
					buffer.textAlign = guiText[i].alignX;
					buffer.textBaseline = guiText[i].alignY;
					buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
				}
			buffer.closePath();
			delete guiText;
			//Must Purchase Previous Weapon Dialogue
			var guiText = [];
			if(gameState != 1 && gco.mustPurchasePrevious > 0)
			{
				guiText[0] = new GUIText("Must Purchase Previous Weapon", _canvas.width / 2, _canvas.height / 2, "18px VT323", "center", "center", "rgb(255, 0, 0)");
				buffer.beginPath();
				for(var i = 0; i < guiText.length; i++)
				{
					buffer.fillStyle = guiText[i].color;
					buffer.font = guiText[i].fontStyle;
					buffer.textAlign = guiText[i].alignX;
					buffer.textBaseline = guiText[i].alignY;
					buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
				}
				buffer.closePath();
			}
			delete guiText;
			//Not Enough Cores Menu
			var guiText = [];
			if(gameState != 1 && gco.notEnoughCores > 0)
			{
				guiText[0] = new GUIText("Not Enough Cores", _canvas.width / 2, (_canvas.height / 2) - 20, "18px VT323", "center", "center", "rgb(255, 0, 0)");
				buffer.beginPath();
				for(var i = 0; i < guiText.length; i++)
				{
					buffer.fillStyle = guiText[i].color;
					buffer.font = guiText[i].fontStyle;
					buffer.textAlign = guiText[i].alignX;
					buffer.textBaseline = guiText[i].alignY;
					buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
				}
				buffer.closePath();
			}
		}
		delete guiText;
		// End Player Info
    }
    
    /******************************************************/
    
    
    /******************************************************/
    // Game Loop
    /******************************************************/
    var calcFPS = 0;
    this.Loop = function()
    {
        frame++;
		calcFPS++;
        var curTime = Date.now();
        elapsedTime = curTime - prevTime;
        prevTime = curTime;

        delta = elapsedTime / 1000;

        tickTime += delta;
        if(tickTime >= (ticks / 20))
        {
            ticks++;
            if(ticks >= 20)
            {
				FPS = calcFPS;
				calcFPS = 0;
                tickTime = 0;
                ticks = 0;
                seconds++;
            }
        }
        //if(ticks % 5 == 0){ FPS = Math.floor(1 / delta); }
		
        self.Update();
        self.Draw();	
    }
    
    /******************************************************/
}