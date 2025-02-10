let THREECAMERA = null;

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

  loader.load(
    'models/football_makeup/face.json',
    (geometry) => {
      const mat = new THREE.MeshBasicMaterial({
        // DEBUG: uncomment color, comment map and alphaMap
        map: new THREE.TextureLoader().load('models/football_makeup/IRELAND.png'),
        alphaMap: new THREE.TextureLoader().load('models/football_makeup/MASK.png'),
        transparent: true,
        opacity: 0.7
      });

      const faceMesh = new THREE.Mesh(geometry, mat);
      faceMesh.size = [0.5,0.5];
      geometry.scale(1,1,-0.5);
      //faceMesh.position.x -= 0.1;
      //faceMesh.position.y += 0.1;
      //faceMesh.position.z -= 0.4;
      faceMesh.rotation.x = Math.PI / 12;

      addDragEventListener(faceMesh);

      threeStuffs.faceObject.add(faceMesh);
    }
  )



 // CREATE THE VIDEO BACKGROUND
  function create_mat2d(threeTexture, isTransparent) { //MT216 : we put the creation of the video material in a func because we will also use it for the frame
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

  //MT216 : create the frame. We reuse the geometry of the video
  const calqueMesh = new THREE.Mesh(threeStuffs.videoMesh.geometry, create_mat2d(new THREE.TextureLoader().load('images/BORDER.png'), true))
  calqueMesh.renderOrder = 999; // render last
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
    NNCPath: '../neuralNets/', // path of NN_DEFAULT.json file
    videoSettings: videoSettings,
    callbackReady: function(errCode, spec) {
      if (errCode) {
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: JEELIZFACEFILTER IS READY');
      init_threeScene(spec);
    }, // end callbackReady()

    // called at each render iteration (drawing loop)
    callbackTrack: function(detectState) {
      JeelizThreeHelper.render(detectState, THREECAMERA);
    } // end callbackTrack()
  }); // end JEELIZFACEFILTER.init call
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