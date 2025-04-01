
let sliderTop;
let upperWaterPercent = 0.5; // percentage of tank filled (0 to 1)
let lowerWaterPercent = 0.0;
let padding = 20;
let filling = false;
let draining = false;
let leaking = false;
let droplets = [];
let pauseSim = false;
let clog = true;
let canvas;
let slidertop;
let speedup = 1;

let graphDuration = 15; // seconds
let upperLevelHistory = [];
let lowerWaterHistory = [];
let simTime = 0;         // seconds
let lastFrameTime = 0;   // for calculating delta


function setup() {
  let { canvasWidth, canvasHeight } = getCanvasSize();
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.position(0,0)
  canvas.parent("canvas-container");
  lastFrameTime = millis() / 1000;

  clickables();
  

  drainBtn.style('background', 'green');
  clogBtn.style('background', 'green');
  controlBtn.style('background', 'brown');
  
}
function draw() {

  background(220);
  textAlign(LEFT, TOP);
  text(`Canvas: ${width} x ${height}`, 10, 10);

  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  text(`FPS: ${nf(frameRate(), 2, 1)}`, 10, 30);

  
  let currentTime = millis() / 1000;
  let deltaTime = currentTime - lastFrameTime;

if(!pauseSim){
  simTime += deltaTime;

  upperLevelHistory.push({ t: simTime, value: upperWaterPercent * 100 });
  lowerWaterHistory.push({ t :simTime, value: lowerWaterPercent * 100 });

}
lastFrameTime = currentTime;
  drawLineGraph();


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

  //Water Logic
  let upperOutflow = 0.00125;
  let lowerOutflow = 0.00125;
  let upperInflow = 0.0025;
  let lowerInflow = upperOutflow;

  if(clog) lowerOutflow = 0;

  if (!pauseSim) {
    if(filling){
      upperWaterPercent += upperInflow;
    }
    if (upperWaterPercent > 0) {
      upperWaterPercent -= upperOutflow;
      lowerWaterPercent += lowerInflow;
    }
    if(lowerWaterPercent > 0){
      lowerWaterPercent -= lowerOutflow;
    }
    if(lowerWaterPercent > 1) lowerWaterPercent = 1;
    if(upperWaterPercent > 1) upperWaterPercent = 1;

  }

  // Update slider and controls positions
  resizeControls(x_upperTank, y_upperTank, tankSize, tankGap);

  sliderTop.value(upperWaterPercent * tankSize);
  sliderBot.value(lowerWaterPercent * tankSize);

  // Draw water
  fill(0, 0, 255); noStroke();
  rect(x_upperTank, y_upperTank + tankSize - upperWaterLevel, tankSize, upperWaterLevel);
  if (upperWaterLevel > 0) {
    rect(x_upperTank + tankSize / 2 - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap);
    rect(x_upperTank + tankSize / 2 - connectorWidth/4, y_upperTank + tankSize, connectorWidth/2, tankSize + tankGap);
  }
  rect(x_upperTank, y_upperTank + tankSize + tankGap + tankSize - lowerWaterLevel, tankSize, lowerWaterLevel);

  if (leaking && !pauseSim) drawLeak(x_upperTank, y_upperTank);


  
}

