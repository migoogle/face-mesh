box = {
    "topLeft": [
        154.00487015594797,
        39.17676100684986
    ],
    "bottomRight": [
        417.0680454140489,
        312.04960656387976
    ]
}

// function to calculate the diagonal of the box:
function diagonal(box) {
    return Math.sqrt(Math.pow(box.bottomRight[0] - box.topLeft[0], 2) + Math.pow(box.bottomRight[1] - box.topLeft[1], 2));
}
