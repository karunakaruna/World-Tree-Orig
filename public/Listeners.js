import { raycaster, camera, mouse, cube, userID, showModal } from './scene3.js';
import { gltfScene } from './Loaders.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition } from './Spawners.js';
import {ws} from './WebSockets.js'

let targetRotationX = 0;
let targetRotationZ = 0;
let maxrot = 25;
let targetPosition = new THREE.Vector3(0, 0, 0);
let targetFOV = 60; // Initial target FOV
export function addMouseMovementListener() {
    window.addEventListener('mousemove', (event) => {
    
    const mouseX = event.clientX - window.innerWidth / 2;
    const mouseY = event.clientY - window.innerHeight / 2;

    // Normalize mouse position for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    const divs = [document.getElementById('floatingText'), document.getElementById('authorText'), document.getElementById('yearText')];
    const imageDiv = document.getElementById('displayedImage');
    const imageElem = document.getElementById('imageDisplay');

    divs.forEach((div, index) => {
        div.style.left = `${event.clientX}px`;
        div.style.top = `${event.clientY + index * 25}px`; // Stack the divs vertically
    });
    imageDiv.style.left = `${event.clientX}px`;
    imageDiv.style.top = `${event.clientY - 220}px`; 

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
    targetRotationX = Math.max(Math.min(targetRotationX, Math.PI/2), -Math.PI/2) + 0.4;

    // Check for intersections with 3D objects
    const intersects = raycaster.intersectObjects(gltfScene.children, true);
    for (let i = 0; i < intersects.length; i++) {
        const userData = intersects[i].object.userData;
    
        if (userData) {
            document.getElementById('floatingText').innerText = userData.Name || "";
            document.getElementById('authorText').innerText = userData.Author || "";
            document.getElementById('yearText').innerText = userData.Year || "";
    
            // Update the image src if 'image' userData is present
            if (userData.image) {
                imageElem.src = userData.image;
            } else {
                imageElem.src = ''; // Clear the src if no image data is present
            }
            
            return; // Return to break out of loop if we found an intersection with userData
        }
    }
    

    // If no object is intersected
    divs.forEach(div => div.innerText = '');
    imageElem.src = '';  // Also clear the image if no object is intersected
});
}

    // Listen to scroll wheel
export function addScrollWheelListener() {
    window.addEventListener('wheel', (event) => {
        targetFOV += event.deltaY * 0.1; // Invert the zoom direction
        targetFOV = Math.min(Math.max(targetFOV, 25), 80); // Clamp FOV between 25 and 80
    });
}
export function addClickListener() {   
    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gltfScene.children, true);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            
            // Set the intersection point as the target position
            targetPosition.copy(intersection.point);
    
            // Optional: offset in the Y direction to ensure the cube rests above the grid.
            targetPosition.y += cube.scale.y / 2;
    
            // Always spawn the regular ping on intersection
            spawnPingAtPosition(intersection.point);
            
            const userData = intersection.object.userData;
            if (userData && userData.URL) {
                // Show the modal and spawn an entrance ping when the URL is confirmed.
                showModal(userData.Name || 'Unknown', userData.URL, intersection.point, event);
                return; // Exit to avoid further processing since the URL takes precedence
            }
            
            // Send the position data to WebSocket server
            const payload = {
                type: 'loc',
                userID: userID,
                position: {
                    x: intersection.point.x,
                    y: intersection.point.y,
                    z: intersection.point.z
                }
            };
            ws.send(JSON.stringify(payload));
        }
    });
}

export { gltfScene, targetRotationX, targetRotationZ, targetPosition, targetFOV};