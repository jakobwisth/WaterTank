
let slider;
let upperWaterPercent = 0.5; // percentage of tank filled (0 to 1)
let lowerWaterPercent = 0.0;
let filling = false;
let draining = false;
let leaking = false;
let droplets = [];
let pauseSim = false;
let canvas;

function setup() {
  const { canvasWidth, canvasHeight } = getCanvasSize();
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-container");

  slider = select('#water-slider');
  slider.input(() => {
    let tankSize = min(width, height) * 0.25;
    upperWaterPercent = constrain(slider.value() / tankSize, 0, 1);
  });

  select('#fill-btn').mousePressed(() => {
    filling = true;
    draining = false;
  });

  select('#drain-btn').mousePressed(() => {
    draining = true;
    filling = false;
  });

  select('#pause-btn').mousePressed(() => {
    pauseSim = !pauseSim;
    leaking = false;
  });
}

function drawLeak(xBase, yBase) {
  if (frameCount % 5 === 0) {
    droplets.push({ x: random(xBase, xBase + 200), y: yBase, speed: random(1, 3), duration: 0 });
  }

  for (let i = droplets.length - 1; i >= 0; i--) {
    let d = droplets[i];
    fill(100, 100, 255, 180);
    noStroke();
    ellipse(d.x, d.y, 5, 8);
    d.y += d.duration < 6 ? -d.speed : d.speed;
    d.x += d.x > 225 ? d.speed / 2 : -d.speed / 2;
    d.duration++;
    if (d.y > height) droplets.splice(i, 1);
  }
}

function draw() {
  background(220);

  let x_upperTank = width * 0.15;
  let y_upperTank = height * 0.15;
  let tankSize = min(width, height) * 0.25;
  let tankGap = height * 0.05;
  let connectorWidth = tankSize * 0.05;

  let upperWaterLevel = upperWaterPercent * tankSize;
  let lowerWaterLevel = lowerWaterPercent * tankSize;

  // Draw tanks
  fill(255); stroke(0);
  rect(x_upperTank, y_upperTank, tankSize, tankSize);
  rect(x_upperTank, y_upperTank + tankSize + tankGap, tankSize, tankSize);
  rect(x_upperTank + tankSize / 2 - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap);

  // Simulation logic
  if (!pauseSim) {
    if (filling && upperWaterPercent < 1) upperWaterPercent += 0.005;
    if (upperWaterPercent > 0) upperWaterPercent -= 0.0025;
    if (lowerWaterPercent > 0) lowerWaterPercent -= 0.00125;
    if (upperWaterPercent > 0 && lowerWaterPercent < 1) lowerWaterPercent += 0.0025;
    leaking = filling && upperWaterPercent >= 1;
    if (!leaking) droplets = [];
  }

  // Update slider and controls positions
  resizeControls(x_upperTank, y_upperTank, tankSize, tankGap);

  slider.value(upperWaterPercent * tankSize);

  // Draw water
  fill(0, 0, 255); noStroke();
  rect(x_upperTank, y_upperTank + tankSize - upperWaterLevel, tankSize, upperWaterLevel);
  if (upperWaterLevel > 0) {
    rect(x_upperTank + tankSize / 2 - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap);
  }
  rect(x_upperTank, y_upperTank + tankSize + tankGap + tankSize - lowerWaterLevel, tankSize, lowerWaterLevel);

  if (leaking && !pauseSim) drawLeak(x_upperTank, y_upperTank);
}

function resizeControls(x, y, size, gap) {
  let canvasBounds = canvas.elt.getBoundingClientRect();
let pointerOffset = 18;
  let sliderX = canvasBounds.left + x + size / 2 + size/30;
  let sliderY = canvasBounds.top + y + size / 2;
  slider.position(sliderX, sliderY);
  slider.style('width', (size + pointerOffset) + 'px');
  slider.attribute('max', size);
  slider.attribute('min', 0);

  let controlsX = canvasBounds.left + x;
  let controlsY = canvasBounds.top + y + 2 * size + gap + 50;
  select('#controls').position(controlsX, controlsY);
}

function windowResized() {
  const { canvasWidth, canvasHeight } = getCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function getCanvasSize() {
  const padding = 40;
  const aspectRatio = 16 / 9;
  const maxWidth = windowWidth - padding;
  const maxHeight = windowHeight - padding;
  let canvasWidth = maxWidth;
  let canvasHeight = canvasWidth / aspectRatio;
  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight;
    canvasWidth = canvasHeight * aspectRatio;
  }
  return { canvasWidth, canvasHeight };
}
