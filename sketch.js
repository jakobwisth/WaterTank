
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
let tankSize = 500;
let connectorWidth;
let upperWaterLevel;
let lowerWaterLevel;
let accumulatedTime = 0;  // New global variable
const fixedTimeStep = 0.03; 
let inflow_rate;
let tooltipMap = {};
let hoveringValve = false;
let isUpperOverflowing = false;
let isLowerOverflowing = false;
let tabHidden = false;

//Advanced Options
let clogSlider;
let clogValue;


// Position globals
let canvas;
let x_controls;
let y_controls;
let controlSize;
let sliderTop;
let slidertop;
let padding = 20;
let x_upperTank;
let y_upperTank;
let tankGap;
let speedupSlider;
let pageBecameVisible = false;
let scaleFactor = 1;
let graphX = 0;
let graphY = 0;
let showerLine_y;

// PID control globals
let control = false;
let P_enable = true;
let I_enable = false;
let D_enable = false;
let controlLower = false;
let controlUpper = true;
let Kp = 1;
let Ti = 1; 
let Td = 1;
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
let graphDuration = 50;
let simTime = 0;    
let lastFrameTime = 0; 
let upperLevelHistory = [];
let lowerWaterHistory = [];
let referenceHistory = [];
let P_history = [];
let I_history = [];
let D_history = [];
let U_history = [];
let graphWidth;
let graphHeight;
let graphGap;

// buttons
let pauseBtn;
const pi = 3.1415;

function setup() {
  let { canvasWidth, canvasHeight } = getCanvasSize();
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.position(0,0)
  canvas.parent("canvas-container");
  lastFrameTime = millis() / 1000;

  pauseWhenTabbedOut();
  clearTooltips();
  clickables();
  initiateButtons();
  
}
function initiateButtons(){

  //clogLowerBtn.style('background', 'gray');
  //clogUpperBtn.style('background', 'gray');

  clogLowerBtn.hide();
  clogUpperBtn.hide();

  controlUpperBtn.addClass('button-style');
  controlLowerBtn.addClass('button-style');
  pauseBtn.addClass('button-style');
  P_enableBtn.addClass('button-style');
  I_enableBtn.addClass('button-style');
  D_enableBtn.addClass('button-style');
  automaticBtn.addClass('button-style');
  manualBtn.addClass('button-style');


  pauseBtn.addClass('default-button');
  controlUpperBtn.addClass('active-button');
  controlLowerBtn.addClass('default-button');
  P_enableBtn.addClass('active-button');
  I_enableBtn.addClass('default-button');
  D_enableBtn.addClass('default-button');
  fillBtn.addClass('active-button');
  automaticBtn.addClass('default-button');
  manualBtn.addClass('active-button');
}

function pauseWhenTabbedOut(){
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tabHidden = true;
      noLoop();
    } else {
      tabHidden = false;
      lastFrameTime = millis() / 1000;  // Reset time tracking
      loop();
    }
  });
}

function draw() {

  background(220);

  resizeControls();
  drawLineGraph(1);
  drawLineGraph(2);
  drawSimulation();
  drawClogToggles();
  drawControlImage();
  //drawDebug();

  updateSimulationTime();
}

function updateSimulationTime(){
  if (tabHidden) return;

  let currentTime = millis() / 1000;
  let deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  
  if (!pauseSim) {
    accumulatedTime += deltaTime*speedup;
  
    while (accumulatedTime >= fixedTimeStep) {
      runSimulationStep(fixedTimeStep);  // Run simulations until dt is caught up
      accumulatedTime -= fixedTimeStep;
    }
  }
}


function runSimulationStep(dt) {
  simTime += dt;

  // --- Water logic ---
  let inflow_rate_max = 1.2 * Math.pow(10, -5); // 2.1 i manual !
  inflow_rate = updateControl(inflow_rate_max, simTime, dt);
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

  let clogFraction = 1 - parseFloat(clogSlider.value()) / 100;
  if (clogUpper) upper_q_out = upper_q_out *= clogFraction;
  if (clogLower) lower_q_out = lower_q_out *= clogFraction;

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

  const cutoffIndex = upperLevelHistory.findIndex(d => d.t >= minTime);

  if (cutoffIndex > 0) {
    upperLevelHistory.splice(0, cutoffIndex);
    lowerWaterHistory.splice(0, cutoffIndex);
    P_history.splice(0, cutoffIndex);
    I_history.splice(0, cutoffIndex);
    D_history.splice(0, cutoffIndex);
    U_history.splice(0, cutoffIndex);
    referenceHistory.splice(0, cutoffIndex);
  }
}

