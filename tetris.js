//background canvas and context
var bg_canvas = document.getElementById("bg");
var bg_context = bg_canvas.getContext("2d");

//foreground1 canvas and context
var fg1_canvas = document.getElementById("fg1");
var fg1_context = fg1_canvas.getContext("2d");

//foreground2 canvas and context
var fg2_canvas = document.getElementById("fg2");
var fg2_context = fg2_canvas.getContext("2d");

//global variables for functions dealing with game function
//including win and loss determination
var boxLength = 25;
var gridLoc = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];

//global variables for determining time elapsed
var sec_elapsed = 0;
var min_elapsed = 0;
var sec_str = "";
var score = 0;

//global variable for main()
var start = false;
var lose = false;
var controlBlock;
var groundedBlocks = [];
var delay = 0;

/* foreground #1: object to contain control data 
for each box and also control the display of
each box 
*/
var foreground1 = {
    canvas: fg1_canvas,
    context: fg1_context,
    lastKey: "",
    game: "",
    time: "",
    //overlays a transparent rectangle over an old frame to clear for drawing new box position
    clear: function() {     
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    //initializes the variables for the set interval functions
    engine: function() { 
        setInterval(main, 5); // animations for the boxes are refreshed every 20 ms
        setInterval(timer, 1000);
    }
}

/* background: displays a static grid at the beginning of the script, indicating 
which spaces the boxes are allowed to move*/
var background = {
    canvas: bg_canvas,
    context: bg_context,
    width: "4",
    color: "grey",
    //intializes the grid width and color
    init: function() {
        this.context.lineWidth = this.width;
        this.context.strokeStyle = this.color;
    },
    //same purpose as foreground1.clear()
    clear: function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

/* foreground #2: object to contain control data 
for each box and also control the display of
each box 
*/
var foreground2 = {
    canvas: fg2_canvas,
    context: fg2_context,
    lastKey: "",
    font: "15px alfa slab one, arial, san serif",
    color: "black",
    //overlays a transparent rectangle over an old frame to clear for drawing new box position
    clear: function() {     
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
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
    lose_text: [
        "You lost, try again",
        "",
        "Refresh page`   to start again"
    ],
    display: function(scene) {
        var context = foreground2.context;
        var canvas = foreground2.canvas;
        var text ;
        var height = 0;
        context.font = this.font;
        context.style = this.color;
        context.textAlign = "center";
        // switch will not only select the correct text but also height for the 
        // text to center itself on the height's axis
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
        //overlays a white background for the text, otherwise background grid shows up
        context.fillRect(0, 0, canvas.width, canvas.height);
        for(var i=0; i<text.length; i++) {
            // writes each line and adjusts the height as it lays out each line
            context.strokeText(text[i], canvas.width/2, height);
            height+=25
        }
    }
}

function block(color, matrix, index) {
    this.color = color,
    this.shape = matrix,
    this.index = index
}

/* box: object constructor, when called it will create a new box with unique properties.
It is built in with its own movement and combining functions so players only control 
what direction the boxes shift

1 = line
2 = J-block
3 = L-block
4 = square
5 = S-block
6 = T-block
7 = Z-block

*/

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

// grid: an object constructor to make new grid spaces within a larger array 
// called gridLoc, which holds all possible grids the boxes can move in
function grid(row, col, x, y) {
    this.row_ind = row,
    this.col_ind = col,
    this.pos_x = x,
    this.pos_y = y
}

function initGrid() {
    /* Initialize a matrix of 12x20 spaces to control the shapes that will fall and create layers */
    var row = boxLength/2;
    var col = boxLength/2;

    for(var i=0; i<20; i++) {
        for(var j=0; j<12; j++) {
            //creating rectangle outlines was a piece of code from w3schools
            //citation: https://www.w3schools.com/tags/canvas_rect.asp
            //the use of rect() was not a novel idea by me
            background.context.beginPath();
            if(i < 3) background.context.strokeStyle = "red";
            else background.context.strokeStyle = background.color;
            gridLoc[i][j] = new grid(i, j, row, col);
            background.context.rect(row-boxLength/2, col-boxLength/2, boxLength, boxLength);
            background.context.stroke();
            row += boxLength;
        }
        col += boxLength;
        row = boxLength/2;
    }
}

function drawShapes(block) {
    fg1_context.fillStyle = block.color;
    framework = block.shape;
    drawGrid = block.grid;
    for (let i=0; i < framework.length; i++) {
        for (let j = 0; j < framework[0].length; j++) {
            if(framework[i][j] == 0) continue;
            fg1_context.fillStyle = block.color;
            fg1_context.fillRect(drawGrid.pos_x - boxLength/2 + i*boxLength, drawGrid.pos_y - boxLength/2 + j*boxLength, boxLength, boxLength)
        }
    }
}

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

function place() {
    oldGrid = controlBlock.grid;
}

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

function tetris() {
    count = 0;
    layers = [];
    tetrisInd = [];
    temp = [];
    for(let i = 0; i < 20; i++) {
        for(let k = 0; k < groundedBlocks.length; k++) {
            if(groundedBlocks[k].grid.row_ind == i) {
                count++;
                temp.push(k);
            }
        }
        if(temp.length == 12) {
            temp.forEach(function(value) {tetrisInd.push(value);});
            score += 12;
            layers.push(i);
        }
        count = 0;
        temp = [];
    }
    tetrisInd.sort(function(a,b){return a-b;}).reverse().forEach(function(value) {
        groundedBlocks.splice(value, 1);
    });
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

function check_sides(direction, rotate) {
    framework = controlBlock.shape;
    drawGrid = controlBlock.grid;
    outIndex = 0;
    for (let i = 0; i < framework.length; i++) {
        for (let j = 0; j < framework[0].length; j++) {
                if(!rotate) {
                    if(framework[i][j] == 0) continue;
                    if(drawGrid.col_ind + i + 2 > gridLoc[0].length && direction == 2) return false;
                    else if (drawGrid.col_ind - 1 < 0 && direction == 1) return false;
                    for (let k = 0; k < groundedBlocks.length; k++) { 
                        if(direction == 1 && drawGrid.col_ind + i - 1 == groundedBlocks[k].grid.col_ind && drawGrid.row_ind + j== 
                            groundedBlocks[k].grid.row_ind) return false; 
                        else if(direction == 2 && drawGrid.col_ind + i + 1 == groundedBlocks[k].grid.col_ind && drawGrid.row_ind + j  == 
                            groundedBlocks[k].grid.row_ind) return false;
                    }
                }
                else {
                    if(drawGrid.col_ind + i + 1 > gridLoc[0].length) {
                        tempIndex = drawGrid.col_ind + i + 1 - gridLoc[0].length;
                        if(framework[i][j] == 0) continue;
                        if(tempIndex > outIndex) outIndex = tempIndex;
                        else continue;
                    }
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

background.init();
initGrid();
controlBlock = shapes[1];
controlBlock.grid = gridLoc[0][7];

foreground2.display("intro");
document.addEventListener('keydown', function (c) {
    start = true;
    foreground2.clear();
});

//main: used to animate all objects simultaneously with player control, 
//and it creates the start and ending screens
function main() {
    foreground1.clear();
    document.addEventListener('keydown', function (c) {
        //first conditional prevents any control from holding arrow keys, and second
        //only allows for movement after all boxes have stopped moving
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
    //holding down an arrow key will not move the boxes, so this is
    //to reset any hold down 
    document.addEventListener('keyup', function (c) { 
        foreground1.lastKey = "none";
    });
    if(start) {
        tetris();
        document.getElementById("score").innerText = score;
        for (let i = 0; i < groundedBlocks.length; i++) {
            drawShapes(groundedBlocks[i]);
        }
        drawShapes(controlBlock);
        
        oldGrid = controlBlock.grid;
        delay += 1;

        if(!check_bottom()) {
            color = controlBlock.color;
            matrix = controlBlock.shape;
            row = oldGrid.row_ind;
            col = oldGrid.col_ind; 
            
            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[0].length; j++) {
                    if(matrix[i][j] == 0) continue;
                    groundedBlocks.push(new block(color, [[1]], 0));
                    groundedBlocks[groundedBlocks.length-1].grid = gridLoc[row + j][col + i];
                }
            }

            controlBlock = shapes[Math.floor(Math.random()*7)+1];
            controlBlock.grid = gridLoc[1][6];
            delay = 0;
        }

        for(let i = 0; i < groundedBlocks.length; i++) {
            if(groundedBlocks[i].grid.row_ind < 3) {
                start = false;
                lose = true;
            }
        }

        if(delay > 60) {
            console.log("moved");
            controlBlock.grid = gridLoc[oldGrid.row_ind + 1][oldGrid.col_ind];
            delay = 0;
        }
    }
    else if (lose) {
        clearInterval(foreground1.game);
        clearInterval(foreground1.time);
        foreground2.display("lose");
    }
}