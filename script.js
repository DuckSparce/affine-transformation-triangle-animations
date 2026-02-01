const axesWidth = 2;
const axesMargin = 10;
const cellSize = 20;

const minScale = 0.1;
const maxScale = 100;
let scale = 1;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let offsetX = 0;
let offsetY = 0;

// Each triangle: { points: [{x, y}, ...], color: "#RRGGBB" }
let triangles = [];
let currentTrianglePoints = []; // Collects up to 3 points for a new triangle

// For dragging/moving points
let selectedTriangleIndex = -1;
let selectedVertexIndex = -1;

const pointRadius = 4;
const selectedPointRadius = 8;
const pointLocationError = 5;
const lineWidth = 2;

function getGridUnit() {
  if (scale < 0.2) return 30;
  if (scale < 0.5) return 10;
  if (scale < 1) return 5;
  if (scale < 2) return 2;
  if (scale < 5) return 1;
  if (scale < 10) return 0.5;
  if (scale < 20) return 0.3;
  if (scale < 50) return 0.1;
  if (scale < 100) return 0.05;
  return 0.02;
}

function setupZoom() {
  const canvas = document.getElementById("canvas");
  canvas.addEventListener("wheel", function(event) {
    event.preventDefault();

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate world coordinates under mouse before zoom
    const pxPerCoord = cellSize * scale;
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;
    const worldX = (mouseX - centerX) / pxPerCoord;
    const worldY = (centerY - mouseY) / pxPerCoord;

    // Zoom
    if (event.deltaY < 0) {
      scale *= 1.15;
    } else {
      scale /= 1.15;
    }
    scale = Math.max(minScale, Math.min(maxScale, scale));

    const newPxPerCoord = cellSize * scale;
    offsetX = mouseX - canvas.width / 2 - worldX * newPxPerCoord;
    offsetY = mouseY - canvas.height / 2 + worldY * newPxPerCoord;

    redrawCanvas();
  });
}

function setupDrag() {
  const canvas = document.getElementById("canvas");

  canvas.addEventListener("mousedown", function (event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const pxPerCoord = cellSize * scale;
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;

    selectedTriangleIndex = -1;
    selectedVertexIndex = -1;

    // Check if clicking on a triangle vertex
    triangles.forEach((triangle, tIdx) => {
      triangle.points.forEach((point, vIdx) => {
        const screenX = centerX + point.x * pxPerCoord;
        const screenY = centerY - point.y * pxPerCoord;
        const distance = Math.sqrt(
          Math.pow(mouseX - screenX, 2) + Math.pow(mouseY - screenY, 2)
        );
        if (distance <= pointRadius * 2) {
          selectedTriangleIndex = tIdx;
          selectedVertexIndex = vIdx;
        }
      });
    });

    if (selectedTriangleIndex === -1) {
      isDragging = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      canvas.style.cursor = "move";
    } else {
      canvas.style.cursor = "grabbing";
    }
  });

  canvas.addEventListener("mousemove", function (event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (selectedTriangleIndex !== -1 && selectedVertexIndex !== -1) {
      const pxPerCoord = cellSize * scale;
      const centerX = canvas.width / 2 + offsetX;
      const centerY = canvas.height / 2 + offsetY;

      const x = (mouseX - centerX) / pxPerCoord;
      const y = (centerY - mouseY) / pxPerCoord;

      if (validateCoordinates(x, y)) {
        triangles[selectedTriangleIndex].points[selectedVertexIndex].x = x;
        triangles[selectedTriangleIndex].points[selectedVertexIndex].y = y;
        updateTrianglesList();
        redrawCanvas();
      }
      
      document.getElementById("download-result-matrix").disabled = true;
      return;
    }

    if (!isDragging) return;

    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;

    offsetX += dx;
    offsetY += dy;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    redrawCanvas();
  });

  function finishDragging() {
    isDragging = false;
    selectedTriangleIndex = -1;
    selectedVertexIndex = -1;
    canvas.style.cursor = "";
    redrawCanvas();
  }

  canvas.addEventListener("mouseup", finishDragging);

  canvas.addEventListener("mouseleave", finishDragging);
}

function validateCoordinates(x, y) {
  const min = -1000;
  const max = 1000;
  
  if (x < min || x > max || y < min || y > max) {
    return false;
  }
  return true;
}

