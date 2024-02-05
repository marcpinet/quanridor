const canvas = document.querySelector("canvas")
const context = canvas.getContext('2d')
const player1 = document.getElementById("player1")
const player2 = document.getElementById("player2")
const anticheat = document.getElementsByClassName("anticheat")
const ready = document.getElementById("ready")
const win = document.getElementById("win")
const smoke = document.getElementById("smoke")
const confirm = document.getElementById("confirm")

canvas.width = 703
canvas.height = 703

function drawRoundedRect(x, y, width, height, radius, color) {
    context.beginPath();

    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius)
    context.arcTo(x + width, y + height, x, y + height, radius)
    context.arcTo(x, y + height, x, y, radius)
    context.arcTo(x, y, x + width, y, radius)

    context.fillStyle = color
    context.fill()
    context.closePath()
}

function drawRoundedRect(x, y, width, height, radius, color) {
    context.beginPath()

    context.moveTo(x + radius, y)
    context.arcTo(x + width, y, x + width, y + height, radius)
    context.arcTo(x + width, y + height, x, y + height, radius)
    context.arcTo(x, y + height, x, y, radius)
    context.arcTo(x, y, x + width, y, radius)

    context.fillStyle = color
    context.fill()
    context.closePath()

    // Return the rectangle information for clearing
    return { x: x, y: y, width: width, height: height }
}


function clearRoundedRect(rect) {
    context.clearRect(rect.x, rect.y, rect.width, rect.height)
}



let tour = 0
let p1_coord = [4,8]
let p2_coord = [4,0]
let playing = true
let select1 = false
let select2 = false
let p1_walls = 10
let p2_walls = 10
let v_walls = []
let h_walls = []
let current_direction = 'v'
let temp_wall = []

let board_visibility = [[-1, -1, -1, -2, -2, -2, -1, -1, -1],
                        [-1, -1, -1, -1, -2, -1, -1, -1, -1],
                        [-1, -1, -1, -1, -1, -1, -1, -1, -1],
                        [-1, -1, -1, -1, -1, -1, -1, -1, -1],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [1, 1, 1, 1, 1, 1, 1, 1, 1],
                        [1, 1, 1, 1, 1, 1, 1, 1, 1],
                        [1, 1, 1, 1, 2, 1, 1, 1, 1],
                        [1, 1, 1, 2, 2, 2, 1, 1, 1]]

function isLegal(player, new_coord) {
    let x = new_coord[0]
    let y = new_coord[1]
    if (player == 1) {
        if (x == p2_coord[0] && y == p2_coord[1] || x == p1_coord[0] && y == p1_coord[1]) return false
        if (Math.abs(x-p1_coord[0]) > 1 || Math.abs(y-p1_coord[1]) > 1) return false
        if (Math.abs(x-p1_coord[0]) == 1 && Math.abs(y-p1_coord[1]) == 1) return false
        for (let wall of v_walls) {
            if (wall[0]==p1_coord[0] && (wall[1]==p1_coord[1] || wall[1]==p1_coord[1]-1) && x-p1_coord[0]==1) return false
            if (wall[0]==p1_coord[0]-1 && (wall[1]==p1_coord[1] || wall[1]==p1_coord[1]-1) && p1_coord[0]-x==1) return false
        }
        for (let wall of h_walls) {
            if (wall[1]==p1_coord[1] && (wall[0]==p1_coord[0] || wall[0]==p1_coord[0]-1) && y-p1_coord[1]==1) return false
            if (wall[1]==p1_coord[1]-1 && (wall[0]==p1_coord[0] || wall[0]==p1_coord[0]-1) && p1_coord[1]-y==1) return false
        }
    }
    else {
        if (x == p1_coord[0] && y == p1_coord[1] || x == p2_coord[0] && y == p2_coord[1]) return false
        if (Math.abs(x-p2_coord[0]) > 1 || Math.abs(y-p2_coord[1]) > 1) return false
        if (Math.abs(x-p2_coord[0]) == 1 && Math.abs(y-p2_coord[1]) == 1) return false
        for (let wall of v_walls) {
            if (wall[0]==p2_coord[0] && (wall[1]==p2_coord[1] || wall[1]==p2_coord[1]-1) && x-p2_coord[0]==1) return false
            if (wall[0]==p2_coord[0]-1 && (wall[1]==p2_coord[1] || wall[1]==p2_coord[1]-1) && p2_coord[0]-x==1) return false
        }
        for (let wall of h_walls) {
            if (wall[1]==p2_coord[1] && (wall[0]==p2_coord[0] || wall[0]==p2_coord[0]-1) && y-p2_coord[1]==1) return false
            if (wall[1]==p2_coord[1]-1 && (wall[0]==p2_coord[0] || wall[0]==p2_coord[0]-1) && p2_coord[1]-y==1) return false
        }
    }
    return true
}