//Drawing reservoir and showerhead, and lines between
function drawReservoirScaled() {
  const centerX = x_upperTank + tankSize * 3/4;  // x of center of lower tank
  const baseY = y_upperTank + 2 * tankSize + tankGap + height *0.12; // Bottom Y of reservoir

  push();
  translate(centerX, baseY); // moves so origin (0,0) is at the bottom center of reservoir
  scale(scaleFactor);   //scales

  const tankWidth = tankSize / scaleFactor / 2;
  const reservoirHeight = 30;
  const reservoirWidthOffset = 20;

  fill(0);
  beginShape();
  vertex(-tankWidth / 2, 0); // Bottom-left
  vertex(tankWidth / 2, 0);  // Bottom-right
  vertex(tankWidth / 2 + reservoirWidthOffset, -reservoirHeight); // Top-right
  vertex(-tankWidth / 2 - reservoirWidthOffset, -reservoirHeight); // Top-left
  endShape(CLOSE);

  // horisontal line from reservoir to pump
  strokeWeight(5 / scaleFactor);
  const pipeY = -reservoirHeight + 2;

  // Variables for drwaing
  const pumpSize = 10*scaleFactor;
  const pumpX = (x_pump - centerX) / scaleFactor;
  const pumpY_bottom = (y_pump - baseY + pumpSize) / scaleFactor;
  const pumpY_top = (y_pump - baseY - pumpSize) / scaleFactor;
  const topLine_Y = pumpY_top - 80;
  showerLine_y = topLine_Y+20;

  // Line going from reservoir to showerhead

  line(-tankWidth / 2 - reservoirWidthOffset + 10, pipeY, pumpX, pipeY); // First
  line(pumpX, pipeY - 2, pumpX, topLine_Y); // Vertical from bottom reservoir to top
  line(pumpX, topLine_Y, 0, topLine_Y);  //Horisontal top
  line(0, topLine_Y, 0, showerLine_y); // top to showerhead


  //Drawing showerhead
  const headWidth = 20;
  const headHeight = 15 ;
  beginShape(); 
  vertex(0, showerLine_y);                          
  vertex(-headWidth / 2, showerLine_y + headHeight); 
  vertex(headWidth / 2, showerLine_y + headHeight);  
  endShape(CLOSE);
  pop();

  }

