    //websockets
    let loadedGLTF; 
    const ws = new WebSocket('wss://worldtree.herokuapp.com'); // Replace with your Heroku app's WebSocket address
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
    
        // Function to append logs

    
        if (message.type === 'color') {
            // Update the cube's color
            cube.material.color.set(message.value);
            addLog(`Color updated to ${message.value}`);
        } else if (message.type === 'ping') {
            // Process ping
            //console.log('ping!');
            addLog('Received heartbeat');
        } else if (message.type === 'loc') {
            const receivedPosition = new THREE.Vector3(
                message.position.x,
                message.position.y,
                message.position.z,
            );
            //console.log('hi!');
            // Call your function to spawn and animate a ping instance at this position
            spawnPingAtPosition(receivedPosition);
            //addLog(`Received location: (${receivedPosition.x}, ${receivedPosition.y}, ${receivedPosition.z})`);
        } else if (message.type === 'userCount') {
            // Update the user count on the page
            document.getElementById('userCount').textContent = message.value;
            addLog(`Users online: ${message.value}`);
        } else if (message.type === 'beacon') {
            // Process beacon message
            const beaconURL = message.url;
            console.log(beaconURL);
            // Now, iterate through your gltf.scene objects
            loadedGLTF.scene.traverse((object) => {
                if (object.userData && object.userData.URL === beaconURL) {
                    // Run the "spawn ping" at this object's position
                    spawnBeaconLightAtPosition(object.position);
                    addLog(`Beacon ping at ${object.userData.URL}`);
                }
            });
        }
    };

// Audio ///
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer; // Store the audio buffer globally
    
    // Load the audio file and store it in the audioBuffer
    const audioFiles = {
        'chime': 'multichime2.mp3',
        'beacon': '636631__eponn__soft-buildup-game-fx-3.mp3',
        'click': '420997__eponn__click.mp3',
        'beep': '528863__eponn__beep-3.mp3',
        // ...add other sounds as needed
    };
    const listener = new THREE.AudioListener();
    const loop = new THREE.PositionalAudio( listener );

// load a sound and set it as the Audio object's buffer
    const loopLoader = new THREE.AudioLoader();
    loopLoader.load( 'Precession - bnk736_1.mp3', function( buffer ) {
        loop.setBuffer( buffer );
        loop.setLoop(true);
        loop.setVolume(2);
        loop.play();
    });


    let audioBuffers = {};
    
    for (let soundName in audioFiles) {
        fetch(audioFiles[soundName])
          .then(response => response.arrayBuffer())
          .then(data => audioContext.decodeAudioData(data))
          .then(buffer => {
              audioBuffers[soundName] = buffer; // Store the audio buffer with its key
          })
          .catch(error => console.error(`Error loading ${soundName} audio:`, error));
    }

    function playSpatialAudio(soundName, position, volume = 1) {
        const buffer = audioBuffers[soundName];
        if (!buffer) {
            console.error(`Audio buffer for "${soundName}" not found.`);
            return;
        }
        
        const sound = new THREE.PositionalAudio(listener);
        
        sound.setBuffer(buffer);
        sound.setRefDistance(1);
        sound.setRolloffFactor(1);
        sound.setDistanceModel('exponential');
        sound.setMaxDistance(1000);
        sound.setVolume(volume);
        sound.position.copy(position);
        scene.add(sound);
        
        sound.play();
    
        sound.onEnded = function() {
            scene.remove(sound);
        };
    }
    

    
    const scene = new THREE.Scene();

    // Initialize cube position, target position, and rotation
    let cubePosition = new THREE.Vector3(0, 0, 0);
    let targetPosition = new THREE.Vector3(0, 0, 0);

    //Camera Movement
    const maxMovement = 8;
    const damping = 0.04; // Damping factor to control lerping speed
    const deadZoneRadius = 0; // Adjust this for the dead-zone size

    let cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed

    // Camera Renderer Setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    camera.add(listener);

    // Scale the three.js scene when you change the window size.
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize, false);


    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Camera Zoom Setup
    let cameraFOV = 45;
    let targetFOV = 45; // Initial target FOV
    const fovLerpSpeed = 0.1; // Adjust this for zoom speed
    const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction

    // Set the camera's "up" vector
    camera.up.copy(customUpVector);

    //Setup Basis Geometry (used for camera testing)
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    const geometry2 = new THREE.BoxGeometry();
    const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const cube2 = new THREE.Mesh(geometry2, material2);
    cube.name = "cube"; 
    cube2.scale.set(.1,.1,.1)
    cube2.position.set(0,0,0)
    cube.add(cube2);

    camera.position.set(0, 15, 0);
    camera.rotation.set(-1.5708, 0, 0);
    const gridGeometry = new THREE.PlaneGeometry(88, 88, 88, 88);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    cube.visible = false;
    scene.add(cube);
    cube.add(camera);

    //Lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Use a lower intensity value like 0.2 for a dim light
    directionalLight.position.set(1, 1, 1); // Set the light's position
    scene.add(directionalLight); // Add the light to your scene


    //camera lerp
    let targetRotationX = 0;
    let targetRotationZ = 0;
    const lerpFactor = 0.05;


