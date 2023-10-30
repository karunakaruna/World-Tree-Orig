import { globalState } from "./state.js";
import { cuboid } from "./classes.js";

// Create a raycaster
const raycaster = new THREE.Raycaster();

// Create a mouse vector
const mouse = new THREE.Vector2();


// Add event listener for mouse click

export function addListener() {
    window.addEventListener("click", function(event) {
            // Calculate mouse position in normalized device coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, globalState.camera);

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(globalState.scene.children, true);

            // If there is at least one intersection
            if (intersects.length > 0) {
                console.log(intersects);
                // Get the name and world coordinates of the first intersected object
                const objectName = intersects[0].object.name;
                const intersectionPoint = intersects[0].point;
                console.log("Clicked on object:", objectName, "at position:", intersectionPoint);

                // Clone the cached model and add it to the scene
                const clonedModel = new cuboid;
                // clonedModel.name = 'cuboid';
                clonedModel.position.copy(intersectionPoint);
                clonedModel.userData.instance = clonedModel; // Store reference to the Object3D instance
                globalState.scene.add(clonedModel);
                console.log(clonedModel.name);
                
            } else if (intersects.length == 0) {
                console.log("Clicked on nothing");
            }
    });
};           



export function addRightListener() {
    window.addEventListener("contextmenu", function(event) { // Change event listener to right click
        event.preventDefault(); // Prevent default right click behavior

        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, globalState.camera);

        

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(globalState.scene.children, true);

        // If there is at least one intersection
        if (intersects.length > 0) {
            console.log(intersects[0].object);
            console.log(intersects[0].object.material);
            console.log(intersects[0].object.geometry);
            console.log(intersects);
            for (const intersect of intersects) {
                console.log(intersect.object.parent.name);
            }

            // Get the name and world coordinates of the first intersected object
            const objectName = intersects[0].object.parent.name;
            const intersectionPoint = intersects[0].point;
            console.log("Right clicked on object:", objectName, "at position:", intersectionPoint);

            // Change the color of the target cuboid class to red
            // Inside the addRightListener function:
            if (intersects[0].object.parent.name === "cuboid") {
                console.log("Right clicked on a cuboid");

                // Call setColor on the referenced cuboid instance
                intersects[0].object.parent.color = 'red';
                console.log(intersects[0].object.parent.color);
            }


        } else if (intersects.length == 0) {
            console.log("Right clicked on nothing");
        }
    });
};           




export const mouseCoords = { x: 0, y: 0 };
window.addEventListener("mousemove", function(event) {
    // Update the mouse coordinates in the GUI
    mouseCoords.x = event.clientX;
    mouseCoords.y = event.clientY;
});