function windowResized() {
  clearTooltips();
  const { canvasWidth, canvasHeight } = getCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  
  resizeControls();
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

function resizeControls() {

  x_upperTank  = width * 0.43;
  y_upperTank = height * 0.15;
  tankSize = min(width, height) * 0.25;
  tankGap = height * 0.05;
  
  x_controls = padding + width*0.01;
  y_controls = padding + height*0.1;
  controlSize = min(width,height) * 0.5;

  connectorWidth = tankSize * 0.05;
  upperWaterLevel = upperWaterPercent * tankSize;
  lowerWaterLevel = lowerWaterPercent * tankSize;

  const canvasRect = canvas.elt.getBoundingClientRect();
  let pointerOffset = 18;
  let sliderX = x_upperTank + padding + tankSize/2;
  let sliderY = y_upperTank + padding + tankSize/2 -3;
  let botSliderX = sliderX;
  let botSliderY = sliderY + tankSize + tankGap;

  sliderTop.position(sliderX, sliderY);
  sliderTop.style('width', (tankSize + pointerOffset) + 'px');
  sliderTop.attribute('max', tankSize);
  sliderTop.attribute('min', 0);

  sliderBot.position(botSliderX, botSliderY);
  sliderBot.style('width', (tankSize + pointerOffset) + 'px');
  sliderBot.attribute('max', tankSize);
  sliderBot.attribute('min', 0);

  let pid_equation = select('#pid-equation');
  let inflowBox = select('#inflow-slider-box');
  let speedupBox = select('#speedup-slider-box');
  let setpointBox = select('#setpoint-slider-box');
  let PIDBox = select('#PID-variables-slider-box');
  let controlBox = select('#control-button-group');
  let pButton = select('#P-control');
  let iButton = select('#I-control');
  let dButton = select('#D-control');
  let inflowbox = select('#inflow-slider-box').elt.getBoundingClientRect();


  scaleFactor = tankSize / 200;
  let x_controlSlider = x_controls;
  let y_inflowSlider =  y_controls;

  if (control) {
    inflowBox.addClass('slider-disabled');
    setpointBox.removeClass('slider-disabled');
  } else {
    setpointBox.addClass('slider-disabled');
    inflowBox.removeClass('slider-disabled');
  }

  let setpointX = inflowbox.right + tankSize/50;
  setpointBox.position(setpointX, y_inflowSlider);
  setpointBox.style('transform', `scale(${scaleFactor})`);
  inflowBox.position(x_controlSlider, y_inflowSlider);
  inflowBox.style('transform', `scale(${scaleFactor})`);
  PIDBox.position(x_controlSlider, y_inflowSlider + 1.4*tankSize);
  PIDBox.style('transform', `scale(${scaleFactor})`);

  
  controlBox.position(x_controlSlider, y_inflowSlider+ 2.8*tankSize);
  controlBox.style('transform', `scale(${scaleFactor*0.7})`);
  pid_equation.position(padding + width*0.24, padding + height*0.87);
  pid_equation.style('transform', `scale(${scaleFactor*1.3})`);
 
  let pauseX = width *0.66;
  let pauseY = height*0.5;
  let pauseHeight = pauseBtn.elt.offsetHeight;
  
  speedupBox.style('transform', `scale(${scaleFactor*0.67})`);
  speedupBox.position(pauseX+width*0.17, pauseY);
  
  pauseBtn.style('transform', `scale(${scaleFactor*0.88})`);
  pauseBtn.position(pauseX, pauseY);
  pauseBtn.style('padding', `${5 * scaleFactor}px ${15 * scaleFactor}px`);

  let setpointSliderBox = select('#setpoint-slider').elt.getBoundingClientRect();  
  let x_PIDbuttons = x_controlSlider + 2*tankSize;
  let y_PIDbuttons = setpointSliderBox.top;
  let PID_marigin = tankSize/2;

  pButton.position(x_PIDbuttons, y_PIDbuttons - PID_marigin);
  pButton.style('transform', `scale(${scaleFactor})`);
  iButton.position(x_PIDbuttons, y_PIDbuttons);
  iButton.style('transform', `scale(${scaleFactor})`);
  dButton.position(x_PIDbuttons, y_PIDbuttons + PID_marigin);
  dButton.style('transform', `scale(${scaleFactor})`);


  fillBtn.hide();
  drainBtn.hide();

}


// not used 
function positionPauseButton() {

  let pauseX = width - graphWidth;
  let pauseY = graphY - graphGap / 2.5;
  pauseBtn.position(pauseX, pauseY);
}


function drawLineGraph(graph) {
  graphWidth = width * 0.34;
  graphHeight = height * 0.33;
  graphGap = height * 0.27;

  if (graph == 1) {
    graphX = width - graphWidth- padding*scaleFactor;
    graphY = padding * scaleFactor + height*0.03;
  }
  if (graph == 2) {
    graphX = width - graphWidth - padding*scaleFactor;
    graphY = graphHeight + graphGap;
  }

  const now = simTime;
  const minTime = Math.max(0, now - graphDuration);
  const maxTime = minTime + graphDuration;
push();
  stroke(0);
  fill(255);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight);

  // -- Y axis -- 
  let yMin = (graph === 2) ? -1 : 0; // If true = -1,  if false = 0
  let yMax = (graph === 2) ? 1 : 100;
  
  strokeWeight(2); 

  const yStep = (graph === 2) ? 0.2 : 10;
  for (let yVal = yMin; yVal <= yMax + 0.001; yVal += yStep) {
    let y = map(yVal, yMin, yMax, graphY + graphHeight, graphY);
    line(graphX, y, graphX + graphWidth, y);
    textSize(15*scaleFactor);
    noStroke();
    fill(0);
    textAlign(RIGHT, CENTER);
    if (graph === 1) {
      text(`${nf(yVal, 1, 0)}%`, graphX - 10, y);
    } else {
      text(`${nf(yVal, 1, 1)}`, graphX - 10, y);
    }
    stroke(150);
  }
  pop();

  
  // -- X-axis --
  push();
  const xStep = 1;
  stroke(0);
  for (let sec = Math.ceil(minTime / xStep) * xStep; sec <= maxTime; sec += xStep) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    line(x, graphY, x, graphY + graphHeight);
    noStroke();
    fill(0);
    textSize(15*scaleFactor);
    textAlign(CENTER, TOP);
    if (sec % 5 == 0) {
      text(`${nf(sec, 2, 0)}`, x, graphY + graphHeight + 10);
    }
    stroke(150);
  }
  pop();

  // -- Tick marks --
  push();
  stroke(0);
  strokeWeight(1.5);
  for (let sec = Math.ceil(minTime); sec <= maxTime; sec++) {
    let x = map(sec, minTime, maxTime, graphX, graphX + graphWidth);
    if(sec % 5 == 0) {
    line(x, graphY + graphHeight - 3, x, graphY + graphHeight + 6); 
    }
  }
  pop();

  // -- Data lines -- 
  if (graph === 2) {
      drawHistoryLine(P_history, 'red', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v/100);
      drawHistoryLine(I_history, 'green', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v/100);
      drawHistoryLine(D_history, 'blue', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v/100);
      drawHistoryLine(U_history, 'black', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v/100);
  }

  if (graph === 1) {

    if(!control){
      drawHistoryLine(upperLevelHistory, 'blue', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
      drawHistoryLine(lowerWaterHistory, '#cc0033', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
    } 
    
    else{
      drawHistoryLine(referenceHistory, 'black', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, v => v);
      if(controlUpper){
        drawHistoryLine(upperLevelHistory, 'blue', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
      } if(controlLower){
        drawHistoryLine(lowerWaterHistory, '#cc0033', graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax);
      }
  }
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

    // -- graph titles and units/labels --
push();
textAlign(CENTER, CENTER);
textSize(width/85);
fill(0);

// X- Time(s) label
text("Time (s)", graphX + graphWidth / 2, graphY + graphHeight + height*0.04);

// labels for both Y axis
push();
translate(graphX - width*0.035, graphY + graphHeight / 2);
rotate(-pi/2);
text(graph === 1 ? "Water Level y(t)" : "Control Signal u(t)", 0, 0);
pop();

// Graph title
textAlign(CENTER, BOTTOM);
textSize(width/65);
text(graph === 1 ? "Tank Levels and Reference" : "PID Components", graphX + graphWidth / 2, graphY);
pop();
}

function drawHistoryLine(data, color, graphX, graphY, graphWidth, graphHeight, minTime, maxTime, yMin, yMax, valueTransform = null) {
  if (data.length < 2) return;

  let skip = max(1, floor(data.length / graphWidth));

  push();
  noFill();
  stroke(color);
  strokeWeight(4);
  beginShape();

  for (let i = 0; i < data.length; i += skip) {
    let d = data[i];
    let x = map(d.t, minTime, maxTime, graphX, graphX + graphWidth);

    let v = valueTransform ? valueTransform(d.value) : d.value;
    v = constrain(v, yMin, yMax);  
    let y = map(v, yMin, yMax, graphY + graphHeight, graphY);

    vertex(x, y);
  }
  endShape();
  pop();
}

//-------------------------


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
  automaticBtn = select('#automatic-btn');
  manualBtn = select('#manual-btn');
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
  inflowSlider = select('#inflow-slider');
  inflowValue = select('#inflow-value');
  setpointSlider = select('#setpoint-slider');
  setpointValue = select('#setpoint-value');
  speedupSlider = select('#speedup-slider');

  KpSlider = select('#Kp-slider');
  KpValue = select('#Kp-value');
  TiSlider = select('#Ti-slider');
  TiValue = select('#Ti-value');
  TdSlider = select('#Td-slider');
  TdValue = select('#Td-value');

  // --- Advanced options
  let optionsButton = select('#options-button');
  let optionsMenu = select('#options-menu');
  clogSlider = select('#clog-slider');
  clogValue = select('#clog-value');


  
  if (clogSlider && clogValue) {
    clogSlider.input(() => {
      clogValue.value(clogSlider.value());
    });
  
    clogValue.input(() => {
      let val = constrain(parseInt(clogValue.value()), 0, 100);
      clogValue.value(val);
      clogSlider.value(val);
    });
  }

  optionsButton.mousePressed(() => {
    if (optionsMenu.hasClass('visible')) {
      optionsMenu.removeClass('visible');
    } else {
      optionsMenu.addClass('visible');
    }
  });

      // --- End of Advanced Options


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
      let clamped = constrain(typedValue, 0, 50);
      Kp = clamped;
      KpSlider.value(Kp);
      KpValue.value(nf(Kp, 1, 2));
    }
  });
  TiValue.changed(() => {
    let typed = TiValue.value();
    let typedValue = parseFloat(typed);
    if (!isNaN(typedValue)) {
      if (typedValue < 0.01) {
        typedValue = 0.01;
      }
      let clamped = constrain(typedValue, 0, 50);
      Ti = clamped;
      TiSlider.value(clamped);
  
      if (clamped >= 50) {
        TiValue.value('inf');
      } else {
        TiValue.value(nf(clamped, 1, 2));
      }
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

  speedupSlider.input(() => {
    speedup = speedupSlider.value();
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
  
    if (sliderVal >= 50) {
      TiValue.value('inf');
    } else {
      TiValue.value(nf(sliderVal, 1, 2));
    }
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

  fillBtn.mousePressed(() => {
    filling = true;
    resetButtonColors();
    fillBtn.addClass('active-button');
  });

  clogLowerBtn.mousePressed(() => {
    clogLower = !clogLower;
    if(clogLower){clogLowerBtn.removeClass('default-button');clogLowerBtn.addClass('active-button');}
    else{clogLowerBtn.removeClass('active-button');clogLowerBtn.addClass('default-button');}
  });
  clogUpperBtn.mousePressed(() => {
    clogUpper = !clogUpper;
    if(clogUpper){clogUpperBtn.removeClass('default-button');clogUpperBtn.addClass('active-button');}
    else{clogUpperBtn.removeClass('active-button');clogUpperBtn.addClass('default-button');}
  });

  P_enableBtn.mousePressed(() => {
    P_enable = !P_enable;
    if(!P_enable){P_enableBtn.removeClass('active-button');P_enableBtn.addClass('default-button');}
    else{P_enableBtn.removeClass('default-button');P_enableBtn.addClass('active-button');}
  });
  I_enableBtn.mousePressed(() => {
    I_enable = !I_enable;
    if(!I_enable){I_enableBtn.removeClass('active-button');I_enableBtn.addClass('default-button');}
    else{I_enableBtn.removeClass('default-button');I_enableBtn.addClass('active-button');}
  });
  D_enableBtn.mousePressed(() => {
    D_enable = !D_enable;
    if(!D_enable){D_enableBtn.removeClass('active-button');D_enableBtn.addClass('default-button');}
    else{D_enableBtn.removeClass('default-button');D_enableBtn.addClass('active-button');}
  });
  
  controlUpperBtn.mousePressed(() => {
    controlUpper = true;
    controlLower = false;

    controlLowerBtn.removeClass('active-button');
    controlUpperBtn.removeClass('default-button');
    controlUpperBtn.addClass('active-button');
    controlLowerBtn.addClass('default-button');

  });

  controlLowerBtn.mousePressed(() => {
    controlLower = true;
    controlUpper = false;
    controlLowerBtn.removeClass('default-button');
    controlUpperBtn.removeClass('active-button');
    controlLowerBtn.addClass('active-button');
    controlUpperBtn.addClass('default-button');

  });
  drainBtn.mousePressed(() => {
    filling = false;
    resetButtonColors(); ///// might wanna check this out again and delete this
    drainBtn.removeClass('default-button');
    drainBtn.addClass('active-button');
    
  });

  automaticBtn.mousePressed(() => {
    
    clearTooltips();
    control = true;
    resizeControls();
    integral = 0;
    previousError = 0;
    automaticBtn.removeClass('default-button');
    automaticBtn.addClass('active-button');
    manualBtn.removeClass('active-button');
    manualBtn.addClass('default-button');
  });

  manualBtn.mousePressed(() => {
    
    clearTooltips();
    control = false;
    resizeControls();

    manualBtn.removeClass('default-button');
    manualBtn.addClass('active-button');
    automaticBtn.removeClass('active-button');
    automaticBtn.addClass('default-button');
  });
  pauseBtn.mousePressed(() => {
    pauseSim = !pauseSim;
    leaking = false;
  
    if (pauseSim) {
      pauseBtn.removeClass('default-button');
      pauseBtn.addClass('active-button');
    } else {
      pauseBtn.removeClass('active-button');
      pauseBtn.addClass('default-button');
    }
  });
}


function updateControl(inflow_rate_max, t, dt) {
  if (!control) {
    u = constrain(inflowSlider.value() / 100, 0, 1);  
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
    if (I_enable) {
      if (Ti !== previousTi) {
        previousTi = Ti;
      }

      // Anti-windup
      if (!((u >= 1 && e > 0) || (u <= 0 && e < 0))) {
        integral += e * dt;
      }

      I_part = (Ti !== 50) ? (Kp / Ti) * integral : 0; // If Ti == 50, I_part = 0
    } else {
      integral = 0; 
      I_part = 0;
    }
    // -- D Part --
    const alpha = 0.01;
    if(D_enable){

      let dy = (y - previousY) / dt;
      let filteredD = (1 - alpha) * previousDerivative + alpha * (-dy);
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

  let setpointSliderBox = select('#setpoint-slider-box').elt.getBoundingClientRect();
  let pBtn = select('#P-control').elt.getBoundingClientRect();
  let iBtn = select('#I-control').elt.getBoundingClientRect();
  let dBtn = select('#D-control').elt.getBoundingClientRect();

  let startX = setpointSliderBox.right-padding;

drawPIDLines(
  startX,
  0,
  {
    x: pBtn.left - canvasRect.left,
    y: pBtn.top + pBtn.height / 2 - canvasRect.top,
    x_right: pBtn.right - canvasRect.left,
    height: pBtn.height,
    width: pBtn.width
  },
  {
    x: iBtn.left - canvasRect.left,
    y: iBtn.top + iBtn.height / 2 - canvasRect.top,
    x_right: iBtn.right - canvasRect.left,
    height: iBtn.height,
    width: iBtn.width
  },
  {
    x: dBtn.left - canvasRect.left,
    y: dBtn.top + dBtn.height / 2 - canvasRect.top,
    x_right: dBtn.right - canvasRect.left,
    height: dBtn.height,
    width: dBtn.width
  }
);

}

function drawSimulation(){

  
  sliderTop.value(upperWaterPercent * tankSize);
  sliderBot.value(lowerWaterPercent * tankSize);

push();
  // Draw tanks
  fill(255); stroke(0);
  rect(x_upperTank+tankSize/2, y_upperTank, tankSize/2, tankSize);
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize + tankGap, tankSize/2, tankSize);

  // draw connector
  rect(x_upperTank+tankSize/2 + tankSize / 4 - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap);
  rect(x_upperTank+tankSize/2 + tankSize / 4 - connectorWidth / 2, y_upperTank + tankSize + tankSize + tankGap, connectorWidth, tankGap);
  // Draw water
  fill(0, 0, 255); noStroke();
  if(u >= 0.01) {
    rect(x_upperTank + tankSize*31/42,  y_upperTank - tankSize/7 ,connectorWidth/2, tankSize + tankSize/7);
  }
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize - upperWaterLevel, tankSize/2, upperWaterLevel); // Tank 1 water
  if (upperWaterPercent > 0.001) {
    rect(x_upperTank + tankSize*3/4  - connectorWidth / 2, y_upperTank + tankSize, connectorWidth, tankGap); // Connector water
    clogUpper ? 0 : rect(x_upperTank + tankSize*3/4- connectorWidth/4, y_upperTank + tankSize, connectorWidth/2, tankSize + tankGap); // Water flowing from connector
  }
  rect(x_upperTank+tankSize/2, y_upperTank + tankSize + tankGap + tankSize - lowerWaterLevel, tankSize/2, lowerWaterLevel); //Tank 2 water
  if (lowerWaterPercent > 0.001) {
    rect(x_upperTank + tankSize*3/4 - connectorWidth/2, y_upperTank + tankSize*2 + tankGap, connectorWidth, 40*scaleFactor); // Water flowing from connector
    clogLower ? 0 : rect(x_upperTank + tankSize*3/4 - connectorWidth/4, y_upperTank + tankSize*2 + tankGap*2, connectorWidth/2, 40*scaleFactor);
  }
  // WIP
  //drawOverflowEffect(x_upperTank + tankSize / 2, y_upperTank, isUpperOverflowing);
  //drawOverflowEffect(x_upperTank + tankSize / 2, y_upperTank + tankSize + tankGap, isLowerOverflowing);

  pop();

  // Drawing pump
  x_pump = x_upperTank + tankSize/3;
  y_pump = height*0.184;
  scaleFactor = tankSize/200;
  //drawPump(x_pump, y_pump, 0, scaleFactor)

  //Drawing lines with reservoir and showerhead
  drawReservoirScaled();

}

// Drawing of each line for drawControlImage
function drawPIDLines(startX, startY, pPos, iPos, dPos) {

  startY = iPos.y;

  push(); //Push/pop to save/restore default draw settings

  stroke(0);
  strokeWeight(2);

  //Commenting this so it makes sense.
  //This is the drawings from inflow rate (um) slider box, into the PID buttons. 
  // Please note, drawArrowhead(X,Y, angle) prints an arrowhead at the end of the line. This is sometimes used.

  // values for sum blocks
  const x_sumRight = pPos.x + width * 0.065;
  const x_sumLeft = pPos.x/1.17;
  const y_sum= iPos.y;
  const sumSize = 15;
  const mergingX = x_sumRight; 
  const splitX = pPos.x/1.07;

  //If automatic, first line from inflow box -> branch spot 
  if(control){
    line(startX, startY, splitX, iPos.y);
  }
  // If Manual, draw from Manual -> output box, added later.

  //This draws a veritcal line from yTop to ybottom where the first split occurs
  const yTop = pPos.y;
  const yBottom = dPos.y;
  line(splitX, yTop, splitX, yBottom);

  line(x_sumRight,iPos.y, x_sumLeft, iPos.y);

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
  const x_uBox = mergingX + width * 0.035;   
  line(pPos.x_right, pPos.y, mergingX, pPos.y);
  line(iPos.x_right, iPos.y, mergingX, iPos.y);
  line(dPos.x_right, dPos.y, mergingX, dPos.y);

  // Vertical line by merge point
  line(mergingX, yTop, mergingX, yBottom);

  // Drawing the control signal box (uBox)
  const y_uBox = iPos.y;
  drawBox(x_uBox, y_uBox, iPos.height, iPos.width, u, "Control Signal (u)");

// If automatic mode, draw line from sum to uBox
if(control){
  line(mergingX, iPos.y, x_uBox, iPos.y);
  drawArrowhead(x_uBox, iPos.y, 0);
  drawArrowhead(x_sumLeft-sumSize, y_sum, 0);
}
// If manual mode, draw from Manual slider box to uBox
  if(!control){
    const manSliderBoxX = startX - width * 0.113;
    const lineHeight = pPos.y - height*0.045;
    const x_manualuBox = x_uBox + width*0.03;
    const y_manualuBox = y_uBox - height * 0.025;
    line(manSliderBoxX, startY, manSliderBoxX, lineHeight);
    line(manSliderBoxX, lineHeight, x_manualuBox,lineHeight);
    line(x_manualuBox,lineHeight, x_manualuBox, y_manualuBox);
    drawArrowhead(x_manualuBox, y_manualuBox, pi/2);
  }
  
  //Drawing pump
  drawPump(x_pump, y_uBox, 0, scaleFactor)

  // Line from uBox to pump
  let pump_LEFT = x_pump-10 * scaleFactor;
  line(x_uBox+iPos.width*2, y_uBox, pump_LEFT, y_uBox);
  drawArrowhead(pump_LEFT, y_uBox);
  

  // Veritcal line from left sum block
  const y_output = dPos.y + tankSize/3;
  const x_outputBox = x_uBox; 
  line(x_sumLeft, y_sum, x_sumLeft, y_output);

  // Horisontal line across output box and inverter.
  line(x_sumLeft, y_output, x_outputBox, y_output);
  drawArrowhead(iPos.x + iPos.width, y_output, pi);

  //Inverter box
  drawBox(iPos.x, y_output, iPos.height, iPos.width/2, -1, "Inverter block");

  //

//Draws water heigh boxes and lines from tank into box
  if(controlLower){
    drawBox(x_outputBox, y_output, iPos.height, iPos.width, lowerWaterPercent, "Lower tank water (%)");
    line(x_outputBox+iPos.width/2 , y_upperTank+1.75*tankSize, x_outputBox+iPos.width/2, y_output+iPos.height/2);
    line(x_upperTank + tankSize/2 , y_upperTank+1.75*tankSize, x_outputBox+iPos.width/2, y_upperTank+1.75*tankSize);
    drawArrowhead(x_outputBox+iPos.width/2,y_output+iPos.height/2, 3*pi/2);
  }
  else{
  drawBox(x_outputBox, y_output, iPos.height, iPos.width, upperWaterPercent, "Upper tank water (%)");
  line(x_outputBox+iPos.width/2 , y_upperTank+tankSize/2, x_outputBox+iPos.width/2, y_output-iPos.height/2);
  line(x_upperTank + tankSize/2 , y_upperTank+tankSize/2, x_outputBox+iPos.width/2, y_upperTank+tankSize/2);
  drawArrowhead(x_outputBox+iPos.width/2,y_output-iPos.height/2, pi/2);
  } 
  push();
  let textMarigin = iPos.height/3;
  fill(0, 0, 0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(iPos.height * 0.5);
  let rText = 'u(t)  ';
  text(rText, x_uBox-textMarigin, iPos.y-textMarigin);
  let yText = 'y(t)  ';
  text(yText, x_outputBox-textMarigin, y_output-textMarigin);
  pop();

// Arrowhead into left sumblock
  drawArrowhead(x_sumLeft, y_sum+sumSize, 3*pi / 2);

  // Arrowheads into right sumblock
  drawArrowhead(x_sumRight-sumSize, y_sum, 0);
  drawArrowhead(x_sumRight, y_sum+sumSize, 3*pi / 2);
  drawArrowhead(x_sumRight, y_sum-sumSize, 1*pi / 2);

  
  drawSumBlock(x_sumLeft, y_sum, sumSize);
  drawSumBlock(x_sumRight, y_sum, sumSize);
  pop();
}


// Draws arrowhead end of line (Angle in radians. pi = 3.1415)
function drawArrowhead(x, y, angle) {
  push();
  translate(x, y);
  rotate(angle);
  fill(0);
  noStroke();
  triangle(0, 0, -10, 5, -10, -5);
  pop();
}

// Draws pump
function drawPump(x, y, angle, size = 1) {
  push();
  translate(x, y);
  rotate(angle);
  scale(size);

  // Circle around triangle
  fill(255);
  stroke(0);
  strokeWeight(2);
  ellipse(0, 0, 20, 20);  // Centered at 0,0. Diameter 20

  // Triangle
  noFill();
  stroke(0);
  strokeWeight(2);
  triangle(
    0, -8,    // Top point (a bit above center)
    -8, 4,    // Bottom left
    8, 4      // Bottom right
  );

  pop();
}

// Draws Sum block circle
function drawSumBlock(x, y, radius = 20) {

  push(); // Saves previous style settings
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

function drawBox(x,y, boxHeight, boxWidth, value, hoverText = ""){

  boxWidth = boxWidth / 0.5;
  y = y-boxHeight/2;
  push();
  stroke(0);
  fill(255);
  rect(x, y, boxWidth, boxHeight, 3);

  let uText = `${nf(value, 1, 2)}`;
  if(value == -1) {uText = `${nf(value, 1, 0)}`}

  fill(0, 0, 200);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(boxHeight * 0.5);
  text(uText, x + boxWidth/2, y + boxHeight/2);
  
  if (hoverText !== "" && !tooltipMap[hoverText]) {
    let labelDiv = createDiv(hoverText);
    labelDiv.class("hover-label");
    labelDiv.position(x, y - 20);
    labelDiv.hide();
  
    let hitBox = createDiv("");
    hitBox.position(x + boxWidth / 7, y + boxHeight / 4);
    hitBox.size(boxWidth, boxHeight);
    hitBox.style("opacity", "0");
    hitBox.style("position", "absolute");
  
    hitBox.mouseOver(() => labelDiv.show());
    hitBox.mouseOut(() => labelDiv.hide());
  
    tooltipMap[hoverText] = { labelDiv, hitBox };
  } 
  pop();
}

function drawDebug(){
  push();
  textAlign(LEFT, TOP);
  text(`Canvas: ${width} x ${height}`, 10, 10);
  text(`FPS: ${nf(frameRate(), 2, 1)}`, 10, 30);
  pop();
}

function drawClogToggles() {
  let upperX = x_upperTank + tankSize * 3/4;
  let upperY = y_upperTank + tankSize + tankGap;
  let lowerY = y_upperTank + 2 * tankSize + tankGap * 2;

  drawValveToggle(upperX, upperY, clogUpper, "Clog upper");
  drawValveToggle(upperX, lowerY, clogLower, "Clog lower");
  hoveringValve ? cursor(HAND) : cursor(ARROW);
  hoveringValve = false; 

}

function drawValveToggle(x, y, isClogged, hoverText) {
  const size = 16 * scaleFactor;
  y = y - size / 2;

  const isHovering = dist(mouseX, mouseY, x, y) < size*2;
  push();
  translate(x, y);
  rectMode(CENTER);
  strokeWeight(2);

  if (isHovering) {
    hoveringValve = true;
    stroke(50, 200, 255); 
    fill(200);          
  } else {
    stroke(0);
    fill('gray');
  }

  if (isClogged) {
    rect(0, 0, size, size);
  } else {
    rect(size, 0, size, size);
  }

  stroke(0);
  strokeWeight(4);
  line(-size / 2 + 2, 0, size / 2 - 2, 0);
  pop();

  if (isHovering) {
    let tooltipText = hoverText;
    textSize(12 * scaleFactor); 
    textAlign(CENTER, CENTER);
    let tw = textWidth(tooltipText);
    let th = textAscent() + textDescent();
    let paddingX = 8 * scaleFactor;
    let paddingY = 4 * scaleFactor;
  
    let boxWidth = tw + 2 * paddingX;
    let boxHeight = th + 2 * paddingY;
    push();
    rectMode(CENTER);
    noStroke();
    fill(0, 0, 0, 175); 
    rect(x, y - size - boxHeight, boxWidth, boxHeight, 4 * scaleFactor);
  
    fill(255); 
    text(tooltipText, x, y - size - boxHeight);
    pop();
  } 

}


function mousePressed() {
  let upperX = x_upperTank + tankSize * 3/4;
  let upperY = y_upperTank + tankSize + tankGap;
  let lowerY = y_upperTank + 2 * tankSize + tankGap * 2;
  const radius = 12 * scaleFactor;

  if (dist(mouseX, mouseY, upperX, upperY) < radius*3) {
    clogUpper = !clogUpper;
  }

  if (dist(mouseX, mouseY, upperX, lowerY) < radius*3) {
    clogLower = !clogLower;
  }
}

function clearTooltips() {
  for (let key in tooltipMap) {
    tooltipMap[key].labelDiv.remove();
    tooltipMap[key].hitBox.remove();
  }
  tooltipMap = {};
}

function drawOverflowEffect(x, y, isOverflowing) {
  if (isOverflowing) {
    push();
    stroke(0, 100, 255, 200);
    fill(100, 150, 255, 180);
    for (let i = 0; i < 5; i++) {
      ellipse(x + random(-10, 10), y + 10 + i * 8, 6, 6);
    }
    pop();

    if (frameCount % 30 < 20) {
      push();
      fill('red');
      textSize(14);
      textAlign(CENTER, BOTTOM);
      text("Overflow!", x, y - 10);
      pop();
    }
  }
}