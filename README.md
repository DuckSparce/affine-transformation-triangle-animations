# Lab 5: Triangle Drawing System with Affine Transformations

## Purpose

This project is an interactive geometric visualization tool that enables users to create, manipulate, and animate triangles using affine transformations. The primary focus is on demonstrating mirror reflections combined with scaling transformations through animated sequences. It provides a visual and mathematical exploration of 2D affine transformation matrices.

## Key Features

- **Interactive Triangle Creation**:
  - Click on canvas to add vertices (every 3 points form a triangle)
  - Manual coordinate input for precise vertex placement
  - Drag vertices to reposition them dynamically
  - Automatic color assignment for each triangle
  
- **Affine Animation System**:
  - Sequential mirroring across two axes (X and Y)
  - Configurable axis order (X→Y or Y→X)
  - Scaling transformation during animation
  - Four-phase animation cycle: shrink1, shrink2, unshrink1, unshrink2
  - Smooth interpolation using performance timestamps
  
- **Animation Controls**:
  - Adjustable animation duration (100-10,000 ms)
  - Scaling coefficient control (0.01-100)
  - Continuous loop mode option
  - Start, Stop, Continue, and Reset buttons
  
- **Canvas Navigation**:
  - Mouse wheel zoom with center-focused scaling
  - Drag-to-pan for viewport movement
  - Grid system with adaptive scaling
  - Coordinate axes display
  
- **Export Capabilities**:
  - Download canvas as image
  - Export transformation matrix for result verification
  - Matrix visualization in the UI

## Technologies Used

- **HTML5**: Document structure and form controls
- **CSS3**: Custom styling with CSS variables
- **JavaScript (ES6+)**: 
  - Canvas API for 2D rendering
  - Affine transformation matrices (3×3 homogeneous coordinates)
  - Matrix multiplication algorithms
  - Animation with `requestAnimationFrame()`
  - Event handling for mouse interactions
- **Linear Algebra Concepts**:
  - Homogeneous coordinates for 2D transformations
  - Matrix composition for combined transformations
  - Translation, scaling, and reflection matrices

## Mathematical Foundation

### Transformation Matrices

The application uses 3×3 matrices in row notation for 2D affine transformations:

**Translation Matrix:**
```
[ 1   0   0 ]
[ 0   1   0 ]
[ dx  dy  1 ]
```

**Scaling Matrix:**
```
[ sx  0   0 ]
[ 0   sy  0 ]
[ 0   0   1 ]
```

**Mirror Reflection Matrix** (with parameter t for animation):
- X-axis: `[1, 0, 0; 0, 1-2t, 0; 0, 0, 1]`
- Y-axis: `[1-2t, 0, 0; 0, 1, 0; 0, 0, 1]`

### Composite Transformation

For scaling about a triangle's centroid followed by mirroring:

$$M = T(-c) \cdot S \cdot T(c) \cdot R$$

where $T$ is translation, $S$ is scaling, $R$ is reflection, and $c$ is the centroid.

### Animation Phases

1. **Shrink1**: Scale from 1 to √s, mirror across first axis
2. **Shrink2**: Scale from √s to s, mirror across second axis
3. **Unshrink1**: Scale from s to √s, unmirror second axis
4. **Unshrink2**: Scale from √s to 1, unmirror first axis

where $s$ is the scaling coefficient.

## Usage

1. Open `index.html` in a modern web browser
2. Add triangle vertices:
   - Click on the canvas (3 points = 1 triangle)
   - Or use X/Y coordinate inputs for precise placement
3. Drag vertices to adjust triangle positions
4. Configure animation settings:
   - Select axis order (X→Y or Y→X)
   - Set animation duration
   - Adjust scaling coefficient
   - Enable continuous mode if desired
5. Click "Start Mirror Animation" to begin
6. Use Stop/Continue/Reset to control playback
7. Download canvas image or transformation matrix as needed

## Technical Implementation

- **Point Storage**: Each triangle stored as array of 3 vertices with x,y coordinates
- **Transformation Pipeline**: Matrix operations applied in sequence
- **Animation Loop**: Uses `performance.now()` for precise timing
- **Centroid Calculation**: Average of three vertex positions
- **Matrix Multiplication**: Row-major order with proper composition
