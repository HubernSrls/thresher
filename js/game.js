var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    game.load.spritesheet('tileset', 'assets/tileset.png', 32, 32);
}

// Constants
var WORLD_SIZE = 16;
var PLAYER_SPEED = 200;
var PLAYER_ROT = 100;
var ENEMY_SPEED = 150;

// Variables
var world;
var player;
var enemies;
var cursors;

// TEST
var fall;

function create() {

    game.stage.backgroundColor = '#639bff';

    // World
    createWorld();
    randomWheat();
    // Player
    createPlayer();

    // AI
    createAI();
    createEnemy();

    // Enable cursors
    cursors = game.input.keyboard.createCursorKeys();
}

function update() {

  updatePlayer();
  updateAI();

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
        world.forEach(function(item) {
          var itemX = item.position.x;
          var itemY = item.position.y;
          if (playerX >= itemX && playerX <= itemX + 32 && playerY >= itemY && playerY <= itemY + 32) {
            item.frame = 0;
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
          enemy.state = 'state_idle';
        }
        break;

      case 'state_eat':

        if (game.math.distance(enemy.position.x, enemy.position.y, enemy.tileToEat.position.x, enemy.tileToEat.position.y) < 10) {
          enemy.tileToEat.frame = 1;
          enemy.state = 'state_idle';
        }

        break;

      case 'state_attack':

        // Player out of sight
        if (game.math.distance(enemy.position.x, enemy.position.y, player.position.x, player.position.y) > 128) {
          enemy.state = 'state_idle';
        }
        break;

      case 'state_fall':
        break;

    }

    // Attack player
    if (enemy.state !== 'state_fall' && game.math.distance(enemy.position.x, enemy.position.y, player.position.x, player.position.y) < 128) {
      game.physics.arcade.moveToObject(enemy, player, ENEMY_SPEED);
      enemy.state = 'state_attack';
    }

    // Fall
    if (enemy.state !== 'state_fall' && !checkOverlap(enemy, world)) {
      var scale = game.add.tween(enemy.scale).to({ x: 0, y: 0 }, 1000, Phaser.Easing.Linear.None).start();
      var rot = game.add.tween(enemy).to({ rotation: 360*2 }, 1000, Phaser.Easing.Linear.None).start();
      enemy.body.velocity.set(0,0);
      enemy.state = 'state_fall';
      scale.onComplete.add(function() { enemy.kill(); });
    }

    // Rotation
    enemy.rotation = game.physics.arcade.angleToXY(enemy, enemy.position.x + enemy.body.velocity.x, enemy.position.y + enemy.body.velocity.y) + 1.57079633;
  });
}

//------------------------------------UTILS------------------------------------\\
function checkOverlap(spriteA, spriteB) {
  var boundsA = spriteA.getBounds();
  var boundsB = spriteB.getBounds();

  return Phaser.Rectangle.intersects(boundsA, boundsB);
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
}

function createAI() {
    enemies = game.add.group();
    fall = game.input.keyboard.addKey(Phaser.Keyboard.ONE);
    fall.onDown.add(function() {
      enemies.forEachAlive(function(enemy) {
        var scale = game.add.tween(enemy.scale).to({ x: 0, y: 0 }, 1000, Phaser.Easing.Linear.None).start();
        var rot = game.add.tween(enemy).to({ rotation: 360*2 }, 1000, Phaser.Easing.Linear.None).start();
        enemy.body.velocity.set(0,0);
        enemy.state = 'state_fall';
      });
    }, this);
}

function createEnemy() {
  var enemy = enemies.create(200, 200, 'tileset');
  enemy.anchor.set(0.5);
  game.physics.arcade.enable(enemy);
  enemy.animations.add('idle', [5]);
  enemy.animations.add('walk', [6, 7], 8, true);
  enemy.animations.play('idle');
  enemy.state = 'state_idle';
}
