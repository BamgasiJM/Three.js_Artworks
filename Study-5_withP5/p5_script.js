let ang = [];
let num = 200;

function setup() {
  createCanvas(windowWidth, 500);
  angleMode(DEGREES);

  for (let i = 0; i < num; i++) {
    //ang[i] = random(360);
    ang.push(random(360));
  }
}

function draw() {
  background(5, 181, 187, 20);

  for (let i = 0; i < num; i++) {
    push();
    translate(width / 2, height / 2);
    rotate(ang[i]);
    fill(0, 50);
    noStroke();
    ellipse(i * 10, 0, 5);
    pop();
    ang[i] += calVelocity(i);
  }
}

function calVelocity(i) {
  let val = map(i, 0, num, 0.7, 1.5);
  return val;
}
