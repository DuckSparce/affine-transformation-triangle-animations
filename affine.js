let animationActive = false;
let animationOriginalTriangles = [];
let animationAxisOrder = "xy";
let animationPhase = "shrink1"; // shrink1, shrink2, unshrink1, unshrink2
let animationProgress = 0;
let animationDuration = 3000; // ms
let animationStartTime = 0;
let animationContinuous = false;
let animationScale = 1;
let animationPausedElapsed = 0;

function getTriangleCentroid(points) {
  let cx = (points[0].x + points[1].x + points[2].x) / 3;
  let cy = (points[0].y + points[1].y + points[2].y) / 3;
  return { x: cx, y: cy };
}

function applyMatToPointRow(p, m) {
  // p: {x, y}, m: 3x3 matrix (row notation)
  // Returns {x, y}
  let v = [p.x, p.y, 1];
  let res = [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
  // For affine, res[2] should be 1
  return { x: res[0], y: res[1] };
}

function translationMatrixRow(dx, dy) {
  // Row notation: [ [1,0,0], [0,1,0], [dx,dy,1] ]
  return [
    [1, 0, 0],
    [0, 1, 0],
    [dx, dy, 1]
  ];
}

function scaleMatrixRow(sx, sy) {
  // Row notation: [ [sx,0,0], [0,sy,0], [0,0,1] ]
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function mirrorMatrixRow(axis, t) {
  // Row notation
  if (axis === "x") {
    return [
      [1, 0, 0],
      [0, 1 - 2 * t, 0],
      [0, 0, 1]
    ];
  } else if (axis === "y") {
    return [
      [1 - 2 * t, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
}

function scaleAboutCenterMatrixRow(s, cx, cy) {
  // T(-c) * S * T(c)
  // T(-c): [ [1,0,0], [0,1,0], [-cx,-cy,1] ]
  // S:     [ [s,0,0], [0,s,0], [0,0,1] ]
  // T(c):  [ [1,0,0], [0,1,0], [cx,cy,1] ]
  let T1 = translationMatrixRow(-cx, -cy);
  let S = scaleMatrixRow(s, s);
  let T2 = translationMatrixRow(cx, cy);
  return multiplicateMatrices(multiplicateMatrices(T1, S), T2);
}

function animateTriangle(triangle, axis1, axis2, phase, t, scaleCoeff) {
  let pts = triangle.points.map(pt => ({ ...pt }));
  const centroid = getTriangleCentroid(pts);
  
  // Compute scaling factor for this phase
  let scale = 1;
  if (phase === "shrink1") {
    scale = 1 + (Math.sqrt(scaleCoeff) - 1) * t;
  } else if (phase === "shrink2") {
    scale = Math.sqrt(scaleCoeff) + (scaleCoeff - Math.sqrt(scaleCoeff)) * t;
  } else if (phase === "unshrink1") {
    scale = scaleCoeff - (scaleCoeff - Math.sqrt(scaleCoeff)) * t;
  } else if (phase === "unshrink2") {
    scale = Math.sqrt(scaleCoeff) - (Math.sqrt(scaleCoeff) - 1) * t;
  }

  // Build the transformation matrix for this phase
  let mat = scaleAboutCenterMatrixRow(scale, centroid.x, centroid.y);
  
  if (phase === "shrink1") {
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis1, t));
  } else if (phase === "shrink2") {
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis1, 1));
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis2, t));
  } else if (phase === "unshrink1") {
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis1, 1));
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis2, 1 - t));
  } else if (phase === "unshrink2") {
    mat = multiplicateMatrices(mat, mirrorMatrixRow(axis1, 1 - t));
  }
  
  // Apply matrix to all points
  pts = pts.map(pt => applyMatToPointRow(pt, mat));
  return { points: pts, color: triangle.color };
}

function startAffineAnimation() {
  if (animationActive || triangles.length === 0) return;
  animationActive = true;
  animationOriginalTriangles = triangles.map(tri => ({
    points: tri.points.map(pt => ({ ...pt })),
    color: tri.color
  }));

  const axisOrderSelect = document.getElementById("axis-order");
  animationAxisOrder = axisOrderSelect ? axisOrderSelect.value : "xy";
  // Get duration from input
  const durationInput = document.getElementById("animation-duration");
  let duration = parseInt(durationInput ? durationInput.value : "3000", 10);
  
  if (duration < 100) {
    duration = 100;
    durationInput.value = "100"; 
  }

  if (duration > 10000) {
    duration = 10000;
    durationInput.value = "10000"; 
  }
  
  animationDuration = duration / 4;

  const continuousInput = document.getElementById("continuous-animation-checkbox");
  animationContinuous = !!(continuousInput && continuousInput.checked);
  
  const scaleInput = document.getElementById("scaling-coefficient");
  let scaleCoeff = parseFloat(scaleInput ? scaleInput.value : "1");
  if (isNaN(scaleCoeff) || scaleCoeff < 0.01) scaleCoeff = 0.01;
  if (scaleCoeff > 100) scaleCoeff = 100;

  animationScale = scaleCoeff;
  animationPhase = "shrink1";
  animationProgress = 0;
  animationPausedElapsed = 0;
  animationStartTime = performance.now();

  document.getElementById("download-result-matrix").disabled = false;

  requestAnimationFrame(runAffineAnimationFrame);
}

function stopAffineAnimation() {
  if (!animationActive) return;
  // Save how much time has elapsed in the current phase
  animationPausedElapsed += performance.now() - animationStartTime;
  animationActive = false;
}

