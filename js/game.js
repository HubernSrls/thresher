var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    game.load.spritesheet('tileset', 'assets/tileset.png', 32, 32);
    game.load.image('hungrybar_fill', 'assets/hungrybar_fill.png', 128, 32);
    game.load.image('hungrybar_frame', 'assets/hungrybar_frame.png', 128, 32);
    game.load.bitmapFont('font', 'assets/font.png', 'assets/font.fnt');
}

// Constants
var WORLD_SIZE = 16;
var PLAYER_SPEED = 200;
var PLAYER_ROT = 100;
var ENEMY_SPEED = 150;
var HUNGRY_SPEED = 1;
var GROW_SPEED = 4;
var ENEMY_SPAWN_SPEED_MIN = 1;
var ENEMY_SPAWN_SPEED_MAX = 4;
var ATTACK_IMPULSE = 1000;
var PLAYER_DRAG = 5000;
var ENEMY_DRAG = 1000;

// Tiles
var TILE_GRASS = 1;
var TILE_DIRT = 9;
var TILE_WHEAT = 0;

// Variables
var world;
var player;
var enemies;
var ui;
var fallingEntities;
var cursors;
var hungry = 100; // 0 (Game Over) - 100 (Full)
var hungryBarFill;
var hungryBarCrop;
var hungryBarFrame;
var score = 0;
var scoreText;
var titleText;
var gameOverText;
var gameState = 'state_menu';

function create() {

    game.stage.backgroundColor = '#639bff';

    //  Set-up the physics bodies
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Falling entities
    fallingEntities = game.add.group();

    // World
    createWorld();
    randomWheat();

    // AI
    createAI();
    game.time.events.add(Phaser.Timer.SECOND * game.rnd.integerInRange(ENEMY_SPAWN_SPEED_MIN, ENEMY_SPAWN_SPEED_MAX), function() {
      createEnemy();
    }, this);

    // UI
    createUI();

    // Start Game
    startGame();

    // Enable cursors
    cursors = game.input.keyboard.createCursorKeys();

    // Hungry bar
    game.time.events.loop(Phaser.Timer.SECOND * HUNGRY_SPEED, function() {
      hungry -= 5;
    }, this);
}

function update() {

  updateUI();

  if (gameState === 'state_game') {
    updatePlayer();
  }

  updateAI();

}

//----------------------------------ENTITIES----------------------------------\\
function updatePlayer() {
console.log(player.body.gravity);
  switch (player.state) {
    case 'state_idle':

      var dir = new Phaser.Point(0, 0);

      if (cursors.up.isDown) {
        dir.y = -PLAYER_SPEED;
      } else if (cursors.down.isDown) {
        dir.y = PLAYER_SPEED;
      } else {
        dir.y = 0;
      }

      if (cursors.left.isDown) {
        dir.x = -PLAYER_SPEED;
      } else if (cursors.right.isDown) {
        dir.x = PLAYER_SPEED;
      } else {
        dir.x = 0;
      }

      dir.normalize();
      dir.x *= PLAYER_SPEED;
      dir.y *= PLAYER_SPEED;

      player.body.velocity = dir;

      if (player.body.velocity.x == 0 && player.body.velocity.y == 0) {
        player.animations.play('idle');
      } else {
        player.animations.play('walk');
      }

      // Seed
      if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
        var playerX = player.body.position.x + 16;
        var playerY = player.body.position.y + 16;
        world.forEach(function(tile) {
          var tileX = tile.position.x;
          var tileY = tile.position.y;
          if (playerX >= tileX && playerX <= tileX + 32 && playerY >= tileY && playerY <= tileY + 32) {
            seedTile(tile);
          }
        });
      }

      // Attack
      if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
        player.state = 'state_spin';

        game.time.events.add(Phaser.Timer.SECOND * 1, function() {
          player.state = 'state_idle';
        }, this);
      }

      // Eat
      game.physics.arcade.overlap(player, world, function(player, tile) { eatTile(tile); }, null, this);

      player.rotation = game.physics.arcade.angleToXY(player, player.position.x + player.body.velocity.x, player.position.y + player.body.velocity.y) + 1.57079633;
      break;

    case 'state_spin':
      player.angle += 35;

      // Contact
      game.physics.arcade.overlap(player, enemies, function(player, enemy) {
        attack(player, enemy);
      }, null, this);
      break;

    case 'state_fall':
      break;

    case 'state_hit':
      if (player.body.velocity.getMagnitude() <= 0) {
        player.state = "state_idle";
      }
      break;

    case 'state_die':
      break;
  }

  // Hit
  if (player.state === 'state_hit') {
    player.body.drag.set(PLAYER_DRAG);
  } else {
    player.body.drag.set(0);
  }

  // Fall
  if (gameState !== 'state_over' && player.state !== 'state_fall' && !checkOverlap(player, world)) {
    var scale = game.add.tween(player.scale).to({ x: 0, y: 0 }, 1000, Phaser.Easing.Linear.None).start();
    var rot = game.add.tween(player).to({ rotation: 360*2 }, 1000, Phaser.Easing.Linear.None).start();
    player.body.velocity.set(0,0);
    player.animations.play('idle');
    fallingEntities.add(player);
    player.body.gravity.set(0, 500);
    player.state = 'state_fall';
    gameState = 'state_over';
    gameOver();
  }
}

