
//Simulation globals
let filling = true;
let draining = false;
let leaking = false;
let pauseSim = false;
let clogLower = false;
let clogUpper = false;
let speedup = 1;
let upperWaterPercent = 0.0;
let lowerWaterPercent = 0.0;
let droplets = [];
let tankSize;

// Position globals
let canvas;
let x_controls;
let y_controls;
let controlSize;
let sliderTop;
let slidertop;
let padding = 20;


// PID control globals
let control = false;
let P_enable = true;
let I_enable = true;
let D_enable = true;
let controlLower = false;
let controlUpper = true;
let Kp = 4;
let Ti = 15; 
let Td = 5;
let previousTi = Ti;
let integral = 0;
let previousError = 0;
let previousDerivative = 0;
let previousY = 0;
let P_part = 0;
let I_part = 0;
let D_part = 0;
let u = 0;

// Graph globals
let graphDuration = 60;
let simTime = 0;    
let lastFrameTime = 0; 
let upperLevelHistory = [];
let lowerWaterHistory = [];
let referenceHistory = [];
let P_history = [];
let I_history = [];
let D_history = [];
let U_history = [];


function setup() {
  let { canvasWidth, canvasHeight } = getCanvasSize();
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.position(0,0)
  canvas.parent("canvas-container");
  lastFrameTime = millis() / 1000;

  clickables();
  
  fillBtn.style('background', 'green');
  controlBtn.style('background', 'gray');
  controlLowerBtn.style('background', 'gray');
  clogLowerBtn.style('background', 'gray');
  clogUpperBtn.style('background', 'gray');
  pauseBtn.style('background', 'gray');
  controlUpperBtn.style('background', 'green');
  P_enableBtn.style('background-color', 'green');
  I_enableBtn.style('background-color', 'green');
  D_enableBtn.style('background-color', 'green');
  
}
function draw() {

  background(220);

  textAlign(LEFT, TOP);
  text(`Canvas: ${width} x ${height}`, 10, 10);
  text(`FPS: ${nf(frameRate(), 2, 1)}`, 10, 30);

  let currentTime = millis() / 1000; // (milli)seconds since program started
  let deltaTime = currentTime - lastFrameTime; // time since last frame
  lastFrameTime = currentTime;

  if (!pauseSim) {
    runSimulationStep(deltaTime);  // run simulation using real dt
  }
  

  // Drawing graphs
  drawLineGraph(1);
  drawLineGraph(2);

 // Tank sizes
  tankSize = min(width, height) * 0.25;
  let x_upperTank = (width * 0.38);
  let y_upperTank = height * 0.15;
  let tankGap = height * 0.05;
  let connectorWidth = tankSize * 0.05;

  x_controls = width*0.01;
  y_controls = height*0.1;
  controlSize = min(width,height) * 0.5;

  let upperWaterLevel = upperWaterPercent * tankSize;
  let lowerWaterLevel = lowerWaterPercent * tankSize;

  // Draw tanks+connector
  fill(255); stroke(0);
  rect(x_upperTank+tankSize/2, y_upperTank, tankSize/2, tankSize);
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize + tankGap, tankSize/2, tankSize);
  rect(x_upperTank+tankSize/2 + tankSize / 4 - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap);

  // Update slider and controls positions
  resizeControls(x_upperTank, y_upperTank, tankSize, tankGap);
  sliderTop.value(upperWaterPercent * tankSize);
  sliderBot.value(lowerWaterPercent * tankSize);

  // Draw water and tanks
  fill(0, 0, 255); noStroke();
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize - upperWaterLevel, tankSize/2, upperWaterLevel); // Tank 1 water
  if (upperWaterLevel > 0) {
    rect(x_upperTank + tankSize*3/4  - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap); // Connector water
    rect(x_upperTank + tankSize*3/4- connectorWidth/4, y_upperTank + tankSize, connectorWidth/2, tankSize + tankGap); // Water flowing from connector
  }
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize + tankGap + tankSize - lowerWaterLevel, tankSize/2, lowerWaterLevel); //Tank 2 water

    // Update controls
    resizeControls(x_upperTank, y_upperTank, tankSize, tankGap);
    sliderTop.value(upperWaterPercent * tankSize);
    sliderBot.value(lowerWaterPercent * tankSize);

  // Display u(t)
  push();
  let uText = `u(t): ${nf(u, 1, 2)}`;
  textAlign(RIGHT, BOTTOM);
  fill(0);
  textSize(40);
  text(uText, width - 10, height - 10);
  pop();

  //Draw PID button schematics
  drawControlImage();

}

