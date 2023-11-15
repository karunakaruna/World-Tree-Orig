import { bookmark } from "./Bookmark.js";








export function DOM(){
    const contextMenu = document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // const bookmarkButton = document.querySelector("#urlMenu > button:nth-child(2)").addEventListener("click", bookmark);

    const urlModal = document.getElementById('urlModal');
    const confirmButton = document.getElementById('confirmButton');
    const modalText = document.getElementById('modalText');
    const imageElem = document.getElementById('imageDisplay');




// URL Menu
    const examineButton = document.querySelector("#examineButton").addEventListener("click", () => {
        console.log("Examine");
        closeContextMenu();
    });

    const saveFavouriteButton = document.querySelector("#saveFavouriteButton").addEventListener("click", () => {
        console.log("Save Favourite");
        bookmark();
        closeContextMenu();
    });

    const inviteFriendButton = document.querySelector("#inviteFriendButton").addEventListener("click", () => {
        console.log("Invite Friend");
        closeContextMenu();
    });


    


// Player Menu
    const goAFKButton = document.querySelector("#goAFKButton").addEventListener("click", () => {
        console.log("Go AFK");
        closeContextMenu();
    });

    const playerSettingsButton = document.querySelector("#playerSettingsButton").addEventListener("click", () => {
        console.log("Player Settings");
        closeContextMenu();
    });

    const inventoryButton = document.querySelector("#inventoryButton").addEventListener("click", () => {
        console.log("Inventory");
        closeContextMenu();
    });

// User Menu
    const trustButton = document.querySelector("#trustButton").addEventListener("click", () => {
        console.log("Trust");
        closeContextMenu();
    });

    const addFriendButton = document.querySelector("#addFriendButton").addEventListener("click", () => {
        console.log("Add Friend");
        closeContextMenu();
    });

    const viewProfileButton = document.querySelector("#viewProfileButton").addEventListener("click", () => {
        console.log("View Profile");
        closeContextMenu();
    });


    //Default Menu
    const createButton = document.querySelector("#createButton").addEventListener("click", () => {
        console.log("Create");
        closeContextMenu();
    });

    const listUsersButton = document.querySelector("#listUsersButton").addEventListener("click", () => {
        console.log("List Users");
        closeContextMenu();
    });

    const addButton = document.querySelector("#addButton").addEventListener("click", () => {
        console.log("Add");
        closeContextMenu();
    });


    function closeContextMenu() {
        const contextMenus = document.querySelectorAll('.contextMenu');
        Array.prototype.forEach.call(contextMenus, (menu) => {
            menu.style.display = "none";
        });
    }



};


    