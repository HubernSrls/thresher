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

  if (cursors.up.isDown) {
    player.body.velocity.y = -PLAYER_SPEED;
  } else if (cursors.down.isDown) {
    player.body.velocity.y = PLAYER_SPEED;
  } else {
    player.body.velocity.y = 0;
  }

  if (cursors.left.isDown) {
    player.body.velocity.x = -PLAYER_SPEED;
  } else if (cursors.right.isDown) {
    player.body.velocity.x = PLAYER_SPEED;
  } else {
    player.body.velocity.x = 0;
  }

  if (player.body.velocity.x == 0 && player.body.velocity.y == 0) {
    player.animations.play('idle');
  } else {
    player.animations.play('walk');
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
}