function isWallLegal(player, coord) {
    if ((player==1 && p1_walls==0) || (player==2 && p2_walls==0)) return false
    if (coord[0]>7 || coord[0]<0 || coord[1]>7 || coord[1]<0) return false
    return true
}

function getPlayerNeighbour(coord) {
    const x = coord[0];
    const y = coord[1];
    const neighbors = [];

    neighbors.push([x,y])
    if (x > 0) neighbors.push([x - 1, y]);
    if (x < 8) neighbors.push([x + 1, y]);
    if (y > 0) neighbors.push([x, y - 1]);
    if (y < 8) neighbors.push([x, y + 1]);

    return neighbors;
}

function checkWin(player) {
    return (player == 1 && p1_coord[1]==0) || (player == 2 && p2_coord[1]==8)
}

function placeWall(coord, direction) {
    if (direction == "v") v_walls.push(coord)
    else h_walls.push(coord)
}

function drawWalls() {
    for (let wall of v_walls) {
        drawRoundedRect(77*(wall[0]+1), 10+wall[1]*77, 10, 2*67+10, 5, '#FFFFFF')
    }

    for (let wall of h_walls) {
        drawRoundedRect(10+wall[0]*77, 77*(wall[1]+1), 2*67+10, 10, 5, '#FFFFFF')
    }
}

function clearTempWall() {
    temp_wall = []
    drawBoard()
}

function drawTempWall(coord, direction) {
    let color = '#F1A7FF'
    clearTempWall()
    if (direction == 'v') {
        drawRoundedRect(77*(coord[0]+1),10+coord[1]*77, 10, 2*67+10, 5, color)
    }
    if (direction == 'h')  {
        drawRoundedRect(10+coord[0]*77,77*(coord[1]+1), 2*67+10, 10, 5, color)
    }
    temp_wall = coord
}

function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    let gradient = context.createLinearGradient(0, 0, 0, canvas.height)

    gradient.addColorStop(0, "rgba(255, 0, 61, 0.5)")
    gradient.addColorStop(1, "rgba(94, 0, 188, 0.5)")
    // '#161A3D'
    drawRoundedRect(0, 0, 703, 703, 20, gradient)

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            let color
            if (tour % 2 == 0) {
                player1.style.display = 'block'
                color = board_visibility[j][i]>=0 ? '#EE4F3A' : '#FFFFFF' //'rgba(238, 79, 58, 0.5)'
                player2.style.display = board_visibility[p2_coord[1]][p2_coord[0]]<0 ? 'none' : 'block'
            }
            else {
                player2.style.display = "block"
                color = board_visibility[j][i]<=0 ? '#EE4F3A' : '#FFFFFF'
                player1.style.display = board_visibility[p1_coord[1]][p1_coord[0]]>0 ? 'none' : 'block'
            }
            drawRoundedRect((i+1)*10+i*67, (j+1)*10+j*67, 67, 67, 20, color)
        }
    }
    drawWalls()
}

drawBoard()

function getCaseFromCoord(x,y) {
    return [Math.floor(x/77), Math.floor(y/77)]
}

function movePlayer(player, coord) {
    let legal = false
    if (player == 1) {
        legal = true
        p1_coord = coord
        player1.style.top = 26 + coord[1]*77 + 'px'
        player1.style.left = 26 + coord[0]*77 + 'px'
        select1 = false
    }
    else {
        legal = true
        p2_coord = coord
        player2.style.top = 26 + coord[1]*77 + 'px'
        player2.style.left = 26 + coord[0]*77 + 'px'
        select2 = false
    }
    if (checkWin(player)) {
        player1.style.display = 'none'
        player2.style.display = 'none'
        smoke.style.display = 'block'
        win.style.display = 'block'
        win.textContent = 'player' + player + ' won!'
    }
    else {
        tour++
        getReady()
    }
}

function getWallFromCoord(x,y) {
    return [Math.floor((x-(67/2))/77),Math.floor((y-(67/2))/77)]
}

