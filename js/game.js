var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    game.load.spritesheet('tileset', 'assets/tileset.png', 32, 32);
}

// Constants
var WORLD_SIZE = 16;
var PLAYER_SPEED = 200;
var PLAYER_ROT = 100;

// Variables
var world;
var player;
var cursors;

function create() {

    game.stage.backgroundColor = '#639bff';

    // World
    createWorld();

    // Player
    createPlayer();

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

}

//----------------------------------CREATION----------------------------------\\
function createWorld() {
  world = game.add.group();

  var tile;

  for (var i = 0; i < WORLD_SIZE; i++) {
    for (var j = 0; j < WORLD_SIZE; j++) {
      tile = world.create((game.world.centerX - (32*WORLD_SIZE/2)) + i*32, (game.world.centerY - (32*WORLD_SIZE/2)) + j*32, 'tileset');
      tile.frame = 1;
    }
  }
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
