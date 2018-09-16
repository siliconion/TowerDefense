// initial constants
const canvas_width = 500;
const grid_number = 10;
const grid_width = canvas_width / grid_number;

const mob_init_hp = 100;
const mob_init_position_x = 0;
const mob_init_position_y = canvas_width / 2 - grid_width / 2;
const mob_size = 10;
const mob_speed = 1;
const mob_damage = 10;
const mob_worth = 2;

const start_gold = 200;
const start_hp = 100;
const tower_damage = 100;
const tower_range = grid_width * 2;
const tower_cooldown = 1000;
const tower_cost = 40;



//helpers
function calculateXYPixels(x, y) {
    const xPosition = x * grid_width;
    const yPosition = y * grid_width;
    return {xPosition, yPosition, xPixel: grid_width, yPixel: grid_width};
}
function calculateCoordinate(offsetX, offsetY) {
    const x = Math.floor(offsetX / grid_width);
    const y = Math.floor(offsetY / grid_width);
    return {x, y};
}
const debounceChangeColorOnHover = debounce(10, changeColorOnHover);

function debounce(milliseconds, context) {
    const originalFunction = context;
    const wait = milliseconds;
    let timer = null;
    return function () {
        const self = context || this;
        const args = arguments;

        function complete() {
            originalFunction.apply(context, args);
            timer = null;
        }

        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(complete, wait);
    };
}

// global variables
let gameState = {
    gold: start_gold,
    hp: start_hp,
    level: 0,
    mobs: [],
    grid: Grid(),
    spawnMob: true
};

window.onload = () => {
    addEventListeners();
    game.start();
};

let myGameArea = {
    canvas: document.createElement("canvas"),
    gold: document.getElementById("gold"),
    hp: document.getElementById("hp"),
    level: document.getElementById("level"),
    start: function () {
        this.canvas.width = canvas_width;
        this.canvas.height = canvas_width;
        this.context = this.canvas.getContext("2d");
        document.getElementById("game").appendChild(this.canvas);
        this.interval = setInterval(game.runGame, 1000 / 60);
        this.gold.innerText = gameState.gold;
        this.hp.innerText = gameState.hp;
        this.level.innerText = gameState.level;
        console.log(gameState.level)

        
        
    },
    clear: function () {
        this.context.clearRect(0, 0, canvas_width, canvas_width);
    }
};

let game = {
    start: function () {
        // initialize board
        gameState = {
            gold: start_gold,
            hp: start_hp,
            level: 0,
            mobs: [],
            grid: Grid(),
            spawnMob: true
        };
        myGameArea.start();

    },
    spawn: function () {
        // if spawnMob is true, make new mobs.
        if (gameState.spawnMob) {
            let new_mob = new Mob();
            gameState.mobs.push(new_mob);
            gameState.level += 1;
            myGameArea.level.innerText = Math.floor((gameState.level)/10);


            gameState.spawnMob = false;
            console.log(gameState.level)
            var spawn_cooldown = 1500 * Math.pow(0.995, gameState.level)
            game.spawn_countdown =
                setTimeout(() => {
                    gameState.spawnMob = true;
                }, spawn_cooldown)
        }
    },
    runGame: function () {
        // debugger;
        if (gameState.hp <= 0) {
            game.stopGame()
        }
        // remove dead mobs
        gameState.mobs = gameState.mobs
            .filter(m => m.hp > 0)
            .filter(m => !m.reach_the_end);

        // Redraw
        myGameArea.clear();
        grid.drawHoverEffect();
        grid.draw();
        grid.towers.forEach(t => t.draw());
        gameState.mobs.forEach(m => {
            m.draw();
        });
        // mob move
        gameState.mobs.forEach(m => m.move());
        // new mob spawn
        game.spawn();

        // towers
        grid.towers.forEach(t => t.attack());
        // check dead mobs
        gameState.mobs.forEach(m=>m.die())
        // build
    },
    spawn_countdown: null
    ,
    stopGame: function () {
        alert("GAME OVER");
        game.start();
        clearInterval(myGameArea.interval);
        clearTimeout(game.spawn_countdown)
    }
}

function placeTower(e) {
    if (gameState.gold < tower_cost) return;
    const xValue = e.offsetX;
    const yValue = e.offsetY;
    const {x, y} = calculateCoordinate(xValue, yValue);
    const xTower = Math.floor(xValue / grid_width) * grid_width + grid_width / 2;
    const yTower = Math.floor(yValue / grid_width) * grid_width + grid_width / 2;
    const uniqueXY = `${x}${y}`;
    !gameState.grid.tower_lookup.includes(uniqueXY)
        ? gameState.grid.tower_lookup.push(uniqueXY)
        : null;
    gameState.grid.towers.push(new Tower(xTower, yTower));
    gameState.gold -= tower_cost;
    myGameArea.gold.innerText = gameState.gold;

    finalizeTower();
}

function fillHoverBlock(x, y) {
    const {xPosition, yPosition, xPixel, yPixel} = calculateXYPixels(x, y);
    myGameArea.context.fillStyle = "#888888";
    myGameArea.context.fillRect(xPosition, yPosition, xPixel, yPixel);
}

function changeColorOnHover(e) {
    const {x, y} = calculateCoordinate(e.offsetX, e.offsetY);
    const uniqueXY = `${x}${y}`;
    gameState.grid.tower_lookup.includes(uniqueXY)
        ? (gameState.grid.hoveredBlock = {x: null, y: null})
        : (gameState.grid.hoveredBlock = {x, y});
}

function setTimeoutResetHover() {
    // reset needs to be in set time out to override debounce setTimeOut
    setTimeout(resetHover, 100);
}

function resetHover() {
    gameState.grid.hoveredBlock = {x: null, y: null};
}

function finalizeTower() {
    // upon "finish building"
    setTimeoutResetHover();

    const canvas = myGameArea.canvas;
    canvas.removeEventListener("click", placeTower);
    canvas.removeEventListener("mouseleave", setTimeoutResetHover);
    canvas.removeEventListener("mousemove", debounceChangeColorOnHover);
    canvas.removeEventListener("mouseover", debounceChangeColorOnHover);

    const button = document.getElementById("build-tower-button");
    button.disabled = false;
}

function addEventListeners() {
    document.getElementById("build-tower-button").addEventListener("click", e => {
        const button = e.target;
        button.disabled = true;
        const canvas = myGameArea.canvas;
        canvas.addEventListener("mouseleave", setTimeoutResetHover);
        canvas.addEventListener("mouseover", debounceChangeColorOnHover);
        canvas.addEventListener("mousemove", debounceChangeColorOnHover);
        canvas.addEventListener("click", placeTower);
    });
}
