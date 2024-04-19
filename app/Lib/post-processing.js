// Create a hidden WebGL canvas
const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');

// Check if WebGL is supported
if (!gl) {
    console.error('WebGL not supported');
}

// Helper function to create shaders
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

// Helper function to create shader programs
function createShaderProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function setUniformsAndAttributesForBright(program, texture) {
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const textureLocation = gl.getUniformLocation(program, 'uTexture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // This now refers to a valid texture object
    gl.uniform1i(textureLocation, 0);
}

function setUniformsAndAttributesForBlur(program, texture) {
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const textureLocation = gl.getUniformLocation(program, 'uTexture');
    const textureSizeLocation = gl.getUniformLocation(program, 'uTextureSize');
    const blurSizeLocation = gl.getUniformLocation(program, 'uBlurSize');

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // Ensure texture is correctly passed here
    gl.uniform1i(textureLocation, 0);
    gl.uniform2f(textureSizeLocation, glCanvas.width, glCanvas.height);
    gl.uniform1f(blurSizeLocation, 1.0); // Example blur size
}

function setUniformsAndAttributesForBlend(program, sceneTexture, bloomTexture) {
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const sceneTextureLocation = gl.getUniformLocation(program, 'uScene');
    const bloomTextureLocation = gl.getUniformLocation(program, 'uBloom');

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture); // Ensure scene texture is correctly passed here
    gl.uniform1i(sceneTextureLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexture); // Ensure bloom texture is correctly passed here
    gl.uniform1i(bloomTextureLocation, 1);
}

function createTextureFromCanvas(canvas) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createTexture(width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createFramebuffer(texture) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
}

// Create textures
const originalSceneTexture = createTexture(glCanvas.width, glCanvas.height); // Assume you load this from canvas
const brightResultTexture = createTexture(glCanvas.width, glCanvas.height);
const blurredBloomTexture = createTexture(glCanvas.width, glCanvas.height);

// Create framebuffers
const brightFramebuffer = createFramebuffer(brightResultTexture);
const blurFramebuffer = createFramebuffer(blurredBloomTexture);

window.applyPostProcessing = function(canvas, ctx) {
    // Clear and reset our planet rendering contexts so we can re-render this game loop.
    glCanvas.width = canvas.width;
    glCanvas.height = canvas.height;
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Re-create textures and framebuffers with new dimensions
    const originalSceneTexture = createTextureFromCanvas(canvas);
    const brightResultTexture = createTexture(glCanvas.width, glCanvas.height);
    const blurredBloomTexture = createTexture(glCanvas.width, glCanvas.height);
    const brightFramebuffer = createFramebuffer(brightResultTexture);
    const blurFramebuffer = createFramebuffer(blurredBloomTexture);

    // Create shaders
    const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 vTexCoord; // Ensure this matches fragment shader varying name
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            vTexCoord = (a_position + 1.0) / 2.0;
        }
    `;

    // Bright Shader
    // https://stackoverflow.com/questions/596216/formula-to-determine-perceived-brightness-of-rgb-color
    // Luminance (standard for certain colour spaces): (0.2126*R + 0.7152*G + 0.0722*B)
    // Luminance (perceived option 1): 0.299*R + 0.587*G + 0.114*B)
    // Luminance (perceived option 2, slower to calculate): sqrt( 0.299*R^2 + 0.587*G^2 + 0.114*B^2 )
    const brightShaderSource = `
        precision highp float;

        varying vec2 vTexCoord;
        uniform sampler2D uTexture;

        void main() {
            vec4 color = texture2D(uTexture, vTexCoord);
            float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114)); // Calculate luminance
            // Adjust threshold here, maybe even use a smoothstep for softer transitions
            float threshold = 0.3; // Lower the threshold
            float factor = smoothstep(threshold - 0.1, threshold, brightness);
            gl_FragColor = vec4(color.rgb * factor, 1.0);
        }
    `;

    // Blur Shader
    const blurFragmentShaderSource = `
        precision highp float;

        varying vec2 vTexCoord;
        uniform sampler2D uTexture;
        uniform vec2 uTextureSize;
        uniform float uBlurSize;

        void main() {
            vec2 tex_offset = 1.0 / uTextureSize;
            vec4 result = vec4(0.0);
            // Applying a basic average blur
            for (int i = -1; i <= 1; i++) {
                for (int j = -1; j <= 1; j++) {
                    vec2 offset = vec2(float(i), float(j)) * uBlurSize * tex_offset;
                    result += texture2D(uTexture, vTexCoord + offset);
                }
            }
            gl_FragColor = result / 9.0; // Normalizing the sum
        }
    `;


    // Blend Shader
    const blendFragmentShaderSource = `
        precision highp float;

        varying vec2 vTexCoord;
        uniform sampler2D uScene;
        uniform sampler2D uBloom;

        void main() {
            vec4 sceneColor = texture2D(uScene, vTexCoord);
            vec4 bloomColor = texture2D(uBloom, vTexCoord);
            gl_FragColor = sceneColor + vec4(bloomColor.rgb, 0.0); // Ensure alpha remains unaffected
        }    
    `;

    // Create shaders
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const brightFragmentShader = compileShader(gl.FRAGMENT_SHADER, brightShaderSource);
    const blurFragmentShader = compileShader(gl.FRAGMENT_SHADER, blurFragmentShaderSource);
    const blendFragmentShader = compileShader(gl.FRAGMENT_SHADER, blendFragmentShaderSource);

    // Create programs
    const brightProgram = createShaderProgram(vertexShader, brightFragmentShader);
    const blurProgram = createShaderProgram(vertexShader, blurFragmentShader);
    const blendProgram = createShaderProgram(vertexShader, blendFragmentShader);

    // Use the shader program
    gl.useProgram(brightProgram);
    gl.useProgram(blurProgram);
    gl.useProgram(blendProgram);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    // Pass 1: Bright Pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, brightFramebuffer); // Bind the framebuffer for bright pass
    gl.viewport(0, 0, glCanvas.width, glCanvas.height); // Ensure viewport is set for framebuffer size
    gl.useProgram(brightProgram); // Use the bright shader program
    setUniformsAndAttributesForBright(brightProgram, originalSceneTexture); // Set uniforms (texture)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Draw the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Unbind the framebuffer

    // Pass 2: Blur Pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFramebuffer); // Bind the framebuffer for blur pass
    gl.viewport(0, 0, glCanvas.width, glCanvas.height); // Set viewport for the framebuffer size
    gl.useProgram(blurProgram); // Use the blur shader program
    setUniformsAndAttributesForBlur(blurProgram, brightResultTexture); // Set uniforms (texture)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Draw the bright texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Unbind the framebuffer

    // Pass 3: Blend Pass
    gl.viewport(0, 0, glCanvas.width, glCanvas.height); // Reset viewport for final output
    gl.useProgram(blendProgram); // Use the blend shader program
    setUniformsAndAttributesForBlend(blendProgram, originalSceneTexture, blurredBloomTexture); // Set uniforms (textures)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Draw the final blended scene

    // Copy the rendered result back to the canvas
    const imageData = new Uint8Array(glCanvas.width * glCanvas.height * 4);
    gl.readPixels(0, 0, glCanvas.width, glCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
    const imageDataObject = new ImageData(new Uint8ClampedArray(imageData), glCanvas.width, glCanvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageDataObject, 0, 0);
};