function continueAffineAnimation() {
  if (animationActive || triangles.length === 0) return;
  animationActive = true;
  // Resume from where we left off in the current phase
  animationStartTime = performance.now() - animationPausedElapsed;
  requestAnimationFrame(runAffineAnimationFrame);
}

function runAffineAnimationFrame(now) {
  if (!animationActive) return;

  triangles = animationOriginalTriangles.map(tri => ({
    points: tri.points.map(pt => ({ ...pt })),
    color: tri.color
  }));

  let axis1 = animationAxisOrder[0];
  let axis2 = animationAxisOrder[1];

  // Calculate progress (0 to 1)
  let elapsed = now - animationStartTime;
  let t = Math.min(elapsed / animationDuration, 1);

  // Animate all triangles with scaling
  triangles = animationOriginalTriangles.map(tri =>
    animateTriangle(tri, axis1, axis2, animationPhase, t, animationScale)
  );
  redrawCanvas();

  if (t < 1) {
    requestAnimationFrame(runAffineAnimationFrame);
    return;
  }

  // Move to next phase: shrink1 -> shrink2 -> unshrink1 -> unshrink2 -> done/loop
  animationPausedElapsed = 0; // Reset pause offset at phase change
  if (animationPhase === "shrink1") {
    animationPhase = "shrink2";
  } else if (animationPhase === "shrink2") {
    animationPhase = "unshrink1";
  } else if (animationPhase === "unshrink1") {
    animationPhase = "unshrink2";
  } else if (animationPhase === "unshrink2") {
    if (animationContinuous) {
      animationPhase = "shrink1";
      animationStartTime = now;
      requestAnimationFrame(runAffineAnimationFrame);
      return;
    } else {
      animationActive = false;
      redrawCanvas();
      return;
    }
  }
  animationStartTime = now;
  if (animationActive) requestAnimationFrame(runAffineAnimationFrame);
}

function resetAffineAnimation() {
  animationActive = false;
  animationPausedElapsed = 0;
  // Restore triangles to original state before animation
  if (animationOriginalTriangles.length > 0) {
    triangles = animationOriginalTriangles.map(tri => ({
      points: tri.points.map(pt => ({ ...pt })),
      color: tri.color
    }));
    redrawCanvas();
  }
}

function downloadCanvasImage() {
  const canvas = document.getElementById("canvas");
  redrawCanvas();
  const link = document.createElement("a");
  link.download = "triangles.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function multiplicateMatrices(a, b) {
  let r = [];
  for (let i = 0; i < 3; ++i) {
    r[i] = [];
    for (let j = 0; j < 3; ++j) {
      r[i][j] = 0;
      for (let k = 0; k < 3; ++k) {
        r[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return r;
}

function downloadResultMatrix() {
  let scaleCoeff = animationScale || 1;

  let txt = "Affine Result Matrix (after both shrink  phases, about centroid):\n";
  
  txt += `
T(-cx, -cy) * D(s, s) * T(cx, cy) * Mox * Moy =
[ -s 0 0 ]
[ 0 -s 0 ]
[ cx-s*cx cy-s*cy 1 ]
`;

  let transformationMatrix = [
    [-scaleCoeff, 0, 0],
    [0, -scaleCoeff, 0],
    [0, 0, 1]
  ];

  txt += `
Transformation Matrix, applied to each triangle.
*Triangle matrix format:
[ p1x p1y 1 ]
[ p2x p2y 1 ]
[ p3x p3y 1 ]
`;

  for (let i = 0; i < animationOriginalTriangles.length; i++) {
    let t = animationOriginalTriangles[i];
    transformationMatrix[2][0] = scaleCoeff * t.points[0].x - t.points[0].x;
    transformationMatrix[2][1] = scaleCoeff * t.points[0].y - t.points[0].y;
    let triangleMatrix = [
      [t.points[0].x, t.points[0].y, 1],
      [t.points[1].x, t.points[1].y, 1],
      [t.points[2].x, t.points[2].y, 1]
    ];

    let m = multiplicateMatrices(triangleMatrix, transformationMatrix);
    
    txt += `
Triangle T${i + 1} transformation matrix:
[ ${m[0][0].toFixed(2)} ${m[0][1].toFixed(2)} ${m[0][2]} ]
[ ${m[1][0].toFixed(2)} ${m[1][1].toFixed(2)} ${m[1][2]} ]
[ ${m[2][0].toFixed(2)} ${m[2][1].toFixed(2)} ${m[2][2]} ]
`
  };

  const blob = new Blob([txt], { type: "text/plain" });
  const link = document.createElement("a");
  link.download = "affine_result_matrix.txt";
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

window.onload = function() {
  resizeCanvas();
  redrawCanvas();
  setupZoom();
  setupDrag();
  setupCanvas();
  
  const affineBtn = document.getElementById("start-affine-animation");
  if (affineBtn) affineBtn.onclick = startAffineAnimation;
  const stopBtn = document.getElementById("stop-affine-animation");
  if (stopBtn) stopBtn.onclick = stopAffineAnimation;
  const continueBtn = document.getElementById("continue-affine-animation");
  if (continueBtn) continueBtn.onclick = continueAffineAnimation;
  const resetBtn = document.getElementById("reset-affine-animation");
  if (resetBtn) resetBtn.onclick = resetAffineAnimation;

  const downloadBtn = document.getElementById("download-canvas-image");
  if (downloadBtn) downloadBtn.onclick = downloadCanvasImage;
  const downloadMatrixBtn = document.getElementById("download-result-matrix");
  if (downloadMatrixBtn) downloadMatrixBtn.onclick = downloadResultMatrix;

  window.addEventListener("resize", resizeCanvas);
  updateTrianglesList();
};
