var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    game.load.image('star', 'assets/star.png');
}

function create() {
    game.add.sprite(0, 15, 'star');
}

function update() {
    
}