function updateAI() {
  enemies.forEachAlive(function(enemy) {

    switch(enemy.state) {

      case 'state_idle':

        // Pick a random point
        var dest = new Phaser.Point(
          game.rnd.integerInRange(game.world.centerX - (32*WORLD_SIZE/2), game.world.centerX + (32*WORLD_SIZE/2)),
          game.rnd.integerInRange(game.world.centerY - (32*WORLD_SIZE/2), game.world.centerY + (32*WORLD_SIZE/2)));

        enemy.dest = dest;

        // Move to dest
        game.physics.arcade.moveToXY(enemy, dest.x, dest.y, ENEMY_SPEED);

        // Change state
        enemy.animations.play('walk');
        enemy.state = 'state_move';

        break;

      case 'state_move':

        // Look for wheat
        world.forEachAlive(function(tile) {
            if (tile.frame === TILE_WHEAT && game.math.distance(enemy.position.x, enemy.position.y, tile.x, tile.y) < 128) {
              game.physics.arcade.moveToXY(enemy, tile.position.x, tile.position.y, ENEMY_SPEED);
              enemy.tileToEat = tile;
              enemy.state = 'state_eat';
              return;
            }
        });

        if (game.math.distance(enemy.position.x, enemy.position.y, enemy.dest.x, enemy.dest.y) < 10) {
          enemy.animations.play('idle');
          enemy.state = 'state_idle';
        }
        break;

      case 'state_eat':

        if (game.math.distance(enemy.position.x, enemy.position.y, enemy.tileToEat.position.x, enemy.tileToEat.position.y) < 10) {
          enemy.tileToEat.frame = TILE_GRASS;
          enemy.animations.play('idle');
          enemy.state = 'state_idle';
        }

        break;

      case 'state_attack':

        // Player out of sight
        if (player.state !== 'state_fall' && game.math.distance(enemy.position.x, enemy.position.y, player.position.x, player.position.y) > 128) {
          enemy.animations.play('idle');
          enemy.state = 'state_idle';
        }

        // Contact
        if (player.state !== 'state_spin' && checkOverlap(enemy, player)) {
          attack(enemy, player);
        }
        break;

      case 'state_fall':
        enemy.body.gravity.set(0, 500);
        break;

      case 'state_hit':
        if (enemy.body.velocity.getMagnitude() <= 0) {
          enemy.state = "state_idle";
        }
        break;

    }

    // Global State
    if (gameState === 'state_game' && enemy.state !== 'state_hit' && enemy.state !== 'state_fall') {
      // Attack player
      if (enemy.state !== 'state_fall' && game.math.distance(enemy.position.x, enemy.position.y, player.position.x, player.position.y) < 128) {
        game.physics.arcade.moveToObject(enemy, player, ENEMY_SPEED);
        enemy.animations.play('walk');
        enemy.state = 'state_attack';
      }

      // Fall
      if (enemy.state !== 'state_fall' && !checkOverlap(enemy, world)) {
        var scale = game.add.tween(enemy.scale).to({ x: 0, y: 0 }, 1000, Phaser.Easing.Linear.None).start();
        var rot = game.add.tween(enemy).to({ rotation: 360*2 }, 1000, Phaser.Easing.Linear.None).start();
        enemy.body.velocity.set(0,0);
        enemy.animations.play('idle');
        enemies.remove(enemy);
        fallingEntities.add(enemy);
        enemy.body.gravity.set(0, 500);
        enemy.state = 'state_fall';
        score += 50;
        scoreText.text = "SCORE " + score;
        scale.onComplete.add(function() {
          enemy.kill();
        });
      }
    }

    // Drag
    if (enemy.state === 'state_hit') {
      enemy.body.drag.set(ENEMY_DRAG);
    } else {
      enemy.body.drag.set(0);
    }

    // Rotation
    enemy.rotation = game.physics.arcade.angleToXY(enemy, enemy.position.x + enemy.body.velocity.x, enemy.position.y + enemy.body.velocity.y) + 1.57079633;
  });
}

