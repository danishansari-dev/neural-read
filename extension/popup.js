/**
 * Popup script for NeuralRead extension.
 * This exists to handle the UI interactions in the extension popup window, allowing the user
 * to toggle the main extension functionality on and off via chrome.storage.local.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusText = document.getElementById('statusText');
    const errorMessage = document.getElementById('errorMessage');
    const loadingMessage = document.getElementById('loadingMessage');

    /**
     * Updates the UI to show an error state
     * @param {string} msg - The error message to display
     */
    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
    }

    try {
        // Initialize state from chrome.storage.local
        const result = await chrome.storage.local.get(['isActive']);
        // Default to active if not set previously
        const isActive = result.isActive !== false;

        // Setup initial UI state
        toggleSwitch.checked = isActive;
        statusText.textContent = isActive ? 'Enabled' : 'Disabled';
        toggleSwitch.disabled = false; // Enable the checkbox once state is loaded

        // Add listener for toggle changes
        toggleSwitch.addEventListener('change', async (event) => {
            try {
                // Show loading indicator
                errorMessage.style.display = 'none';
                loadingMessage.style.display = 'block';
                toggleSwitch.disabled = true; // Prevent rapid clicking

                const newState = event.target.checked;

                // Save new state
                await chrome.storage.local.set({ isActive: newState });

                statusText.textContent = newState ? 'Enabled' : 'Disabled';
            } catch (err) {
                console.error("Error saving toggle state:", err);
                showError("Failed to save state.");
                // Revert UI on failure
                toggleSwitch.checked = !event.target.checked;
            } finally {
                loadingMessage.style.display = 'none';
                toggleSwitch.disabled = false;
            }
        });
    } catch (err) {
        console.error("Error initializing popup:", err);
        showError("Failed to load extension state.");
    }
});
