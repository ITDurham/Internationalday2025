let THREECAMERA = null;
let currentTexture = null; // Store the current texture to avoid reloading unnecessarily
let faceMesh = null; // Store the face mesh for later updates

// callback: launched if a face is detected or lost
function detect_callback(isDetected) {
  if (isDetected) {
    console.log('INFO in detect_callback(): DETECTED');
  } else {
    console.log('INFO in detect_callback(): LOST');
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec) {
  const threeStuffs = JeelizThreeHelper.init(spec, detect_callback);

  // Add our face model:
  const loader = new THREE.BufferGeometryLoader();

  loader.load('models/football_makeup/face.json', (geometry) => {
    const textureLoader = new THREE.TextureLoader();

    // Function to update flag dynamically
    function updateFlag(flagName) {
      console.log("Function called to update the flag");

      // Check if the texture is already loaded to avoid redundant loading
      if (currentTexture && currentTexture.name === flagName) {
        console.log('Texture already loaded:', flagName);
        return; // No need to load again
      }

      textureLoader.load(
        `models/football_makeup/${flagName}.png`,
        (texture) => {
          currentTexture = texture; // Store the loaded texture

          // Update the material's map to the new texture
          faceMesh.material.map = texture;
          faceMesh.material.needsUpdate = true;
          console.log(`Texture updated: ${flagName}`);
        },
        undefined,
        (err) => {
          console.error(`Error loading texture: ${flagName}`, err);
        }
      );
    }

    const mat = new THREE.MeshBasicMaterial({
      // DEBUG: uncomment color, comment map and alphaMap
      map: null,
      alphaMap: new THREE.TextureLoader().load('models/football_makeup/MASK3.png'),
      transparent: true,
      opacity: 0.7
    });

    faceMesh = new THREE.Mesh(geometry, mat);
    faceMesh.size = [0.5, 0.5];
    geometry.scale(1, 1, -0.5);
    faceMesh.rotation.x = Math.PI / 12;
    faceMesh.rotation.y = Math.PI / 12;

    addDragEventListener(faceMesh);

    threeStuffs.faceObject.add(faceMesh);

    window.updateFlag = updateFlag;
    
    const urlParams = new URLSearchParams(window.location.search);
      const flag = urlParams.get('flag'); // Get the flag parameter from URL

      // If a flag is specified in the URL, update the flag immediately
      if (flag) {
        updateFlag(flag);
      }// Expose the updateFlag function to be used globally
  });

  // CREATE THE VIDEO BACKGROUND
  function create_mat2d(threeTexture, isTransparent) {
    return new THREE.RawShaderMaterial({
      depthWrite: false,
      depthTest: false,
      transparent: isTransparent,
      vertexShader: "attribute vec2 position;\n\
        varying vec2 vUV;\n\
        void main(void){\n\
          gl_Position=vec4(position, 0., 1.);\n\
          vUV=0.5+0.5*position;\n\
        }",
      fragmentShader: "precision lowp float;\n\
        uniform sampler2D samplerVideo;\n\
        varying vec2 vUV;\n\
        void main(void){\n\
          gl_FragColor=texture2D(samplerVideo, vUV);\n\
        }",
      uniforms: {
        samplerVideo: { value: threeTexture }
      }
    });
  }

  // Create the frame
  const calqueMesh = new THREE.Mesh(threeStuffs.videoMesh.geometry, create_mat2d(new THREE.TextureLoader().load('images/BORDER.png'), true));
  calqueMesh.renderOrder = 999; // Render last
  calqueMesh.frustumCulled = false;
  threeStuffs.scene.add(calqueMesh);

  // CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} // end init_threeScene()

// Entry point:
function main() {
  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    callback: function(isError, bestVideoSettings) {
      init_faceFilter(bestVideoSettings);
    }
  })
}

function init_faceFilter(videoSettings) {
  JEELIZFACEFILTER.init({
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: '../neuralNets/', // Path of NN_DEFAULT.json file
    videoSettings: videoSettings,
    callbackReady: function(errCode, spec) {
      if (errCode) {
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: JEELIZFACEFILTER IS READY');
      init_threeScene(spec);
    }, // end callbackReady()

    // Called at each render iteration (drawing loop)
    callbackTrack: function(detectState) {
      JeelizThreeHelper.render(detectState, THREECAMERA);
    } // end callbackTrack()
  }); // end JEELIZFACEFILTER.init call

  // Listen for screenshot button
  const screenshotButton = document.getElementById('screenshot-btn');
  screenshotButton.addEventListener('click', () => {
    const canvas = document.getElementById('jeeFaceFilterCanvas'); // Get the canvas element
    if (canvas) {
      // Create a temporary canvas to flip the image
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');

      // Set the dimensions of the temporary canvas to match the original
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      // Flip the image horizontally
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, -canvas.width, 0);
      const link = document.createElement('a');
      link.download = 'jeeliz_screenshot.png';
      link.href = tempCanvas.toDataURL('image/png'); // Convert canvas to an image
      link.click();
    } else {
      console.error('Canvas not found!');
    }
  });
}

window.addEventListener('load', main);
