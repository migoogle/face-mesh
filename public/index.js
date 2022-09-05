const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const eyesBlinkedText = document.getElementById("eyesBlinkedCount");
const eyesAppertureText = document.getElementById("eyesApperture");
const diagonalText = document.getElementById("diagonal");
const thresholdText = document.getElementById("threshold");

let ctx;
let videoWidth, videoHeight;
let beep_timer = 0;

let snd = new Audio("alarm_clock.ogg");

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            videoWidth = video.videoWidth;
            videoHeight = video.videoHeight;
            video.width = videoWidth;
            video.height = videoHeight;
            resolve(video);
        };
    });
}

function setupCanvas() {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx = canvas.getContext('2d');
}

async function loadFaceLandmarkDetectionModel() {
    return faceLandmarksDetection
        .load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
            { maxFaces: 1 });
}

async function renderPrediction() {
    const predictions = await model.estimateFaces({
        input: video
    });

    ctx.drawImage(
        video, 0, 0, video.width, video.height, 0, 0, canvas.width, canvas.height);
    
    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    //Display dots on the predicted keypoints
    //displayKeypoints(predictions);

    //Draw triangle mesh using the indexes provided by Google for triangulation
    //connectKeypointsToDrawTriangle(predictions);

    //Display dots on the outline of the face
    //drawFaceOutline(predictions);

    //Display dots on the outline of both eyes
    //drawEyesOutline(predictions);

    //Display iris location
    //displayIrisPosition(predictions);

    //Count number of times the eyes are blinked
    detectBlinkingEyes(predictions);

    window.requestAnimationFrame(renderPrediction);
}

function displayKeypoints(predictions) {
    if (predictions.length > 0) {
        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;
            for (let i = 0; i < keypoints.length; i++) {
                const x = keypoints[i][0];
                const y = keypoints[i][1];

                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }
}

function connectKeypointsToDrawTriangle(predictions) {
    //ctx.strokeStyle = "grey";
    ctx.fillStyle = "grey";
    if(predictions.length > 0) {
        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;
            for(let i = 0; i < TRIANGULATION.length; i+=3) {
                let i1 = TRIANGULATION[i];
                let i2 = TRIANGULATION[i + 1];
                let i3 = TRIANGULATION[i + 2];
                ctx.fillStyle = getRandomColor();
                ctx.beginPath();
                ctx.moveTo(keypoints[i1][0], keypoints[i1][1]);
                ctx.lineTo(keypoints[i2][0], keypoints[i2][1]);
                ctx.lineTo(keypoints[i3][0], keypoints[i3][1]);
                ctx.closePath();
                //ctx.stroke();
                ctx.fill();
            }
        });
    }
}

function drawFaceOutline(predictions) {
    ctx.fillStyle = "red";
    if(predictions.length > 0) {
        predictions.forEach(prediction => {
            const faceOutlinePoints = prediction.annotations.silhouette;
            faceOutlinePoints.forEach(point => {
                ctx.beginPath();
                ctx.rect(point[0], point[1], 2, 2);
                ctx.fill();
            });
        });
    }
}

function drawEyesOutline(predictions) {
    ctx.fillStyle = "red";
    
    if(predictions.length > 0 && predictions.annotations.faceInViewConfidence > 0.9) {
        predictions.forEach(prediction => {
            const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
            const rightEyeLower0 = prediction.annotations.rightEyeLower0;
            const rightEyeUpper1 = prediction.annotations.rightEyeUpper1;
            const rightEyeLower1 = prediction.annotations.rightEyeLower1;
            const rightEyeUpper2 = prediction.annotations.rightEyeUpper2;
            const rightEyeLower2 = prediction.annotations.rightEyeLower2;
            const rightEyeLower3 = prediction.annotations.rightEyeLower3;
            const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
            const leftEyeLower0 = prediction.annotations.leftEyeLower0;
            const leftEyeUpper1 = prediction.annotations.leftEyeUpper1;
            const leftEyeLower1 = prediction.annotations.leftEyeLower1;
            const leftEyeUpper2 = prediction.annotations.leftEyeUpper2;
            const leftEyeLower2 = prediction.annotations.leftEyeLower2;
            const leftEyeLower3 = prediction.annotations.leftEyeLower3;
            const box = prediction.boundingBox;

            const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, rightEyeUpper1, rightEyeLower1,
                                                   rightEyeUpper2, rightEyeLower2, rightEyeLower3,
                                                   leftEyeUpper0, leftEyeLower0, leftEyeUpper1,
                                                   leftEyeLower1, leftEyeUpper2, leftEyeLower2,
                                                   leftEyeLower3);

            eyeOutlinePoints.forEach(point => {
                ctx.beginPath();
                ctx.rect(point[0], point[1], 2, 2);
                ctx.fill();
            });
        });
    }
}