// GLTF loaders ///

// Map Scene ///
    let gltfScene; 
    const loader = new THREE.GLTFLoader();
    loader.load('grid6.glb', function(gltf) {
        loadedGLTF = gltf; // Assign the loaded gltf model
        gltfScene = gltf.scene;  // Store the scene
        scene.add(gltfScene);
    }, undefined, function(error) {
        console.error('An error occurred loading the GLTF:', error);
    });


// Ping  //
        const pingloader = new THREE.GLTFLoader();
        let pingModel; // Store the loaded model
        pingloader.load('ping.glb', (gltf) => {
            pingModel = gltf.scene; // Store the loaded model
            pingModel.animations = gltf.animations; // Store animations
        
            // You can scale and position the model as needed
            pingModel.scale.set(2, 2, 2);
            pingModel.position.set(0, 1, 0);
            const materialred = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Create a basic material with a red color
            pingModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = materialred;
                }
            });
            // Add the model to the scene but initially hide it
            pingModel.visible = false;
            scene.add(pingModel);
            pingmixer = new THREE.AnimationMixer(pingModel);
            const pingclips = pingModel.animations;
            pingclip = THREE.AnimationClip.findByName(pingclips, 'CircleAction'); // Fetch the first animation
            const pingaction = pingmixer.clipAction(pingclip);
            pingaction.play();

        }, undefined, (error) => {
            console.error('An error occurred loading the GLB:', error);
        });
 
// Beaconlight Loader ///
        const beaconLightLoader = new THREE.GLTFLoader();
        let beaconLightModel; // Store the loaded beacon light model
        beaconLightLoader.load('beaconlight.glb', (gltf) => {
            beaconLightModel = gltf.scene; // Store the loaded model
            beaconLightModel.animations = gltf.animations; // Store animations

            beaconLightModel.scale.set(2, 2, 2);
            beaconLightModel.position.set(0, 1, 0);
            const materialRed = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            beaconLightModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = materialRed;
                }
            });
            
            beaconLightModel.visible = false;
            scene.add(beaconLightModel);
            
            // If you end up adding animations for the beacon light later, you can initialize its animation mixer here:
            // beaconLightMixer = new THREE.AnimationMixer(beaconLightModel);

        }, undefined, (error) => {
            console.error('An error occurred loading the beacon light GLB:', error);
        });


// LISTENERS ///

    // Mouse movement listener. //
    let maxrot = 25;
    window.addEventListener('mousemove', (event) => {
        const mouseX = event.clientX - window.innerWidth / 2;
        const mouseY = event.clientY - window.innerHeight / 2;

        // Normalize mouse position for raycasting
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        const divs = [document.getElementById('floatingText'), document.getElementById('authorText'), document.getElementById('yearText')];
        divs.forEach((div, index) => {
            div.style.left = `${event.clientX}px`;
            div.style.top = `${event.clientY + index * 25}px`; // Stack the divs vertically
        });


        // Update the target rotations based on the mouse position
        targetRotationZ = THREE.MathUtils.mapLinear(
            event.clientX, 0, window.innerWidth, 
            THREE.MathUtils.degToRad(maxrot), THREE.MathUtils.degToRad(maxrot*-1)
        );
            
        targetRotationX = THREE.MathUtils.mapLinear(
            event.clientY, 0, window.innerHeight, 
            THREE.MathUtils.degToRad(maxrot*-1), THREE.MathUtils.degToRad(maxrot)
        );
        // Ensure the X rotation stays within bounds to avoid over-rotation
       targetRotationX = Math.max(Math.min(targetRotationX, Math.PI/2), -Math.PI/2)+.4;

        // Update Text Overlay for Objects Intersected
            const intersects = raycaster.intersectObjects(gltfScene.children, true);
                        for (let i = 0; i < intersects.length; i++) {
                            const userData = intersects[i].object.userData;

                            if (userData) {
                                document.getElementById('floatingText').innerText = userData.Name || "";
                                document.getElementById('authorText').innerText = userData.Author || "";
                                document.getElementById('yearText').innerText = userData.Year || "";
                                return;
                            }
                        }
    // If no object is intersected
    divs.forEach(div => div.innerText = '');
    });

    // Listen to scroll wheel
    window.addEventListener('wheel', (event) => {
        targetFOV += event.deltaY * 0.1; // Invert the zoom direction
        targetFOV = Math.min(Math.max(targetFOV, 25), 80); // Clamp FOV between 25 and 80
    });