function getMouseCoordOnCanvas(event) {
    let x = event.clientX - canvas.getBoundingClientRect().left
    let y = event.clientY - canvas.getBoundingClientRect().top
    let new_coord = getCaseFromCoord(x,y)
    if (select1 && isLegal(1, new_coord)) {
        updateFogOfWarReverse(1)
        movePlayer(1, new_coord)
        updateFogOfWar(1)
    }
    else if (select2 && isLegal(2, new_coord)) {
        updateFogOfWarReverse(2)
        movePlayer(2, new_coord)
        updateFogOfWar(2)
    }
    else {
        select1 = false
        select2 = false
        drawBoard()
        let new_coord = getWallFromCoord(x,y)
        current_direction = (current_direction=='v')?'h':'v'
        let player = (tour%2==0)?1:2
        if (isWallLegal(player, new_coord)) {
            drawTempWall(new_coord, current_direction, )
        }
    }
}

function displayPossibleMoves(player) {
    let color = '#F1A7FF'
    if (player == 1 && tour%2==0) {
        clearTempWall(current_direction)
        drawWalls()
        select1 = true
        for (let coord of getPlayerNeighbour(p1_coord)) {
            if (isLegal(player, coord)) {
                drawRoundedRect((coord[0]+1)*10+coord[0]*67,(coord[1]+1)*10+coord[1]*67, 67, 67, 20, color)
            }
        }
    }
    else if (player == 2 && tour%2==1) {
        select2 = true
        clearTempWall(current_direction)
        drawWalls()
        for (let coord of getPlayerNeighbour(p2_coord)) {
            if (isLegal(player, coord)) {
                drawRoundedRect((coord[0]+1)*10+coord[0]*67,(coord[1]+1)*10+coord[1]*67, 67, 67, 20, color)
            }
        }
    }
}

function getReady() {
    player1.style.display = 'none'
    player2.style.display = 'none'
    for (let element of anticheat) {
        element.style.display = 'block'
    }
}

function isReady() {
    for (let element of anticheat) {
        element.style.display = 'none'
    }
    drawBoard()
}

function updateFogOfWar(player) {
    if (player == 1) {
        for (let coord of getPlayerNeighbour(p1_coord)) {
            board_visibility[coord[1]][coord[0]]++
        }
    }
    else {
        for (let coord of getPlayerNeighbour(p2_coord)) {
            board_visibility[coord[1]][coord[0]]--
        }
    }
}

function updateFogOfWarReverse(player) {
    if (player == 1) {
        for (let coord of getPlayerNeighbour(p1_coord)) {
            board_visibility[coord[1]][coord[0]]--
        }
    }
    else {
        for (let coord of getPlayerNeighbour(p2_coord)) {
            board_visibility[coord[1]][coord[0]]++
        }
    }
}

function confirmWall() {
    if (temp_wall.length > 0) {
        placeWall(temp_wall, current_direction)
        if (tour%2==0) p1_walls--
        else p2_walls--
        tour++
        getReady()
    }
}

function aStarPathfinding(start, goal) {
    let openSet = [];
    let closedSet = [];
    let path = [];
    let current;
    openSet.push(start);

    while (openSet.length > 0) {
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        current = openSet[lowestIndex];

        if (current === goal) {
            let temp = current;
            path.push(temp);
            while (temp.previous) {
                path.push(temp.previous);
                temp = temp.previous;
            }
            return path.reverse();
        }

        openSet = openSet.filter((item) => item !== current);
        closedSet.push(current);

        let neighbors = getPlayerNeighbour(current);

        for (let neighbor of neighbors) {
            if (closedSet.includes(neighbor) || !isLegal(1, neighbor)) continue;

            let tempG = current.g + 1;

            let newPath = false;
            if (openSet.includes(neighbor)) {
                if (tempG < neighbor.g) {
                    neighbor.g = tempG;
                    newPath = true;
                }
            } else {
                neighbor.g = tempG;
                newPath = true;
                openSet.push(neighbor);
            }

            if (newPath) {
                neighbor.h = heuristic(neighbor, goal);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.previous = current;
            }
        }
    }

    return [];
}

function heuristic(a, b) {
    let d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    return d;
}

canvas.addEventListener('click', getMouseCoordOnCanvas);

player1.addEventListener('click', function() {
    displayPossibleMoves(1)
});

player2.addEventListener('click', function() {
    displayPossibleMoves(2)
});

ready.addEventListener('click', isReady)

confirm.addEventListener('click', confirmWall)