function runSimulationStep(dt) {
  simTime += dt;

  // --- Water logic ---
  let inflow_rate_max = 2.1 * Math.pow(10, -5);
  let inflow_rate = getInflow(inflow_rate_max, simTime, dt);
  let A = 4.9 * Math.pow(10, -4);

  let h1 = upperWaterPercent * 0.16;
  let h2 = lowerWaterPercent * 0.16;
  let g = 9.82;
  let a1 = 3.1 * Math.pow(10, -6);
  let a2 = a1;

  let upper_q_out = a1 * Math.sqrt(2 * g * h1);
  let lower_q_out = a2 * Math.sqrt(2 * g * h2);

  let upper_q_in = filling ? inflow_rate : 0;
  let lower_q_in = upper_q_out;

  if (clogUpper) upper_q_out = 0;
  if (clogLower) lower_q_out = 0;

  if (filling) h1 += upper_q_in * dt / A;
  h1 -= upper_q_out * dt / A;
  h2 += upper_q_out * dt / A;
  h2 -= lower_q_out * dt / A;

  h1 = constrain(h1, 0, 0.16);
  h2 = constrain(h2, 0, 0.16);

  upperWaterPercent = h1 / 0.16;
  lowerWaterPercent = h2 / 0.16;

  // --- Data logging ---
  upperLevelHistory.push({ t: simTime, value: upperWaterPercent * 100 });
  lowerWaterHistory.push({ t: simTime, value: lowerWaterPercent * 100 });
  P_history.push({ t: simTime, value: P_part * 100 });
  I_history.push({ t: simTime, value: I_part * 100 });
  D_history.push({ t: simTime, value: D_part * 100 });
  U_history.push({ t: simTime, value: u * 100 });
  referenceHistory.push({ t: simTime, value: setpointSlider.value() });

  // --- History trimming ---
  let minTime = simTime - graphDuration;
  while (
    upperLevelHistory.length > 0 &&
    upperLevelHistory[0].t < minTime
  ) {
    upperLevelHistory.shift();
    lowerWaterHistory.shift();
    P_history.shift();
    I_history.shift();
    D_history.shift();
    U_history.shift();
    referenceHistory.shift();
  }
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


  let inflowBox = select('#inflow-slider-box');
  let setpointBox = select('#setpoint-slider-box');
  let PIDBox = select('#PID-variables-slider-box');
  let pButton = select('#P-control');
  let iButton = select('#I-control');
  let dButton = select('#D-control');
  let inflowbox = select('#inflow-slider-box').elt.getBoundingClientRect();
  let scaleFactor = size / 200;
  let x_controlSlider = x_controls + controlSize/20;
  let y_inflowSlider =  y_controls + controlSize / 10;

  
  let setpointX = inflowbox.right + size/50;
  setpointBox.position(setpointX, y_inflowSlider);
  setpointBox.style('transform', `scale(${scaleFactor})`);
  inflowBox.position(x_controlSlider, y_inflowSlider);
  inflowBox.style('transform', `scale(${scaleFactor})`);
  PIDBox.position(x_controlSlider, y_inflowSlider + 1.3*size);
  PIDBox.style('transform', `scale(${scaleFactor})`);
  
  let x_PIDbuttons = x_controlSlider + 2*size

  pButton.position(x_PIDbuttons, y_inflowSlider);
  pButton.style('transform', `scale(${scaleFactor})`);
  iButton.position(x_PIDbuttons, y_inflowSlider + size/2);
  iButton.style('transform', `scale(${scaleFactor})`);
  dButton.position(x_PIDbuttons, y_inflowSlider + size);
  dButton.style('transform', `scale(${scaleFactor})`);

  let controlsX = x_controlSlider;
  let controlsY = botSliderY + size;
  // Delete/comment these if you want to change position of the buttons individually. Otherwise it wont position as wanted.
  buttons.position(controlsX, controlsY);
  buttons2.position(controlsX, controlsY+50);
  //buttons3.position(controlsX, controlsY+100); // Commented to place P I D buttons seperately.


  fillBtn.hide();
  drainBtn.hide();

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

function drawLineGraph(graph) {
  let graphX = 0;
  let graphY = 0;
  const graphWidth = width * 0.4;
  const graphHeight = height * 0.4;

  if (graph == 1) {
    graphX = width - graphWidth - padding;
    graphY = padding;
  }
  if (graph == 2) {
    graphX = width - graphWidth - padding;
    graphY = height / 2;
  }

  const now = simTime;
  const minTime = Math.max(0, now - graphDuration);
  const maxTime = minTime + graphDuration;

  stroke(0);
  fill(255);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight);

  // -- Y axis -- 
  let yMin = (graph === 2) ? -1 : 0; // If true = -1,  if false = 0
  let yMax = (graph === 2) ? 1 : 100;

  stroke(220);
  strokeWeight(1); 

  const yStep = (graph === 2) ? 0.2 : 10;
  for (let yVal = yMin; yVal <= yMax + 0.001; yVal += yStep) {
    let y = map(yVal, yMin, yMax, graphY + graphHeight, graphY);
    line(graphX, y, graphX + graphWidth, y);

    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    if (graph === 1) {
      text(`${nf(yVal, 1, 0)}%`, graphX - 5, y);
    } else {
      text(`${nf(yVal, 1, 1)}`, graphX - 5, y);
    }
    stroke(220);
  }

  // -- X-axis --
  const xStep = 1;
  stroke(220);
  for (let sec = Math.ceil(minTime / xStep) * xStep; sec <= maxTime; sec += xStep) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    line(x, graphY, x, graphY + graphHeight);
    noStroke();
    fill(80);
    textAlign(CENTER, TOP);
    if (sec % 5 == 0) {
      text(`${nf(sec, 2, 1)}s`, x, graphY + graphHeight + 5);
    }
    stroke(220);
  }

  // -- Tick marks --
  stroke(100);
  strokeWeight(1);
  for (let sec = Math.ceil(minTime); sec <= maxTime; sec++) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    line(x, graphY + graphHeight - 3, x, graphY + graphHeight + 6); 
  }

  // -- Data lines -- 
  if (graph === 2) {
    drawHistoryLine(P_history, 'red', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v / 100);
    drawHistoryLine(I_history, 'green', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v / 100);
    drawHistoryLine(D_history, 'blue', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v / 100);
    drawHistoryLine(U_history, 'black', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v / 100);
  }

  if (graph === 1) {
    drawHistoryLine(upperLevelHistory, 'blue', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
    drawHistoryLine(lowerWaterHistory, '#cc0033', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
    drawHistoryLine(referenceHistory, 'black', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax)
  }

  

  // -- legend --
  push();
  const legendX = graphX + 10;
  let legendY = graphY + 10;
  const spacing = width/75;
  let legendItems = [];
  if (graph === 2) {
    legendItems = [
      { label: 'P', color: 'red' },
      { label: 'I', color: 'green' },
      { label: 'D', color: 'blue' },
      { label: 'U = P + I + D', color: 'black' }
    ];
  }

  if (graph == 1 ) {
    legendItems = [
      { label: 'Upper tank', color: 'blue' },
      { label: 'Lower tank', color: 'red'},
      { label: 'Reference', color: 'black'}
    ];
  }
   
    textAlign(LEFT, CENTER);
    textSize(width/100);
    noStroke();
  
    for (let item of legendItems) {
      fill(item.color);
      rect(legendX, legendY - 5, width/150, width/150);
      fill(0);
      text(item.label, legendX + width/50, legendY);
      legendY += spacing;
    }
    pop();

}

function drawHistoryLine(data, color, graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, valueTransform = null) {
  push();
  noFill();
  strokeWeight(2);
  beginShape();
  for (let d of data) {
    if (d.t >= minTime && d.t <= maxTime) {
      let rawVal = valueTransform ? valueTransform(d.value) : d.value;
      let clamped = constrain(rawVal, yMin, yMax);
      let x = map(d.t, minTime, maxTime, graphX, graphX + graphWidth);
      let y = map(clamped, yMin, yMax, graphY + graphHeight, graphY);
      stroke((rawVal !== clamped) ? 'red' : color);
      vertex(x, y);
    }
  }
  endShape();
  pop();
}

//-------------------------

function resetButtonColors() { // delete ?
  fillBtn.style('background-color', '#0077cc');
  drainBtn.style('background-color', '#0077cc');
  //controlBtn.style('background-color', '#0077cc');
}

function clickables(){

  // When adding buttons / etc
  //    1. Make <div> in html
  //    2. Style said div in style.css
  //    3. Implement what the div (button etc) does here, in clickables.

// NOTE: might be smart to move some if they are only used once. (i.e inflowBox and setpointbox)
  sliderTop = select('#top-slider');
  sliderBot = select('#bot-slider');
  fillBtn = select('#fill-btn');
  drainBtn = select('#drain-btn');
  controlBtn = select('#control-btn');
  pauseBtn =select('#pause-btn');
  buttons = select('#controls');
  buttons2 = select('#controls2');
  buttons3 = select('#controls3');
  clogLowerBtn = select('#clog-lower-btn');
  clogUpperBtn = select('#clog-upper-btn');
  controlUpperBtn = select('#control-upper-btn');
  controlLowerBtn = select('#control-lower-btn');
  P_enableBtn = select('#P-control');
  I_enableBtn = select('#I-control');
  D_enableBtn = select('#D-control');
  controlLowerBtn = select('#control-lower-btn');
  controlLowerBtn = select('#control-lower-btn');
  inflowSlider = select('#inflow-slider');
  inflowValue = select('#inflow-value');
  setpointSlider = select('#setpoint-slider');
  setpointValue = select('#setpoint-value');

  KpSlider = select('#Kp-slider');
  KpValue = select('#Kp-value');
  TiSlider = select('#Ti-slider');
  TiValue = select('#Ti-value');
  TdSlider = select('#Td-slider');
  TdValue = select('#Td-value');

    
  // How the clickables will function here

  inflowValue.changed(() => {
    let typedValue = parseFloat(inflowValue.value());
    if (!isNaN(typedValue)) {
      let clamped = constrain(typedValue, 0, 1);
      inflowValue.value(nf(clamped, 1, 2)); 
      inflowSlider.value(clamped * 100);
    }
  });

  setpointValue.changed(() => {
    let typedValue = parseFloat(setpointValue.value());
    if (!isNaN(typedValue)) {
      let clamped = constrain(typedValue, 0, 1);
      setpointValue.value(nf(clamped, 1, 2)); 
      setpointSlider.value(clamped * 100);
    }
  });

  KpValue.changed(() => {
    let typedValue = parseFloat(KpValue.value());
    if (!isNaN(typedValue)) {
      Kp = typedValue;
      KpSlider.value(Kp);
      KpValue.value(nf(Kp, 1, 2));
    }
  });
  TiValue.changed(() => {
    let typedValue = parseFloat(TiValue.value());
    if (!isNaN(typedValue)) {
      let clamped = constrain(typedValue, 0, 50);
      Ti = clamped;
      TiSlider.value(clamped);
      TiValue.value(nf(clamped, 1, 2));
    }
  });
  TdValue.changed(() => {
    let typedValue = parseFloat(TdValue.value());
    if (!isNaN(typedValue)) {
      let clamped = constrain(typedValue, 0, 50);
      Td = clamped;
      TdSlider.value(clamped);
      TdValue.value(nf(clamped, 1, 2));
    }
  });


  inflowSlider.input(() => {
    let percent = inflowSlider.value() / 100;
    inflowValue.value(nf(percent, 1, 2));
  });
  setpointSlider.input(() => {
    let percent = setpointSlider.value() / 100;
    setpointValue.value(nf(percent, 1, 2));
  });
  
  KpSlider.input(() => {
    let sliderVal = parseFloat(KpSlider.value());
    Kp = sliderVal;
    KpValue.value(nf(sliderVal, 1, 2));
  });
  TiSlider.input(() => {
    let sliderVal = parseFloat(TiSlider.value());
    Ti = sliderVal;
    TiValue.value(nf(sliderVal, 1, 2));
  });
  TdSlider.input(() => {
    let sliderVal = parseFloat(TdSlider.value());
    Td = sliderVal;
    TdValue.value(nf(sliderVal, 1, 2));
  });


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

  clogLowerBtn.mousePressed(() => {
    clogLower = !clogLower;
    if(clogLower){clogLowerBtn.style('background-color', 'green');}
    else{clogLowerBtn.style('background-color', 'gray');}
  });
  clogUpperBtn.mousePressed(() => {
    clogUpper = !clogUpper;
    if(clogUpper){clogUpperBtn.style('background-color', 'green');}
    else{clogUpperBtn.style('background-color', 'gray');}
  });

  P_enableBtn.mousePressed(() => {
    P_enable = !P_enable;
    if(!P_enable){P_enableBtn.style('background-color', 'gray');}
    else{P_enableBtn.style('background-color', 'green');}
  });
  I_enableBtn.mousePressed(() => {
    I_enable = !I_enable;
    if(!I_enable){I_enableBtn.style('background-color', 'gray');}
    else{I_enableBtn.style('background-color', 'green');}
  });
  D_enableBtn.mousePressed(() => {
    D_enable = !D_enable;
    if(!D_enable){D_enableBtn.style('background-color', 'gray');}
    else{D_enableBtn.style('background-color', 'green');}
  });
  
  controlUpperBtn.mousePressed(() => {
    controlUpper = true;
    controlLower = false;

    controlUpperBtn.style('background-color', 'green');
    controlLowerBtn.style('background-color', 'gray');

  });

  controlLowerBtn.mousePressed(() => {
    controlLower = true;
    controlUpper = false;

    controlLowerBtn.style('background-color', 'green');
    controlUpperBtn.style('background-color', 'gray');

  });
  drainBtn.mousePressed(() => {
    filling = false;
    resetButtonColors(); ///// might wanna check this out again and delete this
    drainBtn.style('background-color', 'green');
    
  });

  controlBtn.mousePressed(() => {

    control = !control;

    if (control) {
      integral = 0;
      previousError = 0;
      controlBtn.style('background-color', 'green');
    } else {
      controlBtn.style('background-color', 'gray');
    }
  });
  pauseBtn.mousePressed(() => {
    pauseSim = !pauseSim;
    leaking = false;
    if(pauseSim){pauseBtn.style('background-color', 'green');}
    else{pauseBtn.style('background-color', 'gray');}
  });
}


function getInflow(inflow_rate_max, t, dt) {
  if (!control) {
    return (inflowSlider.value() / 100) * inflow_rate_max;
  } else {

    // PID CALCULATIONS 
    let r = setpointSlider.value() / 100;  // Reference (setpoint)
    let y = lowerWaterPercent;  
    if(controlUpper){
      y = upperWaterPercent;
    }
    if(controlLower){
      y = lowerWaterPercent;
    }

    let e = r - y;                        // Error

    // --- P Part ---
    if(P_enable){
      P_part = Kp * e;
    } else{P_part = 0;}
 

    // --- I Part ---
    if(I_enable){
      if (Ti !== previousTi) {
        integral = 0;
        previousTi = Ti;
      }
      integral += e * dt;
      I_part = (Ti !== 0) ? (Kp / Ti) * integral : 0; // If Ti == 0, I_part = 0
    } else { I_part = 0;}

    // -- D Part --
    if(D_enable){
      let dy = (y - previousY) / dt;
      let derivative = -dy;
      let filteredD = 0.9 * previousDerivative + 0.1 * derivative;
      D_part = (Td > 0) ? Kp * Td * filteredD : 0;
      previousY = y;
      previousDerivative = filteredD;
    } else{ D_part = 0; }


    // --- Total Control Signal ---
    u = constrain(P_part + I_part + D_part, 0, 1);  

    return u * inflow_rate_max;
  }
}

// Function that draws everything in regards to the PID arrow schematic
function drawControlImage() {
  const canvasRect = canvas.elt.getBoundingClientRect();

  let setpointSliderBox = select('#setpoint-slider').elt.getBoundingClientRect();
  let pBtn = select('#P-control').elt.getBoundingClientRect();
  let iBtn = select('#I-control').elt.getBoundingClientRect();
  let dBtn = select('#D-control').elt.getBoundingClientRect();

  let startX = setpointSliderBox.right;
  let startY =  y_controls + controlSize / 10 + tankSize/2;

drawPIDLines(
  startX,
  startY,
  {
    x: pBtn.left - canvasRect.left,
    y: pBtn.top + pBtn.height / 2 - canvasRect.top,
    x_right: pBtn.right - canvasRect.left
  },
  {
    x: iBtn.left - canvasRect.left,
    y: iBtn.top + iBtn.height / 2 - canvasRect.top,
    x_right: iBtn.right - canvasRect.left
  },
  {
    x: dBtn.left - canvasRect.left,
    y: dBtn.top + dBtn.height / 2 - canvasRect.top,
    x_right: dBtn.right - canvasRect.left
  }
);

}

// Drawing of each line for drawControlImage
function drawPIDLines(startX, startY, pPos, iPos, dPos) {

  push(); //Push/pop to save/restore default draw settings

  stroke(0);
  strokeWeight(2);

  //Commenting this so it makes sense.
  //This is the drawings from inflow rate (um) slider box, into the PID buttons. 
  // Please note, drawArrowhead(X,Y, angle) prints an arrowhead at the end of the line. This is sometimes used.

  //First line from inflow box -> branch spot
  const splitX = pPos.x/1.07;
  line(startX, startY, splitX, startY);

  //This draws a veritcal line from yTop to ybottom where the first split occurs
  const yTop = pPos.y;
  const yBottom = dPos.y;
  line(splitX, yTop, splitX, yBottom);

  // Branch to P
  line(splitX, pPos.y, pPos.x, pPos.y);
  drawArrowhead(pPos.x, pPos.y, 0); // horizontal

  // Branch to I
  line(splitX, iPos.y, iPos.x, iPos.y);
  drawArrowhead(iPos.x, iPos.y, 0);

  // Branch to D
  line(splitX, dPos.y, dPos.x, dPos.y);
  drawArrowhead(dPos.x, dPos.y, 0);

  // From the buttons to merging point
  const mergingX = pPos.x +width * 0.05;
  line(pPos.x_right, pPos.y, mergingX, pPos.y);
  line(iPos.x_right, iPos.y, mergingX, iPos.y);
  line(dPos.x_right, dPos.y, mergingX, dPos.y);

  // Vertical line merge point
  line(mergingX, yTop, mergingX, yBottom);


  drawSumBlock(pPos.x/1.17, iPos.y, 15);
  pop();
}


// Draws arrowhead end of line
function drawArrowhead(x, y, angle) {
  push();
  translate(x, y);
  rotate(angle);
  fill(0);
  noStroke();
  triangle(0, 0, -10, 5, -10, -5);
  pop();
}

// Draws Sum block circle
function drawSumBlock(x, y, radius = 20) {

  push(); // Saves previous style settings
  // Drawing circle
  stroke(0);
  strokeWeight(2);
  fill(255);
  ellipse(x, y, radius * 2, radius * 2);

  // Drawing Sigma (Sum letter)
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(radius * 1.2); 
  text('Σ', x, y); 
  pop(); // Restoring to previous style
  fill(0);
}