function isDuplicatePoint(x, y) {
  // Check in currentTrianglePoints and all triangle points
  for (const p of currentTrianglePoints) {
    if (Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6) return true;
  }

  return false;
}

function addTrianglePoint(x, y) {
  if (!validateCoordinates(x, y)) {
    alert(`Coordinates must be within the range of -1000 to 1000`);
    return false;
  }

  if (isDuplicatePoint(x, y)) {
    alert("This point already exists. Please enter a unique point.");
    return false;
  }

  currentTrianglePoints.push({ x, y });

  if (currentTrianglePoints.length === 3) {
    triangles.push({
      points: currentTrianglePoints.map(p => ({ ...p })),
      color: getRandomColor()
    });
    currentTrianglePoints = [];

    document.getElementById("download-result-matrix").disabled = true;
  }

  updateTrianglesList();
  redrawCanvas();
  return true;
}

function removeTriangle(index) {
  if (index >= 0 && index < triangles.length) {
    triangles.splice(index, 1);
    updateTrianglesList();
    redrawCanvas();
  }
}

function clearAllTriangles() {
  triangles = [];
  currentTrianglePoints = [];
  updateTrianglesList();
  redrawCanvas();
}

function updateTrianglesList() {
  const listContainer = document.getElementById("control-points-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  triangles.forEach((triangle, tIdx) => {
    const item = document.createElement("div");
    item.className = "point-item";
    item.innerHTML = `
      <div class="point-display-container">
        <span>
          <span style="display:inline-block;width:16px;height:16px;background:${triangle.color};border-radius:3px;margin-right:6px;vertical-align:middle;border:1px solid #aaa;"></span>
          Triangle ${tIdx + 1}: 
          (${triangle.points[0].x.toFixed(2)}, ${triangle.points[0].y.toFixed(2)}), 
          (${triangle.points[1].x.toFixed(2)}, ${triangle.points[1].y.toFixed(2)}), 
          (${triangle.points[2].x.toFixed(2)}, ${triangle.points[2].y.toFixed(2)})
        </span>
        <div class="point-action-buttons">
          <button onclick="editTriangle(${tIdx})">Edit</button>
          <button onclick="removeTriangle(${tIdx})" style="background-color:var(--danger-color);">Remove</button>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });

  // Show current triangle points being collected
  if (currentTrianglePoints.length > 0) {
    const item = document.createElement("div");
    item.className = "point-item";
    item.innerHTML = `
      <div class="point-display-container">
        <span>New Triangle: ${
          currentTrianglePoints.map(
            (p, i) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
          ).join(", ")
        }${currentTrianglePoints.length < 3 ? " (add " + (3 - currentTrianglePoints.length) + " more)" : ""}
        </span>
      </div>
    `;
    listContainer.appendChild(item);
  }

  document.getElementById("download-result-matrix").disabled = true;
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 70%)`;
}

let editingTriangleIndex = -1;
function editTriangle(index) {
  editingTriangleIndex = index;
  updateTrianglesList();
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      const xInput = document.getElementById(`edit-x-${index}-${i}`);
      if (xInput && i === 0) xInput.focus();
    }
  }, 50);
}

function saveEditedTriangle(index) {
  if (index >= 0 && index < triangles.length) {
    let newPoints = [];

    for (let i = 0; i < 3; i++) {
      const xInput = document.getElementById(`edit-x-${index}-${i}`);
      const yInput = document.getElementById(`edit-y-${index}-${i}`);
      if (!xInput || !yInput) return;
      const x = parseFloat(xInput.value);
      const y = parseFloat(yInput.value);
      if (isNaN(x) || isNaN(y) || !validateCoordinates(x, y)) {
        alert("Please enter valid coordinates in range -1000 to 1000");
        return;
      }
      newPoints.push({ x, y });
    }
    
    const colorInput = document.getElementById(`edit-color-${index}`);
    let color = triangles[index].color;
    if (colorInput) color = colorInput.value;
    triangles[index] = { points: newPoints, color };
    editingTriangleIndex = -1;

    document.getElementById("download-result-matrix").disabled = true;

    updateTrianglesList();
    redrawCanvas();
  }
}

function cancelInlineEdit() {
  editingTriangleIndex = -1;
  updateTrianglesList();
}