function seedTile(tile) {
  if (tile.frame === TILE_GRASS) {
    tile.frame = TILE_DIRT;
    game.time.events.add(Phaser.Timer.SECOND * GROW_SPEED, function() {
      tile.frame = TILE_WHEAT;
    }, this);
  }
}

function eatTile(tile) {
  if (tile.frame === TILE_WHEAT) {
    tile.frame = TILE_GRASS;
    score += 10;
    scoreText.text = "SCORE " + score;
    hungry += 5;
    if (hungry > 100) {
      hungry = 100
    }
  }
}
//------------------------------------UTILS------------------------------------\\
function checkOverlap(spriteA, spriteB) {
  var boundsA = spriteA.getBounds();
  var boundsB = spriteB.getBounds();

  return Phaser.Rectangle.intersects(boundsA, boundsB);
}

function startGame() {
  var tween = game.add.tween(titleText).to({ y: game.world.centerY }, 1000, Phaser.Easing.Bounce.Out).start();
  game.time.events.add(Phaser.Timer.SECOND * 3, function() {
    game.add.tween(titleText).to({ y: -100 }, 1000, Phaser.Easing.Linear.Out).start();
    resetGame();
  });
}

function gameOver() {
  game.add.tween(gameOverText).to({ y: game.world.centerY }, 1000, Phaser.Easing.Bounce.Out).start();
  game.time.events.add(Phaser.Timer.SECOND * 3, resetGame);
}

function resetGame() {

  world.forEachAlive(function(tile) { tile.frame = TILE_GRASS; });
  enemies.forEachAlive(function(enemy) { enemy.kill(); });
  fallingEntities.forEachAlive(function(entity) { entity.kill(); });

  createPlayer();
  resetUI();

  hungry = 100;
  score = 0;

  gameState = 'state_game';
}

function randomPosition() {
  return new Phaser.Point(
    game.rnd.integerInRange(world.leftBound, world.rightBound),
    game.rnd.integerInRange(world.topBound, world.bottomBound));
}

