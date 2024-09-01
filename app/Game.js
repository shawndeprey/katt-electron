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
    let gameInitalized = false;

	//Tracked Data
	var score = 0;
	var enemyPoints = 0;
	var enemiesKilled = 0;
	var itemsUsed = 0;
	var totalCores = 0;
	
    this.gameLoop = null;
    var self = this;
    var gameState = 0;
    var debug = false;
	var playerInfo = false;
	var masterBGMVolume = 0.2;
	var bossPhase = -1;
    var postProcessing = {bloom: false};
    var lg = null;
    var planet = null;
    var planetLevel = null;
	
	// GUI Info
	var currentGui = 0;
	var lastGui = 0;
	var NULL_GUI_STATE = 8;// Should always be above current state limit
	// State GUIs
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
    var gamepadX = false;
    var gamepadStart = false;
	
	// Options
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
    for(var i = 0; i < starTypes; i++) {
        starImages[i] = new Image();
        starImages[i].addEventListener('load', self.loadedImage, false);
        starImages[i].addEventListener('error', function() {
            console.log('Error loading image: Graphics/Stars/star_' + i + '.png');
        });
        starImages[i].src = ('Graphics/Stars/star_' + i + '.png');
    }

    var portraitImages = [];
    for(var i = 0; i < 6; i++) {
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
    for(var i = 0; i < 14; i++) {
        images[i] = new Image();
        images[i].addEventListener('load', self.loadedImage, false);
        images[i].src = ('Graphics/GUI_0' + i + '.png');
    }
    
    var enemyImages = [];
    for(var i = 0; i < 21; i++) {
        enemyImages[i] = new Image();
        enemyImages[i].addEventListener('load', self.loadedImage, false);
        enemyImages[i].src = ('Graphics/ship_' + i + '.png');
    }
    
    var playerImages1 = [];
    for(var i = 0; i < 20; i++) {
        playerImages1[i] = new Image();
        playerImages1[i].addEventListener('load', self.loadedImage, false);
        playerImages1[i].src = ('Graphics/Player/ship1/normal/player_' + i + '.png');
    }

    var playerImages2 = [];
    for(var i = 0; i < 20; i++) {
        playerImages2[i] = new Image();
        playerImages2[i].addEventListener('load', self.loadedImage, false);
        playerImages2[i].src = ('Graphics/Player/ship2/normal/player_' + i + '.png');
    }

    var playerImages3 = [];
    for(var i = 0; i < 20; i++) {
        playerImages3[i] = new Image();
        playerImages3[i].addEventListener('load', self.loadedImage, false);
        playerImages3[i].src = ('Graphics/Player/ship3/normal/player_' + i + '.png');
    }

    var playerImages4 = [];
    for(var i = 0; i < 20; i++) {
        playerImages4[i] = new Image();
        playerImages4[i].addEventListener('load', self.loadedImage, false);
        playerImages4[i].src = ('Graphics/Player/ship4/normal/player_' + i + '.png');
    }

    var playerImages5 = [];
    for(var i = 0; i < 20; i++) {
        playerImages5[i] = new Image();
        playerImages5[i].addEventListener('load', self.loadedImage, false);
        playerImages5[i].src = ('Graphics/Player/ship5/normal/player_' + i + '.png');
    }

    var playerImages6 = [];
    for(var i = 0; i < 20; i++) {
        playerImages6[i] = new Image();
        playerImages6[i].addEventListener('load', self.loadedImage, false);
        playerImages6[i].src = ('Graphics/Player/ship6/normal/player_' + i + '.png');
    }

    var playerImages7 = [];
    for(var i = 0; i < 20; i++) {
        playerImages7[i] = new Image();
        playerImages7[i].addEventListener('load', self.loadedImage, false);
        playerImages7[i].src = ('Graphics/Player/ship7/normal/player_' + i + '.png');
    }

    var playerImages8 = [];
    for(var i = 0; i < 20; i++) {
        playerImages8[i] = new Image();
        playerImages8[i].addEventListener('load', self.loadedImage, false);
        playerImages8[i].src = ('Graphics/Player/ship8/normal/player_' + i + '.png');
    }
    
    var itemImages = [];
    for(var i = 0; i < 5; i++) {
        itemImages[i] = new Image();
        itemImages[i].addEventListener('load', self.loadedImage, false);
        itemImages[i].src = ('Graphics/item_0' + i + '.png')
    }

    var logoImages = [];
    for(var i = 0; i < 1; i++) {
        logoImages[i] = new Image();
        logoImages[i].addEventListener('load', self.loadedImage, false);
        logoImages[i].src = ('Graphics/Logo.png')
    }

    var transitionImages = [];
    for(var i = 0; i < 1; i++) {
        transitionImages[i] = new Image();
        transitionImages[i].addEventListener('load', self.loadedImage, false);
        transitionImages[i].src = ('Graphics/UI/transition.png')
    }

    var cutsceneImages = [];
    for(var i = 0; i < 1; i++) {
        cutsceneImages[i] = new Image();
        cutsceneImages[i].addEventListener('load', self.loadedImage, false);
        cutsceneImages[i].src = (`Graphics/Cutscene/cs_${i}.jpg`)
    }

    var wepImages = [];
    for(var i = 0; i < 5; i++) {
        wepImages[i] = new Image();
        wepImages[i].addEventListener('load', self.loadedImage, false);
        wepImages[i].src = (`Graphics/UI/wep_${i}.png`);
    }

    var dmgImages = [];
    for(var i = 0; i < 5; i++) {
        dmgImages[i] = new Image();
        dmgImages[i].addEventListener('load', self.loadedImage, false);
        dmgImages[i].src = (`Graphics/UI/dmg_${i}.png`);
    }

    var missileImages = [];
    for(var i = 0; i < 5; i++) {
        missileImages[i] = new Image();
        missileImages[i].addEventListener('load', self.loadedImage, false);
        missileImages[i].src = (`Graphics/Missiles/missile_${i}.png`);
    }

    var lasImages = [];
    for(var i = 0; i < 5; i++) {
        lasImages[i] = new Image();
        lasImages[i].addEventListener('load', self.loadedImage, false);
        lasImages[i].src = (`Graphics/UI/las_${i}.png`);
    }

    var lasdmgImages = [];
    for(var i = 0; i < 5; i++) {
        lasdmgImages[i] = new Image();
        lasdmgImages[i].addEventListener('load', self.loadedImage, false);
        lasdmgImages[i].src = (`Graphics/UI/lasdmg_${i}.png`);
    }

	var numOfImages = (starImages.length + images.length + enemyImages.length + playerImages1.length + playerImages2.length + playerImages3.length
        + playerImages4.length + playerImages5.length + playerImages6.length + playerImages7.length + playerImages8.length
        + itemImages.length + logoImages.length + fgImages.length + portraitImages.length + transitionImages.length + cutsceneImages.length + wepImages.length
        + dmgImages.length + missileImages.length + lasImages.length + lasdmgImages.length);

    // Containers
    var stars = [];
    var missiles = [];
    var enemies = [];
    var explosions = [];
	var money = [];
	var randomItems = [];
    var playerTrails = [];
    
	var NUM_OF_RANDOM_ITEMS = 3;
	//0 = Health
	//1 = Shield
	//2 = Cores
    
    // Scoring
    var destroys = 0;
	var totalDestroys = 0;
	var totalShots = 0;

    // Mechanics
    var colSwap = true;

    // Keypress Memory Spaces - Every new supported key MUST have an index in this array!
    var Keys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
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
	document.querySelector("#bgm_boss").addEventListener("ended",swapBGM,false);
	//Error Detection
	document.querySelector("#bgm_square").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_fast").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_soar").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_dorian").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_euphoria").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_energy").addEventListener("error",swapBGM,false);
	document.querySelector("#bgm_boss").addEventListener("error",swapBGM,false);

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

    this.InitGame = function()
    {
        gco.bgm = document.getElementById('bgm_square');
        gco.init_audio();
        setTimeout(() => {
            gameInitalized = true;
        }, 1500);
    }

	this.RefreshSoundsOnGameLoss = function()
	{
		gco.bgm = document.getElementById('bgm_square');
		gco.init_audio();
	}
   
    this.hardReset = function()
    {
        paused = false;
        currentGui = 0;
        gameState = 0;
        missiles = [];
		enemies = [];
		explosions = [];
        score = 0;        
        totalShots = 0;
		randomItems = [];
        money = [];
		totalDestroys = 0;
		destroys = 0;
        totalCores = 0;
        player = new Player();
        player.ResetAll();
		gco.bgm.pause();
		gco = new GameControlObject();
		gco.Init();
        gco.EquipWeapon(0);
        menu = new Menu();
        menu.Init()
		sfx.pause(1);
		self.RefreshSoundsOnGameLoss();
		enemyGeneration = new EnemyGeneration();
        lg = new LevelGen();
        planet = new Planet();
        planetLevel = new PlanetLevel();
        ed.ResetAll();
        playerInfo = false;
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
        totalShots += player.totalMissiles;
        player.totalMissiles = 0;
        player.resetLife();
        player.resetBoost();
        player.resetPosition();
        player.resetShield();
        sfx.pause(1);//Pause laser sound on round end
        enemyGeneration.hasBoss = false;
        playerInfo = false;
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

    this.isColliding = function(bb1, bb2) {
        // Extract the bounding box coordinates
        const [bb1Left, bb1Top, bb1Right, bb1Bottom] = [bb1[0].x, bb1[0].y, bb1[1].x, bb1[2].y];
        const [bb2Left, bb2Top, bb2Right, bb2Bottom] = [bb2[0].x, bb2[0].y, bb2[1].x, bb2[2].y];

        // Check for collision
        if (bb1Right < bb2Left || bb1Left > bb2Right || bb1Bottom < bb2Top || bb1Top > bb2Bottom) {
            return false;
        }
        return true;
    }

    this.getCentralOverlapX = function(bb1, bb2) {
        // Find the min and max x-coordinates for both bounding boxes
        const bbMinX = Math.min(bb1[0].x, bb1[1].x, bb1[2].x, bb1[3].x);
        const bbMaxX = Math.max(bb1[0].x, bb1[1].x, bb1[2].x, bb1[3].x);
        const colMinX = Math.min(bb2[0].x, bb2[1].x, bb2[2].x, bb2[3].x);
        const colMaxX = Math.max(bb2[0].x, bb2[1].x, bb2[2].x, bb2[3].x);
    
        // Determine the overlapping range
        const overlapMinX = Math.max(bbMinX, colMinX);
        const overlapMaxX = Math.min(bbMaxX, colMaxX);
    
        // If there is no overlap, return null or some indication of no overlap
        if (overlapMinX >= overlapMaxX) {
            return null; // No overlap
        }
    
        // Calculate the central x-coordinate of the overlap
        const centralOverlapX = (overlapMinX + overlapMaxX) / 2;
        return centralOverlapX;
    }

    // This is an easing function meant to smoothly ease between 1 number and another.
    // i.e. animate smoothly between y1 and y2.
    this.easeOutQuad = function(start, end, progress) {
        return start + (end - start) * (1 - Math.pow(1 - progress, 2));
    }
    /******************************************************/
    
    
    /******************************************************/
    // Objects
    /******************************************************/
    function GameControlObject()
    {   
        this.Init = function() {
            // Levels
            this.level = 0;
            this.levelDefs = {
                0: {title: "Tutorial", upgradeTutorial: false},
                1: {title: "Level 1 Gauntlet", upgradeTutorial: false}, 2: {title: "Level 1 Boss", upgradeTutorial: false},
                3: {title: "Level 2 Gauntlet", upgradeTutorial: true}, 4: {title: "Level 2 Boss", upgradeTutorial: false},
                5: {title: "Level 3 Gauntlet", upgradeTutorial: false}, 6: {title: "Level 3 Boss", upgradeTutorial: false},
                7: {title: "Level 4 Gauntlet", upgradeTutorial: true}, 8: {title: "Level 4 Boss", upgradeTutorial: false},
                9: {title: "Level 5 Gauntlet", upgradeTutorial: false}, 10: {title: "Level 5 Boss", upgradeTutorial: false},
                11: {title: "Level 6 Gauntlet", upgradeTutorial: false}, 12: {title: "Level 6 Boss", upgradeTutorial: false},
                13: {title: "Level 7 Gauntlet", upgradeTutorial: true}, 14: {title: "Level 7 Boss", upgradeTutorial: false},
                15: {title: "Level 8 Gauntlet", upgradeTutorial: false}, 16: {title: "Level 8 Boss", upgradeTutorial: false},
                17: {title: "Level 9 Gauntlet", upgradeTutorial: false}, 18: {title: "Level 9 Boss", upgradeTutorial: false},
                19: {title: "Level 10 Gauntlet", upgradeTutorial: true}, 20: {title: "Level 10 Boss", upgradeTutorial: false},
                21: {title: "Level 11 Gauntlet", upgradeTutorial: false}, 22: {title: "Level 11 Boss", upgradeTutorial: false},
                23: {title: "Level 12 Boss", upgradeTutorial: false}
            }
            this.finalLevel = 23
            this.win = false;

            this.enemiesKilled = []; // [enemyNum] = 126
            this.weaponsOwned = []; // [weaponNum] = true
            this.weaponPrice = []; // [weaponNum] = 486 (cores)
            this.laserPrice = []; // [laser.level] = 486 (cores)
            this.damagePrice = []; // [damageLevel] = 486 (cores)
            this.laserDamagePrice = []; // [damageLevel] = 486 (cores)
            this.ownLaser = false;
            this.levelMission = new LevelMission();
            this.extras = [];
            this.extraPrices = [];
            this.onTick = 0;
            this.bgm = null;
            
            this.bossX = 0; // Final Boss X set when boss dies
            this.bossY = 0; // Final Boss Y set when boss dies
            
            this.credits = new Credits();
            this.story = new Story();
            this.transition = new Transition();
            this.transition.Init();
            this.playStory = false;
            
            this.mustPurchasePrevious = 0;
            this.notEnoughCores = 0;
            
            this.weaponsOwned[0] = true;//Primary Assult
            this.weaponsOwned[1] = false;//Rapid Fire Assult
            this.weaponsOwned[2] = false;//Rapid Fire Cyclone
            this.weaponsOwned[3] = false;//Rapid Fire Cyclone
            this.weaponsOwned[4] = false;//Rapid Fire Cyclone
            this.weaponsOwned[49] = true;//Null Weapon
            
            this.weaponPrice[0] = 0;//Primary Assult
            this.weaponPrice[1] = 150;//Rapid Fire Assult
            this.weaponPrice[2] = 250;//Rapid Fire Cyclone
            this.weaponPrice[3] = 350;//Rapid Fire Cyclone
            this.weaponPrice[4] = 500;//Rapid Fire Cyclone
            this.damagePrice[0] = 0;
            this.damagePrice[1] = 150;
            this.damagePrice[2] = 250;
            this.damagePrice[3] = 350;
            this.damagePrice[4] = 500;

            this.laserPrice[0] = 0;//Laser 1
            this.laserPrice[1] = 150;//Laser 2
            this.laserPrice[2] = 250;//Laser 3
            this.laserPrice[3] = 350;//Laser 4
            this.laserPrice[4] = 500;//Laser 5
            this.laserDamagePrice[0] = 0;
            this.laserDamagePrice[1] = 150;
            this.laserDamagePrice[2] = 250;
            this.laserDamagePrice[3] = 350;
            this.laserDamagePrice[4] = 500;
        }

        this.Ended = function() {
            return this.credits.isBlackedOut || currentGui == 7;
        }
        
        this.init_audio = function() {
            if(this.bgm.currentTime) {
                this.bgm.currentTime = 0;
            }
            this.bgm.volume = masterBGMVolume;
            this.bgm.play();
        }
        
        this.ProgressLevel = function() {
            this.level += 1;
            this.levelMission.resetProgress();
        }

        this.levelTitle = function() {
            return this.levelDefs[this.level].title;
        }

        this.hasDialogueForUpgrade = function() {
            if(this.levelDefs[this.level].upgradeTutorial) {
                this.levelDefs[this.level].upgradeTutorial = false;
                return true;
            }
            return false
        }
        
        this.PurchaseWeapon = function(wepID) { //assumes player has the cash/doesn't own weapon
            if(wepID - 1 < 0) {
                this.weaponsOwned[wepID] = true;
                this.EquipWeapon(wepID);
            } else {
                if(this.weaponsOwned[wepID - 1]) {
                    this.weaponsOwned[wepID] = true;
                    player.money -= this.weaponPrice[wepID];
                    sfx.play(15);
                    this.EquipWeapon(wepID);
                } else {
                    this.mustPurchasePrevious = 1000;
                }
            }
        }
        
        this.EquipWeapon = function(wepID) {
            sfx.play(16);
            player.weapon = wepID;
        }
        
        this.PurchaseExtras = function(itemNumber) {
            sfx.play(15); sfx.play(16);
            switch(itemNumber) {
                case 0: { // Shield
                    player.money -= (player.shieldLevel + 1) * 250;
                    player.upgradeShield();
                    break;
                }
            }
        }
        
        this.GoToUpgradeMenu = function() {
            currentGui = 2;//Go to upgradeMenu
            gameState = 0;//Take game out of live mode
            menu.delayNextInput();
            playerInfo = false;
            sfx.pause(1);
        }
        
        this.StartLevel = function() {
            currentGui = NULL_GUI_STATE; // default case will Trigger
            gameState = 1; // Put Game in live mode
            player.resetPosition();
            ed.initEvent(1); // Fly in to level event
        }
        
        this.ShowContinueScreen = function() {
            currentGui = 3; // Continue(3), Game Over(5)
            menu.addLongDelay();
        }
        
        this.TogglePauseGame = function() {
            paused = !paused;
            sfx.play(paused ? 8 : 9);
        }
        
        this.Update = function() {
            if(this.onTick != ticks) {
                this.onTick = ticks;
                if(gameState == 1) {
                    if(!ed.eventPlaying() && !paused && !this.win && this.levelMission.GauntletComplete()) {
                        ed.initEvent(2); // Fly out of level event
                    }
                    if(this.win && !ed.cutscene.isBlackedOut()) {
                        if(Math.floor(Math.random() * 4) == 1) { this.RandomBossExplosion(); }
                    }
                }
            }
            this.transition.Update();
            if(this.credits.active) { this.credits.Update(); }
        }

        this.Draw = function() {
            this.transition.Draw();
            if(this.credits.active){ this.credits.Draw(); }
            if(this.playStory){ this.story.Draw(); }
        }

        this.goToLevelUpMenu = function() {
            menu.delayNextInput();
            currentGui = 4; // Go to level up menu
            gameState = 0;
            sfx.play(14);
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
        this.ResetAll = function() {
            this.onTick = 0;
            this.activeEvent = 0; // 0 = No Active Event
            this.eventTime = 0;
            this.subtickEventTime = 0;
            this.dialogue = new Dialogue();
            this.cutscene = new Cutscene();
            
            // Event variables other systems can watch or use
            this.skipStarMoveMultiplier = false;
            this.moveMultiplierOne = 1;
        }

        this.eventPlaying = function() { // Easy function for other game systems to query for event state
            return this.activeEvent !== 0;
        }

        this.movementEventPlaying = function() {
            return [1, 2].includes(this.activeEvent);
        }

        this.dialogueEventPlaying = function() {
            return [3, 4, 5].includes(this.activeEvent);
        }

        this.cutsceneEventPlaying = function() {
            return [6].includes(this.activeEvent);
        }

        this.globalActionCull = function() {
            // We needed a method to stop or pause things in the game when an event started.
            // This function serves that need an culls things from around that app that conflict with events.
            player.laser.stop();
            player.turnOffBoost();
        }

        this.initEvent = function(event) {
            this.globalActionCull();
            this.activeEvent = event;
            this.subtickEventTime = 0;
            this.skipStarMoveMultiplier = false;
            if(this.activeEvent == 1) {
                if(planetLevel.isEnabled()) {
                    if(gco.level == 13) {
                        planetLevel.initOutro();
                    } else {
                        planetLevel.init();
                    }
                    if(gco.level == 12) {
                        this.skipStarMoveMultiplier = true;
                    }
                }
                this.eventTime = 60; // 3 Seconds
                player.y = _buffer.height + player.height;
                lg.resetForLevel();
                sfx.play(3);
            } else if(this.activeEvent == 2) {
                if(planetLevel.isEnabled()) {
                    planetLevel.initOutro();
                    if(gco.level == 11 || gco.level == 12) {
                        this.skipStarMoveMultiplier = true;
                    }
                }
                this.eventTime = 60; // 3 Seconds
                sfx.play(3);
            } else if(this.activeEvent == 3) {
                this.dialogue.initDialogueForLevelIntro();
            } else if(this.activeEvent == 4) {
                this.dialogue.initDialogueForLevelOutro();
            } else if(this.activeEvent == 5) {
                this.dialogue.initDialogueForUpgrade();
            } else if(this.activeEvent == 6) {
                this.cutscene.initCutscene();
            }
        }

        this.endEvent = function() {
            this.activeEvent = 0;
        }

        this.Update = function() {
            // Timing claculators
            if(ticks != this.onTick) {
                this.onTick = ticks
                if (this.eventTime > 0) this.eventTime--; // For time based events, this controls the time of the event in 50ms increments
            }
            this.subtickEventTime += delta;
            // Event Updates
            if(this.activeEvent == 1) this.levelIntroUpdate();
            if(this.activeEvent == 2) this.levelOutroUpdate();
            if(this.dialogueEventPlaying()) this.dialogueUpdate();
            if(this.cutsceneEventPlaying()) this.cutsceneUpdate();
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

            if(planetLevel.isEnabled() && !planetLevel.isPositioned()) {
                // Calculate progress for subtick events: delta adds up and we divide it by 3 since the whole animation is 3 seconds
                if(gco.level == 13) {
                    planetLevel.progressOutroAnimation(this.subtickEventTime / 3);
                } else {
                    planetLevel.progressIntroAnimation(this.subtickEventTime / 3);
                }
            }

            // Speed calculation using the derivative of the cubic easing function
            // Speed should be proportional to the derivative of the easing function times the total distance
            let speed = -3 * Math.pow(1 - normalizedTime, 2) * totalDistance / 3; // Total duration is 3 seconds

            // Update player.y by speed adjusted for delta
            player.y += speed * delta;  // Use += since speed will be negative, moving the player up

            if(this.eventTime <= 0) {
                if(planetLevel.isEnabled() && !planetLevel.isPositioned()) {
                    if(gco.level == 13) {
                        planetLevel.finalizeOutroAnimation();
                    } else {
                        planetLevel.finalizeIntroAnimation();
                    }
                }
                this.endEvent();
                this.initEvent(3);
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

            for(var i = 0; i < missiles.length; i++) { // Enemy Update Ticks
                // Only perform this action for bombs
                if(missiles[i].missileType != 52) { continue; }
                missiles[i].y += speed * delta;
            }

            // Other items screen exit
            for(var i = 0; i < money.length; i++) { // Money Item Updates
                money[i].y += speed * delta;
            }
            for(var i = 0; i < randomItems.length; i++) { // Random Item Updates
                randomItems[i].y += speed * delta;
            }

            if(this.eventTime <= 0) {
                this.initEvent(4);
            }
        }

        this.dialogueUpdate = function() {
            if(this.dialogue.isFinished()) {
                if(this.activeEvent == 4) { // End of Level Dialogue
                    gco.ProgressLevel();
                    if(gco.levelMission.shouldImmediatelyStartLevel()) {
                        gco.StartLevel();
                    } else {
                        if(this.cutscene.shouldPlay()) {
                            this.initEvent(6);
                        } else {
                            this.endEvent();
                            gco.transition.toUpgrade();
                        }
                    }
                } else {
                    this.endEvent();
                }
            } else {
                this.dialogue.Update();
            }
        }

        this.cutsceneUpdate = function() {
            if(this.cutscene.isFinished()) {
                if(gco.level == 0) {
                    gco.StartLevel();
                } else {
                    this.endEvent();
                }
            } else {
                this.cutscene.Update();
            }
        }

        this.Draw = function() {
            if(this.dialogueEventPlaying()) {
                this.dialogue.Draw();
            }

            if(this.cutsceneEventPlaying()) {
                this.cutscene.Draw();
            }
        }

        this.DoInput = function() {
            if(gco.credits.active) { return; } // Disable input if credits are active

            if(this.dialogueEventPlaying()) {
                this.dialogue.DoInput();
            }

            if(this.cutsceneEventPlaying()) {
                this.cutscene.DoInput();
            }
        }

        this.ResetAll();
    }

    function Dialogue() {
        let onTick = 0;
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

        this.initDialogueForLevelIntro = function() {
            d = introDialogues[gco.level];
            introCustomStateOverrides();
            resetDialogueSteppingValues();
        }

        this.initDialogueForLevelOutro = function() {
            d = outroDialogues[gco.level];
            resetDialogueSteppingValues();
        }

        this.initDialogueForUpgrade = function() {
            let onUpgradeDialogue = {3: 0, 7: 1, 13: 2, 19: 3}[gco.level];
            d = upgradeDialogues[onUpgradeDialogue];
            resetDialogueSteppingValues();
        }

        const introCustomStateOverrides = function() {
            if(gco.level == 0 && hasControllerInput) d.lines = d.altLines; // Custom Tutorial Dialogue
        }

        const resetDialogueSteppingValues = function() {
            dialogueFinished = false;
            lineIndex = 0;
            resetDialogueValues();
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
                menu.delayNextInput();
                dialogueFinished = true;
            } else {
                resetDialogueValues();
                lineIndex++;
            }
            
        }

        this.DoInput = function() {
            if(timeout > 0 || percentageDone < 99) return;
            timeout = 15;
            sfx.play(8);
            Continue();
        }

        this.Draw = function() {
            var dialogueBoxWidth = 700;
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
            var imageWidth = 300; // Adjust for padding
            var imageHeight = imageWidth; // Maintain aspect ratio
            var x = (_buffer.width / 2) - 360; // Left position inside the dialogue box
            var y = _buffer.height - 344; // Vertical centering

            // Save the current state of the canvas context
            buffer.save();

            // Draw image with shadow for emphasis
            buffer.shadowBlur = 1;
            buffer.shadowColor = 'rgb(0, 173, 239)';
            buffer.drawImage(portraitImages[d.lines[lineIndex].character], x, y, imageWidth, imageHeight);
            buffer.shadowBlur = 0;

            // Restore the context to remove the clipping path
            buffer.restore();
        }

        const drawDialogueText = function(dialogueBoxWidth, dialogueBoxHeight) {
            const fontSize = 28;
            const lineHeight = fontSize + 4;
            const padding = 16;
            const fontFamily = "VT323";
        
            // Assuming each character in VT323 at 28px is approximately 12px wide
            const charWidth = 12; // This value should be adjusted based on visual tests or accurate measurements
            const portraitWidth = dialogueBoxHeight - (2 * padding);
            const textAreaWidth = dialogueBoxWidth - portraitWidth - (3 * padding) - 110;
            const textX = _buffer.width / 2 - dialogueBoxWidth / 2 + portraitWidth + (2 * padding) + 110;
            const textY = _buffer.height - (dialogueBoxHeight + 28);
            const maxCharsPerLine = Math.floor(textAreaWidth / charWidth);
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
        let introDialogues = [
            // Level 0
            {lines: [
                {character: 1, line: "KBM Tutorial Dialogue"},
            ], altLines: [
                {character: 1, line: "Controller Tutorial Dialogue"},
            ]},

            // Level 1
            {lines: [
                {character: 0, line: "Level 1 Dialogue."},
            ]},

            // Level 2
            {lines: [
                {character: 0, line: "Level 1 Boss Dialogue."},
            ]},

            // Level 3
            {lines: [
                {character: 0, line: "Level 2 Dialogue."},
            ]},

            // Level 4
            {lines: [
                {character: 0, line: "Level 2 Boss Dialogue."},
            ]},

            // Level 5
            {lines: [
                {character: 0, line: "Level 3 Dialogue."},
            ]},

            // Level 6
            {lines: [
                {character: 0, line: "Level 3 Boss Dialogue."},
            ]},

            // Level 7
            {lines: [
                {character: 0, line: "Level 4 Dialogue."},
            ]},

            // Level 8
            {lines: [
                {character: 0, line: "Level 4 Boss Dialogue."},
            ]},

            // Level 9
            {lines: [
                {character: 0, line: "Level 5 Dialogue."},
            ]},

            // Level 10
            {lines: [
                {character: 0, line: "Level 5 Boss Dialogue."},
            ]},

            // Level 11
            {lines: [
                {character: 0, line: "Level 6 Dialogue."},
            ]},

            // Level 12
            {lines: [
                {character: 0, line: "Level 6 Boss Dialogue."},
            ]},

            // Level 13
            {lines: [
                {character: 0, line: "Level 7 Dialogue."},
            ]},

            // Level 14
            {lines: [
                {character: 0, line: "Level 7 Boss Dialogue."},
            ]},

            // Level 15
            {lines: [
                {character: 0, line: "Level 8 Dialogue."},
            ]},

            // Level 16
            {lines: [
                {character: 0, line: "Level 8 Boss Dialogue."},
            ]},

            // Level 17
            {lines: [
                {character: 0, line: "Level 9 Dialogue."},
            ]},

            // Level 18
            {lines: [
                {character: 0, line: "Level 9 Boss Dialogue."},
            ]},

            // Level 19
            {lines: [
                {character: 0, line: "Level 10 Dialogue."},
            ]},

            // Level 20
            {lines: [
                {character: 0, line: "Level 10 Boss Dialogue."},
            ]},

            // Level 21
            {lines: [
                {character: 0, line: "Level 11 Dialogue."},
            ]},

            // Level 22
            {lines: [
                {character: 0, line: "Level 11 Boss Dialogue - Final Boss."},
            ]},

            // Level 23
            {lines: [
                {character: 0, line: "Level 12 Boss Dialogue - Real Final Boss."},
            ]},
        ];

        // One dialogue per level
        let outroDialogues = [
            // Level 0
            {lines: [
                {character: 1, line: "Tutorial Outro Dialogue."},
            ]},

            // Level 1
            {lines: [
                {character: 0, line: "Level 1 Outro Dialogue."},
            ]},

            // Level 2
            {lines: [
                {character: 0, line: "Level 1 Boss Outro Dialogue."},
            ]},

            // Level 3
            {lines: [
                {character: 0, line: "Level 2 Outro Dialogue."},
            ]},

            // Level 4
            {lines: [
                {character: 0, line: "Level 2 Boss Outro Dialogue."},
            ]},

            // Level 5
            {lines: [
                {character: 0, line: "Level 3 Outro Dialogue."},
            ]},

            // Level 6
            {lines: [
                {character: 0, line: "Level 3 Boss Outro Dialogue."},
            ]},

            // Level 7
            {lines: [
                {character: 0, line: "Level 4 Outro Dialogue."},
            ]},

            // Level 8
            {lines: [
                {character: 0, line: "Level 4 Boss Outro Dialogue."},
            ]},

            // Level 9
            {lines: [
                {character: 0, line: "Level 5 Outro Dialogue."},
            ]},

            // Level 10
            {lines: [
                {character: 0, line: "Level 5 Boss Outro Dialogue."},
            ]},

            // Level 11
            {lines: [
                {character: 0, line: "Level 6 Outro Dialogue."},
            ]},

            // Level 12
            {lines: [
                {character: 0, line: "Level 6 Boss Outro Dialogue."},
            ]},

            // Level 13
            {lines: [
                {character: 0, line: "Level 7 Outro Dialogue."},
            ]},

            // Level 14
            {lines: [
                {character: 0, line: "Level 7 Boss Outro Dialogue."},
            ]},

            // Level 15
            {lines: [
                {character: 0, line: "Level 8 Outro Dialogue."},
            ]},

            // Level 16
            {lines: [
                {character: 0, line: "Level 8 Boss Outro Dialogue."},
            ]},

            // Level 17
            {lines: [
                {character: 0, line: "Level 9 Outro Dialogue."},
            ]},

            // Level 18
            {lines: [
                {character: 0, line: "Level 9 Boss Outro Dialogue."},
            ]},

            // Level 19
            {lines: [
                {character: 0, line: "Level 10 Outro Dialogue."},
            ]},

            // Level 20
            {lines: [
                {character: 0, line: "Level 10 Boss Outro Dialogue."},
            ]},

            // Level 21
            {lines: [
                {character: 0, line: "Level 11 Outro Dialogue."},
            ]},

            // Level 22
            {lines: [
                {character: 0, line: "Level 11 Boss Outro Dialogue - Final Boss."},
            ]},

            // Level 23
            // This level doesn't have an outro dialogue as the final cutscene is triggered by the boss. Search for: gco.win = true
        ];

        let upgradeDialogues = [
            {lines: [
                {character: 1, line: "Level 1 Upgrade Tutorial."},
            ]},
            {lines: [
                {character: 1, line: "Level 3 Upgrade Tutorial."},
            ]},
            {lines: [
                {character: 1, line: "Level 6 Upgrade Tutorial."},
            ]},
            {lines: [
                {character: 1, line: "Level 9 Upgrade Tutorial."},
            ]},
        ]
    }

    function Cutscene() {
        let levelsWithCutscenes = [7, 13, 19];
        let onTick = 0;
        let c = null;
        let frameIndex = 0;
        let frameText = "";
        let subTick = 0;
        let maxSubTick = 16;
        let playInitialSound = true;
        let percentageDone = 0;
        let timeout = 0;
        let cutsceneFinished = false;
        let x = 0;
        let maxX = 480;
        let y = 0;
        let width = 1067; // Pre-calculate scale down from 1280
        let height = 600; // Pre-calculate scale down from 720
        let textBoxWidth = 700;
        let textBoxHeight = 175;

        let blackedOut = false;
        let bgAlpha = 0;
        let animateNext = false;
        let imageAlpha = 0;
        let maxBlur = 15;
        let imageBlur = maxBlur;

        const resetCutsceneSteppingValues = function() {
            cutsceneFinished = false;
            frameIndex = 0;
            blackedOut = false;
            bgAlpha = 0;
            animateNext = false;
            imageAlpha = 0;
            imageBlur = maxBlur;
            resetCutsceneValues();
        }

        const resetCutsceneValues = function() {
            subTick = 0;
            frameText = "";
            playInitialSound = true;
            percentageDone = 0;
        }

        this.initCutscene = function() {
            if(gco.level == 0) { c = introCutscene; }
            if(gco.level == 7) { c = actOneCutscene; }
            if(gco.level == 13) { c = actTwoCutscene; }
            if(gco.level == 19) { c = actThreeCutscene; }
            if(gco.level == gco.finalLevel) { c = outroCutscene; }
            resetCutsceneSteppingValues();
        }

        this.isBlackedOut = function() {
            return blackedOut;
        }

        this.isActive = function() {
            return !cutsceneFinished;
        }

        this.isFinished = function() {
            return cutsceneFinished;
        }

        this.shouldPlay = function() {
            return levelsWithCutscenes.includes(gco.level);
        }

        this.DoInput = function() {
            if(timeout > 0 || percentageDone < 99) return;
            timeout = 15;
            sfx.play(8);
            Continue();
        }

        this.Update = function() {
            if(!blackedOut) {
                bgAlpha += blackoutSpeed();
                if(bgAlpha >= 1.0) {
                    bgAlpha = 1;
                    blackedOut = true;
                }
            } else {
                animateNext ? animNext() : animFrame();
                if (ticks !== onTick) { // Ticks go 0-19 every second in 50 ms intervals
                    onTick = ticks;
                    subTick++;
                    if(timeout > 0) { timeout--; } // Count down timeout
                    if(imageAlpha < 1) { return; } // Only progress text if the image is loaded in fully
                    animText();
                }
            }
        }

        this.Draw = function() {
            drawBackground();
            if(!blackedOut) { return; }
            drawImage();
            drawFrameText();
            if(percentageDone > 99) {
                drawContinuePrompt();
            }
        }

        const Continue = function() {
            if(OnLastFrame() && gco.level == gco.finalLevel) {
                gco.credits.roll();
            } else {
                animateNext = true;
                preFadeEvent();
            }
                
        }

        const Progress = function() {
            resetCutsceneValues();
            frameIndex++;
            animateNext = false;
            imageAlpha = 0;
        }

        const Finish = function() {
            menu.delayNextInput();
            cutsceneFinished = true;
        }

        const OnLastFrame = function() {
            return frameIndex == c.frames.length - 1;
        }

        const OnFirstFrame = function() {
            return frameIndex == 0;
        }

        const blackoutSpeed = function() {
            if(OnFirstFrame() && gco.level == gco.finalLevel) {
                return delta / 10;
            } else {
                return delta / 2
            }
        }

        const preFadeEvent = function() {
            if(OnLastFrame()) { // If we're on the last frame and about to fade out...
                if(gco.level == 0) { // If we're on the tutorial...
                    currentGui = NULL_GUI_STATE;
                } else {
                    self.softReset();
                    gco.GoToUpgradeMenu();
                }
            }
        }

        const animNext = function() {
            if(OnLastFrame() && bgAlpha > 0) {
                bgAlpha -= delta;
                if(bgAlpha < 0) { bgAlpha = 0; }
            }

            if(imageBlur < maxBlur) {
                imageBlur += delta * maxBlur;
                if(imageBlur > maxBlur) { imageBlur = maxBlur; }
            }

            if(imageAlpha > 0) {
                imageAlpha -= delta;
                if(imageAlpha < 0) { imageAlpha = 0; }
            }

            if(OnLastFrame()) {
                if(bgAlpha <= 0) {
                    Finish();
                }
            } else {
                if(imageBlur == maxBlur && imageAlpha == 0) {
                    Progress();
                }
            }
            
        }

        const animFrame = function() {
            if(imageBlur > 0) {
                imageBlur -= delta * maxBlur;
                if(imageBlur < 0) { imageBlur = 0; }
            }

            if(imageAlpha < 1) {
                imageAlpha += delta;
                if(imageAlpha > 1) { imageAlpha = 1; }
            }

            if(x < maxX) {
                x -= delta * 2;
                if(x < -maxX) { x = -maxX; }
            }
        }

        const animText = function() {
            if(percentageDone >= 100) { return; }
            // Determine the maximum sub-tick interval based on the character's voice type
            const voiceType = c.frames[frameIndex].character;
            maxSubTick = [2, 5, 1, 3].includes(voiceType) ? 10 : 16;

            // Read through the text, 1 letter at a time, into the rendered cache state
            if (frameText.length < c.frames[frameIndex].text.length) {
                frameText += c.frames[frameIndex].text[frameText.length];  // Append next character
            }

            // Calculate the percentage of the text that has been displayed
            percentageDone = (frameText.length / c.frames[frameIndex].text.length) * 100;
    
            // Play sound effects based on the current tick interval and voice type
            if (percentageDone < 90) {
                const midVoice = [0, 4].includes(voiceType);
                if (!midVoice && (playInitialSound || subTick % 10 === 0)) {
                    sfx.play([2, 5].includes(voiceType) ? 4 : 6);
                }
                if (midVoice && (playInitialSound || subTick % 16 === 0)) {
                    sfx.play(5); // Mid dialogue text SFX for characters 0 and 4
                }
            }

            if (subTick >= maxSubTick) subTick = 0; // Reset subTick
            playInitialSound = false;
        }

        const drawBackground = function() {
            buffer.fillStyle = "rgba(0, 0, 0, " + bgAlpha + ")";
            buffer.fillRect(0, 0, _buffer.width, _buffer.height);
        }

        const drawImage = function() {
            const currentAlpha = buffer.globalAlpha;
            buffer.globalAlpha = imageAlpha;
            if(imageBlur > 0) { buffer.filter = `blur(${imageBlur}px)`; }
            buffer.drawImage(cutsceneImages[c.frames[frameIndex].image], x, y, width, height);
            buffer.globalAlpha = currentAlpha;
            buffer.filter = 'none';
        }

        const drawFrameText = function() {
            const fontSize = 28;
            const lineHeight = fontSize + 4;
            const fontFamily = "VT323";
        
            // Assuming each character in VT323 at 28px is approximately 12px wide
            const charWidth = 12; // This value should be adjusted based on visual tests or accurate measurements
            const textX = _buffer.width / 2 - textBoxWidth / 2;
            const textY = _buffer.height - (textBoxHeight + 28);
            const maxCharsPerLine = Math.floor(textBoxWidth / charWidth);
            const words = frameText.split(' ');
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
        
            const currentAlpha = buffer.globalAlpha;
            buffer.globalAlpha = imageAlpha;
            if(imageBlur > 0) { buffer.filter = `blur(${imageBlur}px)`; }
            guiText.forEach(text => {
                text.Draw(_buffer);
            });
            buffer.globalAlpha = currentAlpha;
            buffer.filter = 'none';
        }

        const drawContinuePrompt = function() {
            const fontSize = 28; // Smaller font for the continue prompt
            const fontFamily = "VT323"; // Using the same monospaced font for consistency
            const padding = 12; // Padding inside the dialogue box
        
            // Calculate positions
            const textX = _buffer.width / 2 + textBoxWidth / 2 - padding; // Right align the text within the dialogue box
            const textY = _buffer.height - padding; // Position at the bottom of the dialogue box
            const arrowX = textX - 100; // Position the arrow 70px to the left of the text
            const arrowY = textY - 12; // Slightly adjust the arrow position for vertical alignment
        
            // Create GUIText object for "Continue"
            const continueText = new GUIText("Continue", textX, textY, `${fontSize}px ${fontFamily}`, "right", "bottom", "white");
        
            // Draw the "Continue" text using GUIText.Draw method
            const currentAlpha = buffer.globalAlpha;
            buffer.globalAlpha = imageAlpha;
            if(imageBlur > 0) { buffer.filter = `blur(${imageBlur}px)`; }
            continueText.Draw();
            buffer.globalAlpha = currentAlpha;
            buffer.filter = 'none';
        
            // Draw the green arrow using the predefined function
            menu.DrawArrow(3, arrowX, arrowY, 20); // Assuming `menu.DrawArrow` handles the drawing based on provided coordinates
        }

        // Cutscene Definitions
        let introCutscene = {
            frames: [
                {character: 1, text: "Intro Cutscene.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.", image: 0},
            ]
        }

        let actOneCutscene = {
            frames: [
                {character: 1, text: "Act One Cutscene.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", image: 0},
            ]
        }

        let actTwoCutscene = {
            frames: [
                {character: 1, text: "Act Two Cutscene.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", image: 0},
            ]
        }

        let actThreeCutscene = {
            frames: [
                {character: 1, text: "Act Three Cutscene.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", image: 0},
            ]
        }

        let outroCutscene = {
            frames: [
                {character: 1, text: "Outro Cutscene.", image: 0},
                // {character: 1, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", image: 0},
            ]
        }
    }

    function Transition() {
        this.Init = function() {
            this.active = false;
            this.transitionId = 0;
            this.onTick = 0;
            this.timer = 0;
        }

        this.Update = function() {
            if(!this.active) { return; }
            if(this.onTick != ticks) {
                this.onTick = ticks;
                this.timer += 1;
            }
            if(this.transitionId == 0) { this.updateTransitionToUpgrade(); }
        }

        this.Draw = function() {
            if(!this.active) { return; }
            if(this.transitionId == 0) { this.drawTransitionToUpgrade(); }
        }

        // Transition To Upgrade Menu
        this.toUpgrade = function() {
            this.transitionId = 0;
            this.active = true;
            this.width = _canvas.width;
            this.height = _canvas.height;
            this.x = 0;
            this.startY = -_canvas.height;
            this.y = this.startY;
            this.targetY = 0;
            this.speed = 600;
            this.timer = 0;
            this.reachedApex = false;
            this.exitPlayed = false;
            sfx.play(24);
        }

        this.updateTransitionToUpgrade = function() {
            let moveY = this.speed * delta;
            if(!this.reachedApex) {
                if(this.y < this.targetY) {
                    this.y += moveY;
                    if(this.y > this.targetY) { this.y = this.targetY; }
                } else {
                    this.reachedApex = true;
                    this.timer = 0;
                    gco.GoToUpgradeMenu();
                    self.softReset();
                }
            } else {
                if(this.timer < 30) { return; } // Spend 1 second on transition screen
                if(!this.exitPlayed) {
                    this.exitPlayed = true;
                    sfx.play(24);
                }
                if(this.y > this.startY) {
                    this.y -= moveY;
                    if(this.y < this.startY) { this.y = this.startY; }
                } else {
                    if(gco.hasDialogueForUpgrade()) {
                        ed.initEvent(5);
                    }
                    this.active = false; // Full Exit Clause
                }
            }
        }

        this.drawTransitionToUpgrade = function() {
            buffer.drawImage(transitionImages[0], this.x, this.y, this.width, this.height);
        }
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
                [[false, false], [false, false, true], [false, false, false]],
                [true, false, false],
                [true],
                [true, false],
                [true, false, false, false],
                [true, false],
            ]
        }

        this.addLongDelay = function() {
            this.timeout = 40; // 2 Second Delay
        }

        this.delayNextInput = function() {
            this.timeout = 15; // 750ms delay
        }
		
        this.move = function(activeMenu, direction)
        {
            // activeMenu - is whatever currentGui is active, which correlates to the index of states.
            // direction - 0, 1, 2, 3 - up, left, down, right - Depending on the activeMenu, this will correlate to moves in the menu.
            if(ed.eventPlaying()) return; // Skip all menu input if an event is playing

            // Escape this function if a menu option was moved within the last n milliseconds
            if(this.timeout > 0) return;
            sfx.play(7);

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
                            if(sfx.masterVolume >= 0.1) sfx.volume(Math.round(sfx.masterVolume * 100) / 100 - 0.1);
                        } else {
                            if(sfx.masterVolume < 0.91) sfx.volume(Math.round(sfx.masterVolume * 100) / 100 + 0.1);
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
            if(currentGui == 6){ currentGui = lastGui; lastGui = 6; sfx.play(9); }
            if(currentGui == 1 && !gco.win){ gco.TogglePauseGame(); currentGui = NULL_GUI_STATE; sfx.play(9); }
        }

        this.select = function()
        { // This function should mimic the doMouseClick functionality. If something is added there, it should be here, and visa-versa
            if(ed.eventPlaying()) return; // Skip all menu input if an event is playing
            if(this.timeout > 0) return;
            this.timeout = 5; // 250 ms delay before next action
            switch(currentGui) {
                case 0:
                { // Main Menu
                    if(!gco.playStory) {
                        this.delayNextInput();
                        if(this.states[0][0]){
                            if(gco.level == 0) {
                                ed.initEvent(6);
                            } else {
                                currentGui = 2;
                            }
                            sfx.play(11);
                        }
                        if(this.states[0][1]){ currentGui = 6; lastGui = 0; sfx.play(8); }
                        if(this.states[0][2]){ gco.playStory = true; sfx.play(8); }
                        if(this.states[0][3]){ ipcRenderer.send('quit-app'); }
                    }
                    break;
                }
                case 1: { // Pause Menu
                    if(this.states[1][0]){ currentGui = 6; lastGui = 1; sfx.play(8); }
                    if(this.states[1][1]){ self.hardReset(); this.delayNextInput(); sfx.play(8); } 
                    if(this.states[1][2]){ ipcRenderer.send('quit-app'); }
                    break;
                }
                case 2: { // Upgrade Menu
                    // Options
                    if(this.states[2][0][0]){ currentGui = 6; lastGui = 2; this.delayNextInput(); sfx.play(8); }
                    // Quit
                    if(this.states[2][0][1]){ self.hardReset(); sfx.play(9); }

                    // Primary Weapon
                    if(this.states[2][1][0]){ if(player.weapon == 4) { sfx.play(8); } else { if(player.money >= gco.weaponPrice[player.weapon + 1]) { gco.PurchaseWeapon(player.weapon + 1); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }} }
                    // Weapon Damage
                    if(this.states[2][1][1]){ if(player.damageLevel == 4) { sfx.play(8); } else { if(player.money >= gco.damagePrice[player.damageLevel + 1]) { player.upgradeDamage(); player.buy(gco.damagePrice[player.damageLevel]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }} }
                    // Start Level
                    if(this.states[2][1][2]){ if(player.weapon != 49){ gco.StartLevel(); sfx.play(8); }}

                    // Laser
                    if(this.states[2][2][0]){ if(player.laser.level == 4) { sfx.play(8); } else { if(player.money >= gco.laserPrice[player.laser.level + 1]) { player.laser.upgradeLevel(); player.buy(gco.laserPrice[player.laser.level]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }} }
                    // Laser Damage
                    if(this.states[2][2][1]){ if(player.laser.damageLevel == 4) { sfx.play(8); } else { if(player.money >= gco.laserDamagePrice[player.laser.damageLevel + 1]) { player.laser.upgradeDamage(); player.buy(gco.laserDamagePrice[player.laser.damageLevel]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }} }
                    // Shield
                    if(this.states[2][2][2]){ if(player.money >= (player.shieldLevel + 1) * 250){gco.PurchaseExtras(0); sfx.play(8); } else {gco.notEnoughCores = 1000; sfx.play(10); } }

                    break;
                }
                case 3: { // Continue Menu
                    if(this.states[3][0]){ gco.levelMission.nextOnDeath(); }
                    if(this.states[3][1]){ self.hardReset(); this.delayNextInput(); sfx.play(9); }
                    if(this.states[3][2]){ ipcRenderer.send('quit-app'); }
                    break;
                }
                case 4: { // Level Up Menu
                    if(this.states[4][0]) { self.softReset(); gco.GoToUpgradeMenu(); this.delayNextInput(); sfx.play(8); }
                    break;
                }
                case 5: { // Game Over Menu
                    if(this.states[5][0]){ self.hardReset(); this.delayNextInput(); sfx.play(8); }
                    if(this.states[5][1]) ipcRenderer.send('quit-app');
                    break;
                }
                case 6: { // Options Menu
                    if(this.states[6][3]) { currentGui = lastGui; lastGui = 6; this.delayNextInput(); sfx.play(9); }
                    break;
                }
                case 7: { // Score Menu
                    if(this.states[7][0]) { self.hardReset(); sfx.play(8); }
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
		switch(Math.floor(Math.random() * 7))
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
            case 6:
			{
				gco.bgm = document.getElementById('bgm_boss');
				break;
			}
			default:{}
		}
		gco.init_audio();
	}
	
    function SFXObject()
    {
        // Web Audio API Integration
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Other Variables
        this.masterVolume = 0.2;

        // Create and configure the master gain node for volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.audioContext.destination);

        // Audio Channels
        this.explosion = {index: 0, channel: [], channels: 40} // Explosion Channels
        this.laser = 0; this.laserPlaying = false; this.laserSource = null; // Player Laser Channel
        this.bossLaser = 0; this.bossLaserPlaying = false; // Boss Laser Channel
        this.whooshOne = {index: 0, channel: [], channels: 3}; // Whoosh One Channels
        this.dialogueLow = {index: 0, channel: [], channels: 10} // Low Dialogue Channels
        this.dialogueMid = {index: 0, channel: [], channels: 10} // Mid Dialogue Channels
        this.dialogueHigh = {index: 0, channel: [], channels: 10} // High Dialogue Channels
        this.menuBlip = {index: 0, channel: [], channels: 5} // Menu Blip Channels
        this.insertCoin = {index: 0, channel: [], channels: 5} // Insert Coin Channels
        this.menuSelect = {index: 0, channel: [], channels: 5}; // Menu Select Channels
        this.menuBack = {index: 0, channel: [], channels: 5}; // Menu Back Channels
        this.menuFail = {index: 0, channel: [], channels: 5}; // Menu Fail Channels
        this.pew = {index: 0, channel: [], channels: 40} // Pew Channels
        this.hit = {index: 0, channel: [], channels: 80} // Hit Channels
        this.levelUp = 0; // Level Up Channel
        this.purchaseItem = {index: 0, channel: [], channels: 3}; // Purchase Item Channels
        this.equipItem = {index: 0, channel: [], channels: 3}; // Equip Item Channels
        this.pickupCoin = {index: 0, channel: [], channels: 3} // Pickup Coin Channels
        this.pickupShield = {index: 0, channel: [], channels: 3} // Pickup Shield Channels
        this.pickupHealth = {index: 0, channel: [], channels: 3} // Pickup Health Channels
        this.pickupAmmo = {index: 0, channel: [], channels: 3} // Pickup Coin Channels
        this.startBoost = {index: 0, channel: [], channels: 5} // Pickup Coin Channels
        this.repeatBoost = {index: 0, channel: [], channels: 30} // Pickup Coin Channels
        this.stopBoost = {index: 0, channel: [], channels: 5} // Pickup Coin Channels
        this.transition = {index: 0, channel: [], channels: 2} // Transition Channelss
        
        this.Init = function() {
            // Explosions
            for(var i = 0; i < this.explosion.channels; i++) {
                var a = new Audio('Audio/Explode.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.explosion.channel.push(a);
            }

            // Player Lasers
            fetch('Audio/sfx/laser.mp3')
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.laser = audioBuffer;
            })
            .catch(e => console.error('Error with decoding audio data: ' + e.err));

            
            // Boss Lasers
            this.bossLaser = new Audio('Audio/lasorz.mp3');
            this.bossLaser.volume = this.masterVolume;
            this.bossLaser.preload = 'auto';
            this.bossLaser.loop = true;

            // Whoose One
            for(var i = 0; i < this.whooshOne.channels; i++) {
                var a = new Audio('Audio/sfx/woosh-low-long.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.whooshOne.channel.push(a);
            }

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

            // Menu Blips
            for(var i = 0; i < this.menuBlip.channels; i++) {
                var a = new Audio('Audio/sfx/menu-blip-2.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.menuBlip.channel.push(a);
            }

            //Insert Coin
            for(var i = 0; i < this.insertCoin.channels; i++) {
                var a = new Audio('Audio/sfx/insert-coin.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.insertCoin.channel.push(a);
            }

            // Menu Select
            for(var i = 0; i < this.menuSelect.channels; i++) {
                var a = new Audio('Audio/sfx/menu-select.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.menuSelect.channel.push(a);
            }

            // Menu Back
            for(var i = 0; i < this.menuBack.channels; i++) {
                var a = new Audio('Audio/sfx/menu-back.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.menuBack.channel.push(a);
            }

            // Menu Fail
            for(var i = 0; i < this.menuFail.channels; i++) {
                var a = new Audio('Audio/sfx/menu-fail.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.menuFail.channel.push(a);
            }

            // Pew
            for(var i = 0; i < this.pew.channels; i++) {
                var a = new Audio('Audio/sfx/laser-shot.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.pew.channel.push(a);
            }

            // Hit
            for(var i = 0; i < this.hit.channels; i++) {
                var num = Math.floor(Math.random() * 8) + 1;
                var a = new Audio(`Audio/sfx/hit_${num}.mp3`);
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.hit.channel.push(a);
            }

            // Level Up
            this.levelUp = new Audio('Audio/sfx/level_up.mp3');
            this.levelUp.volume = this.masterVolume;
            this.levelUp.preload = 'auto';

            // Purchase Item
            for(var i = 0; i < this.purchaseItem.channels; i++) {
                var a = new Audio('Audio/sfx/purchase_item.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.purchaseItem.channel.push(a);
            }

            // Equip Item
            for(var i = 0; i < this.equipItem.channels; i++) {
                var a = new Audio('Audio/sfx/equip_item.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.equipItem.channel.push(a);
            }

            // Pickup Coin
            for(var i = 0; i < this.pickupCoin.channels; i++) {
                var a = new Audio('Audio/sfx/pickup_coin.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.pickupCoin.channel.push(a);
            }

            // Pickup Shield
            for(var i = 0; i < this.pickupShield.channels; i++) {
                var a = new Audio('Audio/sfx/pickup_shield.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.pickupShield.channel.push(a);
            }

            // Pickup Health
            for(var i = 0; i < this.pickupHealth.channels; i++) {
                var a = new Audio('Audio/sfx/pickup_health.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.pickupHealth.channel.push(a);
            }

            // Pickup Ammo
            for(var i = 0; i < this.pickupAmmo.channels; i++) {
                var a = new Audio('Audio/sfx/pickup_ammo.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.pickupAmmo.channel.push(a);
            }

            // Start Boost
            for(var i = 0; i < this.startBoost.channels; i++) {
                var a = new Audio('Audio/sfx/start_boost.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.startBoost.channel.push(a);
            }

            // Repeat Boost
            for(var i = 0; i < this.repeatBoost.channels; i++) {
                var a = new Audio('Audio/sfx/repeat_boost.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.repeatBoost.channel.push(a);
            }

            // Stop Boost
            for(var i = 0; i < this.stopBoost.channels; i++) {
                var a = new Audio('Audio/sfx/stop_boost.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.stopBoost.channel.push(a);
            }

            // Transition
            for(var i = 0; i < this.transition.channels; i++) {
                var a = new Audio('Audio/sfx/transition.mp3');
                a.volume = this.masterVolume;
                a.preload = 'auto';
                this.transition.channel.push(a);
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
                    this.laserSource = this.audioContext.createBufferSource();
                    this.laserSource.buffer = this.laser;
                    this.laserSource.loop = true;
                    this.laserSource.connect(this.masterGain);
                    this.laserSource.start(0);
                    this.laserPlaying = true;
                    break;
                }
                case 2: { // Boss Laser
                    this.bossLaser.play();
                    this.bossLaserPlaying = true;
                    break;
                }
                case 3: { // Whoosh One
                    if(this.whooshOne.channel[this.whooshOne.index]) {
                        this.whooshOne.channel[this.whooshOne.index].play();
                        this.whooshOne.index += 1; if(this.whooshOne.index > (this.whooshOne.channels - 1)){this.whooshOne.index = 0;}
                    }
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
                case 7: { // Menu Blip
                    if(this.menuBlip.channel[this.menuBlip.index]) {
                        this.menuBlip.channel[this.menuBlip.index].play();
                        this.menuBlip.index += 1; if(this.menuBlip.index > (this.menuBlip.channels - 1)){this.menuBlip.index = 0;}
                    }
                    break;
                }
                case 8: { // Menu Select
                    if(this.menuSelect.channel[this.menuSelect.index]) {
                        this.menuSelect.channel[this.menuSelect.index].play();
                        this.menuSelect.index += 1; if(this.menuSelect.index > (this.menuSelect.channels - 1)){this.menuSelect.index = 0;}
                    }
                    break;
                }
                case 9: { // Menu Back
                    if(this.menuBack.channel[this.menuBack.index]) {
                        this.menuBack.channel[this.menuBack.index].play();
                        this.menuBack.index += 1; if(this.menuBack.index > (this.menuBack.channels - 1)){this.menuBack.index = 0;}
                    }
                    break;
                }
                case 10: { // Menu Fail
                    if(this.menuFail.channel[this.menuFail.index]) {
                        this.menuFail.channel[this.menuFail.index].play();
                        this.menuFail.index += 1; if(this.menuFail.index > (this.menuFail.channels - 1)){this.menuFail.index = 0;}
                    }
                    break;
                }
                case 11: { // Insert Coin
                    if(this.insertCoin.channel[this.insertCoin.index]) {
                        this.insertCoin.channel[this.insertCoin.index].play();
                        this.insertCoin.index += 1; if(this.insertCoin.index > (this.insertCoin.channels - 1)){this.insertCoin.index = 0;}
                    }
                    break;
                }
                case 12: { // Pew
                    if(this.pew.channel[this.pew.index]) {
                        this.pew.channel[this.pew.index].play();
                        this.pew.index += 1; if(this.pew.index > (this.pew.channels - 1)){this.pew.index = 0;}
                    }
                    break;
                }
                case 13: { // Hit
                    if(this.hit.channel[this.hit.index]) {
                        this.hit.channel[this.hit.index].play();
                        this.hit.index += 1; if(this.hit.index > (this.hit.channels - 1)){this.hit.index = 0;}
                    }
                    break;
                }
                case 14: { // Level Up
                    this.levelUp.play();
                    break;
                }
                case 15: { // Purchase Item
                    if(this.purchaseItem.channel[this.purchaseItem.index]) {
                        this.purchaseItem.channel[this.purchaseItem.index].play();
                        this.purchaseItem.index += 1; if(this.purchaseItem.index > (this.purchaseItem.channels - 1)){this.purchaseItem.index = 0;}
                    }
                    break;
                }
                case 16: { // Equip Item
                    if(this.equipItem.channel[this.equipItem.index]) {
                        this.equipItem.channel[this.equipItem.index].play();
                        this.equipItem.index += 1; if(this.equipItem.index > (this.equipItem.channels - 1)){this.equipItem.index = 0;}
                    }
                    break;
                }
                case 17: { // Pickup Coin
                    if(this.pickupCoin.channel[this.pickupCoin.index]) {
                        this.pickupCoin.channel[this.pickupCoin.index].play();
                        this.pickupCoin.index += 1; if(this.pickupCoin.index > (this.pickupCoin.channels - 1)){this.pickupCoin.index = 0;}
                    }
                    break;
                }
                case 18: { // Pickup Shield
                    if(this.pickupShield.channel[this.pickupShield.index]) {
                        this.pickupShield.channel[this.pickupShield.index].play();
                        this.pickupShield.index += 1; if(this.pickupShield.index > (this.pickupShield.channels - 1)){this.pickupShield.index = 0;}
                    }
                    break;
                }
                case 19: { // Pickup Health
                    if(this.pickupHealth.channel[this.pickupHealth.index]) {
                        this.pickupHealth.channel[this.pickupHealth.index].play();
                        this.pickupHealth.index += 1; if(this.pickupHealth.index > (this.pickupHealth.channels - 1)){this.pickupHealth.index = 0;}
                    }
                    break;
                }
                case 20: { // Pickup Ammo
                    if(this.pickupAmmo.channel[this.pickupAmmo.index]) {
                        this.pickupAmmo.channel[this.pickupAmmo.index].play();
                        this.pickupAmmo.index += 1; if(this.pickupAmmo.index > (this.pickupAmmo.channels - 1)){this.pickupAmmo.index = 0;}
                    }
                    break;
                }
                case 21: { // Start Boost
                    if(this.startBoost.channel[this.startBoost.index]) {
                        this.startBoost.channel[this.startBoost.index].play();
                        this.startBoost.index += 1; if(this.startBoost.index > (this.startBoost.channels - 1)){this.startBoost.index = 0;}
                    }
                    break;
                }
                case 22: { // Repeat Boost
                    if(this.repeatBoost.channel[this.repeatBoost.index]) {
                        this.repeatBoost.channel[this.repeatBoost.index].play();
                        this.repeatBoost.index += 1; if(this.repeatBoost.index > (this.repeatBoost.channels - 1)){this.repeatBoost.index = 0;}
                    }
                    break;
                }
                case 23: { // Stop Boost
                    if(this.stopBoost.channel[this.stopBoost.index]) {
                        this.stopBoost.channel[this.stopBoost.index].play();
                        this.stopBoost.index += 1; if(this.stopBoost.index > (this.stopBoost.channels - 1)){this.stopBoost.index = 0;}
                    }
                    break;
                }
                case 24: { // Transition
                    if(this.transition.channel[this.transition.index]) {
                        this.transition.channel[this.transition.index].play();
                        this.transition.index += 1; if(this.transition.index > (this.transition.channels - 1)){this.transition.index = 0;}
                    }
                    break;
                }
            }
        }
        
        this.pause = function(stopfx) { // Only some SFX can be paused once started
            switch(stopfx) {
                case 1: { // Laser
                    if (this.laserSource) {
                        this.laserSource.stop();
                        this.laserSource.disconnect();
                        this.laserSource = null;
                    }
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
            for(var i = 0; i < this.explosion.channel.length; i++) { this.explosion.channel[i].volume = value; }
            // this.laser.volume = value;
            this.bossLaser.volume = value;
            for(var i = 0; i < this.whooshOne.channel.length; i++) { this.whooshOne.channel[i].volume = value; }
            for(var i = 0; i < this.dialogueLow.channel.length; i++) { this.dialogueLow.channel[i].volume = value; }
            for(var i = 0; i < this.dialogueMid.channel.length; i++) { this.dialogueMid.channel[i].volume = value; }
            for(var i = 0; i < this.dialogueHigh.channel.length; i++) { this.dialogueHigh.channel[i].volume = value; }
            for(var i = 0; i < this.menuBlip.channel.length; i++) { this.menuBlip.channel[i].volume = value; }
            for(var i = 0; i < this.insertCoin.channel.length; i++) { this.insertCoin.channel[i].volume = value; }
            for(var i = 0; i < this.menuSelect.channel.length; i++) { this.menuSelect.channel[i].volume = value; }
            for(var i = 0; i < this.menuBack.channel.length; i++) { this.menuBack.channel[i].volume = value; }
            for(var i = 0; i < this.menuFail.channel.length; i++) { this.menuFail.channel[i].volume = value; }
            for(var i = 0; i < this.pew.channel.length; i++) { this.pew.channel[i].volume = value; }
            for(var i = 0; i < this.hit.channel.length; i++) { this.hit.channel[i].volume = value; }
            this.levelUp.volume = value;
            for(var i = 0; i < this.purchaseItem.channel.length; i++) { this.purchaseItem.channel[i].volume = value; }
            for(var i = 0; i < this.equipItem.channel.length; i++) { this.equipItem.channel[i].volume = value; }
            for(var i = 0; i < this.pickupCoin.channel.length; i++) { this.pickupCoin.channel[i].volume = value; }
            for(var i = 0; i < this.pickupShield.channel.length; i++) { this.pickupShield.channel[i].volume = value; }
            for(var i = 0; i < this.pickupHealth.channel.length; i++) { this.pickupHealth.channel[i].volume = value; }
            for(var i = 0; i < this.pickupAmmo.channel.length; i++) { this.pickupAmmo.channel[i].volume = value; }
            for(var i = 0; i < this.startBoost.channel.length; i++) { this.startBoost.channel[i].volume = value; }
            for(var i = 0; i < this.repeatBoost.channel.length; i++) { this.repeatBoost.channel[i].volume = value; }
            for(var i = 0; i < this.stopBoost.channel.length; i++) { this.stopBoost.channel[i].volume = value; }
            for(var i = 0; i < this.transition.channel.length; i++) { this.transition.channel[i].volume = value; }
            this.masterVolume = value;
            this.masterGain.gain.value = this.masterVolume; // All tracks using the audio API will follow this.
        }
    }
	
    function LevelMission()
    {
        this.bossNums = [100, 101, 102, 103, 104, 105, 106, 107, 109, 110, 111];
        this.levelsWithBoss = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
        this.skipLevelUp = [1];
        this.skipBossLevelStart = [23];
        this.objectives = [
            {1001: 5}, // Tutorial
            {1002: 24, 1003: 27, 1004:38}, // Level 1 Gauntlet
            {1: 1}, // Level 1 Boss
            {0: 1, 1: 1}, // Level 2 Gauntlet
            {2: 1}, // Level 2 Boss
            {0: 1, 1: 1, 2: 1}, // Level 3 Gauntlet
            {2: 2}, // Level 3 Boss
            {0: 1, 1: 1, 2: 1, 3: 1}, // Level 4 Gauntlet
            {3: 1}, // Level 4 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 5 Gauntlet
            {3: 2}, // Level 5 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 6 Gauntlet
            {4: 1}, // Level 6 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 7 Gauntlet
            {4: 2}, // Level 7 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 8 Gauntlet
            {4: 3}, // Level 8 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 9 Gauntlet
            {4: 1}, // Level 9 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 10 Gauntlet
            {4: 1}, // Level 10 Boss
            {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}, // Level 11 Gauntlet
            {4: 1}, // Level 11 Boss
            {100: 1}, // Level 12 Boss
        ];
        this.progress = {};

        this.nextOnDeath = function() {
            currentGui = NULL_GUI_STATE;
            if([0, 1, 2].includes(gco.level)) {
                self.softReset();
                this.resetProgress();
                gco.StartLevel();
            } else {
                sfx.play(8);
                gco.transition.toUpgrade();
            }
        }

        this.onBoss = function() {
            return this.levelsWithBoss.includes(gco.level);
        }

        this.shouldImmediatelyStartLevel = function() {
            if(this.skipBossLevelStart.includes(gco.level)) { return false; }
            if(this.onBoss()) { return true; }
            if(this.skipLevelUp.includes(gco.level)) { return true; }
            return false;
        }

        this.enemyTypesForLevel = function() {
            // Returns an array of enemy types: [1, 2, 3]
            let keys = Object.keys(this.objectives[gco.level]);
            return keys.filter(item => Number.isInteger(parseInt(item))).map(item => parseInt(item));
        }
        
        this.UpdateProgress = function(enType) {
            if(!this.progress[enType]) { this.progress[enType] = 0; }
            this.progress[enType] += 1;
            //tells gen logic something what was killed
            lg.phaseCheck(enType);
        }
        
        this.GauntletComplete = function() { // returns true if level is complete, else returns false
            if(!player.isAlive()) { return; }
            let types = this.enemyTypesForLevel();
            const includesBossNums = types.some(type => this.bossNums.includes(type));
            if(includesBossNums) { return false; }
            let keys = Object.keys(this.progress);
            if(keys.length < types.length) { return false; }
            let obj = this.objectives[gco.level];
            for(let i = 0; i < types.length; i++) {
                if(obj[types[i]] == undefined) { continue; } // Skip if the enemy type is not required to progress the level
                if(this.progress[types[i]] < obj[types[i]]) { return false; }
            }
            return true;
        }

        this.resetProgress = function() {
            this.progress = {};
        }
    }

    function Planet()
    { // This object is the base planet handler to copy the pixel-planet canvas into our game context
        this.onTick = 0;

        this.Update = function() {
            if(ticks != this.onTick) {
                this.onTick = ticks;
                if(this.onTick % 2 === 0) { // Planet Pre-Rendering
                    this.cachePlanet();
                }
            }
        }

        this.cachePlanet = function() {
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
            // Get the select element
            var selectElement = document.querySelector('.dg.ac select');
            if(!selectElement) return;

            // Get all the options within the select element
            var options = selectElement.options;

            // Commit selection
            this.selectPlanet(Math.floor(Math.random() * options.length));
        }

        this.selectPlanet = function(option) {
            // 7 = Dry Planet, 8 = Earth Planet
            var selectElement = document.querySelector('.dg.ac select');
            if(!selectElement) return;

            // Get all the options within the select element
            var options = selectElement.options;

            // Set the selected option based on the random index
            options[option].selected = true;

            // Simulate the change event on the select element
            var event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);
        }
    }

    function PlanetLevel()
    { // This object handles level art which are close to planets
        // Planet definitions
        this.pY = -1000; // Target: -25
        this.pSizeMultiplier = 0.25; // Target: 3
        let pX;

        // Gradient definitions
        this.gOpacity = 0; // Target: 0.3
        let gX = _buffer.width / 2;
        let gY = 0;
        let gHeight = _buffer.height;
        let gWidth = _buffer.width;
        let gLight = "#588ede";
        let gDark = "#172862";

        // Animation helpers
        let introStartY = -1000;
        let introEndY = -25;
        let introStartSizeMultiplier = 0.25;
        let introEndSizeMultiplier = 3;
        let introStartOpacity = 0;
        let introEndOpacity = 0.3;
        let outroStartY = -25;
        let outroEndY = -1000;
        let outroStartSizeMultiplier = 3;
        let outroEndSizeMultiplier = 0.25;
        let outroStartOpacity = 0.3;
        let outroEndOpacity = 0;

        this.init = function() {
            if(!this.isEnabled) return;
            if(gco.level == 11) {
                planet.selectPlanet(8);
                introStartY = -1000;
                introEndY = -25;
                introStartSizeMultiplier = 0.25;
                introEndSizeMultiplier = 3;
                introStartOpacity = 0;
                introEndOpacity = 0.3;
            }
        }

        this.initOutro = function() {
            if(!this.isEnabled) return;
            if(gco.level == 13) {
                outroStartY = -25;
                outroEndY = 975;
                outroStartSizeMultiplier = 3;
                outroEndSizeMultiplier = 0.25;
                outroStartOpacity = 0.3;
                outroEndOpacity = 0;
            }
        }
        
        this.isEnabled = function() {
            return gco.level == 11 || gco.level == 12 || gco.level == 13
        }

        this.isPositioned = function() {
            if(gco.level == 11 && this.pY == introEndY) return true;
            if(gco.level == 13 && this.pY == outroEndY) return true;
            return false
        }

        this.progressIntroAnimation = function(progress) {
            if(gco.level != 11) return;
            this.pY = self.easeOutQuad(introStartY, introEndY, progress);
            this.pSizeMultiplier = self.easeOutQuad(introStartSizeMultiplier, introEndSizeMultiplier, progress);
            this.gOpacity = self.easeOutQuad(introStartOpacity, introEndOpacity, progress);
            this.calculatePlanetX();
        }

        this.finalizeIntroAnimation = function() {
            if(gco.level != 11) return;
            this.pY = introEndY;
            this.pSizeMultiplier = introEndSizeMultiplier;
            this.gOpacity = introEndOpacity;
        }

        this.progressOutroAnimation = function(progress) {
            if(gco.level != 13) return;
            this.pY = self.easeOutQuad(outroStartY, outroEndY, progress);
            this.pSizeMultiplier = self.easeOutQuad(outroStartSizeMultiplier, outroEndSizeMultiplier, progress);
            this.gOpacity = self.easeOutQuad(outroStartOpacity, outroEndOpacity, progress);
            this.calculatePlanetX();
        }

        this.finalizeOutroAnimation = function() {
            if(gco.level != 13) return;
            this.pY = outroEndY;
            this.pSizeMultiplier = outroEndSizeMultiplier;
            this.gOpacity = outroEndOpacity;
        }

        this.calculatePlanetX = function() {
            pX = ((_buffer.width / 2) - ((600 * this.pSizeMultiplier) / 2));
        }

        this.renderGradient = function() {
            // Create a linear gradient from the top to the bottom of the canvas
            const gradient = buffer.createLinearGradient(gX, gY, gX, gHeight);
        
            // Add color stops to the gradient
            gradient.addColorStop(0, gDark);
            gradient.addColorStop(1, gLight);
        
            // Set global opacity for the gradient
            buffer.globalAlpha = this.gOpacity;
        
            // Fill the canvas with the gradient
            buffer.fillStyle = gradient;
            buffer.fillRect(0, 0, gWidth, gHeight);
        
            // Reset the global opacity to avoid affecting other drawings
            buffer.globalAlpha = 1;
        }

        this.renderPlanet = function() {
            buffer.drawImage(shaderPlanetCanvas, pX, this.pY, offScreenPlanetCanvas.width * this.pSizeMultiplier, offScreenPlanetCanvas.height * this.pSizeMultiplier);
        }

        pX = this.calculatePlanetX();
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
            if(ed.movementEventPlaying()) { return; }
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
            this.y += ((this.speed * player.yVecMulti) * ed.moveMultiplierOne) * delta;
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
                        var movementEventPlaying = ed.movementEventPlaying();
                        var isPlanetLevel = planetLevel.isEnabled();
                        var starType = this.genRandomStarType(movementEventPlaying || isPlanetLevel); // Only gen stars in fly in and out events
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
                // Star Color: one component is reduced near zero
                let colors = [225, 225, 225].map(val => val + Math.floor(Math.random() * 30)); // Start with high values from 225 to 255
                const reduceIndex = Math.floor(Math.random() * 3); // Select one color to reduce
                colors[reduceIndex] = Math.max(0, colors[reduceIndex] - 200); // Reduce one component significantly to near zero
                this.color = { r: colors[0], g: colors[1], b: colors[2] };
            }
        }

        this.Update = function() {
            // Movement Dynamics
            let moveMultiplier = ed.skipStarMoveMultiplier ? 1 : ed.moveMultiplierOne
            this.y += ((this.speed * player.yVecMulti) * moveMultiplier) * delta;
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
    
        // Call pre-render on object creation
        if(this.isPlanet) {
            planet.randomlySelectPlanet();
        }
        if(this.customStarShader) {
            this.renderStar();
        }
        
    }

    function LevelGen()
    {
        let onTick = 0;
        let gens = [new TutorialGen(), new GauntletOneGen()];
        let runTick = false;
        let runTime = 0;

        this.resetForLevel = function() {
            if(gco.level > 2) return;
            runTick = false;
            runTime = 0;
            gens[gco.level].reset();
        }

        this.Update = function() {
            if(gco.level > 2) return;
            runTick = false;
            runTime += delta;
            if(onTick != ticks) {
                onTick = ticks;
                runTick = true;
            }
            gens[gco.level].Update({runTick: runTick, runTime: runTime});
        }

        this.phaseCheck = function(enType) {
            if(gco.level > 2) return;
            gens[gco.level].phaseCheck(enType);
        }
    }

    function BaseGen()
    {
        this.phaseCheck = function(enType) {
        }
    }

    function TutorialGen()
    {
        BaseGen.call(this);
        let droneCount = 0;
        const segment = _canvas.width / 6;

        this.reset = function() {
            droneCount = 0;
        }

        this.Update = function(args) {
            let timeframe = droneCount + 1;
            if(args.runTime > timeframe && droneCount < timeframe && droneCount < 5) {
                droneCount++;
                this.spawn(segment * timeframe);
            }
        }

        this.spawn = function(x) {
            enemies.push(new TutorialDrone({x: x}));
        }
    }

    function GauntletOneGen()
    {
        BaseGen.call(this);
        let phase = 0;
        let runTime = 0;
        let p1DroneCount = 0;
        let p2DroneCount = 0;
        let p3DroneCount = 0;
        let p4DroneCount = 0;
        const p1Segment = _canvas.width / 25;
        const p2Segment = _canvas.width / 19;
        const p3Segment = _canvas.width / 11;
        const p4Segment = _canvas.width / 28;
        let p1Progress = 0;
        let p2Progress = 0;
        let p3Progress = 0;
        let p4Progress = 0;
        let p1Goal = 24;
        let p2Goal = 18;
        let p3Goal = 20;
        let p4Goal = 27;
        let p1CompTime = 0;

        this.reset = function() {
            p1DroneCount = 0;
            p2DroneCount = 0;
            p3DroneCount = 0;
            p4DroneCount = 0;
        }

        this.Update = function(args) {
            runTime = args.runTime;
            if(phase == 0){
                let timeframe = p1DroneCount + 1;
                if(args.runTime > timeframe / 10 && p1DroneCount < timeframe && p1DroneCount < p1Goal) {
                    p1DroneCount++;
                    this.spawn({x: p1Segment * timeframe});
                }
            }
            if(phase == 1){
                let timeframe = p2DroneCount + 1;
                if(args.runTime - p1CompTime > timeframe / 10 && p2DroneCount < timeframe && p2DroneCount < p2Goal) {
                    p2DroneCount++;
                    this.spawn({x: p2Segment * timeframe});
                }
            }
            if(phase == 2){
                let timeframe = p3DroneCount + 1;
                if(args.runTime - p1CompTime > timeframe / 10 && p3DroneCount < timeframe && p3DroneCount < p3Goal) {
                    p3DroneCount++;
                    if(p3DroneCount % 2 == 0){
                        this.spawn({x: _canvas.width - (p3Segment * timeframe) - 40, isRight: true});
                    }else{
                        this.spawn({x: (p3Segment * timeframe) + 40, isRight: false});
                    }
                }
            }
            if(phase == 3){
                let timeframe = p4DroneCount + 1;
                if(args.runTime - p1CompTime > timeframe / 10 && p4DroneCount < timeframe && p4DroneCount < p4Goal) {
                    p4DroneCount++;
                    if(p4DroneCount % 3 == 0){
                        this.spawn({x: _canvas.width / 2, isRight: false, shipType: 0});
                    }
                    if(p4DroneCount % 3 == 1){
                        this.spawn({x: _canvas.width - (p4Segment * timeframe) - 50, isRight: true, shipType: 1});
                    }
                    if(p4DroneCount % 3 == 2){
                        this.spawn({x: (p4Segment * timeframe) + 50, isRight: false, shipType: 1});
                    }
                }
            }
        }

        this.spawn = function(args) {
            if(phase == 0) enemies.push(new DroneN1(args));
            if(phase == 1) enemies.push(new DroneN2(args));
            if(phase == 2) enemies.push(new DroneN3(args));
            if(phase == 3) {
                if(args.shipType == 0) enemies.push(new DroneN2(args));
                if(args.shipType == 1) enemies.push(new DroneN3(args));             
            }
        }

        this.phaseCheck = function(enType) {
            if(phase == 0){
                p1Progress++;
                if(p1Progress == p1Goal){
                    phase = 1;
                    p1CompTime = runTime;
                }
            }
            else if(phase == 1){
                p2Progress++;
                if(p2Progress == p2Goal){
                    phase = 2;
                    p1CompTime = runTime;
                }
            }
            else if(phase == 2){
                p3Progress++;
                if(p3Progress == p3Goal){
                    phase = 3;
                    p1CompTime = runTime;
                }
            }
            else if(phase == 3){
                p4Progress++;
                if(p4Progress == p4Goal){
                    phase = 4;
                    p1CompTime = runTime;
                }
            } 
        }
    }

    function Drone()
    {
        numEnemies++;
        this.type = 1000;
        this.life = 5;
        this.speed = 100;
        this.width = 15;
        this.height = 24;
        this.x = 0;
        this.y = 0;
        this.damage = 5; // Damage the drone does when colliding with player.
        this.img = 0;
        this.cores = 1;
        this.points = 1;
        this.doRealMovement = false;
		

        //point based movement variables
        this.pbmCoords = [];
        this.targetX = 0;
        this.targetY = 0;
        this.moveIndex = 0;
        this.minSpeed = 10;
        this.ySpeed = 100;
        this.xSpeed = 100;

        //pi based movement variables
        this.piCenterX = _canvas.width / 2;
        this.piCenterY = _canvas.height / 2;
        this.piRadius = 150;
        this.piSpeed = 10;
        this.moveX = 0;
        this.moveY = 0;
        this.waveLength = 100;
        this.sinOffset = -1;
        this.timeAlive = 0;
        this.circleCount = 0;

        this.resetPosition = function() {
            this.y = -1 * this.height + 10
        }

        this.getBoundingBox = function() {
            // TL, TR, BR, BL
            let halfWidth = this.width / 2;
            let halfHeight = this.height / 2;
            let top = this.y - halfHeight;
            let bottom = this.y + halfHeight;
            let left = this.x - halfWidth;
            let right = this.x + halfWidth;
            return [
                {x: left, y: top},
                {x: right, y: top},
                {x: right, y: bottom},
                {x: left, y: bottom},
            ]
        }

        this.Update = function() {}

        this.baseUpdate = function() {
            this.timeAlive += delta;
        }

        this.Draw = function() {
            buffer.drawImage(enemyImages[this.img], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
        }

        this.destroyClause = function() {
            if(this.life <= 0 || this.y > _canvas.height + this.height) {
                destroys += 1;
                explosions.push(new Explosion(this.x, this.y, 75, 4, 200, 3, 3, 3));
                gco.levelMission.UpdateProgress(this.type);
                return 1;
            }
            return 0;
        }

        this.changePBMTarget = function() {
            this.moveIndex++;
            if(this.pbmCoords.length == this.moveIndex) this.moveIndex = 0;
            this.targetX = this.pbmCoords[this.moveIndex].x;
            this.targetY = this.pbmCoords[this.moveIndex].y;
        }

        //Point A to point B movement
        this.pbmUpdate = function(){
            if(this.x != this.targetX) {
                this.x += (this.xSpeed * delta) * (this.x > this.targetX ? -1 : 1);
                if(Math.abs(this.x - this.targetX) < 0.2){
                    this.x = this.targetX;
                }
                if(this.xSpeed > this.minSpeed) {
                    this.xSpeed = Math.abs(this.x - this.targetX);
                }
                if(this.xSpeed < this.minSpeed){
                    this.xSpeed = this.minSpeed;
                }
            }
            if(this.y != this.targetY) {
                this.y += (this.ySpeed * delta) * (this.y > this.targetY ? -1 : 1);
                if(Math.abs(this.y - this.targetY) < 0.2){
                    this.y = this.targetY;
                }
                if(this.ySpeed > this.minSpeed) {
                    this.ySpeed = Math.abs(this.y - this.targetY);
                }
                if(this.ySpeed < this.minSpeed){
                    this.ySpeed = this.minSpeed;
                }
            }
            if(this.y == this.targetY && this.x == this.targetX){
                this.changePBMTarget()
            }
        }

        //curve based movement
        this.piUpdate = function(){
            this.x = this.piCenterX + (this.piRadius * Math.sin(this.piSpeed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
            this.y = this.piCenterY + (this.piRadius * Math.cos(this.piSpeed * Math.PI * this.waveLength * (this.timeAlive / 1000))) * this.sinOffset;
        }
    }

    function TutorialDrone(args) {
        Drone.call(this);
        this.type = 1001;
        this.x = args.x;
        this.speed = 300;
        const minSpeed = 10;
        const targetY = (_canvas.height / 2) - 100;
        this.resetPosition();

        this.Update = function() {
            this.baseUpdate();
            if(this.y < targetY) {
                this.y += this.speed * delta;
                if(this.speed > minSpeed) {
                    this.speed -= this.speed * delta;
                }
            }
        }
    }

    function DroneN1(args) {
        //Drone Normal 1 - This shit does not shoot
        Drone.call(this);
        this.type = 1002;
        this.x = args.x;
        this.targetY = (_canvas.height / 2) - 150;
        this.targetX = this.x;
        this.resetPosition();
        this.img = 3;
        this.ySpeed = 600;
        this.xSpeed = 600;
        this.minSpeed = 50;
        this.pbmCoords = [{x: this.targetX, y: this.targetY},
                          {x: _canvas.width - this.x, y:(_canvas.height / 2) + 100}];

        this.Update = function() {
            this.baseUpdate(); 
            this.pbmUpdate();
        }
    } 

    function DroneN2(args){
        Drone.call(this);
        this.type = 1003;
        this.img = 10;
        this.x = args.x;
        this.targetY = (_canvas.height / 2) - 300;
        this.targetX = this.x;
        this.originalX = this.x;
        this.resetPosition();
        this.ySpeed = 600;
        this.xSpeed = 600;
        this.minSpeed = 400;
        this.posState = 0;
        this.pbmCoords = [{x: this.targetX, y: this.targetY},
                          {x: _canvas.width / 2, y:(_canvas.height / 2) - 150},
                          {x: _canvas.width / 2, y:(_canvas.height / 2) - 25},
                          {x: this.originalX, y: 550},
                          {x: 50, y: 550},
                          {x: 50, y: -50}];

        this.Update = function() {
            this.baseUpdate();
            if(this.posState == 0){
                this.pbmUpdate();
                if(this.y == this.pbmCoords[1].y && this.x == this.pbmCoords[1].x){
                    this.posState++;
                    this.timeAlive = 0;
                }
            }
            if(this.posState == 1){
                this.ySpeed = 100;
                this.xSpeed = 100;
                this.piRadius = 150;
                this.piUpdate();
                if(this.timeAlive > 2){
                    this.posState++;
                }
            }
            if(this.posState == 2){
                this.pbmUpdate();
                if(this.y == this.pbmCoords[2].y && this.x == this.pbmCoords[2].x){
                    this.posState++;
                    this.timeAlive = 0;
                }
            }   
            if(this.posState == 3){
                this.ySpeed = 100;
                this.xSpeed = 100;
                this.piRadius = 25;
                this.piUpdate();
                if(this.timeAlive > 2){
                    this.posState = 0;
                }                  
            }      
        }
    }

    function DroneN3(args) {
        //Drone Normal 1 - This shit does not shoot
        Drone.call(this);
        this.type = 1004;
        this.x = args.x;
        this.isRight = args.isRight;
        this.targetY = (_canvas.height / 2) - 150;
        this.targetX = this.x;
        this.resetPosition();
        this.img = 7;
        this.ySpeed = 600;
        this.xSpeed = 600;
        this.minSpeed = 300;
        this.borderOne = 40;
        this.borderTwo = 150;
        
        if(this.isRight){
            this.pbmCoords = [{x: this.targetX, y: this.targetY},
                {x: this.borderOne, y: this.targetY},
                {x: this.borderOne, y: 560},
                {x: _canvas.width - this.borderOne, y: 560},
                {x: _canvas.width - this.borderOne, y: 40},
                {x: this.borderOne, y: 40},
                {x: this.borderTwo, y: 150},
                {x: this.borderTwo, y: 450},
                {x: _canvas.width - this.borderTwo, y: 450},
                {x: _canvas.width - this.borderTwo, y: 150},
                {x: _canvas.width / 2, y: 150},
              ];
        }else{
            this.pbmCoords = [{x: this.targetX, y: this.targetY},
                {x: _canvas.width - this.borderOne, y: this.targetY},
                {x: _canvas.width - this.borderOne, y: 560},
                {x: this.borderOne, y: 560},
                {x: this.borderOne, y: 40},
                {x: _canvas.width - this.borderOne, y: 40},
                {x: _canvas.width - this.borderTwo, y: 150},
                {x: _canvas.width - this.borderTwo, y: 450},
                {x: this.borderTwo, y: 450},
                {x: this.borderTwo, y: 150},
                {x: _canvas.width / 2, y: 150}
            ];
        }
        

        this.Update = function() {
            this.baseUpdate(); 
            this.pbmUpdate();
        }
    }

    function EnemyGeneration()
	{
		this.hasBoss = false;
		this.onTick = 0;
		this.generate = function() {
            if(this.hasBoss && (bossPhase == -1 || bossPhase <= 3)) { return; }

            if(ticks != this.onTick) {
                this.onTick = ticks;
                let types = gco.levelMission.enemyTypesForLevel();
                for(var i = 0; i <= types.length; i++) {
                    if(Math.floor(Math.random() * 30) != 10) { continue; } // 1 in 30 chance
                    let type = types[i];
                    // Only Generates 1 boss ship at a time
                    let isBossType = gco.levelMission.bossNums.includes(type);
                    if(isBossType && this.hasBoss) { type = Math.floor(Math.random() * 5); }
                    var startingX = Math.floor(Math.random() * _buffer.width);
                    var theSpeed = 0;
                    var theDmg = 0;
                    var theLife = 0;
                    var cores = 0;
                    var height = 0;
                    var width = 0;
                    var model = 0;
                    var points = 0;
                    switch(type) {
                        case 0: { // Drones
                            theLife = Math.round(Math.random() * 4) + 2;
                            theSpeed = Math.round(Math.random() * 50) + 50;
                            theDmg = Math.round(Math.random() * 5) + 5;
                            cores = Math.round(Math.random() * 2) + 1;
                            if(theDmg > 7){model = 1; points = 2;} else {model = 0; points = 1;}
                            width = 15;
                            height = 25;
                            break;
                        }
                        case 1: { // Weavers
                            theLife = Math.round(Math.random() * 10) + 7;
                            theSpeed = Math.round(Math.random() * 50) + 50;
                            theDmg = Math.round(Math.random() * 7) + 7;
                            cores = Math.round(Math.random() * 5) + 1;
                            if(theDmg > 10){model = 3; points = 4;} else {model = 2; points = 3;}
                            width = 31;
                            height = 21;
                            break;
                        }
                        case 2: { // Kamakaze Ships
                            theLife = Math.round(Math.random() * 15) + 10;
                            theSpeed = Math.round(Math.random() * 150) + 200;
                            theDmg = Math.round(Math.random() * 10) + 10;
                            if(theDmg >= 16) {
                                model = 5;
                                theDmg = Math.round(Math.random() * 10) + 10;
                                cores = Math.round(Math.random() * 15) + 10;
                                points = 6;
                            } else {
                                points = 5;
                                model = 4;
                                theDmg = Math.round(Math.random() * 9) + 9;
                                cores = Math.round(Math.random() * 5) + 1;
                            }
                            width = 21;
                            height = 31;
                            break;
                        }
                        case 3: { // Splitters
                            theLife = Math.round(Math.random() * 20) + 20;
                            theSpeed = Math.round(Math.random() * 35) + 35;
                            theDmg = Math.round(Math.random() * 15) + 15;
                            if(theDmg >= 23) {
                                points = 8;
                                model = 8;
                                theDmg = Math.round(Math.random() * 17) + 17;
                                cores = Math.round(Math.random() * 30) + 20;
                                width = 37;
                                height = 31;
                            } else {
                                points = 7;
                                model = 6;
                                cores = Math.round(Math.random() * 25) + 10;
                                width = 29;
                                height = 30;
                            }//Missiles 15 x 31
                            break;
                        }
                        case 4: { //Teleporters
                            theLife = Math.round(Math.random() * 25) + 15;
                            theSpeed = Math.round(Math.random() * 35) + 35;
                            theDmg = Math.round(Math.random() * 17) + 17;
                            if(theDmg >= 28) {
                                points = 10;
                                theLife = Math.round(Math.random() * 25) + 25;
                                model = 11;
                                cores = Math.round(Math.random() * 30) + 20;
                                width = 26;
                                height = 21;
                            } else {
                                points = 9;
                                model = 10;
                                cores = Math.round(Math.random() * 25) + 10;
                                width = 26;
                                height = 21;
                            }//Missiles 15 x 31
                            break;
                        }
                        case 100: { // Main Boss
                            this.hasBoss = true;
                            theLife = 500;
                            theSpeed = 75;
                            theDmg = 75;
                            model = 16;
                            points = 1000;
                            cores = 1000;
                            width = 116;
                            height = 72;
                            break;
                        }
                    }
                    
                    enemy = new Enemy(theSpeed, theDmg, theLife, cores, width, height, model, startingX, 0, type, points);
                    enemies.push(enemy);
                }
            }
		}
	}

	function Enemy(spd, dmg, lfe, crs, wdth, hght, mdl, inX, inY, theType, pts)
    {
		numEnemies++;
		this.onTick = 0;
        
        // Position and movement
        this.x = inX;
        this.y = inY;
        this.speed = spd;
        this.waveLength = 0;
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
		this.cores = crs;
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
			case 100:
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
								enemy = new Enemy(this.speed, this.damage, Math.round(this.startLife / 2) + 1, Math.round(this.cores / 3) + 1, 15, 31, 7, this.x + xStart, this.y, 50, 2);
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
								enemy = new Enemy(this.speed, this.damage, Math.round(this.startLife / 2) + 1, Math.round(this.cores / 3) + 1, 15, 31, 9, this.x + xStart, this.y, 50, 2);
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
				case 100:
                {// Final Boss
                    switch(this.phase)
                    {
                        case -1:
                        {
                            // Temp Override for boss life.
							// this.life = this.currentMaxLife;
                            this.life = 10

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
					if(this.life <= 0) {
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
                        if(this.phaseSave >= 5) {
                            //Update Mission Data
                            gco.levelMission.UpdateProgress(this.type);
                            gco.win = true;
                            sfx.pause(1); // Stop Laser Sounds
                            gco.bossX = this.x;
                            gco.bossY = this.y;
                            ed.initEvent(6);
                            return 3;
                        } else {
                            this.Model++;
                            this.laser = false;
                            this.inCenter = false;

                            // Temporarily make the boss easier
                            // this.life = this.baseLife * this.phaseSave;
                            // this.currentMaxLife = this.life;
                            this.life = 10;

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
					} else {
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
					if(this.life <= 0) {
						destroys += 1;
						explosion = new Explosion(this.x, this.y, 75, 4, 200, 3, 0.1, 0.1);
						explosions.push(explosion);
						//Update Mission Data
						gco.levelMission.UpdateProgress(this.type);
						return 1;
					} else if(this.y > _canvas.height) {
						return 1;
					}
					return 0;
				}
			}
        }

        this.getBoundingBox = function() {
            // TL, TR, BR, BL
            let halfWidth = this.width / 2;
            let halfHeight = this.height / 2;
            let top = this.y - halfHeight;
            let bottom = this.y + halfHeight;
            let left = this.x - halfWidth;
            let right = this.x + halfWidth;
            return [
                {x: left, y: top},
                {x: right, y: top},
                {x: right, y: bottom},
                {x: left, y: bottom},
            ]
        }
		
		this.spawnKamakaze = function(X, Y)
		{
			var theLife = Math.round(Math.random() * 15) + 10;
			var theSpeed = Math.round(Math.random() * 150) + 200;
			var theDmg = Math.round(Math.random() * 10) + 10;
			var model;
			var cores;
			var points;
			if(theDmg >= 16)
			{
				model = 5;
				theDmg = Math.round(Math.random() * 10) + 10;
				cores = Math.round(Math.random() * 15) + 10;
				points = 6;
			}else 
			{
				points = 5;
				model = 4;
				theDmg = Math.round(Math.random() * 9) + 9;
				cores = Math.round(Math.random() * 5) + 1;
			}
			width = 21;
			height = 31;
			var enemy = new Enemy(theSpeed, theDmg, theLife, cores, width, height, model, X, Y, 2, points);
			enemies.push(enemy);
		}
		this.spawnWeaver = function(X, Y)
		{
			var theLife = Math.round(Math.random() * 15) + 15;
			var theSpeed = Math.round(Math.random() * 50) + 100;
			var theDmg = Math.round(Math.random() * 10) + 15;
			var cores = Math.round(Math.random() * 20) + 20;
			var model;
			var points;
			if(theDmg > 10){model = 3; points = 7;} else {model = 2; points = 6;}
			width = 31;
			height = 21;
			var enemy = new Enemy(theSpeed, theDmg, theLife, cores, width, height, model, X, Y, 1, points);
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
		this.generate = function() {
			if(ticks != this.onTick) {
				this.onTick = ticks;
				// Random enemy spawning with random levels
				var rand = Math.floor(Math.random() * (200));
				if(rand == 10)
				{
					// 1% chance per tick to get an enemy.
					var startingX = Math.floor(Math.random() * _buffer.width);
					var itemNumber = Math.floor(Math.random() * NUM_OF_RANDOM_ITEMS);
					randomItems.push(new Item(itemNumber, startingX, 0));
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
		
		this.Update = function() {
            this.y += this.speed * delta;
			if(this.used || this.y > _canvas.height)
			{
                if(this.used) {
                    if(this.itemNum == 0) { sfx.play(19); } // Health
                    if(this.itemNum == 1) { sfx.play(18); } // Shield
                    if(this.itemNum == 2) { sfx.play(17); } // Ammo
                }
				return 1;
			}
			return 0;
		}
		
		this.doItemEffect = function() {
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
					{// Corez!!!
						this.used = true;
						var newAmount = 25 * self.clamp(gco.level + 1, 1, 8);
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
                if(this.used) { sfx.play(17); }
				return 1;
			}
			return 0;
		}
	}

    function Missile(missNum, theSpeed, missType, inX, inY, dmg, cstm)
    {
        this.missileNum = missNum;
        this.x = inX;
        this.y = inY;
        this.speed = theSpeed;
        this.width = 25;
        this.height = 25;
        this.life = 1;
        this.damage = dmg;
        this.custom = cstm;
        this.missileType = missType;
        this.startX = this.x;
        this.timeAlive = 0;
        this.sinOffset = 1;
        this.coneSpeed = 50;
        this.timer = 0;
        this.detonated = false;
        //Special Init logic
        this.missileTarget = 1000; // missile target will remain 1000 is no target selected
        switch(this.missileType) {
            case 2: {
                this.coneSpeed = this.custom.coneSpeed;
                this.sinOffset = this.custom.direction;
                break;
            }
            case 3: {
                this.sinOffset = this.custom.direction;
                break;
            }
            case 104: {
                this.timer = Math.floor(Math.random() * (4)) + 2;
                break;
            }
        }
        
        this.Update = function(i) {
            this.timeAlive += delta;
            if(this.y < 0 || this.y > _buffer.height){ this.life = 0; }
            switch(this.missileType)
            {
                case 0: { // Primary Assult
                    this.y -= this.speed * delta;
                    break;
                }
                case 1: { // Rapid Fire Assult
                    this.y -= this.speed * delta;
                    break;
                }
                case 2: { // Cone
                    this.x += this.coneSpeed * this.sinOffset * delta;
                    this.y -= this.speed * delta;
                    break;
                }
                case 3: { // Rapid Fire Cyclone
                    this.x = this.startX + (30 * Math.sin(30 * 3.14 * 100 * (this.timeAlive / 1000))) * this.sinOffset;
                    this.y -= this.speed * delta;
                    break;
                }
                case 100: { // Level 2 enemy bullet
                    this.y += this.speed * delta;
                    break;
                }
                case 101: { // Level 5 enemy bomb
                    this.y += this.speed * delta;
                    break;
                }
                case 102: { // Boss shotA
                    this.y += this.speed * delta;
                    break;
                }
                case 103: { // Boss shotB
                    this.y += this.speed * delta;
                    break;
                }
                case 104: { // Boss timed explosive
                    if(!this.detonated) {
                        if(this.timer > 0) {
                            if(ticks % 20 == 0) {
                                this.timer--;
                            }
                            this.y += this.speed * delta;
                        } else {
                            this.detonated = true;
                            this.width = 60;
                            this.height = 60;
                            this.timer = 10;
                        }
                    } else {
                        this.timer--;
                        if(this.timer <= 0) {
                            sfx.play(0);
                            this.life = 0;
                        }
                    }
                    if(missiles[i].life <= 0) {
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

    function Player()
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

        // Speed and Boost
        this.baseSpeed = 200;
        this.boostSpeed = 400;
        this.speed = 200;
        this.boost = 100;
        this.maxBoost = 100;
        this.boosting = false;
        this.boostTimeout = 0;
        let totalTime = 2;  // Total time to decrease to zero
        let boostDescreseRate = 100 / totalTime;  // Calculate rate of decrease per second
        let boostSoundTime = 0;

        this.ship = 8;
        this.width = this.ship == 8 ? 40 : 24;
        this.height = 40;
        this.totalMissiles = 0;
        this.life = 100; // Default: 100
        this.maxLife = 100; // Default: 100
        this.shieldLevel = 0;
        this.shield = 100;
        this.maxShield = this.shield * this.shieldLevel;
        this.hasShield = false;
        this.invicibility = false;

        this.weapon = 0; // 0 - 48
        this.damageLevel = 0;

        this.weaponFunc = true; // Used for weapon effects
        this.didShoot = false;
        this.onTick = 0;
        this.money = 50000;

        this.isPewing = false;
        this.pewTick = 0;
        this.idleAnim = 0; // 0-3
        this.turnAnimL = 4; // 4-11
        this.turnAnimR = 12; // 12-19
        this.activeAnim = 0;

        // Laser
        this.laser = new PlayerLaser();

        // ONLY called in hardReset, let's keep it that way!
        this.ResetAll = function() {
            this.totalMissiles = 0;
            this.resetLife();
            this.resetBoost();
            this.shieldLevel = 0;
            this.recharge = true;
            this.money = 0;
            this.damageLevel = 0;
            this.resetPosition();
        }

        this.resetLife = function() {
            this.life = this.maxLife;
        }

        this.resetBoost = function() {
            this.boost = this.maxBoost;
        }

        this.turnOffBoost = function() {
            this.boosting = false;
        }

        this.resetPosition = function() {
            this.x = _buffer.width / 2;
            this.y = _buffer.height + this.height / 2;
        }
        
        this.isAlive = function() {
            return (this.life > 0);
        }

        this.wepDmgVal = function() {
            return this.damageLevel + 1;
        }
    
        this.DamagePlayer = function(dmg) {
            if(this.hasShield && this.shield > 0) {
                this.shield -= dmg * 3;
            } else {
                if(this.invicibility == false) {
                    this.life -= dmg;
                    if(this.life < 0){ this.life = 0; }
                }
            }
            if(!this.isAlive()) { 
                gco.ShowContinueScreen();
                sfx.play(0);
                explosion = new Explosion(player.x, player.y, 350, 5, 200, 0.1, 3, 0.1);
                explosions.push(explosion);
                this.laser.stop();
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

        this.Update = function() {
            if(ed.eventPlaying()) { return; }
            this.x1 = this.x;
            this.y1 = this.y - (this.height / 2);
            this.x2 = this.x - (this.width / 2);
            this.y2 = this.y + (this.height / 2);
            this.x3 = this.x + (this.width / 2);
            this.y3 = this.y + (this.height / 2);
            
            if(this.hasShield && this.shield <= 0) {
                this.shield = 0;
            }

            this.handleBoost();
            this.laser.Update();
        }

        this.handleBoost = function() {
            if(Keys[20] != 0 && this.boost > 0) {
                this.boostTimeout = 100
                this.boost -= 25 * delta; // Descrease boost by 25 per second.
                if(!this.boosting) {
                    boostSoundTime = 0.754; // Exact start clip length
                    sfx.play(21);
                } else {
                    if(boostSoundTime > 0) {
                        boostSoundTime -= delta;
                        if(boostSoundTime <= 0.02) {
                            boostSoundTime = 0.297; // Exact repeat clip length
                            sfx.play(22);
                        }
                    }
                }
                this.boosting = true;
                this.speed = this.boostSpeed;
            } else {
                if(this.boosting) {
                    boostSoundTime = 0;
                    sfx.play(23);
                }
                this.boosting = false;
                this.speed = this.baseSpeed;
                if(this.boostTimeout > 0) {
                    this.boostTimeout -= boostDescreseRate * delta;
                    if(this.boostTimeout <= 0) { this.boostTimeout = 0; }
                } else {
                    if(this.boost < this.maxBoost) {
                        this.boost += 5 * delta;
                        if(this.boost > this.maxBoost) { this.boost = this.maxBoost; }
                    }
                }
            }
        }

        this.drawPlayer = function() {
            if(this.boosting) {
                buffer.filter = 'blur(2px)';
            }
            if(this.ship == 2){
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages2[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(ed.eventPlaying()) buffer.drawImage(playerImages2[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages2[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages2[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages2[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages2[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages2[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                } 
            }else if (this.ship == 3) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages3[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(ed.eventPlaying()) buffer.drawImage(playerImages3[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages3[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages3[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages3[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages3[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages3[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 4) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages4[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);                                
                if(ed.eventPlaying()) buffer.drawImage(playerImages4[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages4[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages4[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages4[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages4[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages4[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 5) {
                if (Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages5[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);                
                if(ed.eventPlaying()) buffer.drawImage(playerImages5[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImage5[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages5[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages5[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages5[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages5[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if (this.ship == 6) {
                if(Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages6[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);                
                if(ed.eventPlaying()) buffer.drawImage(playerImages6[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages6[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages6[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages6[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages6[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages6[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }
            }else if(this.ship == 7) {
                if(Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages7[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);                
                if(ed.eventPlaying()) buffer.drawImage(playerImages7[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages7[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages7[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages7[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages7[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages7[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);   
                }
            }else if(this.ship == 8) {
                if(Keys[1] == 0 && Keys[3] == 0) { this.activeAnim = this.idleAnim}
                if(ed.eventPlaying() || (currentGui == 6 || currentGui == 1)) { this.activeAnim = 0; }
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    if((Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) || (Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11)){ this.activeAnim = this.turnAnimL; } // A || Left
                    if(((Keys[3] >= 1 && Keys[1] == 0) && this.turnAnimR >= 12 && this.turnAnimR <= 15) || ((Keys[3] >= 1 && Keys[1] == 0) && this.turnAnimR >= 16 && this.turnAnimR <= 19)){ this.activeAnim = this.turnAnimR; } // D || Right
                }
                buffer.drawImage(playerImages8[this.activeAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
            } else {
                if(Keys[1] == 0 && Keys[3] == 0) buffer.drawImage(playerImages1[this.idleAnim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(ed.eventPlaying()) buffer.drawImage(playerImages1[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(currentGui == 6 || currentGui == 1) buffer.drawImage(playerImages1[0], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                if(!ed.eventPlaying() && currentGui != 6 && currentGui != 1) {
                    // A || Left
                    if(Keys[1] >= 1 && this.turnAnimL >= 4 && this.turnAnimL <= 7) buffer.drawImage(playerImages1[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    if(Keys[1] >= 1 && this.turnAnimL >= 8 && this.turnAnimL <= 11) buffer.drawImage(playerImages1[this.turnAnimL], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                    // D || Right
                    if(Keys[3] >= 1 && this.turnAnimR >= 12 && this.turnAnimR <= 15) buffer.drawImage(playerImages1[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height); 
                    if(Keys[3] >= 1 && this.turnAnimR >= 16 && this.turnAnimR <= 19) buffer.drawImage(playerImages1[this.turnAnimR], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);  
                }  
            }
            buffer.filter = 'none';

            this.laser.Draw();
        }

        this.runOnTick = function() {
            if(this.boosting) {
                playerTrails.push(new PlayerTrail(this.ship, this.x, this.y, this.width, this.height, this.activeAnim))
            }

            if(this.onTick % 2 == 0) {
                this.idleAnim++;
                if(this.idleAnim > 3) this.idleAnim = 0;
            }
            
            if(this.onTick != 0 && this.isPewing && this.pewTick >= 1) {
                this.pewTick = 0;
                sfx.play(12);
            } else {
                if(this.onTick != 0) {
                    this.pewTick++;
                }
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
		
		this.upgradeShield = function() {
			this.hasShield = true;
			this.shieldLevel += 1;
			this.maxShield = 100 * this.shieldLevel
			this.resetShield();
		}
		
		this.resetShield = function() {
			this.shield = this.maxShield;
		}

        this.shoot = function() {
            this.isPewing = true;
            switch(this.weapon) {
                case 0: {
                    this.totalMissiles += 1;
                    if(this.weaponFunc) {
                        missiles.push(new Missile(missiles.length, 300, 0, this.x, this.y - 25, this.wepDmgVal(), {}));
                    }
                    this.weaponFunc = !this.weaponFunc;
                    break;
                }
                case 1: {
                    this.totalMissiles += 1;
                    if(this.weaponFunc) {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x - 5, this.y - 25, this.wepDmgVal(), {}));
                    } else {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x + 5, this.y - 25, this.wepDmgVal(), {}));
                    }
                    this.weaponFunc = !this.weaponFunc;
                    break;
                }
                case 2: {
                    this.totalMissiles += 1;
                    if(this.weaponFunc) {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x - 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1, coneSpeed: 50}));
                    } else {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x + 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1, coneSpeed: 50}));
                    }
                    this.weaponFunc = !this.weaponFunc;
                    break;
                }
                case 3: {
                    this.totalMissiles += 1;
                    if(this.weaponFunc) {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x - 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1, coneSpeed: 50}));
                        missiles.push(new Missile(missiles.length, 300, 3, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1}));
                    } else {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x + 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1, coneSpeed: 50}));
                        missiles.push(new Missile(missiles.length, 300, 3, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1}));
                    }
                    this.weaponFunc = !this.weaponFunc;
                    break;
                }
                case 4: {
                    this.totalMissiles += 1;
                    if(this.weaponFunc) {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x - 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1, coneSpeed: 50}));
                        missiles.push(new Missile(missiles.length, 300, 3, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x + 5, this.y - 25, this.wepDmgVal(), {direction: 1, coneSpeed: 150}));
                    } else {
                        missiles.push(new Missile(missiles.length, 300, 1, this.x + 5, this.y - 25, this.wepDmgVal(), {}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1, coneSpeed: 50}));
                        missiles.push(new Missile(missiles.length, 300, 3, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1}));
                        missiles.push(new Missile(missiles.length, 300, 2, this.x - 5, this.y - 25, this.wepDmgVal(), {direction: -1, coneSpeed: 150}));
                    }
                    this.weaponFunc = !this.weaponFunc;
                    break;
                }
                default:{break;}
            }
        }

        this.upgradeDamage = function() {
            this.damageLevel += 1;
            if(this.damageLevel > 4) { this.damageLevel = 4; }
        }

        this.buy = function(price) {
            this.money -= price;
            sfx.play(15);
            sfx.play(16);
        }
    }

    function PlayerLaser()
    {
        this.onTick = 0;
        this.level = 0;
        this.baseDamage = 3;
        this.damageLevel = 0;
        this.charge = 100;
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.width = 10;
        this.height = 150;
        let heightOffset = 20;
        let collision = null;
        let collisions = [];
        let doDmg = false;
        this.plasmaFlameSize = 20; // Initial size of the plasma flame
        this.plasmaFlameSizeChange = 20; // Adjusted for delta time

        this.Update = function() {
            if(Keys[19] != 0) {
                this.active = true;
                doDmg = false;
                if(!sfx.laserPlaying){ sfx.play(1); }
                this.x = player.x;
                this.y = player.y;
                if(this.onTick != ticks) {
                    this.onTick = ticks;
                    if(this.onTick % 2 == 0) {
                        collision = null;
                        doDmg = true;
                    }
                }
                this.checkCollisions();
                if(collision == null) {
                    this.height = this.y - (heightOffset + 2); // Laser goes to top of screen
                } else {
                    this.height = (player.y - (collision[2].y - 20)) - (heightOffset + 2); // Laser goes to closest hit target + 10 pixels up
                }
                
            } else {
                this.stop();
            }
        }

        this.Draw = function() {
            if (!this.active) { return; }
        
            // Get the base laser color and the lighter color
            let baseColor = this.getBaseLaserColor();
            let lighterColor = this.getBaseLightLaserColor();
        
            // Calculate the dynamic shadow blur
            let shadowBlurValue = 10 + Math.sin(Date.now() * 0.02) * 2;
        
            // Set the shadow color based on the base color
            buffer.shadowBlur = shadowBlurValue;
            buffer.shadowColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        
            let bb = this.getBoundingBox();
            let bWidth = this.beamWidth();
            let radius = Math.min(this.height / 2, bWidth / 2); // Adjust the radius as needed
        
            // Draw outer part of the laser with rounded top and bottom
            buffer.beginPath();
            buffer.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
            buffer.moveTo(bb[0].x + radius, bb[0].y);
            buffer.lineTo(bb[0].x + bWidth - radius, bb[0].y);
            buffer.arcTo(bb[0].x + bWidth, bb[0].y, bb[0].x + bWidth, bb[0].y + radius, radius);
            buffer.lineTo(bb[0].x + bWidth, bb[0].y + this.height - radius);
            buffer.arcTo(bb[0].x + bWidth, bb[0].y + this.height, bb[0].x + bWidth - radius, bb[0].y + this.height, radius);
            buffer.lineTo(bb[0].x + radius, bb[0].y + this.height);
            buffer.arcTo(bb[0].x, bb[0].y + this.height, bb[0].x, bb[0].y + this.height - radius, radius);
            buffer.lineTo(bb[0].x, bb[0].y + radius);
            buffer.arcTo(bb[0].x, bb[0].y, bb[0].x + radius, bb[0].y, radius);
            buffer.closePath();
            buffer.fill();
        
            // Draw inner part of the laser with rounded top and bottom
            buffer.beginPath();
            buffer.fillStyle = `rgb(${lighterColor.r}, ${lighterColor.g}, ${lighterColor.b})`;
            let innerX = bb[0].x + bWidth / 4;
            let innerWidth = bWidth / 2;
            buffer.moveTo(innerX + radius, bb[0].y);
            buffer.lineTo(innerX + innerWidth - radius, bb[0].y);
            buffer.arcTo(innerX + innerWidth, bb[0].y, innerX + innerWidth, bb[0].y + radius, radius);
            buffer.lineTo(innerX + innerWidth, bb[0].y + this.height - radius);
            buffer.arcTo(innerX + innerWidth, bb[0].y + this.height, innerX + innerWidth - radius, bb[0].y + this.height, radius);
            buffer.lineTo(innerX + radius, bb[0].y + this.height);
            buffer.arcTo(innerX, bb[0].y + this.height, innerX, bb[0].y + this.height - radius, radius);
            buffer.lineTo(innerX, bb[0].y + radius);
            buffer.arcTo(innerX, bb[0].y, innerX + radius, bb[0].y, radius);
            buffer.closePath();
            buffer.fill();
        
            buffer.shadowBlur = 0;
        
            // Draw plasma
            if (collision) {
                this.drawPlasmaFlame(bb);
            }

            // Minor plasma flames for higher level lasers
            if(collisions.length > 0) {
                for(let i = 0; i < collisions.length; i++) {
                    this.drawMinorPlasmaFlame(bb, collisions[i]);
                }
            }
        };

        this.drawPlasmaFlame = function(bb) {
            if (!collision) return;
        
            // Determine if we are in the small pulsate mode or large pulsate mode
            if (!this.largePulsateMode) {
                // Small pulsate mode
                this.plasmaFlameSize += (Math.random() - 0.5) * 3 * delta;
                if (this.plasmaFlameSize > 10 || this.plasmaFlameSize < 2) {
                    this.plasmaFlameSizeChange *= -1; // Reverse the size change direction
                }
        
                // Occasionally switch to large pulsate mode
                if (Math.random() < 0.01) { // Reduce chance to switch to large mode
                    this.largePulsateMode = true;
                    this.largePulsateDuration = Math.random() * 1000 + 500; // Duration for large pulsate mode
                    this.largePulsateStartTime = performance.now();
                }
            } else {
                // Large pulsate mode
                this.plasmaFlameSize += (Math.random() - 0.5) * 20 * delta;
                if (this.plasmaFlameSize > 60 || this.plasmaFlameSize < 10) {
                    this.plasmaFlameSizeChange *= -1; // Reverse the size change direction
                }
        
                // Check if we should switch back to small pulsate mode
                if (performance.now() - this.largePulsateStartTime > this.largePulsateDuration) {
                    this.largePulsateMode = false;
                }
            }
        
            // Calculate the exact center of the colliding ship
            let x = bb[0].x + ((bb[1].x - bb[0].x) / 2);
            let y = collision[0].y + ((collision[2].y - collision[0].y) / 2);
        
            // Draw the central bright spot with random pulsating effect
            let centralFlameSize = this.plasmaFlameSize + (Math.random() - 0.5) * 6;
        
            buffer.shadowBlur = 40;
            buffer.shadowColor = 'rgb(255, 255, 255)';
            buffer.beginPath();
            buffer.fillStyle = 'rgba(255, 255, 255, 0.9)';
            buffer.arc(x, y, centralFlameSize, 0, 2 * Math.PI);
            buffer.fill();
            buffer.closePath();
        
            // Draw twinkling arms of light (bokeh/lens flare effect)
            for (let i = 0; i < 8; i++) {
                let angle = Math.random() * 2 * Math.PI;
                let length = Math.random() * 60 + 20;
                let opacity = Math.random() * 0.5 + 0.5;
        
                let armX = x + Math.cos(angle) * length;
                let armY = y + Math.sin(angle) * length;
        
                buffer.beginPath();
                buffer.moveTo(x, y);
                buffer.lineTo(armX, armY);
                buffer.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                buffer.lineWidth = 1;
                buffer.stroke();
                buffer.closePath();
            }
        
            buffer.shadowBlur = 0;
        };

        this.drawMinorPlasmaFlame = function(bb, col) {
            // Calculate the exact center of the colliding ship
            let x = self.getCentralOverlapX(bb, col);
            let y = col[0].y + ((col[2].y - col[0].y) / 2);
        
            // Draw the central bright spot with random pulsating effect
            let centralFlameSize = Math.random() * (15 - 5) + 5;
            buffer.shadowBlur = 20;
            buffer.shadowColor = 'rgb(255, 255, 255)';
            buffer.beginPath();
            buffer.fillStyle = 'rgba(255, 255, 255, 0.9)';
            buffer.arc(x, y, centralFlameSize, 0, 2 * Math.PI);
            buffer.fill();
            buffer.closePath();
        
            // Draw twinkling arms of light (bokeh/lens flare effect)
            for (let i = 0; i < 3; i++) {
                let angle = Math.random() * 2 * Math.PI;
                let length = Math.random() * 20 + 20;
                let opacity = Math.random() * 0.5 + 0.5;
        
                let armX = x + Math.cos(angle) * length;
                let armY = y + Math.sin(angle) * length;
        
                buffer.beginPath();
                buffer.moveTo(x, y);
                buffer.lineTo(armX, armY);
                buffer.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                buffer.lineWidth = 1;
                buffer.stroke();
                buffer.closePath();
            }
        
            buffer.shadowBlur = 0;
        };

        this.getBaseLaserColor = function() {
            switch (this.damageLevel) {
                case 0:
                    return {r: 0, g: 128, b: 255}; // Blue
                case 1:
                    return {r: 0, g: 255, b: 0};   // Green
                case 2:
                    return {r: 255, g: 255, b: 0}; // Yellow
                case 3:
                    return {r: 255, g: 165, b: 0}; // Orange
                case 4:
                    return {r: 255, g: 0, b: 0};   // Red
                default:
                    return {r: 0, g: 128, b: 255}; // Default to Blue
            }
        } 

        this.getBaseLightLaserColor = function() {
            switch (this.damageLevel) {
                case 0:
                    return {r: 0, g: 200, b: 255}; // Blue
                case 1:
                    return {r: 165, g: 255, b: 165};   // Green
                case 2:
                    return {r: 255, g: 255, b: 200}; // Yellow
                case 3:
                    return {r: 255, g: 225, b: 0}; // Orange
                case 4:
                    return {r: 255, g: 125, b: 125};   // Red
                default:
                    return {r: 0, g: 200, b: 255}; // Default to Blue
            }
        }

        this.getBoundingBox = function() {
            // TL, TR, BR, BL
            let bWidth = this.beamWidth();
            let halfWidth = bWidth / 2;
            let top = this.y - (heightOffset + this.height);
            let bottom = this.y - heightOffset;
            let left = this.x - halfWidth;
            let right = this.x + halfWidth;
            return [
                {x: left, y: top},
                {x: right, y: top},
                {x: right, y: bottom},
                {x: left, y: bottom},
            ]
        }

        this.dmgVal = function() {
            return this.baseDamage * (this.damageLevel + 1);
        }

        this.beamWidth = function() {
            this.width
            return this.width + [0, 6, 12, 18, 24][this.level]
        }

        this.checkCollisions = function() {
            if(!this.active) { return; }
            let bb = this.getBoundingBox();
            let ebb = null;
            collisions = []; // Only used for higher level lasers.
            for(var a = 0; a < enemies.length; a++) {
                ebb = enemies[a].getBoundingBox();
                if(self.isColliding(bb, ebb)) {
                    if(this.level < 3) { // Collect collision data to stop laser from going to top of screen.
                        if(collision == null || ebb[2].y > collision[2].y) {
                            collision = ebb;
                        }
                    } else {
                        collisions.push(ebb);
                    }
                    if(doDmg) {
                        enemies[a].life -= this.dmgVal();
                        explosions.push(new Explosion(enemies[a].x, enemies[a].y, 10, 4, 100, 0.1, 0.1, 3.0));
                    }
                }
            }
        }

        this.stop = function() {
            if(!this.active) { return; }
            this.active = false;
            if(sfx.laserPlaying){ sfx.pause(1); }
        }

        this.upgradeLevel = function() {
            this.level += 1;
            if(this.level > 4) { this.level = 4; }
        }

        this.upgradeDamage = function() {
            this.damageLevel += 1;
            if(this.damageLevel > 4) { this.damageLevel = 4; }
        }
    }

    function PlayerTrail(SHIP, X, Y, WIDTH, HEIGHT, ANIM)
    {
        this.ship = SHIP;
        this.x = X;
        this.y = Y;
        this.width = WIDTH;
        this.height = HEIGHT;
        this.anim = ANIM;

        // Internal Variables
        let startTime = 0.5;
        let time = startTime;
        let opacity = 1;

        this.Update = function() {
            if(time > 0) {
                time -= delta;
                if(time < 0) { time = 0; }
                opacity = time / startTime;
                if(opacity < 0) {opacity = 0;}
            }

            // Escape/Death clause
            return time <= 0;
        }

        this.Draw = function() {
            buffer.filter = 'blur(2px)';
            buffer.globalAlpha = opacity;
            buffer.drawImage(playerImages8[this.anim], this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
            buffer.filter = 'none';
            buffer.globalAlpha = 1;
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
				case 11:{out = "a group of rebel fighers now race through space towards the heart of the Drone army."; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
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
        this.active = false;
        this.overlayAlpha = 0.0;
        this.center = _buffer.width / 2;
        this.credits = [];
        this.lines = 31;
        this.lineHeight = 50;
        this.yOffset = 0;
        this.scrollSpeed = 25;
        this.isBlackedOut = false;
        var out = "";
        var size = "";
        var color = "";
        for(var i = 0; i < this.lines; i++) {
            switch(i) {
                case 0:{out = "Humanity is Saved"; size = "28px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
                case 1:{out = "Our ace pilots has defeated the drone core in enough time to save humanity."; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 2:{out = "The task of rebuilding civilization, however difficult, can still never"; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 3:{out = "match the devotion and courage it took for our ace pilots to..."; size = "16px VT323"; color = "rgb(96, 255, 96)"; break;}
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
                case 22:{out = "David Van Laar-Veth"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
                case 23:{out = "Story"; size = "22px Thunderstrike"; color = "rgb(96, 255, 96"; break;}
                case 24:{out = "Mico Picache"; size = "18px VT323"; color = "rgb(255, 255, 255)"; break;}
                case 25:{out = " "; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 26:{out = "Speacial Thanks to @Deep_Fold For the Pixel Planet Generation"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 27:{out = " "; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 28:{out = "Speacial Thanks Justin Hammond For Additional Coding Work"; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 29:{out = " "; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
                case 30:{out = "Thanks for playing!"; size = "28px Thunderstrike Halftone"; color = "rgb(255, 127, 255)"; break;}
                default:{out = ""; size = "18px VT323"; color = "rgb(96, 255, 96)"; break;}
            }
            this.credits[i] = new GUIText(out, this.center, _buffer.height + (this.lineHeight * i), size, "center", "top", color);
        }

        this.roll = function() {
            this.active = true;
        }

        this.reset = function() {
            this.active = false;
            this.overlayAlpha = 0.0;
            this.yOffset = 0;
            this.isBlackedOut = false;
        }
		
        this.Update = function() {
            if(this.CreditsFinished()) {
                if(currentGui != 7) {
                    ed.endEvent(); // Closes the cutscene in the background before fading out.
                    currentGui = 7;
                }
                if(this.isBlackedOut) {
                    this.overlayAlpha -= delta / 2;

                    // CREDITS EXIT CLAUSE
                    if(this.overlayAlpha <= 0) {
                        this.reset();
                        menu.delayNextInput();
                    }
                }
            } else {
                if(this.isBlackedOut) {
                    this.yOffset += this.scrollSpeed * delta;
                } else {
                    this.overlayAlpha += delta / 6;
                    if(this.overlayAlpha >= 1) {
                        this.overlayAlpha = 1;
                        this.isBlackedOut = true;
                    }
                }
            }
        }
        
        this.Draw = function() {
            this.DrawOverlay();
            if(this.isBlackedOut && !this.CreditsFinished()){ this.DrawCredits(); }
        }
        
        this.DrawOverlay = function() {
            buffer.fillStyle = "rgba(0, 0, 0, " + this.overlayAlpha + ")";
            buffer.fillRect(0, 0, _buffer.width, _buffer.height);
        }
        
        this.DrawCredits = function() {
            buffer.beginPath();
            for(var i = 0; i < this.credits.length; i++) {
                if(i == 7) {
                    buffer.drawImage(logoImages[0], 200, this.credits[i].y - this.yOffset, 400, 100);
                } else {
                    buffer.fillStyle = this.credits[i].color;
                    buffer.font = this.credits[i].fontStyle;
                    buffer.textAlign = this.credits[i].alignX;
                    buffer.textBaseline = this.credits[i].alignY;
                    buffer.fillText(this.credits[i].text, this.credits[i].x, this.credits[i].y - this.yOffset);
                }
            }
            buffer.closePath();
        }
        
        this.CreditsFinished = function() {
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
        if(_canvas && _canvas.getContext) {
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
        player = new Player();
		enemyGeneration = new EnemyGeneration();
        lg = new LevelGen();
        planet = new Planet();
        planetLevel = new PlanetLevel();
        starGeneration = new StarGeneration();
        foregroundGeneration = new ForegroundGeneration();
		itemGeneration = new RandomItemGeneration();
		gco = new GameControlObject();
		gco.Init();
        menu = new Menu(); // State manager for all game menus to enable keyboard and gamepad navigation
        menu.Init()
        ed = new EventDirector();
		
		sfx = new SFXObject();
        sfx.Init();
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
		if(gco.mustPurchasePrevious > 0){ gco.mustPurchasePrevious -= (delta * 1000); }
		if(gco.notEnoughCores > 0){ gco.notEnoughCores -= (delta * 1000); }
		if(gco.playStory){ gco.story.Update(); }
		// Stop Sound Check
		if((currentGui != NULL_GUI_STATE) && sfx.laserPlaying){sfx.pause(1);}
		if((gameState != 1) && sfx.bossLaserPlaying){sfx.pause(2);}

        // Menus
        menu.Update();

        // Input
        if(gameInitalized) {
            self.doInput();
            self.getInput();
        }

		// Random Star & Foreground Generation
        if(!paused) {
            starGeneration.generate();
            foregroundGeneration.Update();
            ed.Update();
            planet.Update();
            for(var i = 0; i < stars.length; i++) {
                if(stars[i].Update() != 0) {
                    if(stars[i].isPlanet){ starGeneration.hasPlanet = false;}
                    self.popArray(stars, i);
                }
            }
        }

        if(!paused && gameState == 1) {
            if(!gco.win) {
                for(var i = 0; i < missiles.length; i++) { // Update Missile Objects 
                    missiles[i].Update(i);
                    if(missiles[i].life <= 0){ self.popArray(missiles, i); }
                }
            }
            for(var i = 0; i < explosions.length; i++) { // Explosion Object Updates
                if(explosions[i].Update() != 0) self.popArray(explosions, i);
            }
            for(var i = 0; i < playerTrails.length; i++) { // Explosion Object Updates
                if(playerTrails[i].Update()){ self.popArray(playerTrails, i); }
            }
        }

        gco.Update(); // Game Control Object Update
        if(!ed.eventPlaying() && !gco.transition.active) { // If event is not playing
            if(!paused && gameState == 1 && !gco.win) {
                if(gco.level < 2) {
                    lg.Update();
                } else {
                    enemyGeneration.generate(); // Random Enemy Generation
                }
                itemGeneration.generate(); // Random Item Generation

                if(player.isAlive()) { // Update Player
                    self.levelBoundingCheck(player);
                    player.Update();
                }
                
                for(var i = 0; i < enemies.length; i++) { // Enemy Update Ticks
                    if(enemies[i].onTick != ticks){ enemies[i].onTick = ticks; }
                    let returnValue = enemies[i].Update();
                    if ('destroyClause' in enemies[i]) {
                        returnValue = enemies[i].destroyClause();
                    }
                    switch(returnValue) {
                        case 1:
                            if(enemies[i].life <= 0) {
                                enemiesKilled++;
                                enemyPoints += enemies[i].points;
                                sfx.play(0);
                                money.push(new MoneyEntity(enemies[i].cores, enemies[i].x, enemies[i].y));
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
                                        sfx.play(13); // Random Hit Sound
                                        explosion = new Explosion(missiles[b].x, missiles[b].y, 5, 10, 100, 1, 1, 1);
                                        explosions.push(explosion);
                                        player.DamagePlayer(missiles[b].damage);
                                        this.popArray(missiles, b);
                                    }
                                } else { // Collision detection with player missiles and enemies
                                    if(self.Collision(missiles[b], enemies[a])) {
                                        sfx.play(13); // Random Hit Sound
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
        // Disallow Any Input
        if(!gameInitalized || gco.transition.active || gco.credits.active) { return; }
        if(ed.eventPlaying()) {
            ed.DoInput();
            return; // Escape all other input for mouse event if event is playing.
        }
        // This function should mimic the menu.select() functionality. If something is added there, it should be here, and visa-versa
		//State GUIs
            // 0 = Main Menu
            // 1 = Pause Menu
            // 2 = Upgrade Menu
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
                    if(mouseX > (_canvas.width / 2 + 10) - 115 && mouseX < (_canvas.width / 2 + 10) + 100 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10) {
                        if(gco.level == 0) {
                            ed.initEvent(6);
                        } else {
                            currentGui = 2;
                        }
                        sfx.play(11);
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 65 && mouseX < (_canvas.width / 2 + 10) + 40 && mouseY < (_canvas.height / 2 + 60) + 20 && mouseY > (_canvas.height / 2 + 60) - 10) {
                        currentGui = 6; lastGui = 0;
                        sfx.play(8);
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 65 && mouseX < (_canvas.width / 2 + 10) + 40 && mouseY < (_canvas.height / 2 + 110) + 20 && mouseY > (_canvas.height / 2 + 110) - 10) {
                        gco.playStory = true;
                        sfx.play(8);
                    }
                    if(mouseX > (_canvas.width / 2 + 10) - 80 && mouseX < (_canvas.width / 2 + 10) + 55 && mouseY < (_canvas.height / 2 + 150) + 20 && mouseY > (_canvas.height / 2 + 150) - 10) {
                        ipcRenderer.send('quit-app');
                    }
                }
                break;
			}
            case 1:
            {//Pause Menu
                if(mouseX > (_canvas.width / 2) - 50 && mouseX < (_canvas.width / 2) + 50 && mouseY < (_canvas.height / 2) + 30 && mouseY > (_canvas.height / 2)) {
                    currentGui = 6; lastGui = 1;
                    sfx.play(8);
                }
                if(mouseX > (_canvas.width / 2) - 54 && mouseX < (_canvas.width / 2) + 54 && mouseY < (_canvas.height / 2) + 70 && mouseY > (_canvas.height / 2) + 45) {
                    self.hardReset();
                    sfx.play(9);
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
                if(mouseX > (_canvas.width - 210) && mouseX < (_canvas.width - 10) && mouseY < (278) && mouseY > (250)) { // Start Level
                    if(player.weapon != 49){ gco.StartLevel(); sfx.play(8);}
                }
                if(mouseX > (_canvas.width - 235) && mouseX < (_canvas.width - 125) && mouseY < (55) && mouseY > (15)) { // Options Menu
                    currentGui = 6; lastGui = 2; sfx.play(8);
                }
                if(mouseX > (_canvas.width - 90) && mouseX < (_canvas.width - 25) && mouseY < (55) && mouseY > (15)) { // Quit
                    self.hardReset();
                    sfx.play(9);
                }
                if(mouseX > 10 && mouseX < 58 && mouseY > 280 && mouseY < 328) { // Primary Weapon
                    if(player.weapon == 4) { sfx.play(8); } else { if(player.money >= gco.weaponPrice[player.weapon + 1]) { gco.PurchaseWeapon(player.weapon + 1); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }}
                }
                if(mouseX > 60 && mouseX < 108 && mouseY > 280 && mouseY < 328) { // Weapon Damage
                    if(player.damageLevel == 4) { sfx.play(8); } else { if(player.money >= gco.damagePrice[player.damageLevel + 1]) { player.upgradeDamage(); player.buy(gco.damagePrice[player.damageLevel]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }}
                }
                if(mouseX > 10 && mouseX < 58 && mouseY > 448 && mouseY < 496) { // Laser
                    if(player.laser.level == 4) { sfx.play(8); } else { if(player.money >= gco.laserPrice[player.laser.level + 1]) { player.laser.upgradeLevel(); player.buy(gco.laserPrice[player.laser.level]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }}
                }
                if(mouseX > 60 && mouseX < 108 && mouseY > 448 && mouseY < 496) { // Laser Damage
                    if(player.laser.damageLevel == 4) { sfx.play(8); } else { if(player.money >= gco.laserDamagePrice[player.laser.damageLevel + 1]) { player.laser.upgradeDamage(); player.buy(gco.laserDamagePrice[player.laser.damageLevel]); sfx.play(8); } else { gco.notEnoughCores = 1000; sfx.play(10); }}
                }
                if(mouseX > _canvas.width - 300 && mouseX < _canvas.width - 252 && mouseY > 448 && mouseY < 496) { // Shield
                    if(player.money >= (player.shieldLevel + 1) * 250){gco.PurchaseExtras(0); sfx.play(8); } else {gco.notEnoughCores = 1000; sfx.play(10);}
                }
                //**********************************************************************//
                //                     END UPGRADE MENU SECTION                         //
                //**********************************************************************//
                break;
            }
			case 3:
			{// Continue Menu
                if(mouseX > (_canvas.width / 2 + 10) - 75 && mouseX < (_canvas.width / 2 + 10) + 60 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10) {
                    gco.levelMission.nextOnDeath();
                }
				if(mouseX > (_canvas.width / 2 + 10) - 61 && mouseX < (_canvas.width / 2 + 10) + 43 && mouseY < (_canvas.height / 2 + 53) + 20 && mouseY > (_canvas.height / 2 + 50) )
                {
					self.hardReset();
                    sfx.play(9);
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
                    sfx.play(8);
                    gco.GoToUpgradeMenu();
                }
                break;
			}
			case 5:
			{// Game Over Menu
                if(mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 30) && mouseY > (_canvas.height / 2)) {
                    self.hardReset();
                    sfx.play(8);
                }
                if(mouseX > (_canvas.width / 2 - 65) && mouseX < (_canvas.width / 2 + 70) && mouseY < (_canvas.height / 2 + 80) && mouseY > (_canvas.height / 2 + 48)) {
                    ipcRenderer.send('quit-app');
                }
				break;
			}
			case 6:
			{//Options Menu
                // Back button
				if(mouseX > 0 && mouseX < 90 && mouseY < _canvas.height && mouseY > _canvas.height - 45){currentGui = lastGui; lastGui = 6; sfx.play(9);}
                
                // Graphics
				if(mouseX > 200 && mouseX < 225 && mouseY > 150 && mouseY < 200)
                {
					particleOffset -= 1;
					if(particleOffset < 1){particleOffset = 1;}
                    sfx.play(8);
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 150 && mouseY < 200)
                {
					particleOffset += 1;
                    if(particleOffset > 5){particleOffset = 5;}
                    sfx.play(8);
				}
                
                // BGM Volume
                if(mouseX > 200 && mouseX < 225 && mouseY > 290 && mouseY < 340)
                {
                    if(gco.bgm.volume < 0.1){break;}
                    else{gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 - 0.1;}
                    sfx.play(8);
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 290 && mouseY < 340)
                {
                    if(gco.bgm.volume > 0.91){break;}
                    else{gco.bgm.volume = Math.round(gco.bgm.volume * 100) / 100 + 0.1;}
                    sfx.play(8);
				}
				masterBGMVolume = gco.bgm.volume;
                
                // SFX Volume
                if(mouseX > 200 && mouseX < 225 && mouseY > 430 && mouseY < 480)
                {
                    if(sfx.masterVolume < 0.1){break;}
                    else{sfx.volume(Math.round(sfx.masterVolume * 100) / 100 - 0.1);}
                    sfx.play(8);
				}
				if(mouseX >= 575 && mouseX < 600 && mouseY > 430 && mouseY < 480)
                {
                    if(sfx.masterVolume > 0.91){break;}
                    else{sfx.volume(Math.round(sfx.masterVolume * 100) / 100 + 0.1);}
                    sfx.play(8);
				}
                
				break;
			}
			case 7:
			{// Submit Score Menu
                if(mouseX > (_canvas.width / 2 + 10) - 110 && mouseX < (_canvas.width / 2 + 10) + 95 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10) {
                    // Need to figure out what to do on the submit score screen
                    // self.submitScore("http://www.blackmodulestudio.com/games/katt/update_database.php", self.buildScoresHash(), "POST");
                    self.hardReset();
                    sfx.play(8);
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
        gamepadX = false;
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
                if(gamepad.axes[0] < -joystickThreshold || gamepad.buttons[14].pressed) { gamepadLeft = true; } // Left
                if(gamepad.axes[0] > joystickThreshold || gamepad.buttons[15].pressed) { gamepadRight = true; } // Right
                if(gamepad.axes[1] < -joystickThreshold || gamepad.buttons[12].pressed) { gamepadUp = true; } // Up
                if(gamepad.axes[1] > joystickThreshold || gamepad.buttons[13].pressed) { gamepadDown = true; } // Down
                if(gamepad.buttons[0].pressed || leftTriggerPressed || rightTriggerPressed) { gamepadA = true; } // A and Triggers
                if(gamepad.buttons[1].pressed || gamepad.buttons[4].pressed || gamepad.buttons[5].pressed) { gamepadB = true; } // B and Bumbers
                if(gamepad.buttons[9].pressed) { gamepadStart = true; } // Start
                if(gamepad.buttons[2].pressed) { gamepadX = true; } // Start
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

            if(gamepadX) // X / V(on keyboard)
            {if(Keys[20] == 0){Keys[20] = 1;}else if(Keys[20] == 1 || Keys[20] == 2){Keys[20] = 2;}}else if(!gamepadX){if(Keys[20] == 1 || Keys[20] == 2){Keys[20] = 0;}}
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

            if(keysDown[86] == true) // V
            {if(Keys[20] == 0){Keys[20] = 1;}else if(Keys[20] == 1 || Keys[20] == 2){Keys[20] = 2;}}else if(keysDown[86] == false){if(Keys[20] == 1 || Keys[20] == 2){Keys[20] = 0;}}
        }
    }
    
    this.getInput = function()
    {
        // Disallow Any Input
        if(gco.transition.active || gco.credits.active) { return; }

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

            if(Keys[14] == 1) {
                player.invicibility = !player.invicibility;
            }

			if(Keys[5] == 1 && gameState == 1) {
				if(playerInfo) {
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
                    } else {
                        player.isPewing = false;
                    }
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

        // Planet Level Background Context
        if(planetLevel.isEnabled()) {
            planetLevel.renderPlanet();
        }
        
        
        if(gameState == 1 && !gco.Ended()) {
            //Money
            self.drawMoney();
            
            //Random Items
            self.drawItems();

            //Player Trails
            self.drawPlayerTrails();

            //Enemies
            self.drawEnemies();

            // Player
            if(player.isAlive()) {
                player.drawPlayer();
                if(player.hasShield && player.shield > 0) {
                    self.drawShield();
                }
            }
            
            // Missile
            self.drawMissiles();
            
            // Explosion
            self.drawExplosions();
            
            // GUI
            self.drawHUD();
        }

        // Foreground
        foregroundGeneration.Draw();

        // Planet level foreground context
        if(planetLevel.isEnabled()) {
            planetLevel.renderGradient();
        }
        
        // GUI
        self.drawGUI();
        ed.Draw();
        gco.Draw();

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
        for(var i = 0; i < enemies.length; i++) {
            if ('Draw' in enemies[i]) {
                enemies[i].Draw();
            } else {
                buffer.drawImage(enemyImages[enemies[i].Model], enemies[i].x - (enemies[i].width / 2), enemies[i].y - (enemies[i].height / 2), enemies[i].width, enemies[i].height);
                if(enemies[i].isBoss) {
                    self.drawBossLifeMeter(enemies[i]);
                }
                if(enemies[i].laser == true){ drawLaser = true; x = enemies[i].laserX; y = enemies[i].laserY; h = enemies[i].laserHeight; w = enemies[i].laserWidth; }
            }
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

    this.drawPlayerTrails = function()
    {
        for(var i = 0; i < playerTrails.length; i++) {
            playerTrails[i].Draw();
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
    
    this.drawMissiles = function() {
        for(var i = 0; i < missiles.length; i++)
        {
            switch(missiles[i].missileType)
            {
                case 0: case 1: case 2: case 3: { // Primary Assult Ultra
                    buffer.drawImage(missileImages[player.damageLevel], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
                    break;
                }
                case 100: case 101: case 102: case 103: case 104: {
                    buffer.drawImage(itemImages[4], missiles[i].x - (missiles[i].width / 2), missiles[i].y - (missiles[i].height / 2), missiles[i].width, missiles[i].height);
                    break;
                }
            }
        }
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
        self.drawLifeMeter();
        self.drawShieldMeter();
        self.drawBoostMeter();
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

    this.drawBoostMeter = function()
    {
        var width = 100;
        var height = 15;
        var x1 = 0;
        var y1 = _buffer.height - 75;
        var x2 = width;
        var y2 = y1 + height;

        buffer.beginPath();
            buffer.fillStyle = "rgba(153, 76, 0, 0.5)";
            buffer.fillRect(x1, y1, width, height);
        buffer.closePath();
        
        var grd = buffer.createLinearGradient(x1, y1, x2, y2);
        grd.addColorStop(0, "rgb(153, 76, 0)");
        grd.addColorStop(1, "rgb(255, 178, 102)");
		buffer.beginPath();
            buffer.fillStyle = grd;
            buffer.fillRect(x1, y1, (player.boost / player.maxBoost) * width, height);
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
            case 0: {// Main Menu
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
            case 1: {// Pause Menu
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
            case 2: {// Upgrade Menu
                //**********************************************************************//
                //						UPGRADE MENU SECTION							//
                //**********************************************************************//

                //Static Text
                guiText[0] = new GUIText("Primary Fire", 10, _canvas.height / 2 - 50, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[1] = new GUIText("Laser", 10, 420, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[2] = new GUIText("Cores: " + player.money, _canvas.width - 100, _canvas.height - 53, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[3] = new GUIText("Extra Items", _canvas.width - 300, 420, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                guiText[4] = new GUIText(gco.levelTitle(), 5, _buffer.height / 2 - 76, "20px VT323", "left", "top", "rgb(230, 230, 255)");
                
                if(menu.states[2][1][2] || (mouseX > (_canvas.width - 210) && mouseX < (_canvas.width - 10) && mouseY < (278) && mouseY > (250))) { // Start Level
                    guiText[5] = new GUIText("Start Level", _canvas.width - 110, 250, "28px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
                    menu.DrawArrow(3, _canvas.width - 225, 262);
                } else {
                    guiText[5] = new GUIText("Start Level", _canvas.width - 110, 250, "28px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }

                // Bottom text tooltip initialization
                guiText[6] = new GUIText("", _canvas.width / 2, _canvas.height - 53, "18px VT323", "center", "top", "rgb(230, 230, 255)");
                guiText[7] = new GUIText("", _canvas.width / 2, _canvas.height - 33, "14px VT323", "center", "top", "rgb(230, 230, 255)");
                guiText[8] = new GUIText("", _canvas.width / 2, _canvas.height - 33, "14px VT323", "center", "top", "rgb(230, 230, 255)");

                // GUI Icons
                // NEW WEAPON Primary Assult
                if(menu.states[2][1][0] || (mouseX > 10 && mouseX < 58 && mouseY > 280 && mouseY < 328)) { // Primary Assult, Weapon ID: 0
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(wepImages[player.weapon], 10, 280, 48, 48);    
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 34, 336);
                    let wepNames = ["Primary Assult", "Rapid Fire Assult", "Cone Assult", "Rapid Fire Cyclone", "Ultimate Cyclone Assult"];	
                    guiText[6].text = wepNames[player.weapon];
                    if(player.weapon == 4) {
                        guiText[7].text = "Primary Fully Upgraded";
                    } else {
                        if(player.money >= gco.weaponPrice[player.weapon + 1]) {
                            guiText[7].text = "Select to Upgrade";
                        } else {
                            guiText[7].text = gco.weaponPrice[player.weapon + 1] + " Cores";
                        }
                    }
                }
                buffer.shadowBlur = 1;
                buffer.shadowColor = 'rgb(0, 173, 239)';
                buffer.drawImage(wepImages[player.weapon], 10, 280, 48, 48);
                buffer.shadowBlur = 0;
                //END WEAPON

                // DAMAGE UPGRADE Primary Fire
                if(menu.states[2][1][1] || (mouseX > 60 && mouseX < 108 && mouseY > 280 && mouseY < 328)) {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(dmgImages[player.damageLevel], 60, 280, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 84, 336);
                    guiText[6].text = "Damage Upgrade";

                    if(player.damageLevel == 4) {
                        guiText[7].text = "Maximum Damage";
                    } else {
                        if(player.money >= gco.damagePrice[player.damageLevel + 1]) {
                            guiText[7].text = "Select to Increase Damage";
                        } else {
                            guiText[7].text = gco.damagePrice[player.damageLevel + 1] + " Cores";
                        }
                    }
                }
                buffer.shadowBlur = 1;
                buffer.shadowColor = 'rgb(0, 150, 250)';
                buffer.drawImage(dmgImages[player.damageLevel], 60, 280, 48, 48);
                buffer.shadowBlur = 0;
                //END WEAPON

                // NEW WEAPON Laser
                if(menu.states[2][2][0] || (mouseX > 10 && mouseX < 58 && mouseY > 448 && mouseY < 496)) {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(lasImages[player.laser.level], 10, 448, 48, 48);    
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 34, 504);
                    let lasNames = ["Laser 1", "Laser 2", "Laser 3", "Laser 4", "Laser 5"];	
                    guiText[6].text = lasNames[player.laser.level];
                    if(player.laser.level == 4) {
                        guiText[7].text = "Laser Fully Upgraded";
                    } else {
                        if(player.money >= gco.laserPrice[player.laser.level + 1]) {
                            guiText[7].text = "Select to Upgrade";
                        } else {
                            guiText[7].text = gco.laserPrice[player.laser.level + 1] + " Cores";
                        }
                    }
                }
                buffer.shadowBlur = 1;
                buffer.shadowColor = 'rgb(0, 173, 239)';
                buffer.drawImage(lasImages[player.laser.level], 10, 448, 48, 48);
                buffer.shadowBlur = 0;
                //END WEAPON

                // LASER DAMAGE UPGRADE Primary Fire
                if(menu.states[2][2][1] || (mouseX > 60 && mouseX < 108 && mouseY > 448 && mouseY < 496)) {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(lasdmgImages[player.laser.damageLevel], 60, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, 84, 504);
                    guiText[6].text = "Damage Upgrade";

                    if(player.laser.damageLevel == 4) {
                        guiText[7].text = "Maximum Damage";
                    } else {
                        if(player.money >= gco.laserDamagePrice[player.laser.damageLevel + 1]) {
                            guiText[7].text = "Select to Increase Damage";
                        } else {
                            guiText[7].text = gco.laserDamagePrice[player.laser.damageLevel + 1] + " Cores";
                        }
                    }
                }
                buffer.shadowBlur = 1;
                buffer.shadowColor = 'rgb(0, 150, 250)';
                buffer.drawImage(lasdmgImages[player.laser.damageLevel], 60, 448, 48, 48);
                buffer.shadowBlur = 0;
                //END WEAPON
                
                // NEW POWERUP Shield
                if(menu.states[2][2][2] || (mouseX > _canvas.width - 300 && mouseX < _canvas.width - 252 && mouseY > 448 && mouseY < 496)) { // Shield
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
                    buffer.shadowBlur = 0;
                    menu.DrawArrow(0, _canvas.width - 276, 504);
                    guiText[6].text = "Shield"
                    guiText[6].y = _canvas.height - 65
                    guiText[6].fontStyle = "20px VT323"
                    if(player.hasShield) {
                        guiText[8] = new GUIText("Upgrade: " + (player.shieldLevel + 1) * 250 + " Cores", _canvas.width / 2, _canvas.height - 23, "14px VT323", "center", "top", "rgb(230, 230, 255)");
                        guiText[7].text = "Level: " + player.shieldLevel
                        guiText[7].y = _canvas.height - 43
                    } else {
                        guiText[8] = new GUIText("250 Cores", _canvas.width / 2, _canvas.height - 33, "14px VT323", "center", "top", "rgb(230, 230, 255)");
                    }
                }
                if(player.hasShield) {
                    buffer.shadowBlur = 1;
                    buffer.shadowColor = 'rgb(0, 173, 239)';
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
                    buffer.shadowBlur = 0;
                } else {
                    buffer.globalAlpha = 0.5;
                    buffer.drawImage(images[4], _canvas.width - 300, 448, 48, 48);
                    buffer.globalAlpha = 1.0;
                }
                //END WEAPON

                // Options Menu Selection
                if(menu.states[2][0][0] || (mouseX > (_canvas.width - 248) && mouseX < (_canvas.width - 147) && mouseY < (48) && mouseY > (20))) { // Options Menu
                    guiText[9] = new GUIText("Options", _canvas.width - 200, 20, "20px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
                    menu.DrawArrow(3, _canvas.width - 263, 28);
                } else {
                    guiText[9] = new GUIText("Options", _canvas.width - 200, 20, "20px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }

                // Quit game
                if(menu.states[2][0][1] || (mouseX > (_canvas.width - 86) && mouseX < (_canvas.width - 30) && mouseY < (48) && mouseY > (20))) { // Quit
                    guiText[10] = new GUIText("Quit", _canvas.width - 60, 20, "20px Thunderstrike", "center", "top", "rgb(96, 255, 96)");
                    menu.DrawArrow(3, _canvas.width - 100, 28);
                } else {
                    guiText[10] = new GUIText("Quit", _canvas.width - 60, 20, "20px Thunderstrike", "center", "top", "rgb(96, 150, 96)");
                }
                guiText[11] = new GUIText("Score: " + score, 10, _canvas.height - 53, "18px VT323", "left", "top", "rgb(230, 230, 255)");

            //**********************************************************************//
            //					  END UPGRADE MENU SECTION							//
            //**********************************************************************//
                break;
            }
            case 3: {// Continue Menu
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
            case 4: {// Level Up Menu
                guiText[0] = new GUIText("Level Up!", _canvas.width / 2, _canvas.height / 2 - 150, "44px Thunderstrike Halftone", "center", "top", "rgb(255, 0, 0)");
                guiText[1] = new GUIText("Now on " + gco.levelTitle(), _canvas.width / 2, _canvas.height / 2 - 100, "28px VT323", "center", "top", "rgb(255, 0, 0)");						 
                if(menu.states[4][0] || (mouseX > (_canvas.width / 2 + 10) - 75 && mouseX < (_canvas.width / 2 + 10) + 60 && mouseY < (_canvas.height / 2 + 10) + 20 && mouseY > (_canvas.height / 2 + 10) - 10)) {
                    if(menu.states[4][0]) menu.DrawArrow(3, _canvas.width / 2 - 65, _canvas.height / 2 + 15);
                    guiText[2] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(210, 210, 210)");
                } else {
                    guiText[2] = new GUIText("Continue", _canvas.width / 2, _canvas.height / 2, "28px VT323", "center", "top", "rgb(255, 255, 255)");
                }
                break;
            }
            case 5: {// Game Over Menu
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
            case 6: { // Options Menu
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
            case 7: { // Score Menu
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

        // Draw the menu from guiText cache
        buffer.beginPath();
        for(var i = 0; i < guiText.length; i++) {
            buffer.fillStyle = guiText[i].color;
            buffer.font = guiText[i].fontStyle;
            buffer.textAlign = guiText[i].alignX;
            buffer.textBaseline = guiText[i].alignY;
            buffer.fillText(guiText[i].text, guiText[i].x, guiText[i].y);
        }
        buffer.closePath();
        delete guiText;

        // Stateless Menu Items
        if(!gco.win) {
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
            if(playerInfo) {
                guiText[0] = new GUIText(player.hasShield ? "Shield: " + Math.floor(player.shield) : "" , 105, _canvas.height - 53, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                guiText[1] = new GUIText("Hull: " + player.life, 105, _canvas.height - 28, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                guiText[2] = new GUIText("Destroyed: " + destroys, _canvas.width / 2, _canvas.height - 32, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                guiText[3] = new GUIText("Cores: " + player.money, _canvas.width / 2, _canvas.height - 53, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                guiText[4] = new GUIText("Score: " + score, _canvas.width - 100, 20, "12px VT323", "left", "top", "rgb(96, 255, 96)");
                guiText[5] = new GUIText("Boost: " + Math.round(player.boost), 105, _canvas.height - 77, "18px VT323", "left", "top", "rgb(96, 255, 96)");
            } else {
                if(gameState == 1) {
                    guiText[0] = new GUIText("[E] Ship Info", 105, _canvas.height - 28, "18px VT323", "left", "top", "rgb(96, 255, 96)");
                }
            }
            buffer.beginPath();
                for(var i = 0; i < guiText.length; i++) {
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
        if(tickTime >= 0.05) {  // Ensure each tick is exactly 50 ms
            ticks++;
            tickTime -= 0.05;   // Subtract the tick duration from tickTime, carrying over any excess
        
            if(ticks >= 20) {
                FPS = calcFPS;
                calcFPS = 0;
                tickTime -= 0.05;  // Continue to carry over excess to start the next cycle cleanly
                if (tickTime < 0) { tickTime = 0; } // Prevent tickTime from going negative
                ticks = 0;
                seconds++;
            }
        }

        self.Update();
        self.Draw();	
    }
    /******************************************************/
}