// Override updateTrianglesList to show edit form if needed
const _origUpdateTrianglesList = updateTrianglesList;
updateTrianglesList = function() {
  const listContainer = document.getElementById("control-points-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  triangles.forEach((triangle, tIdx) => {
    const item = document.createElement("div");
    item.className = "point-item";
    if (editingTriangleIndex === tIdx) {
      item.innerHTML = `
        <div class="point-edit-container">
          <div class="point-edit-header">
            <div style="font-weight: bold;">Triangle ${tIdx + 1}</div>
          </div>
          <div class="point-edit-form">
            ${triangle.points.map((p, i) => `
              <div class="point-edit-row">
                <label class="point-edit-label">P${i + 1}&nbsp;&nbsp;&nbsp;&nbsp;X:</label>
                <input type="number" step="0.01" class="inline-edit-input" id="edit-x-${tIdx}-${i}" value="${p.x.toFixed(2)}">
                <label class="point-edit-label">&nbsp;&nbsp;Y:</label>
                <input type="number" step="0.01" class="inline-edit-input" id="edit-y-${tIdx}-${i}" value="${p.y.toFixed(2)}">
              </div>
            `).join("")}
            <div class="point-edit-row">
              <label class="point-edit-label">Color:</label>
              <input type="color" id="edit-color-${tIdx}" value="${rgbToHex(triangle.color)}" style="margin: 20px; width:250px; height:50px; border:none; background:none;">
            </div>
          </div>
          <div class="point-edit-actions">
            <button onclick="saveEditedTriangle(${tIdx})">Save</button>
            <button onclick="cancelInlineEdit()" style="background-color:var(--danger-color);">Cancel</button>
          </div>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="point-display-container">
          <span>
            <span style="display:inline-block;width:16px;height:16px;background:${triangle.color};border-radius:3px;margin-right:6px;vertical-align:middle;border:1px solid #aaa;"></span>
            Triangle ${tIdx + 1}: 
            (${triangle.points[0].x.toFixed(2)}, ${triangle.points[0].y.toFixed(2)}), 
            (${triangle.points[1].x.toFixed(2)}, ${triangle.points[1].y.toFixed(2)}), 
            (${triangle.points[2].x.toFixed(2)}, ${triangle.points[2].y.toFixed(2)})
          </span>
          <div class="point-action-buttons">
            <button onclick="editTriangle(${tIdx})">Edit</button>
            <button onclick="removeTriangle(${tIdx})" style="background-color:var(--danger-color);">Remove</button>
          </div>
        </div>
      `;
    }
    listContainer.appendChild(item);
  });

  // Show current triangle points being collected
  if (currentTrianglePoints.length > 0) {
    const item = document.createElement("div");
    item.className = "point-item";
    item.innerHTML = `
      <div class="point-display-container">
        <span>New Triangle: ${
          currentTrianglePoints.map(
            (p, i) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
          ).join(", ")
        }${currentTrianglePoints.length < 3 ? " (add " + (3 - currentTrianglePoints.length) + " more)" : ""}
        </span>
      </div>
    `;
    listContainer.appendChild(item);
  }
}