function resizeControls(x, y, size, gap) {
  let pointerOffset = 18;
  let sliderX = x + padding + size/2;
  let sliderY = y + padding + size/2 -3;
  let botSliderX = sliderX;
  let botSliderY = sliderY + size + gap;

  sliderTop.position(sliderX, sliderY);
  sliderTop.style('width', (size + pointerOffset) + 'px');
  sliderTop.attribute('max', size);
  sliderTop.attribute('min', 0);

  sliderBot.position(botSliderX, botSliderY);
  sliderBot.style('width', (size + pointerOffset) + 'px');
  sliderBot.attribute('max', size);
  sliderBot.attribute('min', 0);

  let controlsX = botSliderX - size;
  let controlsY = botSliderY + size;
  buttons.position(controlsX, controlsY);

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

function drawLineGraph() {

  //placement and size of graph
  const graphWidth = width * 0.3;
  const graphHeight = height * 0.3;
  const graphX = width - graphWidth - padding;
  const graphY = padding;

  // simulation time
  const now = simTime;
  const minTime = Math.max(0, now - graphDuration);
  const maxTime = minTime + graphDuration;

  // draw background
  stroke(0);
  fill(255);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight);

  // ---Drawing grids---
  // Y-axis
  stroke(220);
  for (let yVal = 0; yVal <= 100; yVal += 20) {
    let y = map(yVal, 0, 100, graphY + graphHeight, graphY);
    line(graphX, y, graphX + graphWidth, y);
    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    text(`${yVal}%`, graphX - 5, y);
    stroke(220);
  }
  // X-axis
  stroke(220);
  const xStep = 5;
  for (let sec = Math.ceil(minTime / xStep) * xStep; sec <= maxTime; sec += xStep) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    line(x, graphY, x, graphY + graphHeight);
    noStroke();
    fill(80);
    textAlign(CENTER, TOP);
    text(`${nf(sec, 2, 1)}s`, x, graphY + graphHeight + 5);
    stroke(220);
  }
  // Ticks on x axis
  stroke(100);
  strokeWeight(1);
  for (let sec = Math.ceil(minTime); sec <= maxTime; sec++) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    line(x, graphY + graphHeight - 3, x, graphY + graphHeight + 6); 
  }
  strokeWeight(1);


  // --Drawing data lines--
  strokeWeight(2);
  stroke(0, 0, 255);
  noFill();
  beginShape();
  for (let d of upperLevelHistory) {
    if (d.t >= minTime && d.t <= maxTime) {
      let x = map(d.t, minTime, maxTime, graphX, graphX + graphWidth);
      let y = map(d.value, 0, 100, graphY + graphHeight, graphY);
      vertex(x, y);
    }
  }
  endShape();

    stroke('#cc0033');
  noFill();
  beginShape();
  for (let d of lowerWaterHistory) {
    if (d.t >= minTime && d.t <= maxTime) {
      let x = map(d.t, minTime, maxTime, graphX, graphX + graphWidth);
      let y = map(d.value, 0, 100, graphY + graphHeight, graphY);
      vertex(x, y);
    }
  }
  endShape();
  strokeWeight(1); //reset so lines are good on tank, etc
}



function resetButtonColors() {
  fillBtn.style('background-color', '#0077cc');
  drainBtn.style('background-color', '#0077cc');
  //controlBtn.style('background-color', '#0077cc');
}

function clickables(){

  // Make <div> in html, and style in style.css

// Make variables of the clickables
  sliderTop = select('#top-slider');
  sliderBot = select('#bot-slider');
  fillBtn = select('#fill-btn');
  drainBtn = select('#drain-btn');
  controlBtn = select('#control-btn');
  pauseBtn =select('#pause-btn');
  buttons = select('#controls');
  clogBtn = select('#clog-btn');

// How the clickables will function here
  sliderTop.input(() => {
    let tankSize = min(width, height) * 0.25;
    upperWaterPercent = constrain(sliderTop.value() / tankSize, 0, 1);
  });

  sliderBot.input(() => {
    let tankSize = min(width, height) * 0.25;
    lowerWaterPercent = constrain(sliderBot.value() / tankSize, 0, 1);
  });

  // alternative color: #22aa22
  fillBtn.mousePressed(() => {
    filling = true;
    resetButtonColors();
    fillBtn.style('background-color', 'green');
  });

  clogBtn.mousePressed(() => {
    clog = !clog;
    if(clog){clogBtn.style('background-color', 'green');}
    else{clogBtn.style('background-color', '#0077cc');}
    
  });
  drainBtn.mousePressed(() => {
    filling = false;
    resetButtonColors();
    drainBtn.style('background-color', 'green');
    
  });

  controlBtn.mousePressed(() => {
    //filling = false;
    //resetButtonColors();
    controlBtn.style('background-color', "brown");
  });

  pauseBtn.mousePressed(() => {
    pauseSim = !pauseSim;
    leaking = false;
    if(pauseSim){pauseBtn.style('background-color', 'orange');}
    else{pauseBtn.style('background-color', '#0077cc');}
  });
}