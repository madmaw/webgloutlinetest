import * as glm from 'gl-matrix';

let vertexShaderSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormalAverage;

    uniform float uVertexOffsetAbsolute;    
    uniform vec4 uVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main() {
        vec3 adjustedVertexPosition =  aVertexPosition + (aVertexNormalAverage * uVertexOffsetAbsolute);
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(adjustedVertexPosition, 1.0);
        vColor = uVertexColor;
    }
`;
let fragmentShaderSource = `
    varying lowp vec4 vColor;
    void main() {
        gl_FragColor = vColor;
    }
`;



onload = function() {
    let canvas = document.getElementById('a') as HTMLCanvasElement;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let gl = canvas.getContext('webgl');

    function loadShader(type: number, source: string) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
            console.error('An error occurred compiling shader', source, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            throw 'shader compilation error';
        }
        return shader;
    }

    function initShaderProgram(fragmentShaderSource: string, vertexShaderSource) {

        let vertexShader = loadShader(gl.VERTEX_SHADER, vertexShaderSource);
        let fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        let shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if( !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
            console.error('An error occurred linking program', gl.getProgramInfoLog(shaderProgram));
            throw 'program link error';
        }

        return shaderProgram;

    }

    function initBuffers() {
        let positions = [
            // Front face
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,
    
            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,    
        ];
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        let u = Math.sqrt(1/3);
        //u = 1;
        let vertexNormalAverages = [
            // Front face
            -u, -u, u, 
            u, -u, u, 
            u, u, u, 
            -u, u, u, 

            // Back face
            -u, -u, -u, 
            -u, u, -u, 
            u, u, -u, 
            u, -u, -u

        ];
        let normalAverageBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalAverageBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormalAverages), gl.STATIC_DRAW);

        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.

        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
        ];

        // Now send the element array to GL

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
        const lineIndices = [
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4, 
            4, 0, 
            5, 3, 
            6, 2, 
            7, 1
        ];
        const lineIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            normalAverages: normalAverageBuffer, 
            indices: indexBuffer,
            indicesCount: indices.length, 
            lineIndices: lineIndexBuffer, 
            lineIndicesCount: lineIndices.length
        };
    }

    let shaderProgram = initShaderProgram(fragmentShaderSource, vertexShaderSource);

    // Set clear color to black, fully opaque
    gl.clearColor(0.1, 0.0, 0.1, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);  
    // Near things obscure far things
    gl.depthFunc(gl.LEQUAL);         
    
    let projectionMatrix = glm.mat4.perspective(
        glm.mat4.create(),
        Math.PI/4, 
        gl.canvas.clientWidth / gl.canvas.clientHeight, 
        .1, 
        1000 
    );

    let modelViewMatrix = glm.mat4.create();

    let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    let aVertexNormalAverage = gl.getAttribLocation(shaderProgram, 'aVertexNormalAverage');

    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    let uModelViewMatrix = gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
    let uVertexColor = gl.getUniformLocation(shaderProgram, 'uVertexColor');
    let uVertexOffsetAbsolute = gl.getUniformLocation(shaderProgram, 'uVertexOffsetAbsolute');

    let buffers = initBuffers();
    let lineColor = [1.0, 1.0, 0.4, 1.0];
    let bodyColor = [0.2, 0.2, 0.2, 1.0];

    function drawScene() {

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            aVertexPosition, 
            3, 
            gl.FLOAT, 
            false, 
            0, 
            0
        );
        gl.enableVertexAttribArray(aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalAverages);
        gl.vertexAttribPointer(
            aVertexNormalAverage, 
            3, 
            gl.FLOAT, 
            false, 
            0, 
            0
        );
        gl.enableVertexAttribArray(aVertexNormalAverage);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    
        gl.useProgram(shaderProgram);
    
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        gl.uniform4fv(uVertexColor, bodyColor);
        gl.uniform1f(uVertexOffsetAbsolute, 0);
    
        gl.drawElements(gl.TRIANGLES, buffers.indicesCount, gl.UNSIGNED_SHORT, 0);

        gl.uniform4fv(uVertexColor, lineColor);
        gl.uniform1f(uVertexOffsetAbsolute, 0.5);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.lineIndices);

        gl.drawElements(gl.LINES, buffers.lineIndicesCount, gl.UNSIGNED_SHORT, 0);
    }

    let then = 0;
    function update(now: number) {
        requestAnimationFrame(update);
        let diff = now - then;

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glm.mat4.identity(modelViewMatrix);
        glm.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -20]);
        glm.mat4.rotateY(modelViewMatrix, modelViewMatrix, now * 0.001);
        glm.mat4.rotateX(modelViewMatrix, modelViewMatrix, now * 0.0001);
        drawScene();
        
        then = now;
    }
    update(0);

}