function rgbToHex(color) {
  if (color.startsWith("#")) return color;
  
  if (color.startsWith("hsl")) {
    // hsl(h, s%, l%)
    const hsl = color.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!hsl) return "#cccccc";
    let h = parseInt(hsl[1]), s = parseFloat(hsl[2]) / 100, l = parseFloat(hsl[3]) / 100;
    // HSL to RGB
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r1, g1, b1;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    let r = Math.round((r1 + m) * 255);
    let g = Math.round((g1 + m) * 255);
    let b = Math.round((b1 + m) * 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  if (color.startsWith("rgb")) {
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!rgb) return "#cccccc";
    let r = parseInt(rgb[1]), g = parseInt(rgb[2]), b = parseInt(rgb[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  return "#cccccc";
}

function redrawCanvas() {
  const c = document.getElementById("canvas");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  drawGrid();
  drawAxes();
  drawTriangles();
}

function drawTriangles() {
  const c = document.getElementById("canvas");
  const ctx = c.getContext("2d");
  const pxPerCoord = cellSize * scale;
  const centerX = c.width / 2 + offsetX;
  const centerY = c.height / 2 + offsetY;

  triangles.forEach((triangle, tIdx) => {
    // Draw triangle edges
    ctx.beginPath();
    ctx.moveTo(centerX + triangle.points[0].x * pxPerCoord, centerY - triangle.points[0].y * pxPerCoord);
    for (let i = 1; i < 3; i++) {
      ctx.lineTo(centerX + triangle.points[i].x * pxPerCoord, centerY - triangle.points[i].y * pxPerCoord);
    }
    ctx.closePath();
    ctx.strokeStyle = triangle.color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.fillStyle = triangle.color;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Draw triangle vertices
    triangle.points.forEach((point, vIdx) => {
      const screenX = centerX + point.x * pxPerCoord;
      const screenY = centerY - point.y * pxPerCoord;
      ctx.beginPath();
      ctx.fillStyle = (selectedTriangleIndex === tIdx && selectedVertexIndex === vIdx) ? "#ff6b6b" : triangle.color;
      ctx.arc(
        screenX,
        screenY,
        (selectedTriangleIndex === tIdx && selectedVertexIndex === vIdx) ? selectedPointRadius : pointRadius,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Draw vertex index
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.fillText(`T${tIdx + 1}P${vIdx + 1}`, screenX + 8, screenY - 8);
    });
  });

  // Draw current triangle points being collected
  if (currentTrianglePoints.length > 0) {
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = lineWidth / 2;
    const pts = currentTrianglePoints;
    ctx.moveTo(centerX + pts[0].x * pxPerCoord, centerY - pts[0].y * pxPerCoord);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(centerX + pts[i].x * pxPerCoord, centerY - pts[i].y * pxPerCoord);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    pts.forEach((point, vIdx) => {
      const screenX = centerX + point.x * pxPerCoord;
      const screenY = centerY - point.y * pxPerCoord;
      ctx.beginPath();
      ctx.fillStyle = "#ff6b6b";
      ctx.arc(screenX, screenY, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.fillText(`N${vIdx + 1}`, screenX + 8, screenY - 8);
    });
  }
}

function setupCanvas() {
  const canvas = document.getElementById("canvas");

  // Double-click to add a point for a new triangle
  canvas.addEventListener("dblclick", function (event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const pxPerCoord = cellSize * scale;
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;

    const worldX = (mouseX - centerX) / pxPerCoord;
    const worldY = (centerY - mouseY) / pxPerCoord;

    addTrianglePoint(worldX, worldY);
  });
}

function addPointManually() {
  const xInput = document.getElementById("x-coordinate");
  const yInput = document.getElementById("y-coordinate");
  if (!xInput || !yInput) return;
  const x = parseFloat(xInput.value);
  const y = parseFloat(yInput.value);
  if (isNaN(x) || isNaN(y)) {
    alert("Please enter valid numeric coordinates");
    return;
  }
  if (addTrianglePoint(x, y)) {
    xInput.value = "";
    yInput.value = "";
  }
}

function drawAxes() {
  const c = document.getElementById("canvas");
  const ctx = c.getContext("2d");

  ctx.strokeStyle = "black";
  ctx.lineWidth = axesWidth;

  const centerX = c.width / 2 + offsetX;
  const centerY = c.height / 2 + offsetY;

  ctx.beginPath();

  // X-axis
  ctx.moveTo(0, centerY);
  ctx.lineTo(c.width, centerY);

  // X-axis arrowhead
  ctx.moveTo(c.width - axesMargin - 15, centerY - 10);
  ctx.lineTo(c.width - axesMargin, centerY);
  ctx.lineTo(c.width - axesMargin - 15, centerY + 10);

  // Y-axis
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, c.height);

  // Y-axis arrowhead
  ctx.moveTo(centerX - 10, axesMargin + 15);
  ctx.lineTo(centerX, axesMargin);
  ctx.lineTo(centerX + 10, axesMargin + 15);

  ctx.stroke();

  const gridUnit = getGridUnit();
  const pixelsPerUnit = cellSize * scale;
  const gridPixels = pixelsPerUnit * gridUnit;

  function formatLabel(value) {
    if (Math.abs(value) >= 1 && value % 1 === 0) {
      return value.toString();
    }
    
    return value.toFixed(2);
  }

  let labelFrequency = 1;
  if (scale > 100) labelFrequency = 20;
  else if (scale > 50) labelFrequency = 10;
  else if (scale > 20) labelFrequency = 5;
  else if (scale > 5) labelFrequency = 2;
  else if (scale > 1) labelFrequency = 1;
  else if (scale > 0.5) labelFrequency = 1;
  else if (scale > 0.2) labelFrequency = 1;
  else labelFrequency = 1;

  ctx.lineWidth = 1.5;

  const visibleLeft = -centerX / gridPixels;
  const visibleRight = (c.width - centerX) / gridPixels;
  const visibleBottom = (c.height - centerY) / gridPixels;
  const visibleTop = -centerY / gridPixels;

  const startX = Math.ceil(visibleLeft / labelFrequency) * labelFrequency;
  const endX = Math.floor(visibleRight / labelFrequency) * labelFrequency;
  const startY = Math.ceil(visibleTop / labelFrequency) * labelFrequency;
  const endY = Math.floor(visibleBottom / labelFrequency) * labelFrequency;

  for (let i = startX; i <= endX; i += labelFrequency) {
    if (i === 0) continue;

    const x = centerX + i * gridPixels;

    if (x >= 0 && x <= c.width) {
      ctx.beginPath();
      ctx.moveTo(x, centerY - 5);
      ctx.lineTo(x, centerY + 5);
      ctx.stroke();

      const value = i * gridUnit;
      const formattedValue = formatLabel(Math.abs(value));

      ctx.fillStyle = "black";
      ctx.font = "bold 14px Arial";

      const xOffset = formattedValue.length > 2 ? 12 : 8;
      const valueDisplay = value < 0 ? "-" + formattedValue : formattedValue;
      ctx.fillText(valueDisplay, x - xOffset, centerY + 18);
    }
  }

  for (let i = startY; i <= endY; i += labelFrequency) {
    if (i === 0) continue;

    const y = centerY + i * gridPixels;

    if (y >= 0 && y <= c.height) {
      ctx.beginPath();
      ctx.moveTo(centerX - 5, y);
      ctx.lineTo(centerX + 5, y);
      ctx.stroke();

      const value = -i * gridUnit;
      const formattedValue = formatLabel(Math.abs(value));

      ctx.fillStyle = "black";
      ctx.font = "bold 14px Arial";

      const xOffset = formattedValue.length > 2 ? 34 : 28;
      const valueDisplay = value < 0 ? "-" + formattedValue : formattedValue;
      ctx.fillText(valueDisplay, centerX - xOffset, y + 5);
    }
  }

  ctx.fillStyle = "black";
  ctx.font = "bold 20px Arial";
  ctx.fillText("X", c.width - axesMargin - 15, centerY - 15);
  ctx.fillText("Y", centerX + 15, axesMargin + 15);
  ctx.font = "bold 14px Arial";
  ctx.fillText("0", centerX - 15, centerY + 15);
}

function drawGrid() {
  const c = document.getElementById("canvas");
  const ctx = c.getContext("2d");

  ctx.strokeStyle = "lightgrey";
  ctx.lineWidth = 0.5;

  const gridUnit = getGridUnit();
  const pixelsPerUnit = cellSize * scale;
  const gridPixels = pixelsPerUnit * gridUnit;

  const centerX = c.width / 2 + offsetX;
  const centerY = c.height / 2 + offsetY;

  const leftUnits = Math.ceil(centerX / gridPixels) + 1;
  const rightUnits = Math.ceil((c.width - centerX) / gridPixels) + 1;
  const topUnits = Math.ceil(centerY / gridPixels) + 1;
  const bottomUnits = Math.ceil((c.height - centerY) / gridPixels) + 1;

  let stepSize = 1;
  if (scale < 0.5) stepSize = 0.5;

  // vertical grid lines
  for (let i = -leftUnits; i <= rightUnits; i += stepSize) {
    if (Math.round(i) === i || scale < 0.5) {
      const x = centerX + i * gridPixels;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, c.height);
      ctx.stroke();
    }
  }

  // horizontal grid lines
  for (let i = -topUnits; i <= bottomUnits; i += stepSize) {
    if (Math.round(i) === i || scale < 0.5) {
      const y = centerY + i * gridPixels;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
    }
  }
}

function resizeCanvas() {
  const c = document.getElementById("canvas");
  c.width = c.offsetWidth;
  c.height = c.offsetHeight;
  redrawCanvas();
}