//-------------------------------------UI-------------------------------------\\
function createUI() {
  if (!ui) {
    ui = game.add.group();
  }

  hungryBarFrame = game.add.sprite(game.world.centerX - 64, game.height-36, 'hungrybar_frame');
  hungryBarFill = game.add.sprite(game.world.centerX - 64, game.height-36, 'hungrybar_fill');
  hungryBarCrop = new Phaser.Rectangle(0, 0, 0, hungryBarFill.height);
  scoreText = game.add.bitmapText(game.world.centerX, 16, 'font', 'SCORE ' + score , 20);
  scoreText.anchor.set(0.5);
  gameOverText = game.add.bitmapText(game.world.centerX, -100, 'font', 'GAME OVER', 64);
  gameOverText.anchor.set(0.5);
  titleText = game.add.bitmapText(game.world.centerX, -100, 'font', 'THE THRESHER', 64);
  titleText.anchor.set(0.5);
  ui.addChild(titleText);
}

function resetUI() {
  hungryBarFrame.kill();
  hungryBarFill.kill();
  scoreText.kill();
  gameOverText.kill();
  createUI();
}

function updateUI() {
  var level = (hungry/100) * 128;
  hungryBarCrop.width = (hungry/100) * 128;
  hungryBarFill.crop(hungryBarCrop);

  if (level <= 0 && gameState != 'state_over') {
    game.add.tween(player).to({ alpha: 0 }, 1000, Phaser.Easing.Linear.None).start();
    player.state = 'state_die';
    gameOver();
    gameState = 'state_over';
  }
}

//----------------------------------CREATION----------------------------------\\
function createWorld() {

  if (!world) {
    world = game.add.group();
  }

  world.enableBody = true;
  world.physicsBodyType = Phaser.Physics.ARCADE;

  var tile;

  for (var i = 0; i < WORLD_SIZE; i++) {
    for (var j = 0; j < WORLD_SIZE; j++) {
      tile = world.create((game.world.centerX - (32*WORLD_SIZE/2)) + i*32, (game.world.centerY - (32*WORLD_SIZE/2)) + j*32, 'tileset');
      tile.frame = TILE_GRASS;
      tile.body.immovable = true;
    }
  }

  // Set bounds
  world.leftBound = game.world.centerX - (32*WORLD_SIZE/2);
  world.rightBound = game.world.centerX + (32*WORLD_SIZE/2);
  world.topBound = game.world.centerY - (32*WORLD_SIZE/2);
  world.bottomBound = game.world.centerY + (32*WORLD_SIZE/2);
}

function randomWheat() {
    world.forEachAlive(function(tile) {
      var rnd = game.rnd.integerInRange(0, 100);
      if (rnd > 90) {
        tile.frame = TILE_WHEAT;
      }
    });
}

function createPlayer() {
  var rndPos = randomPosition();

  if (player) { player.kill(); }
  player = game.add.sprite(rndPos.x, rndPos.y, 'tileset');

  player.anchor.set(0.5);
  game.physics.arcade.enable(player);
  player.animations.add('idle', [2]);
  player.animations.add('walk', [3, 4], 8, true);
  player.animations.play('idle');
  player.scale.set(1,1);
  player.state = 'state_idle';
}

function attack(attacker, attacked) {
  var dir = new Phaser.Point();
  dir.set(attacked.position.x-attacker.position.x, attacked.position.y-attacker.position.y);
  dir.normalize();
  attacked.body.velocity.set(dir.x*ATTACK_IMPULSE,dir.y*ATTACK_IMPULSE);
  attacker.state = 'state_idle';
  attacked.state = 'state_hit';
}

function createAI() {
  if (!enemies) {
    enemies = game.add.group();
  }
}

function createEnemy() {
  var rndPos = randomPosition();

  var enemy = enemies.create(rndPos.x, rndPos.y, 'tileset');
  enemy.anchor.set(0.5);
  game.physics.arcade.enable(enemy);
  enemy.animations.add('idle', [5]);
  enemy.animations.add('walk', [6, 7], 8, true);
  enemy.animations.play('idle');
  enemy.state = 'state_idle';

  // New enemy
  game.time.events.add(Phaser.Timer.SECOND * game.rnd.integerInRange(ENEMY_SPAWN_SPEED_MIN, ENEMY_SPAWN_SPEED_MAX), function() {
    createEnemy();
  }, this);
}
