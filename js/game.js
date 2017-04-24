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
var ENEMY_SPAWN_SPEED = 3;

// Variables
var world;
var player;
var enemies;
var cursors;
var hungry = 100; // 0 (Game Over) - 100 (Full)
var hungryBarFill;
var hungryBarCrop;
var hungryBarFrame;
var score = 0;
var scoreText;
var gameOverText;
var gameState = 'state_game';

function create() {

    game.stage.backgroundColor = '#639bff';
  
    //  Set-up the physics bodies
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // World
    createWorld();
    randomWheat();
    // Player
    createPlayer();

    // AI
    createAI();
    game.time.events.loop(Phaser.Timer.SECOND * ENEMY_SPAWN_SPEED, function() {
      createAI();
    }, this);
    

    // UI
    createUI();

    // Enable cursors
    cursors = game.input.keyboard.createCursorKeys();

    // Hungry bar
    game.time.events.loop(Phaser.Timer.SECOND * HUNGRY_SPEED, function() {
      hungry -= 5;
    }, this);
}

function update() {

  updateUI();
  updatePlayer();
  updateAI();
  
  game.physics.arcade.collide(player, enemies, hitEnemy, null, this);

}

//----------------------------------ENTITIES----------------------------------\\
function updatePlayer() {

  if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
    player.state = "state_spin";
    player.body.velocity.x = 0;
    player.body.velocity.y = 0;

    game.time.events.add(Phaser.Timer.SECOND * 0.5, function() {
      player.state = "state_idle";
    }, this);
  }

  switch (player.state) {
    case "state_idle":
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
      
      if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
        var playerX = player.body.position.x + 16;
        var playerY = player.body.position.y + 16;
        world.forEach(function(tile) {
          var tileX = tile.position.x;
          var tileY = tile.position.y;
          if (playerX >= tileX && playerX <= tileX + 32 && playerY >= tileY && playerY <= tileY + 32) {
            eatTile(tile);
          }
        });
      }

      player.rotation = game.physics.arcade.angleToXY(player, player.position.x + player.body.velocity.x, player.position.y + player.body.velocity.y) + 1.57079633;
      break;
    case "state_spin":
      player.angle += 35;
      break;
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
            if (tile.frame === 0 && game.math.distance(enemy.position.x, enemy.position.y, tile.x, tile.y) < 128) {
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
          enemy.tileToEat.frame = 1;
          enemy.animations.play('idle');
          enemy.state = 'state_idle';
        }

        break;

      case 'state_attack':

        // Player out of sight
        if (game.math.distance(enemy.position.x, enemy.position.y, player.position.x, player.position.y) > 128) {
          enemy.animations.play('idle');
          enemy.state = 'state_idle';
        }
        break;

      case 'state_fall':
        break;

    }

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
      enemy.state = 'state_fall';
      scale.onComplete.add(function() {
        enemy.kill();
        score += 50;
        scoreText.text = "SCORE " + score;
      });
    }

    // Rotation
    enemy.rotation = game.physics.arcade.angleToXY(enemy, enemy.position.x + enemy.body.velocity.x, enemy.position.y + enemy.body.velocity.y) + 1.57079633;
  });
}

function seedTile(tile) {
  tile.frame = 9;
  game.time.events.add(Phaser.Timer.SECOND * GROW_SPEED, function() {
    tile.frame = 0
  }, this);
}

function eatTile(tile) {
  if (tile.frame == 0) {
    tile.frame = 1;
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

function gameOver() {
  game.add.tween(gameOverText).to({ y: game.world.centerY }, 1000, Phaser.Easing.Bounce.Out).start();
  game.time.events.add(Phaser.Timer.SECOND * 3, resetGame);
}

function resetGame() {
  player.kill();
  world.forEachAlive(function(tile) { tile.kill(); });
  enemies.forEachAlive(function(enemy) { enemy.kill(); });

  createWorld();
  createPlayer();
  createAI();
  resetUI();

  hungry = 100;
  score = 0;

  gameState = 'state_game';
}

//-------------------------------------UI-------------------------------------\\
function createUI() {
  hungryBarFrame = game.add.sprite(game.world.centerX - 64, game.height-36, 'hungrybar_frame');
  hungryBarFill = game.add.sprite(game.world.centerX - 64, game.height-36, 'hungrybar_fill');
  hungryBarCrop = new Phaser.Rectangle(0, 0, 0, hungryBarFill.height);
  scoreText = game.add.bitmapText(game.world.centerX, 16, 'font', 'SCORE ' + score , 20);
  scoreText.anchor.set(0.5);
  gameOverText = game.add.bitmapText(game.world.centerX, -100, 'font', 'GAME OVER', 64);
  gameOverText.anchor.set(0.5);
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
    gameOver();
    gameState = 'state_over';
  }
}

//----------------------------------CREATION----------------------------------\\
function createWorld() {
  world = game.add.group();
  world.enableBody = true;
  world.physicsBodyType = Phaser.Physics.ARCADE;

  var tile;

  for (var i = 0; i < WORLD_SIZE; i++) {
    for (var j = 0; j < WORLD_SIZE; j++) {
      tile = world.create((game.world.centerX - (32*WORLD_SIZE/2)) + i*32, (game.world.centerY - (32*WORLD_SIZE/2)) + j*32, 'tileset');
      tile.frame = 1;
      tile.body.immovable = true;
    }
  }

  // Set bounds
  world.leftBound = game.world.centerX - (32*WORLD_SIZE/2);
  world.rightBound = game.world.centerX + (32*WORLD_SIZE/2);
  world.topBound = game.world.centerY - (32*WORLD_SIZE/2);
  world.bottomBound = game.world.centerX + (32*WORLD_SIZE/2);
}

function randomWheat() {
    world.forEachAlive(function(tile) {
      var rnd = game.rnd.integerInRange(0, 100);
      if (rnd > 90) {
        tile.frame = 0;
      }
    });
}

function createPlayer() {
  player = game.add.sprite(100, 100, 'tileset');
  player.anchor.set(0.5);
  game.physics.arcade.enable(player);
  player.animations.add('idle', [2]);
  player.animations.add('walk', [3, 4], 8, true);
  player.animations.play('idle');
  player.state = "state_idle";
  player.body.bounce.set(1);
  
  player.body.onCollide = new Phaser.Signal();
  player.body.onCollide.add(hitEnemy, this)
}

function hitEnemy() {
  console.log("HIT");
  enemies.forEach(function(enemy) {
    enemy.body.velocity.x = -enemy.body.velocity.x * 4;
    enemy.body.velocity.y = -enemy.body.velocity.y * 4;
  });
}

function createAI() {
    enemies = game.add.group();
    createEnemy();
}

function createEnemy() {
  var enemy = enemies.create(200, 200, 'tileset');
  enemy.anchor.set(0.5);
  game.physics.arcade.enable(enemy);
  enemy.animations.add('idle', [5]);
  enemy.animations.add('walk', [6, 7], 8, true);
  enemy.animations.play('idle');
  enemy.state = 'state_idle';
  enemy.body.bounce.set(1);
}