function displayIrisPosition(predictions) {
    ctx.strokeStyle = "red";
    if(predictions.length > 0) {
        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;
            if(keypoints.length == 478) {
                for(let i = 468; i < 478; i++) {
                    let x = keypoints[i][0];
                    let y = keypoints[i][1];

                    ctx.beginPath();
                    ctx.rect(x, y, 2, 2);
                    ctx.stroke();
                }
            }
        });
    }
}

let eyesBlinkedCounter = 0;
let eyesClosed = 0;
function detectBlinkingEyes(predictions) {
    ctx.fillStyle = "red";
    
    if(predictions.length > 0) {
        predictions.forEach(prediction => {
            const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
            const rightEyeLower0 = prediction.annotations.rightEyeLower0;
            const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
            const leftEyeLower0 = prediction.annotations.leftEyeLower0;
            const box = prediction.boundingBox;
            
            const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, leftEyeUpper0, leftEyeLower0);
            let betweenEyesDistance = Math.round(Math.abs(rightEyeUpper0[3][1]-leftEyeUpper0[3][1]));
            let rightEyeCenterPointDistance = Math.abs(rightEyeUpper0[3][1] - rightEyeLower0[4][1]);
            let leftEyeCenterPointDistance = Math.abs(leftEyeUpper0[3][1] - leftEyeLower0[4][1]);
            // function to calculate the diagonal of the box:
            let diagonalDistance = Math.sqrt(Math.pow(box.bottomRight[0] - box.topLeft[0], 2) + Math.pow(box.bottomRight[1] - box.topLeft[1], 2));
            let threshold = diagonalDistance/42;
            /* console.log("---------------");
            console.log(`right: [${rightEyeUpper0[3][0]}, ${rightEyeUpper0[3][1]}], [${rightEyeLower0[4][0]}, ${rightEyeLower0[4][1]}`);
            console.log(`left: [${leftEyeUpper0[3][0]}, ${leftEyeUpper0[3][1]}], [${leftEyeLower0[4][0]}, ${leftEyeLower0[4][1]}`);
            console.log(`right distance: ${rightEyeCenterPointDistance}, left distance: ${leftEyeCenterPointDistance}`); */

            if(eyesClosed == 0 && rightEyeCenterPointDistance < (threshold/2) && leftEyeCenterPointDistance < (threshold/2)) {
                eyesClosed = 1;
                beep_timer = setTimeout(playSound, 1500);
            }

            if(eyesClosed == 1 && (rightEyeCenterPointDistance > threshold && leftEyeCenterPointDistance > threshold)) {
                eyesBlinkedCounter++;
                clearTimeout(beep_timer);
                setTimeout(stopSound, 1500);

                eyesClosed = 0;
            }

            //console.log(`# of times blinked: ${eyesBlinkedCounter}`);
            eyesBlinkedText.style.visibility = "visible";
            eyesBlinkedText.innerHTML = "# of times blinked: " + eyesBlinkedCounter;
            eyesAppertureText.style.visibility = "visible";
            eyesAppertureText.innerHTML = "Right eye aperture: " + Math.round(rightEyeCenterPointDistance);
            diagonalText.style.visibility = "visible";
            diagonalText.innerHTML = "Digonal distance: " + Math.round(diagonalDistance);
            thresholdText.style.visibility = "visible";
            thresholdText.innerHTML = "Threshold: " + Math.round(threshold);

            eyeOutlinePoints.forEach(point => {
                ctx.beginPath();
                ctx.rect(point[0], point[1], 2, 2);
                ctx.fill();
            });
        });
    }
}

function getRandomColor() {
    return '#' + Math.floor(Math.random()*82456975).toString(16);
}

async function main() {
    //Set up camera
    await setupCamera();

    //Set up canvas
    setupCanvas();

    //Load the model
    model = await loadFaceLandmarkDetectionModel();

    //Render Face Mesh Prediction
    renderPrediction();
}


function beep() {
    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
}

// function that plays a sound file .ogg in loop:
function playSound() {
    snd.loop = true;
    snd.play();
}

// function that stops the sound file:
function stopSound() {
    snd.pause();
}


main();