// CLICK <<<<<<<<<<<<<    
    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gltfScene.children, true);
        
        for (let i = 0; i < intersects.length; i++) {
            const userData = intersects[i].object.userData;
            if (userData && userData.URL) {
                window.open(userData.URL, "_blank");
                return;
            }
        }
        if (intersects.length > 0) {
            const intersect = intersects[0];
    
            // Set the intersection point as the target position
            targetPosition.copy(intersect.point);
    
            // Optional: offset in the Y direction to ensure the cube rests above the grid.
            targetPosition.y += cube.scale.y / 2;
        };
        if (intersects.length > 0) {
            const intersection = intersects[0];
        
            // Spawn the ping locally and play the audio
            spawnPingAtPosition(intersection.point);
        
            // Send the position data to WebSocket server  
            const payload = {
                type: 'loc',
                position: {
                    x: intersection.point.x,
                    y: intersection.point.y,
                    z: intersection.point.z
                }
            };
            
            ws.send(JSON.stringify(payload));
        }
    });



// SPAWNERS ///

// PING 
    function spawnPingAtPosition(position) {
        const pingInstance = pingModel.clone();
        pingInstance.position.copy(position).add(new THREE.Vector3(0, 1, 0));
        pingInstance.animations = pingModel.animations;
        pingInstance.visible = true;
        scene.add(pingInstance);
        
        // Play spatial audio at the given position
        playSpatialAudio('beep', position, 1);
    
        let mixer = new THREE.AnimationMixer(pingInstance);
        activeMixers.push(mixer);
        const clips = pingInstance.animations; 
        const clip = THREE.AnimationClip.findByName(clips, 'CircleAction');
        
        if (clip) {
            const action = mixer.clipAction(clip);
            action.play();
        
            setTimeout(() => {
                scene.remove(pingInstance);
                mixer.stopAllAction();
                const mixerIndex = activeMixers.indexOf(mixer);
                if (mixerIndex !== -1) {
                    activeMixers.splice(mixerIndex, 1);
                }
            }, (clip.duration * 1000));
            
        } else {
            console.error("Animation clip not found");
        }
    }
    
// BEACONLIGHT <<<<<<<<<<<<
    function spawnBeaconLightAtPosition(position) {
        const beaconLightInstance = beaconLightModel.clone();
        beaconLightInstance.position.copy(position).add(new THREE.Vector3(0, 0, 0));
        beaconLightInstance.visible = true;
        scene.add(beaconLightInstance);
        
        // Play spatial audio at the given position
        playSpatialAudio('beacon', position);
        
        // 
        setTimeout(() => {
            scene.remove(beaconLightInstance);
        }, 10000);
    }

    const activeMixers = [];

//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV
    camera.fov += (targetFOV - camera.fov) * fovLerpSpeed;
    camera.updateProjectionMatrix();

    // Use lerp to smoothly move the cube towards the target position
    cubePosition.lerp(targetPosition, damping);
    cube.position.copy(cubePosition);

    // Lerp the cube's rotation to the target
    cube.rotation.x += (targetRotationX - cube.rotation.x) * lerpFactor;
    cube.rotation.z += (targetRotationZ - cube.rotation.z) * lerpFactor;

    renderer.render(scene, camera);
};


        animate();