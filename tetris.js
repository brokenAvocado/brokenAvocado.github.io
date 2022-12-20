// Background canvas and context
var bg_canvas = document.getElementById("bg");
var bg_context = bg_canvas.getContext("2d");

// Foreground1 canvas and context
var fg1_canvas = document.getElementById("fg1");
var fg1_context = fg1_canvas.getContext("2d");

// Foreground2 canvas and context
var fg2_canvas = document.getElementById("fg2");
var fg2_context = fg2_canvas.getContext("2d");

// Global variables for functions dealing with game function
var boxLength = 25; // Constant block side length
var gridLoc = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []]; // Matrix for all grid positions

var sec_elapsed = 0; // Seconds elapsed
var min_elapsed = 0; // Minutes elapsed
var sec_str = ""; // Initializing the string to record time
var score = 0; // Counter for score

var start = false; // Start boolean (to get past the start menu)
var lose = false; // Lose boolean (to display the loss screen and stop gameplay)
var controlBlock; // Intialize the block that players control
var groundedBlocks = []; // Intialize the array to put all blocks that have reached the bottom 
var delay = 0; // Number of seconds to 

// Foreground #1: object to contain variables for drawing boxes (canvas and context), control display of each box
// withe clear() and engine() and also store game essential data like start/stop booleans and time 
var foreground1 = {
    canvas: fg1_canvas, 
    context: fg1_context,
    lastKey: "",
    game: "",
    time: "",
    // Overlays a transparent rectangle over an old frame to clear for drawing new box position
    clear: function() {     
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    // Initializes the variables for the setInterval functions
    engine: function() { 
        setInterval(main, 5); // animations for the boxes are refreshed every 5 ms
        setInterval(timer, 1000); // counts up in seconds every 1000 ms
    }
}

/* Background: displays a static grid at the beginning of the script, indicating which spaces the boxes are allowed to move
Has the ability to be initialized and cleared */
var background = {
    canvas: bg_canvas,
    context: bg_context,
    width: "4",
    color: "grey",
    // Intializes the grid width and color
    init: function() {
        this.context.lineWidth = this.width;
        this.context.strokeStyle = this.color;
    },
    // Same purpose as foreground1.clear()
    clear: function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

/* Foreground #2: object to contain control data for each box and also control the display of
each box */
var foreground2 = {
    canvas: fg2_canvas,
    context: fg2_context,
    lastKey: "",
    font: "15px alfa slab one, arial, san serif",
    color: "black",
    // Overlays a transparent rectangle over an old frame to clear for drawing new box position
    clear: function() {     
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    // Contains the main menu text in disjointed strings, so using a for loop you can iterate and display all lines
    intro_text: [ 
        "Instructions: boxes shift in the direction with", 
        "A and D keys (left and right), score high and",
        "survive as long as possible: ",
        "\u2022 Create layers of blocks by rotating (W key)",
        "which disappear after completion",
        "\u2022 Avoid filling up to the top of the grid",
        "\u2022 Place blocks down with Space Bar",
        "\u2022 Increase the pace that blocks fall with S key",
        " ",
        "Press any key to begin playing!"
    ],
    // Contains all lines for stop text
    lose_text: [
        "You lost, try again",
        "",
        "Refresh page to start again"
    ],
    // Displays the main or losing menu depending on the input "scene"
    display: function(scene) {
        var context = foreground2.context;
        var canvas = foreground2.canvas;
        var text ;
        var height = 0;
        context.font = this.font;
        context.style = this.color;
        context.textAlign = "center";
        // Switch will not only select the correct text but also height for the 
        // Text to center itself on the height's axis
        switch(scene) {
            case "intro": 
                text = this.intro_text;
                height = 25*5;
                break;
            case "lose":
                text = this.lose_text;
                height = 25*6.5;
                break;
            default: 
                text = "error";
                break;
        }
        context.fillStyle = "antiquewhite";
        // Overlays a white background for the text, otherwise background grid would show up
        context.fillRect(0, 0, canvas.width, canvas.height);
        for(var i=0; i<text.length; i++) {
            // Writes each line and adjusts the height as it lays out each line
            context.strokeText(text[i], canvas.width/2, height);
            height+=25
        }
    }
}

/* block() object constructor, everytime it is envoked, it will create an object
Inputs
------
color : String
    color of block being drawn
matrix : Array
    array that describes the shape of the sprite based on block positions on grid
index : int
    determines the orientation of the shape

Output
------
None */
function block(color, matrix, index) {
    this.color = color,
    this.shape = matrix,
    this.index = index
}


/* shapes object: contains all possible orientations and sprite shapes, although there are 7
unique shapes, not all shapes need a unique orientation, and some could get rotated by reversing
the elements on the row arrays (refer to rotate() function below)

shape in this context means the matrix of 1's and 0's that define what blocks need to be colored in
on the main grid and what do not

The primary indices (the last input on block()):
1 = line 
2 = J-block (8, 9, 10 are its rotated shapes)
3 = L-block (11, 12, 13 are its rotated shapes)
4 = square
5 = S-block
6 = T-block (11, 12, 13 are its rotated shapes)
7 = Z-block */
var shapes = {
    1: new block("#00AFE2", [[1, 1, 1]], 1),
    2: new block("#3339FF", [[1, 0, 0], [1, 1, 1]], 2),
    3: new block("#FFA833", [[0, 0, 1], [1, 1, 1]], 3),
    4: new block("#FFF033", [[1, 1], [1, 1]], 4),
    5: new block("#46FF33", [[0, 1, 1], [1, 1, 0]], 5),
    6: new block("#A32CC4", [[0, 1, 0], [1, 1, 1]], 6),
    7: new block("red", [[1, 1, 0], [0, 1, 1]], 7),
    8: new block("#3339FF", [[1, 1], [1, 0], [1, 0]], 8),
    9: new block("#3339FF", [[1, 1, 1], [0, 0, 1]], 9),
    10: new block("#3339FF", [[0, 1], [0, 1], [1, 1]], 10),
    11: new block("#FFA833", [[1, 0], [1, 0], [1, 1]], 11),
    12: new block("#FFA833", [[1, 1, 1], [1, 0, 0]], 12),
    13: new block("#FFA833", [[1, 1], [0, 1], [0, 1]], 13),
    14: new block("#A32CC4", [[1, 0], [1, 1], [1, 0]], 14),
    15: new block("#A32CC4", [[1, 1, 1], [0, 1, 0]], 15),
    16: new block("#A32CC4", [[0, 1], [1, 1], [0, 1]], 16)
}

// Grid: an object constructor to make new grid spaces within a matrix 
// called gridLoc, which holds all possible grids the boxes can move in
function grid(row, col, x, y) {
    this.row_ind = row,
    this.col_ind = col,
    this.pos_x = x,
    this.pos_y = y
}

/* initGrid(): add grid() objects to the gridLoc() matrix to make referencing to pixel positions
easier. To get pixel position, it would just require an index on row and column, which makes calculations
simple.

Input
-----
None

Output
------
None */
function initGrid() {
    // Initialize a matrix of 12x20 spaces to control the shapes that will fall and create layers 
    var row = boxLength/2;
    var col = boxLength/2;

    for(var i=0; i<20; i++) {
        for(var j=0; j<12; j++) {
            // Creating rectangle outlines was a piece of code from w3schools
            // Citation: https://www.w3schools.com/tags/canvas_rect.asp
            // The use of rect() was not a novel idea by me
            background.context.beginPath();
            // Colors the top 3 rows in red to indicate a dangerous spot for player
            if(i < 3) background.context.strokeStyle = "red";
            else background.context.strokeStyle = background.color;
            // gridLoc filled by each indice
            gridLoc[i][j] = new grid(i, j, row, col);
            background.context.rect(row-boxLength/2, col-boxLength/2, boxLength, boxLength);
            background.context.stroke();
            row += boxLength;
        }
        col += boxLength;
        row = boxLength/2;
    }
}

/* drawShapes: takes object pointer and its properties to draw its shape on the grid
Input
-----
block : object reference
    contains color, shape, and its grid position

Output
------
None */
function drawShapes(block) {
    // Extract block color, shape, and its grid position
    fg1_context.fillStyle = block.color;
    framework = block.shape;
    drawGrid = block.grid;

    // Iterate through the shape matrix to obtain what it looks like
    for (let i=0; i < framework.length; i++) {
        for (let j = 0; j < framework[0].length; j++) {
            // 0's will be ignored
            if(framework[i][j] == 0) continue;
            // Set the block color before fill in the block grid
            fg1_context.fillStyle = block.color;
            fg1_context.fillRect(drawGrid.pos_x - boxLength/2 + i*boxLength, drawGrid.pos_y - boxLength/2 + j*boxLength, boxLength, boxLength)
        }
    }
}

/* drawShapes: takes object pointer and its properties to draw its shape on the grid
Input
-----
block : object reference
    contains color, shape, and its grid position

Output
------
None */
function transpose(matrix) {
    newRows = [];
    newMatrix = [];
    for(let i = 0; i < matrix[0].length; i++) {
        for(let j = 0; j < matrix.length; j++) {
            newRows.push(matrix[j][i]);
        }
        newMatrix.push(newRows.reverse());
        newRows = [];
    }
    return newMatrix
}

/* move_left(), move_right(), move_down(): all movement functions that first checks for collisions at the side
and then moves the block in the respective direction

Input
-----
None

Output
------
None */
function move_left() {
    oldGrid = controlBlock.grid;
    if (check_sides(1, false)) controlBlock.grid = gridLoc[oldGrid.row_ind][oldGrid.col_ind - 1];
}

function move_right() {
    oldGrid = controlBlock.grid;
    if (check_sides(2, false)) controlBlock.grid = gridLoc[oldGrid.row_ind][oldGrid.col_ind + 1];
}

function move_down() {
    oldGrid = controlBlock.grid;
    if (check_bottom()) controlBlock.grid = gridLoc[oldGrid.row_ind + 1][oldGrid.col_ind];
}


/* place(): instantly lowers the block to the bottom of the game grid, as low as it can go without colliding 
with the bottom or another block

Input
-----
None

Output
------
None */
function place() {
    oldGrid = controlBlock.grid;
}

/* rotate(): switches between sprites of the same shape but different orinetation based on the index number,
will cycle through to the first index number and restart the cycle

Input
-----
None

Output
------
None */
function rotate() {
    oldIndex = controlBlock.index;
    oldGrid = controlBlock.grid;
    switch(controlBlock.index) {
        case 2:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[8];
            controlBlock.grid = oldGrid;
            break;
        case 3:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[11];
            controlBlock.grid = oldGrid;
            break;
        case 6: 
            oldGrid = controlBlock.grid;
            controlBlock = shapes[14];
            controlBlock.grid = oldGrid;
            break;
        case 8:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[9];
            controlBlock.grid = oldGrid;
            break;
        case 11:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[12];
            controlBlock.grid = oldGrid;
            break;
        case 14: 
            oldGrid = controlBlock.grid;
            controlBlock = shapes[15];
            controlBlock.grid = oldGrid;
            break;
        case 9:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[10];
            controlBlock.grid = oldGrid;
            break;
        case 12:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[13];
            controlBlock.grid = oldGrid;
            break;
        case 15: 
            oldGrid = controlBlock.grid;
            controlBlock = shapes[16];
            controlBlock.grid = oldGrid;
            break;
        case 10:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[2];
            controlBlock.grid = oldGrid;
            break;
        case 13:
            oldGrid = controlBlock.grid;
            controlBlock = shapes[3];
            controlBlock.grid = oldGrid;
            break;
        case 16: 
            oldGrid = controlBlock.grid;
            controlBlock = shapes[6];
            controlBlock.grid = oldGrid;
            break;
        default:
            controlBlock.shape = transpose(controlBlock.shape);
            break;
    }
    if (!check_sides(2, false)) controlBlock.grid = gridLoc[oldGrid.row_ind][oldGrid.col_ind - check_sides(2, true)];
}

/* tetris(): checks for completed layers and tracks what layers have been completed

Input
-----
None

Output
------
None */
function tetris() {
    count = 0;
    layers = []; // row indices where completed layers are
    tetrisInd = []; // indices within groundedBlocks that need to be removed due to completion of a layer
    temp = [];
    // iterate through all blocks that reached the bottom
    for(let i = 0; i < 20; i++) {
        for(let k = 0; k < groundedBlocks.length; k++) {
            // if identical row indices are detected within grounded blocks, add to the counter of layers made and 
            // push these indices into a temporary array
            if(groundedBlocks[k].grid.row_ind == i) {
                count++;
                temp.push(k);
            }
        }
        // if the number of blocks reaches the 12 needed to complete a layer, add it to the tetrisInd array 
        if(temp.length == 12) {
            temp.forEach(function(value) {tetrisInd.push(value);});
            score += 12;
            layers.push(i);
        }
        // reset counting of layers and temporary array
        count = 0;
        temp = [];
    }
    // sort the indices from greatest to least and with each element, remove it from the groundedBlocks array
    tetrisInd.sort(function(a,b){return a-b;}).reverse().forEach(function(value) {
        groundedBlocks.splice(value, 1);
    });
    // if there have been completed layers, iterate through each grounded block and shift their row index down 1 to
    // account for the now missing layer 
    if (layers.length != 0) {
        groundedBlocks.forEach(function(value) {
            for (let i = 0; i < layers.length; i++) {
                if (layers[i] > value.grid.row_ind) {
                    value.grid = gridLoc[value.grid.row_ind+1][value.grid.col_ind];
                }
            }
        });
    }
}

/* check_sides(): checks for collisions to the side of the currently controlled block

Input
-----
direction : int
    1 (left) or 2 (right), tells function what side to watch out for
rotate : boolean
    true means to check for side collision while in rotation
    false means to check for collisions due to moving block to the side

Output
------
if rotate = false, boolean returned
    this boolean indicates a collision
if rotate = true, int is returned
    this integer determines how much our controlled shape needs to shift to avoid phasing into
    another block */
function check_sides(direction, rotate) {
    framework = controlBlock.shape;
    drawGrid = controlBlock.grid;
    outIndex = 0;
    // iterate through the shape matrix, which is added to the current block position on the grid to 
    // check the boundary of each shape
    for (let i = 0; i < framework.length; i++) {
        for (let j = 0; j < framework[0].length; j++) {
                if(!rotate) {
                    if(framework[i][j] == 0) continue;
                    // the following conditional checks if the control block will go inside the grounded block, and
                    // to return a false boolean to prevent movement inside
                    if(drawGrid.col_ind + i + 2 > gridLoc[0].length && direction == 2) return false;
                    else if (drawGrid.col_ind - 1 < 0 && direction == 1) return false;

                    // iterate through all groundedBlocks and check to see if the control block would intersect any grounded block index
                    for (let k = 0; k < groundedBlocks.length; k++) { 
                        if(direction == 1 && drawGrid.col_ind + i - 1 == groundedBlocks[k].grid.col_ind && drawGrid.row_ind + j== 
                            groundedBlocks[k].grid.row_ind) return false; 
                        else if(direction == 2 && drawGrid.col_ind + i + 1 == groundedBlocks[k].grid.col_ind && drawGrid.row_ind + j  == 
                            groundedBlocks[k].grid.row_ind) return false;
                    }
                }
                else {
                    // checks if rotated control block intersects the wall
                    if(drawGrid.col_ind + i + 1 > gridLoc[0].length) {
                        tempIndex = drawGrid.col_ind + i + 1 - gridLoc[0].length;
                        if(framework[i][j] == 0) continue;
                        if(tempIndex > outIndex) outIndex = tempIndex;
                        else continue;
                    }
                    // checks if rotated control block intersects another block
                    else {
                        for (let k = 0; k < groundedBlocks.length; k++) { 
                            if(drawGrid.col_ind + i == groundedBlocks[k].grid.col_ind && drawGrid.row_ind + j  == 
                                groundedBlocks[k].grid.row_ind) {
                                    console.log(drawGrid.col_ind + i);
                                    console.log(groundedBlocks[k].grid.col_ind);
                                    outIndex = 1;
                            }
                        }
                    }
                }
            }
        }
    if(!rotate) return true;
    else return outIndex;
}

/* check_bottom(): checks for the bottom block or bottom-most floor

Input
-----
None

Output
------
boolean
    indicates if there is something at the bottom */
function check_bottom() {
    framework = controlBlock.shape;
    drawGrid = controlBlock.grid;
    for (let i = 0; i < framework.length; i++) {
        for (let j = 0; j < framework[0].length; j++) {
            if(framework[i][j] == 0) continue;
            if(drawGrid.row_ind + j + 2 > gridLoc.length) return false;
            for (let k = 0; k < groundedBlocks.length; k++) { if(drawGrid.row_ind + j + 1 == groundedBlocks[k].grid.row_ind 
                && drawGrid.col_ind + i == groundedBlocks[k].grid.col_ind) return false; }
        }
    }
    return true;
}

/* timer(): keeps track of time in terms of minutes and seconds

Input
-----
None

Output
------
string
    outputs formatted time with colon separate minutes from seconds */
function timer() {
    if(start) {
        sec_elapsed += 1;
        if (sec_elapsed == 60) {
            min_elapsed += 1;
            sec_elapsed = 0;
        }
        if (sec_elapsed < 10) {
            sec_str = "0"+sec_elapsed;
        }
        else {
            sec_str = sec_elapsed;
        }
        document.getElementById("time").innerText = min_elapsed + ":" + sec_str;   
    }
    return min_elapsed + ":" + sec_str;
}

// initialize background color and the grid aesthetics
background.init();

// intialize gridLoc
initGrid();

// initialize a new shape (with a random shape type)
controlBlock = shapes[Math.floor(Math.random()*7)+1];

// place new shape at the top of the grid
controlBlock.grid = gridLoc[0][7];

// display the intro screen
foreground2.display("intro");

// listen for any key to begin game
document.addEventListener('keydown', function (c) {
    start = true;
    foreground2.clear();
});

// main(): used to animate all objects simultaneously with player control, 
// and it creates the start and ending screens
function main() {
    foreground1.clear();
    // listens to key presses on the website itself
    document.addEventListener('keydown', function (c) {
        // first conditional prevents any control from holding arrow keys, and second
        // only allows for movement after all boxes have stopped moving
        if(foreground1.lastKey != c.key) {
            switch(c.key) {
                case "a":
                    move_left();
                    break;
                case "d":
                    move_right();
                    break;
                case "s":
                    move_down();
                    break;
                case "w":
                    rotate();
                    break;
                case " ":
                    move_down();
                    break;
                default:
                    break;
            }
        }
        if(c.key != " ") foreground1.lastKey = c.key;
    });
    // holding down an arrow key will not move the boxes, so this is
    // to reset any hold down 
    document.addEventListener('keyup', function (c) { 
        foreground1.lastKey = "none";
    });

    // if the player pressed any key to get out of start menu, the game officially starts
    if(start) {
        // searches for any completed layers
        tetris();

        // modify the html element that has the ID "score," changes the score counter in real time
        document.getElementById("score").innerText = score;

        // draw all grounded blocks
        for (let i = 0; i < groundedBlocks.length; i++) {
            drawShapes(groundedBlocks[i]);
        }
        // draw the currently controlled block
        drawShapes(controlBlock);
        
        oldGrid = controlBlock.grid;
        delay += 1;

        // check to see if control block has reached the bottom limit (floor or grounded block)
        if(!check_bottom()) {
            // if the bottom has been reached, run the follow
            color = controlBlock.color;
            matrix = controlBlock.shape;
            row = oldGrid.row_ind;
            col = oldGrid.col_ind; 
            
            // iterate through the control block and convert its shape into "grounded blocks," which are blocks
            // not under player control but still need to be drawn and accounted for in collisions
            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[0].length; j++) {
                    if(matrix[i][j] == 0) continue;
                    groundedBlocks.push(new block(color, [[1]], 0));
                    groundedBlocks[groundedBlocks.length-1].grid = gridLoc[row + j][col + i];
                }
            }

            // spawn a new control block with random shape
            controlBlock = shapes[Math.floor(Math.random()*7)+1];
            controlBlock.grid = gridLoc[1][6];
            delay = 0;
        }

        // iterate through grounded blocks, and if the blocks stach up to the 3rd row, change start and lose booleans
        // to reflect that the player has lost and can no longer play
        for(let i = 0; i < groundedBlocks.length; i++) {
            if(groundedBlocks[i].grid.row_ind < 3) {
                start = false;
                lose = true;
            }
        }

        // every 300 ms, move the control block down, refresh block positions and draw new blocks
        if(delay > 60) {
            controlBlock.grid = gridLoc[oldGrid.row_ind + 1][oldGrid.col_ind];
            delay = 0;
        }
    }
    // dispaly lose screen
    else if (lose) {
        clearInterval(foreground1.game);
        clearInterval(foreground1.time);
        foreground2.display("lose");
    }
}