import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Add File Transfer Panel to ComfyUI
app.registerExtension({
    name: "Comfy.FileTransferPanel",
    // Define the command to show the file transfer panel
    commands: [
        {
            id: "show-file-transfer",
            label: "Show File Transfer Panel",
            function: () => {
                const panel = document.getElementById("file-transfer-panel");
                if (panel) {
                    panel.style.display = panel.style.display === "none" ? "block" : "none";
                }
            }
        }
    ],
    // Add the command to the menu
    menuCommands: [
        {
            path: ["Extensions", "File Transfer"],
            commands: ["show-file-transfer"]
        }
    ],
    async setup() {

        // Create file transfer panel
        const panel = document.createElement("div");
        panel.id = "file-transfer-panel";
        panel.className = "comfy-modal";
        panel.style.display = "none";
        panel.style.zIndex = 999;
        panel.style.position = "fixed";
        panel.style.top = "50%";
        panel.style.left = "50%";
        panel.style.transform = "translate(-50%, -50%)";
        panel.style.backgroundColor = "var(--bg-color)";
        panel.style.padding = "20px";
        panel.style.borderRadius = "10px";
        panel.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
        panel.style.width = "600px";
        panel.style.maxWidth = "90%";

        // Panel HTML content with tabs
        panel.innerHTML = `
            <h2 style="margin-top: 0">File Transfer Utility</h2>
            
            <div class="tabs">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="rsync-tab">Rsync</button>
                    <button class="tab-button" data-tab="rclone-tab">Rclone</button>
                </div>
                
                <div class="tab-content">
                    <!-- Rsync Tab -->
                    <div id="rsync-tab" class="tab-pane active">
                        <div class="form-group">
                            <label for="rsync-source">Source Path:</label>
                            <input type="text" id="rsync-source" placeholder="Path to source folder or file">
                        </div>
                        <div class="form-group">
                            <label for="rsync-destination">Destination Path:</label>
                            <input type="text" id="rsync-destination" placeholder="Path to destination folder">
                        </div>
                        <div class="form-group">
                            <label for="rsync-flags">Flags:</label>
                            <input type="text" id="rsync-flags" placeholder="rsync flags" value="-avz">
                        </div>
                        <div class="form-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="rsync-dry-run" checked>
                                <label for="rsync-dry-run">Dry Run (no actual changes)</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="rsync-wsl">
                                <label for="rsync-wsl">Use WSL (Windows Subsystem for Linux)</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="rsync-timeout">Timeout (seconds):</label>
                            <input type="number" id="rsync-timeout" min="1" max="3600" value="300">
                        </div>
                        <div class="button-row">
                            <button id="rsync-run" class="primary-button">Run Rsync</button>
                        </div>
                    </div>
                    
                    <!-- Rclone Tab -->
                    <div id="rclone-tab" class="tab-pane">
                        <div class="form-group">
                            <label for="rclone-source">Source Path:</label>
                            <input type="text" id="rclone-source" placeholder="Local path or remote:path">
                        </div>
                        <div class="form-group">
                            <label for="rclone-destination">Destination Path:</label>
                            <input type="text" id="rclone-destination" placeholder="Local path or remote:path">
                        </div>
                        <div class="form-group">
                            <label for="rclone-config">Config File Path (Optional):</label>
                            <input type="text" id="rclone-config" placeholder="Path to rclone.conf">
                        </div>
                        <div class="form-group">
                            <label for="rclone-flags">Command & Flags:</label>
                            <input type="text" id="rclone-flags" placeholder="copy, sync, etc. with flags" value="copy">
                        </div>
                        <div class="form-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="rclone-dry-run" checked>
                                <label for="rclone-dry-run">Dry Run (no actual changes)</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="rclone-wsl">
                                <label for="rclone-wsl">Use WSL (Windows Subsystem for Linux)</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="rclone-timeout">Timeout (seconds):</label>
                            <input type="number" id="rclone-timeout" min="1" max="3600" value="300">
                        </div>
                        <div class="button-row">
                            <button id="rclone-run" class="primary-button">Run Rclone</button>
                        </div>
                    </div>
                </div>
                
                <div class="output-area">
                    <h3>Output:</h3>
                    <pre id="transfer-output" style="max-height: 300px; overflow: auto; background: #1a1a1a; padding: 10px; border-radius: 5px;">Results will appear here</pre>
                </div>
                
                <div class="button-row" style="margin-top: 15px;">
                    <button id="transfer-close" class="secondary-button">Close</button>
                </div>
            </div>
        `;

        // Add some styles
        const style = document.createElement("style");
        style.textContent = `
            .form-group {
                margin-bottom: 10px;
            }
            label {
                display: block;
                margin-bottom: 5px;
            }
            input[type="text"], input[type="number"] {
                width: 100%;
                padding: 5px;
                background-color: var(--comfy-input-bg);
                border: 1px solid var(--border-color);
                color: var(--input-text);
                border-radius: 4px;
            }
            .checkbox-wrapper {
                display: flex;
                align-items: center;
            }
            .checkbox-wrapper label {
                margin-left: 8px;
                margin-bottom: 0;
            }
            .button-row {
                display: flex;
                justify-content: space-between;
                margin-top: 15px;
            }
            .primary-button {
                padding: 8px 16px;
                background-color: var(--primary-color);
                border: none;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            }
            .primary-button:disabled {
                background-color: #666;
                cursor: not-allowed;
            }
            .secondary-button {
                padding: 8px 16px;
                background-color: var(--comfy-input-bg);
                border: 1px solid var(--border-color);
                color: var(--input-text);
                border-radius: 4px;
                cursor: pointer;
            }
            .output-area {
                margin-top: 20px;
            }
            
            /* Tab styling */
            .tabs {
                width: 100%;
            }
            .tab-buttons {
                display: flex;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 15px;
            }
            .tab-button {
                padding: 8px 16px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--input-text);
                cursor: pointer;
                margin-right: 10px;
            }
            .tab-button.active {
                border-bottom: 2px solid var(--primary-color);
                color: var(--primary-color);
            }
            .tab-pane {
                display: none;
            }
            .tab-pane.active {
                display: block;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        // Tab switching functionality
        const tabButtons = panel.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                // Deactivate all tabs
                tabButtons.forEach(btn => btn.classList.remove("active"));
                panel.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));

                // Activate the clicked tab
                button.classList.add("active");
                const tabId = button.dataset.tab;
                panel.querySelector(`#${tabId}`).classList.add("active");
            });
        });

        // Event listeners for close button only
        // Menu click is handled by the command function above

        document.getElementById("transfer-close").addEventListener("click", () => {
            panel.style.display = "none";
        });

        // Rsync run handler
        document.getElementById("rsync-run").addEventListener("click", async () => {
            const runBtn = document.getElementById("rsync-run");
            const outputArea = document.getElementById("transfer-output");

            // Gather form data
            const params = {
                source: document.getElementById("rsync-source").value,
                destination: document.getElementById("rsync-destination").value,
                flags: document.getElementById("rsync-flags").value,
                dry_run: document.getElementById("rsync-dry-run").checked,
                use_wsl: document.getElementById("rsync-wsl").checked,
                timeout: parseInt(document.getElementById("rsync-timeout").value || "300")
            };

            if (!params.source || !params.destination) {
                outputArea.textContent = "Error: Source and destination paths are required.";
                outputArea.style.color = "#ff8787";
                return;
            }

            // Disable button and show loading
            runBtn.disabled = true;
            runBtn.textContent = "Running...";
            outputArea.textContent = "Running rsync command...";
            outputArea.style.color = "var(--input-text)";

            try {
                const response = await fetch("/rsync/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(params)
                });

                const result = await response.json();
                outputArea.textContent = result.output || "No output returned";

                if (result.success) {
                    outputArea.style.color = "#8bff87";  // Green for success
                } else {
                    outputArea.style.color = "#ff8787";  // Red for error
                }
            } catch (error) {
                outputArea.textContent = `Error: ${error.message || "Failed to run rsync"}`;
                outputArea.style.color = "#ff8787";
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = "Run Rsync";
            }
        });

        // Rclone run handler
        document.getElementById("rclone-run").addEventListener("click", async () => {
            const runBtn = document.getElementById("rclone-run");
            const outputArea = document.getElementById("transfer-output");

            // Gather form data
            const params = {
                source: document.getElementById("rclone-source").value,
                destination: document.getElementById("rclone-destination").value,
                flags: document.getElementById("rclone-flags").value,
                dry_run: document.getElementById("rclone-dry-run").checked,
                use_wsl: document.getElementById("rclone-wsl").checked,
                config_path: document.getElementById("rclone-config").value,
                timeout: parseInt(document.getElementById("rclone-timeout").value || "300")
            };

            if (!params.source || !params.destination) {
                outputArea.textContent = "Error: Source and destination paths are required.";
                outputArea.style.color = "#ff8787";
                return;
            }

            // Disable button and show loading
            runBtn.disabled = true;
            runBtn.textContent = "Running...";
            outputArea.textContent = "Running rclone command...";
            outputArea.style.color = "var(--input-text)";

            try {
                const response = await fetch("/rclone/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(params)
                });

                const result = await response.json();
                outputArea.textContent = result.output || "No output returned";

                if (result.success) {
                    outputArea.style.color = "#8bff87";  // Green for success
                } else {
                    outputArea.style.color = "#ff8787";  // Red for error
                }
            } catch (error) {
                outputArea.textContent = `Error: ${error.message || "Failed to run rclone"}`;
                outputArea.style.color = "#ff8787";
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = "Run Rclone";
            }
        });

        // Close when clicking outside
        window.addEventListener("click", (e) => {
            if (e.target === panel) {
                panel.style.display = "none";
            }
        });
    }
});
