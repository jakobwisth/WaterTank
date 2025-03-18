let slider;
let upper_waterLevel = 75; // Initial water height (middle level)
let lower_waterLevel = 0;
let filling = false;
let draining = false;
let previousWaterflowDrain = false;
let previousWaterflowFill = false;
let leaking = false;
let droplets = [];
let pauseSim = false;

function setup() {
    createCanvas(1000, 1000);
    
    // Create a slider
    slider = createSlider(0, 200, 1);
    slider.position(155, 155);
    slider.style('width', '200px'); // Make the slider wider
    slider.style('transform', 'rotate(270deg)');
    slider.style('height', '202px');
    slider.hide;
    
    // Detect when the user interacts with the slider
    slider.input(() => {
        //userAdjusting = true;
        upper_waterLevel = slider.value();
    });

    // Button to fill water
    let fillButton = createButton("Fill");
    fillButton.position(100, 50);
    fillButton.mousePressed(() => {
        filling = true;
        draining = false;
        //userAdjusting = false;
    });

    // Button to drain water
    let drainButton = createButton("Stop fill");
    drainButton.position(140, 50);
    drainButton.mousePressed(() => {
        draining = true;
        filling = false;
        //userAdjusting = false;
    });

    // Button to stop simulation
    let stopButton = createButton("Pause simulation");
    stopButton.position(230, 50);
    stopButton.mousePressed(() => {
        pauseSim = !pauseSim;
        leaking = false;
    });
}

function drawLeak() {
    // Add a new droplet occasionally
    if (frameCount % 5 === 0) { // Every 2 frames
        let droplet = {
            x: random(150, 350), // Random position near center
            y: 150, // Start just above the tank
            speed: random(1, 3), // Random falling speed
            duration: 0
        };
        droplets.push(droplet); // Add droplet to array
    }

    // Draw & update droplets
    for (let i = droplets.length - 1; i >= 0; i--) {
        let d = droplets[i];
        fill(100, 100, 255, 180);
        noStroke();
        ellipse(d.x, d.y, 5, 8); // Draw droplet
        if(d.duration<6){
            d.y-= d.speed;
        }else{d.y += d.speed;}
       

        if(d.x > 225){
            d.x += d.speed/2;
        } else{
            d.x -= d.speed/2;
        }
        d.duration++;
        // Remove if it goes too low
        if (d.y > 250) {
            droplets.splice(i, 1);
        }
    }
}
//  rect(150, 150, 200, 200);

function draw() {
    background(220);
    let x_upperTank = 150;
    let y_upperTank = 150;
    let tankSize = 200;
    let tankGap = 50;
    let connectorWidth = 10;

    // Upper Tank 
    fill(255);
    stroke(0);
    rect(x_upperTank, y_upperTank, tankSize, tankSize);
    //Lower tank
    fill(255);
    stroke(0);
    rect(x_upperTank, (y_upperTank+tankSize+tankGap), tankSize, tankSize);
    //Connector
    fill(255);
    stroke(0);
    rect((x_upperTank + tankSize/2 - connectorWidth/2), (y_upperTank+tankSize), connectorWidth, tankGap);


    // If the user is not manually adjusting, allow the simulation to control waterLevel
    if(!pauseSim) {
        //let calc_upperWater = 0;
        //let calc_lowerWater = 0;
        if (filling && upper_waterLevel < 200) {
            upper_waterLevel += 1; // Increase gradually
        }
        
        if(upper_waterLevel>0){
            upper_waterLevel -= 0.5;
        }
        if(lower_waterLevel > 0){
            lower_waterLevel -= 0.25
        }

        if(upper_waterLevel > 0 && lower_waterLevel< 200) {
            lower_waterLevel += 0.5;
        } 
        if (filling && upper_waterLevel >= 199 ){
            leaking = true;
        } else{
            leaking = false;
            newDroplets = [];
            droplets = newDroplets;
        }
        
    }

    // Always update the slider to reflect changes in waterLevel
      slider.value(upper_waterLevel);

    // Draw the water inside the tank
    fill(0, 0, 255);
    noStroke();
    rect(x_upperTank, y_upperTank+tankSize - upper_waterLevel, tankSize, upper_waterLevel);

    if(upper_waterLevel > 0){
        fill(0, 0, 255);
        noStroke();
        rect((x_upperTank + tankSize/2 - connectorWidth/2), (y_upperTank+tankSize), connectorWidth, tankGap);
    }

    fill(0, 0, 255);
    noStroke();
    rect(x_upperTank, x_upperTank+2*tankSize+tankGap - lower_waterLevel, tankSize, lower_waterLevel);

    if (leaking && !pauseSim) {
        drawLeak();
    }
}
